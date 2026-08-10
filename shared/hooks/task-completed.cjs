#!/usr/bin/env node
// cortex-x TaskCompleted hook — verification gate.
//
// Why this exists: `standards/verification-loop.md` says every implementation
// step must be paired with a verification step, and that the verification
// task MUST be checked off before commit. Today that rule is PROSE in
// CLAUDE.md — it holds only as long as the model remembers to honor it.
// This hook turns it into deterministic enforcement: an implementation task
// cannot be marked completed until the agent has stated, in the task itself,
// which verification primitive proved it works.
//
// Design constraints that shaped this:
//
//   1. A hook that blocks EVERY implementation task forever is a broken
//      hook — the agent would loop. So this nudges exactly ONCE per task,
//      keyed by (session_id, task text). Second attempt always passes.
//   2. It must not fire on trivial work (typo, rename, format, bump).
//   3. It must not fire on tasks that ALREADY name a verification primitive
//      ("run npm test", "screenshot the hero", "curl + assert 200").
//   4. It must fail open. If the payload shape is unrecognized, if the state
//      dir is unwritable, if anything throws — the task completes.
//
// Contract (per Claude Code hooks reference):
//   stdin  — task payload (shape varies by build; probed defensively)
//   stdout — {} to allow, or { decision: 'block', reason } to block
//   exit 0 always; blocking is expressed via JSON, not via exit 2, so a
//   stdout-schema mismatch degrades to "allow" rather than to a hard stop.
//
// Opt-out: CORTEX_VERIFY_GATE_DISABLED=1
//
// SSOT: the rule itself lives in standards/verification-loop.md. This file
// holds only the trigger heuristics, not a restatement of the rule.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const STATE_DIR = path.join(os.tmpdir(), 'cortex-verify-gate');
const STATE_TTL_MS = 24 * 60 * 60 * 1000; // stale nudge records expire daily

// Unicode-aware word boundary. JS `\b` is defined against ASCII `\w`, so
// `/\bověř\b/` never matches "ověř " — the trailing `ř` is already a
// non-word char, leaving no boundary to assert. Every Czech trigger below
// would silently never fire. These lookarounds treat any Unicode letter or
// digit as a word char, which is what `\b` is meant to express here.
const WB = { start: '(?<![\\p{L}\\p{N}_])', end: '(?![\\p{L}\\p{N}_])' };

function words(...list) {
  return new RegExp(`${WB.start}(?:${list.join('|')})${WB.end}`, 'iu');
}

// Task text that describes building something. Deliberately narrower than
// auto-orchestrate's NEW_IMPL_PATTERNS: this gate fires on task completion,
// where a false positive costs the agent a wasted turn.
const IMPLEMENTATION_PATTERNS = [
  // English
  words('implement', 'build', 'wire', 'scaffold', 'migrate', 'refactor'),
  /\b(add|create|write)\s+(a\s+|an\s+|the\s+)?(new\s+)?(feature|endpoint|route|page|component|hook|adapter|integration|api|service|module|migration|schema|handler|middleware|worker|job|cli|command)\b/i,
  /\bfix\s+(the\s+)?(bug|crash|regression|race|leak|error)\b/i,
  // Czech
  words('implementuj', 'naprogramuj', 'napoj', 'zprovozni', 'přepiš', 'refaktoruj'),
  /(?<![\p{L}\p{N}_])(?:přidej|vytvoř|uděl(?:ej|áme))\s+(?:nov\p{L}*\s+)?(?:feature|endpoint|route|stránk\p{L}+|komponent\p{L}+|adapter|integraci|api|službu|modul|migraci|handler)(?![\p{L}\p{N}_])/iu,
];

// Work where verification is the change itself, or where the cost of the
// nudge exceeds its value.
const TRIVIAL_PATTERNS = [
  words('typo', 'rename', 'reformat', 'format', 'prettier', 'lint', 'comment', 'whitespace', 'indent', 'changelog', 'readme', 'docs?[- ]only', 'bump', 'dependency\\s+bump'),
  words('překlep', 'přejmenuj', 'formátování', 'komentář', 'dokumentace'),
];

// Task text that already names how it will be proven. Matches the three
// verification primitives in standards/verification-loop.md § failure modes.
const VERIFICATION_PATTERNS = [
  words('verify', 'verifikuj', 'ověř', 'ověřit', 'assert', 'prove', 'confirm'),
  words('npm\\s+(?:run\\s+)?test', 'npm\\s+t', 'vitest', 'jest', 'pytest', 'go\\s+test', 'cargo\\s+test'),
  words('screenshot', 'devtools', 'lighthouse', 'playwright', 'visual\\s+diff', 'render'),
  words('curl', 'http\\s+2\\d\\d', 'status\\s+2\\d\\d', 'smoke', 'integration\\s+test', 'contract\\s+test'),
  words('green', 'passing', 'prošel', 'prošlo', 'all\\s+tests?'),
];

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

// The TaskCompleted payload shape is not pinned in the public hooks
// reference, so probe the plausible carriers rather than assuming one.
// Returns '' when nothing task-shaped is found — which means fail-open.
function extractTaskText(input) {
  if (!input || typeof input !== 'object') return '';

  const task = (input.task && typeof input.task === 'object') ? input.task : input;
  const candidates = [
    task.content,
    task.description,
    task.subject,
    task.title,
    task.text,
    task.activeForm,
    task.prompt,
    input.task_content,
    input.content,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

function taskKey(sessionId, text) {
  return crypto
    .createHash('sha256')
    .update(`${sessionId || 'no-session'}::${text}`)
    .digest('hex')
    .slice(0, 32);
}

// Returns true if this exact task was already nudged (so: let it through).
// Records the nudge as a side effect when it was not. Fails open — an
// unwritable state dir means "already nudged", never a repeated block.
function alreadyNudged(key) {
  const marker = path.join(STATE_DIR, `${key}.json`);
  try {
    if (fs.existsSync(marker)) {
      const st = fs.statSync(marker);
      if (Date.now() - st.mtimeMs < STATE_TTL_MS) return true;
    }
  } catch (_) {
    return true;
  }

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(marker, JSON.stringify({ at: new Date().toISOString() }));
    return false;
  } catch (_) {
    return true;
  }
}

function shouldGate(text) {
  if (!text) return false;
  if (TRIVIAL_PATTERNS.some((r) => r.test(text))) return false;
  if (VERIFICATION_PATTERNS.some((r) => r.test(text))) return false;
  return IMPLEMENTATION_PATTERNS.some((r) => r.test(text));
}

function buildReason(text) {
  return [
    'cortex verification gate (standards/verification-loop.md).',
    '',
    `Task "${text.slice(0, 120)}" looks like implementation, and nothing in it`,
    'names how the result was proven. A green build is necessary, not sufficient.',
    '',
    'Before completing it, do ONE of these:',
    '  1. Run the verification primitive that matches the failure mode —',
    '     UI → chrome-devtools screenshot + visual assertion;',
    '     handler → integration test or curl + assert on state;',
    '     data shape → contract test or boundary parse.',
    '  2. Add the paired verification task to the list and complete that first.',
    '',
    'Then mark this task completed again — the gate nudges once per task and',
    'will not block the retry.',
  ].join('\n');
}

function emit(payload) {
  try {
    process.stdout.write(JSON.stringify(payload));
  } catch (_) {}
}

function main() {
  if (process.env.CORTEX_VERIFY_GATE_DISABLED === '1') {
    emit({ continue: true });
    return;
  }

  const input = readInput();
  const text = extractTaskText(input);

  if (!shouldGate(text)) {
    emit({ continue: true });
    return;
  }

  if (alreadyNudged(taskKey(input.session_id, text))) {
    emit({ continue: true });
    return;
  }

  emit({ decision: 'block', reason: buildReason(text) });
}

try {
  main();
} catch (_err) {
  emit({ continue: true });
  process.exit(0);
}
