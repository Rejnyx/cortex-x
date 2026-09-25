// lessons.cjs — Sprint 1.8.3 ReasoningBank-lite memory module.
//
// Append-only log of "what failed and why" lessons, captured after every
// failed Hermes run. Lessons are deterministically recalled into the next
// LLM prompt so Hermes does not repeat the same mistake.
//
// Design refs:
//   - Google Research ReasoningBank (2026) — distill failure rationales,
//     not raw transcripts; counterfactual signals; LLM-as-judge.
//   - Cloudflare Agent Memory (2026) — append-only, infrastructure-free,
//     keyword-shaped recall (no embedding service needed for v1).
//
// Storage:
//   $CORTEX_DATA_HOME/journal/<slug>/lessons.jsonl
//   One JSON object per line. No truncation; growth bounded by frequency
//   of failures (typically <1KB/day). Readers tail the last N lines.
//
// Each lesson:
//   {
//     ts:           ISO 8601 timestamp
//     action_kind:  "recommendation" | "recommendation_harvest" | ...
//     action_key:   "<slug>#week-1"            — for repeat-failure dedup
//     root_cause:   "OPENROUTER_KEY_MISSING"  — short error code from result.code
//     lesson_text:  one-sentence what went wrong, plain prose
//     hint:         one-sentence "next time, do X" guidance (optional)
//   }
//
// Recall API picks top-K matching the upcoming action by:
//   1. Exact match on action_key (highest priority — same action failed before)
//   2. Match on action_kind (same kind failed before)
//   3. Recency tiebreaker (newer wins)
//
// No embeddings, no semantic search. Keyword shape is enough for v1.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const DEFAULT_RECALL_K = 5;
const MAX_RECALL_LINES = 500; // hard cap on jsonl tail read

function resolveDataHome() {
  return process.env.CORTEX_DATA_HOME || path.join(os.homedir(), '.cortex');
}

function lessonsPath(slug) {
  return path.join(resolveDataHome(), 'journal', slug, 'lessons.jsonl');
}

// Append-only JSONL write. Idempotent at the line level; safe under concurrent
// Hermes runs because each line is atomic (lessons are short).
function recordLesson(slug, lesson) {
  if (!slug) throw new Error('lessons.recordLesson: slug is required');
  if (!lesson || typeof lesson !== 'object') throw new Error('lessons.recordLesson: lesson object is required');

  const file = lessonsPath(slug);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  // Sprint 2.8 R1 §10 — schema extension for memory foundation:
  //   agent_id      — forward-compat for per-agent memory split (defaults
  //                   to 'default'; Tier 2 Sprint 3.1 may revisit splitting).
  //   failure_origin — distinct provenance: "spec_failures[N].id" or
  //                   "error_code:<code>" — feeds Sprint 2.8 retrieval-at-
  //                   decision-time filtering.
  //   impact        — "advisory" | "warning" | "blocker" — drives
  //                   memory-decay.cjs half-life selection (advisory 30d,
  //                   warning 60d, blocker 120d).
  //   frequency     — retrieval count, increments when a lesson is recalled
  //                   into a prompt. Used by importance-weighted scoring.
  //   pinned        — operator-marked never-degrade fact; memory-decay never
  //                   archives it and the exporter always keeps it. Only a
  //                   literal boolean true pins; omitted when false.
  const enriched = {
    ts: lesson.ts || new Date().toISOString(),
    action_kind: lesson.action_kind || 'recommendation',
    action_key: lesson.action_key || null,
    root_cause: lesson.root_cause || 'UNKNOWN',
    lesson_text: lesson.lesson_text || '',
    hint: lesson.hint || null,
    // Sprint 2.8 schema fields (forward-compat; older readers ignore).
    agent_id: lesson.agent_id || 'default',
    failure_origin: lesson.failure_origin || null,
    impact: lesson.impact || 'advisory',
    frequency: typeof lesson.frequency === 'number' && lesson.frequency >= 0 ? lesson.frequency : 0,
    ...(lesson.pinned === true ? { pinned: true } : {}),
  };

  fs.appendFileSync(file, JSON.stringify(enriched) + '\n', 'utf8');
  return enriched;
}

// Read the last N lessons from the jsonl tail. Returns an array (possibly
// empty if file missing or all entries malformed).
function readAllLessons(slug, { maxLines = MAX_RECALL_LINES } = {}) {
  const file = lessonsPath(slug);
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').filter(Boolean).slice(-maxLines);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch (_) {
      // Malformed line — skip silently. Append-only writes shouldn't produce
      // these, but we don't want one corrupted entry to kill all recall.
    }
  }
  return out;
}

// Score a single lesson against an upcoming action context. Higher score =
// more relevant. Score components:
//   +100  exact action_key match (same recommendation failed before)
//   +30   same action_kind
//   +10   recency boost (newer lessons preferred when keys/kinds tie)
function scoreLesson(lesson, ctx) {
  let score = 0;
  if (ctx.action_key && lesson.action_key === ctx.action_key) score += 100;
  if (ctx.action_kind && lesson.action_kind === ctx.action_kind) score += 30;
  if (lesson.ts) {
    const ageMs = Date.now() - Date.parse(lesson.ts);
    if (!Number.isNaN(ageMs) && ageMs >= 0) {
      // 0 days old → +10, 30 days old → 0, 60+ days → 0
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - ageDays / 3);
    }
  }
  return score;
}

// Recall top-K most relevant lessons for an upcoming action. Returns array
// sorted by score (highest first), capped at K.
function recallLessons(slug, ctx = {}, { topK = DEFAULT_RECALL_K, maxLines = MAX_RECALL_LINES } = {}) {
  const all = readAllLessons(slug, { maxLines });
  if (all.length === 0) return [];
  const scored = all
    .map((lesson) => ({ lesson, score: scoreLesson(lesson, ctx) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((entry) => entry.lesson);
}

// Sprint 3.2 v1 — FTS5-backed recall via node:sqlite. When the FTS5
// index built by `lessons-search.cjs` is available + fresh, returns
// matches ranked by a priority ladder (action_key → action_kind →
// text-query free-text), each tier internally ordered by ts DESC.
// This preserves the priority hierarchy of `recallLessons`' positional
// score (action_key +100 > action_kind +30 > recency +10) without
// reproducing the additive arithmetic — first non-empty tier wins.
//
// Falls back to `recallLessons` (linear scan) on:
//   - node:sqlite unavailable (Node < 22.5)
//   - index file missing or stale beyond opts.maxIdxAgeMs (default 6h)
//   - clock skew (mtime in the future) — Sprint 3.2 v1 R2 fix, mirrors
//     Sprint 2.19 session-start guard pattern
//   - any FTS error
//   - empty result through all 3 tiers (final fall-through)
//
// `ctx.queryText` (or `ctx.error_code`) triggers the free-text tier.
// Action-engine call site doesn't pass these today — forward-compat for
// Sprint 2.8 retrieval-at-decision-time + Sprint 3.3 GraphRAG.
//
// Drop-in replacement signature: same first two args as recallLessons.
function recallLessonsFTS(slug, ctx = {}, opts = {}) {
  const topK = Number.isFinite(opts.topK) && opts.topK > 0 ? opts.topK : DEFAULT_RECALL_K;
  const maxIdxAgeMs = Number.isFinite(opts.maxIdxAgeMs) && opts.maxIdxAgeMs > 0
    ? opts.maxIdxAgeMs : 6 * 60 * 60 * 1000;

  let search;
  try {
    search = require('./lessons-search.cjs');
  } catch {
    return recallLessons(slug, ctx, { topK, maxLines: opts.maxLines });
  }
  if (!search.isAvailable()) {
    return recallLessons(slug, ctx, { topK, maxLines: opts.maxLines });
  }

  const idxFile = search.indexPath(slug);
  let stat;
  try { stat = fs.statSync(idxFile); } catch { stat = null; }
  if (!stat) {
    // No index yet — fall back to linear scan (lazy-build is the
    // operator's call via `cortex-lessons-search build`).
    return recallLessons(slug, ctx, { topK, maxLines: opts.maxLines });
  }
  // Sprint 3.2 v1 R2 (correctness-auditor HIGH): clock-skew defense.
  // A negative ageMs (mtime > now — NTP correction, VM snapshot restore,
  // wall-clock fiddling) would silently pass the `> maxIdxAgeMs` check
  // and use a future-stamped/stale index. Fail-safe to linear scan on
  // any anomaly. Same incident class as Sprint 2.19 session-start
  // (`ageMs >= 0 && ageMs < INTERVAL`).
  const ageMs = Date.now() - stat.mtimeMs;
  if (!(ageMs >= 0 && ageMs <= maxIdxAgeMs)) {
    return recallLessons(slug, ctx, { topK, maxLines: opts.maxLines });
  }

  // Combine action-key match (highest priority) + action_kind filter +
  // text query (root_cause + any keyword hints in ctx).
  const aks = ctx.action_kind;
  const akey = ctx.action_key;
  const query = String(ctx.queryText || ctx.error_code || '').trim();

  try {
    let result;
    // Tier 1: exact action_key match (preserves linear-scan +100 priority).
    // Uses SQL equality on UNINDEXED column, NOT FTS MATCH — special chars
    // like `#` over-tokenize in FTS5.
    if (akey) {
      result = search.searchByActionKey(slug, akey, { limit: topK });
      if (result.ok && result.hits.length > 0) return result.hits.slice(0, topK);
    }
    // Tier 2: action_kind filter (preserves linear-scan +30 priority).
    if (aks) {
      result = search.searchByActionKind(slug, aks, { limit: topK });
      if (result.ok && result.hits.length > 0) return result.hits.slice(0, topK);
    }
    // Tier 3: free-text fallback. Forward-compat — dead at action-engine
    // call site today; populated by retrieval-at-decision-time (Sprint 2.8).
    if (query.length > 0) {
      result = search.searchByText(slug, query, { limit: topK });
      if (result.ok && result.hits.length > 0) return result.hits.slice(0, topK);
    }
  } catch {
    // FTS failure — fall back to linear scan.
  }
  return recallLessons(slug, ctx, { topK, maxLines: opts.maxLines });
}

// Format an array of lessons as a compact markdown block for prompt injection.
// Empty input returns empty string (caller can ?? the result).
function formatLessonsForPrompt(lessons) {
  if (!Array.isArray(lessons) || lessons.length === 0) return '';
  const lines = ['## Past lessons (from prior failed Hermes runs)'];
  for (const l of lessons) {
    const hint = l.hint ? ` Hint: ${l.hint}` : '';
    const akey = l.action_key ? ` [${l.action_key}]` : '';
    lines.push(`- ${l.root_cause}${akey}: ${l.lesson_text}.${hint}`);
  }
  lines.push('');
  lines.push('Read these as cautionary signal. Do not repeat the same root cause without addressing the hint.');
  return lines.join('\n');
}

// Convenience: convert an executor result.code + error string into a default
// lesson_text. Captures the typical "what went wrong" without requiring
// callers to hand-craft prose every time.
// Sprint 2.8.1 hardening (R2 retro H5): SSOT impact classifier. Each entry
// is { regex, impact } evaluated in order; first match wins. Adding a new
// error code class means appending one entry — no scattered regex drift.
//
// Coverage targets ALL error codes from Sprint 2.4 (CLAUDE_CLI_*) and
// Sprint 2.5 (TECH_DEBT_*) explicitly:
//   - blocker: state-integrity violations, leaks, denylist hits, forbidden flags
//   - warning: config / auth / quota issues operator can fix
//   - advisory: transient network / protocol drift (retry-able)
const IMPACT_CLASSIFIER = Object.freeze([
  // BLOCKER: state-integrity, billing, destructive, hard policy violations
  { regex: /BILLING_LEAK/, impact: 'blocker' },
  { regex: /SPEC_VIOLATION/, impact: 'blocker' },
  { regex: /EDIT_DESTRUCTIVE/, impact: 'blocker' },
  { regex: /EDIT_DENYLISTED/, impact: 'blocker' },
  { regex: /EDIT_UNSAFE/, impact: 'blocker' },
  { regex: /FORBIDDEN_FLAG/, impact: 'blocker' },
  { regex: /TECH_DEBT_SNAPSHOT_CORRUPT/, impact: 'blocker' },
  { regex: /STEWARD_CROSS_REPO_EDIT/, impact: 'blocker' },
  { regex: /SIBLING_REALPATH_OUTSIDE_ROOT/, impact: 'blocker' },
  { regex: /SIBLING_WRITE_ATTEMPTED/, impact: 'blocker' },
  // WARNING: operator-fixable config / auth / quota issues
  { regex: /AUTH_REJECTED/, impact: 'warning' },
  { regex: /AUTH_NOT_CONFIGURED/, impact: 'warning' },
  { regex: /KEY_MISSING/, impact: 'warning' },
  { regex: /KEY_MALFORMED/, impact: 'warning' },
  { regex: /NOT_CONFIGURED/, impact: 'warning' },
  { regex: /QUOTA_EXHAUSTED/, impact: 'warning' },
  { regex: /BUDGET_(DAILY|WEEKLY|MONTHLY)_CAP_REACHED/, impact: 'warning' },
  { regex: /TECH_DEBT_THRESHOLD_EXCEEDED/, impact: 'warning' },
  { regex: /TOKEN_VELOCITY_CAP_REACHED/, impact: 'warning' },
  { regex: /LOOP_DETECTED/, impact: 'warning' },
  { regex: /FAILURE_BREAKER_TRIPPED/, impact: 'warning' },
  // Everything else (transient network, protocol drift, timeouts) → advisory
]);

function classifyImpact(code) {
  if (typeof code !== 'string') return 'advisory';
  for (const entry of IMPACT_CLASSIFIER) {
    if (entry.regex.test(code)) return entry.impact;
  }
  return 'advisory';
}

function lessonFromExecuteResult(result, ctx = {}) {
  if (!result || result.ok) return null; // success — nothing to learn from
  // Sprint 2.8: derive impact from result.code class via SSOT classifier.
  const code = String(result.code || '');
  const impact = classifyImpact(code);
  // Sprint 2.8: failure_origin captures distinct provenance so retrieval-at-
  // decision-time can filter by failure class, not just root_cause string.
  const failureOrigin = code.includes(':')
    ? code // SPEC_VIOLATION:no_destructive_rewrite — already namespaced
    : `error_code:${code || 'UNKNOWN'}`;
  const lesson = {
    action_kind: ctx.action_kind || 'recommendation',
    action_key: ctx.action_key || null,
    root_cause: result.code || 'UNKNOWN',
    lesson_text: result.error || 'no error message provided',
    impact,
    failure_origin: failureOrigin,
    agent_id: ctx.agent_id || 'default',
  };
  // Heuristic hints for known root causes.
  // Sprint 1.8.13: normalize engine namespace (OPENROUTER_/MOCK_) so a single
  // case clause covers both runtime + test paths. e.g. OPENROUTER_EDIT_DENYLISTED
  // and EDIT_DENYLISTED hit the same hint.
  // Sprint 1.9.0: root_cause may carry a `:<criterion_id>` suffix
  // (e.g. `SPEC_VIOLATION:no_destructive_rewrite`). Strip the suffix for
  // hint matching, but keep the full string in lesson.root_cause so recall
  // can surface per-criterion patterns. Also strip engine namespaces.
  const rawCode = String(result.code || '');
  const normalizedCode = rawCode
    .replace(/^OPENROUTER_/, '')
    .replace(/^MOCK_/, '')
    .replace(/:.*$/, '');
  switch (normalizedCode) {
    case 'KEY_MISSING':
      lesson.hint = 'Set OPENROUTER_API_KEY env var or gh secret before next run. For gh: printf %s "$KEY" | gh secret set OPENROUTER_API_KEY (avoid echo — trailing newline silently strips Authorization header).';
      break;
    case 'KEY_MALFORMED':
      lesson.hint = 'Key contains whitespace/control chars after trim. Re-set: printf %s "$KEY" | gh secret set OPENROUTER_API_KEY.';
      break;
    case 'AUTH_REJECTED':
      lesson.hint = 'OpenRouter returned 401/403 with valid-format key. Most likely: provisioning key (cannot make /chat/completions calls) instead of inference key, OR key revoked, OR account zero credit. Verify: curl -s -H "Authorization: Bearer $KEY" https://openrouter.ai/api/v1/auth/key | jq .data — should return is_provisioning_key:false.';
      break;
    case 'PLAN_SHAPE_INVALID':
      lesson.hint = 'LLM returned invalid edits[] shape; check max_tokens (default 4096 may truncate)';
      break;
    case 'EDIT_DENYLISTED':
      lesson.hint = 'LLM tried to edit a hardcoded-denylist path; reword recommendation to target auto_improves area';
      break;
    case 'EDIT_DESTRUCTIVE_REWRITE':
      // Pre-1.9 legacy code; kept for journal back-compat. Same hint as SPEC_VIOLATION.
      lesson.hint = 'LLM returned <50% of existing file content (PR #3/#4 pattern 2026-05-08). Reword recommendation with explicit "APPEND/INSERT only, preserve existing content" language. If the rewrite is intentional, set "replace_all": true on the edit in the plan. Watch for fabricated content (LLM may hallucinate prior history when rewriting).';
      break;
    case 'SPEC_VIOLATION':
      // Sprint 1.9.0 — generic spec-violation hint. The criterion id is in the
      // raw root_cause suffix (rawCode after `:`); a recall reader can drill
      // into the specific criterion if needed.
      lesson.hint = 'Per-kind acceptance criterion rejected the action. Read the criterion id from rawCode after the ":" suffix, then inspect bin/steward/_lib/action-kinds.cjs for that kind\'s acceptance_criteria[]. Most common: "no_destructive_rewrite" — set "replace_all": true on the edit OR reword the recommendation to APPEND/INSERT only.';
      break;
    case 'SPEC_PREDICATE_THREW':
      lesson.hint = 'A file_predicate criterion threw at runtime. Likely registry typo: predicate references a helper that does not exist (only touchedFiles, fileSize, fileExists, fileContent, prevSize, edits, plan are in scope) or has a syntax error that compiled but threw on call. Read action-kinds.cjs predicate strings.';
      break;
    case 'SPEC_SHELL_TIMEOUT':
      lesson.hint = 'A shell criterion exceeded timeoutMs. Either the cmd genuinely runs too long (raise timeoutMs in the criterion, max 5min) OR the shell is hung (no stdout). Try the cmd manually outside Hermes to confirm.';
      break;
    case 'SPEC_REGEX_NO_MATCH':
      lesson.hint = 'A regex criterion required a pattern that the post-edit file did not contain. Either the LLM removed the matched content (regression) or the criterion pattern needs updating to reflect the new file shape.';
      break;
    case 'SPEC_OVERRIDE_REJECTED':
      lesson.hint = 'A plan-level override tried to weaken a registry criterion (severity downgrade or kind change). Plan overrides may only ADD criteria or strengthen existing ones (warn → block). Remove the conflicting override from plan.acceptance_criteria.';
      break;
    case 'SPEC_MALFORMED':
      lesson.hint = 'Registry typo or unknown action_kind. Run the contract test (tests/contract/action-kinds-acceptance.test.cjs) to surface the exact malformed criterion. Common: missing kind-specific field (cmd for shell, predicate for file_predicate, pattern for regex, ears for ears_text).';
      break;
    case 'SPEC_LLM_JUDGE_NOT_IMPLEMENTED':
      lesson.hint = 'kind: "llm_judge" is reserved for v2.0+ and throws at runtime. Remove the criterion from action-kinds.cjs or downgrade to a deterministic kind (shell / file_predicate / regex).';
      break;
    case 'NPM_TEST_FAILED':
      lesson.hint = 'Verifier rejected; LLM produced syntactically valid but semantically broken code';
      break;
    case 'BUDGET_CAP_REACHED':
      lesson.hint = 'Daily $5 spend cap exceeded; raise HERMES_DAILY_USD_CAP or wait for UTC midnight reset';
      break;
    case 'FAILURE_BREAKER_TRIPPED':
      lesson.hint = 'Same action_key failed 3+ times within 1h window; manual investigation required';
      break;
    default:
      lesson.hint = null;
  }
  return lesson;
}

module.exports = {
  recordLesson,
  readAllLessons,
  recallLessons,
  recallLessonsFTS,
  scoreLesson,
  formatLessonsForPrompt,
  lessonFromExecuteResult,
  lessonsPath,
  // Sprint 2.8.1 hardening (R2 retro H5): SSOT impact classifier exported
  // for tests + future cross-module consumers.
  IMPACT_CLASSIFIER,
  classifyImpact,
};
