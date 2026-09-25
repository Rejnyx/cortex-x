#!/usr/bin/env node
// cortex-x UserPromptSubmit hook — auto-orchestration soft-gate.
//
// When the user's prompt looks like a new-implementation request, injects
// evidence-based guidance + research cache state + running budget into
// Claude's context via hookSpecificOutput.additionalContext. NEVER spawns
// agents silently; NEVER blocks the turn. Fail-open on any error.
//
// Second responsibility (compaction recovery): PostCompact cannot inject
// context, so post-compact.cjs leaves `.claude/compact-recovery-pending.json`
// and this hook re-injects `.claude/compact-state.md` on the next turn, then
// consumes the marker. That runs INDEPENDENTLY of the orchestration trigger —
// recovery must fire on any prompt, not only on implementation-shaped ones.
//
// Grounded in:
//   standards/auto-orchestration.md (3-fronta rule, 2-minute rule)
//   Anthropic multi-agent research blog (2024)
//   Cognition "Don't Build Multi-Agents" (2025)
//   PlanCraft -70% degradation on sequential tasks with multi-agent
//
// Contract:
//   stdin  — JSON with { prompt, session_id, cwd, ... }
//   stdout — JSON with { continue, hookSpecificOutput? }
//   Silent pass-through when no trigger matches.

const fs = require('fs');
const path = require('path');
const os = require('os');

const { validateCortexHome } = require('./_lib/redact.cjs');
const { sessionTotal, getCapUsd, warningLevel, isBudgetDisabled } = require('./_lib/budget.cjs');

const DEFAULT_TTL_DAYS = 180;
const HOT_FRAMEWORK_TTL_DAYS = 30;
const REGULATION_TTL_DAYS = 180;
const ARCHITECTURE_TTL_DAYS = 365;

const HOT_FRAMEWORK_SLUGS = /\b(next|react|vercel|tailwind|supabase|anthropic|openai|ai[-_]sdk|shadcn|tone|astro|remix|svelte)\b/i;
const REGULATION_SLUGS = /\b(tax|dan|gdpr|hipaa|legal|compliance|regulation)\b/i;
const ARCHITECTURE_SLUGS = /\b(pattern|architecture|design)\b/i;

// New-implementation triggers (cs + en). Tight on purpose — false positives
// spam every turn.
const NEW_IMPL_PATTERNS = [
  // Czech
  /\b(implementuj|přidej|vytvoř|naprogramuj|stavíme|postavíme|udělej)\s+(nov|funkci|feature|endpoint|route|stránku|komponent|adapter|integraci)/i,
  /\bnov[áéýíou]\s+(feature|endpoint|route|stránka|komponenta|funkce|sekce|modul|adapter)\b/i,
  /\bintegruj(eme)?\b/i,
  /\bnapojeni?\s+na\b/i,
  // English
  /\b(implement|add|build|create)\s+(a\s+|an\s+|the\s+)?(new\s+)?(feature|endpoint|route|page|component|adapter|integration|api|service|module)\b/i,
  /\bintegrate\s+[A-Z0-9]/,
  /\bbuild\s+(a\s+|an\s+)?new\b/i,
  /\bwire\s+up\s+\w+/i,
];

// Skip triggers — user explicitly asked for speed or trivial change.
const SKIP_PATTERNS = [
  /\b(quick|rychle|skip\s+research|no\s+research|fix\s+typo|typo|rename|reformat|format|prettier|lint|add\s+a?\s*comment)\b/i,
  /^\s*(quick|rychle|skip|oprav\s+typo)\b/i,
];

// --- compaction recovery (paired with post-compact.cjs) --------------------

const COMPACT_MARKER = path.join(process.cwd(), '.claude', 'compact-recovery-pending.json');
const COMPACT_STATE = path.join(process.cwd(), '.claude', 'compact-state.md');
const COMPACT_MAX_CHARS = 4000;

// Reads the saved pre-compact state if PostCompact flagged one, then deletes
// the marker so the block is injected exactly once. Returns null when there
// is nothing pending. Fail-open: any error yields null.
function consumeCompactRecovery() {
  if (process.env.CORTEX_COMPACT_RECOVERY_DISABLED === '1') return null;

  try {
    if (!fs.existsSync(COMPACT_MARKER)) return null;
  } catch (_) {
    return null;
  }

  let state = null;
  try {
    state = fs.readFileSync(COMPACT_STATE, 'utf8');
  } catch (_) {
    state = null;
  }

  // Consume the marker even when the state file is gone — a marker that
  // cannot be satisfied must not survive to retry on every subsequent turn.
  try { fs.unlinkSync(COMPACT_MARKER); } catch (_) {}

  if (!state || !state.trim()) return null;

  const truncated = state.length > COMPACT_MAX_CHARS
    ? `${state.slice(0, COMPACT_MAX_CHARS)}\n\n[truncated — full state in .claude/compact-state.md]`
    : state;

  return [
    '# cortex-x compaction recovery',
    '',
    'The context was compacted since the last turn. This is the sprint state',
    'captured by the PreCompact hook immediately before that happened. Treat it',
    'as ground truth about where the work stood, and re-read the files it names',
    'before acting on them — it reflects the state at compaction time, not now.',
    '',
    truncated,
  ].join('\n');
}

function resolveCortexRoot() {
  const envHome = validateCortexHome(process.env.CORTEX_HOME);
  if (envHome) return envHome;

  try {
    const yamlPath = path.join(os.homedir(), '.claude', 'shared', 'cortex-source.yaml');
    if (fs.existsSync(yamlPath)) {
      const content = fs.readFileSync(yamlPath, 'utf8');
      const m = content.match(/^cortex_source:\s*(.+)$/m);
      if (m && m[1]) {
        const candidate = m[1].trim();
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch (_) {}

  return null;
}

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function shouldTrigger(prompt) {
  if (!prompt || typeof prompt !== 'string') return false;
  if (SKIP_PATTERNS.some(r => r.test(prompt))) return false;
  return NEW_IMPL_PATTERNS.some(r => r.test(prompt));
}

function pickTtl(slug) {
  if (HOT_FRAMEWORK_SLUGS.test(slug)) return HOT_FRAMEWORK_TTL_DAYS;
  if (REGULATION_SLUGS.test(slug)) return REGULATION_TTL_DAYS;
  if (ARCHITECTURE_SLUGS.test(slug)) return ARCHITECTURE_TTL_DAYS;
  return DEFAULT_TTL_DAYS;
}

function listResearchCache(cortexRoot) {
  if (!cortexRoot) return [];
  const dir = path.join(cortexRoot, 'research');
  if (!fs.existsSync(dir)) return [];
  try {
    const entries = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    const now = Date.now();
    const out = [];
    for (const f of entries) {
      if (f.toLowerCase() === 'readme.md') continue;
      try {
        const full = path.join(dir, f);
        const st = fs.statSync(full);
        if (!st.isFile()) continue;
        const head = fs.readFileSync(full, 'utf8').slice(0, 600);
        const dateMatch = head.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
        const projectMatch = head.match(/^project:\s*(.+)$/m);
        const ttlMatch = head.match(/^ttl_days:\s*(\d+)/m);
        const date = dateMatch ? new Date(dateMatch[1]) : st.mtime;
        const slug = projectMatch ? projectMatch[1].trim() : f.replace(/\.md$/, '');
        const ageDays = Math.floor((now - date.getTime()) / 86400000);
        const ttl = ttlMatch ? Number(ttlMatch[1]) : pickTtl(slug);
        out.push({ file: f, slug, ageDays, ttl, fresh: ageDays < ttl });
      } catch (_) {}
    }
    return out.sort((a, b) => a.ageDays - b.ageDays);
  } catch (_) {
    return [];
  }
}

function formatCacheList(caches, maxEntries = 5) {
  if (!caches || caches.length === 0) return '  (empty)';
  return caches
    .slice(0, maxEntries)
    .map(c => `  - ${c.slug} (${c.ageDays}d old, TTL ${c.ttl}d, ${c.fresh ? 'FRESH' : 'stale'})`)
    .join('\n');
}

function buildGuidance(caches, budget, capUsd, budgetDisabled) {
  const header = [
    '# cortex-x auto-orchestrate',
    '',
    'This prompt matches a new-implementation pattern. Apply the 3-fronta rule from `~/.claude/shared/standards/auto-orchestration.md`:',
    '',
    '- **Research — parallelizable** (3-4 Agent subagents, general-purpose). Run BEFORE writing code if topic is unfamiliar OR cache is stale.',
    '- **Implementation — single-thread.** Multi-agent code-writing degrades -70% on sequential/interdependent tasks (PlanCraft benchmark). Do not parallelize `Edit`/`Write`.',
    '- **Review — parallelizable** (3-5 adversarial agents). Run AFTER implementation via `~/.claude/shared/prompts/auto-review.md`.',
    '',
    'Research cache (sorted by age, fresh first):',
    formatCacheList(caches),
    '',
  ];

  const decisionTree = [
    '**Decision tree:**',
    '1. Topic covered by FRESH cache above → skip research, go to implementation.',
    '2. Unfamiliar / stale / missing → spawn 2-4 parallel Agent tasks (general-purpose), merge, then implement single-threaded.',
    '3. Trivial scope (bug fix, rename, typo) → ignore this hint; implement directly.',
    '4. User said `quick` / `rychle` / `skip research` → ignore this hint.',
    '',
    'After implementation lands, paste `~/.claude/shared/prompts/auto-review.md` (or invoke code-review.md) to run the parallel review pipeline.',
  ];

  if (budgetDisabled) {
    return [...header, ...decisionTree].join('\n');
  }

  const level = warningLevel(budget.cost_usd, capUsd);
  const pct = capUsd > 0 ? Math.round((budget.cost_usd / capUsd) * 100) : 0;
  const budgetLine = budget.count > 0
    ? `Session spend: $${budget.cost_usd.toFixed(2)} / $${capUsd.toFixed(2)} (${pct}%) [${level}]`
    : `Session budget cap: $${capUsd.toFixed(2)} (no Agent/Task spend recorded yet)`;

  const overLine = level === 'over'
    ? '\n**BUDGET EXCEEDED** — ask user before spawning additional Agent/Task subagents.'
    : level === 'warning'
    ? '\n**Budget warning (>80%)** — be frugal. Prefer reused cache over fresh research.'
    : '';

  return [
    ...header,
    budgetLine + overLine,
    '',
    ...decisionTree,
  ].join('\n');
}

function emitContext(blocks) {
  const merged = blocks.filter(Boolean).join('\n\n---\n\n');
  if (!merged) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: merged,
    },
  }));
}

function main() {
  const input = readInput();
  const prompt = (input && (input.prompt || input.user_prompt)) || '';

  // Recovery is unconditional — it must fire on any prompt after a compaction.
  const recovery = consumeCompactRecovery();

  if (!shouldTrigger(prompt)) {
    emitContext([recovery]);
    return;
  }

  const cortexRoot = resolveCortexRoot();
  const caches = listResearchCache(cortexRoot);
  const budgetDisabled = isBudgetDisabled();
  const capUsd = budgetDisabled ? 0 : getCapUsd();
  const budget = (!budgetDisabled && cortexRoot)
    ? sessionTotal(cortexRoot, input && input.session_id)
    : { cost_usd: 0, tokens: 0, count: 0 };

  const guidance = buildGuidance(caches, budget, capUsd, budgetDisabled);

  emitContext([recovery, guidance]);
}

try {
  main();
} catch (_err) {
  // Fail-open: a broken hook must never break a session.
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch (_) {}
  process.exit(0);
}
