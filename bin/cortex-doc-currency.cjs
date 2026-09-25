#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
'use strict';

// bin/cortex-doc-currency.cjs — Sprint 2.46.2 hand-prose currency linter.
//
// Companion to bin/cortex-doc-regen.cjs (which manages BEGIN/END marker
// blocks). cortex-doc-currency.cjs lints hand-written prose around those
// blocks for stale numeric claims like "20 CLIs" or "30 standards" that
// drift the moment a new CLI/standard lands, plus frontmatter expiry
// (last_human_review + cadence_days, explicit `expires`, `point_in_time`).
//
// SSOT for hand-prose currency convention: standards/documentation.md
//   § Hand-prose currency convention.
// SSOT for the BEGIN/END marker frame: standards/documentation.md
//   § State block convention.
//
// CLI:
//   node bin/cortex-doc-currency.cjs --check <file>...   # exit 0/1/2
//   node bin/cortex-doc-currency.cjs --json  <file>...   # machine output
//   node bin/cortex-doc-currency.cjs --apply <file>...   # rewrite stale digits
//   node bin/cortex-doc-currency.cjs --help              # usage
//
// --check exit codes:
//   0 — no findings, or only stale-soft warnings
//   1 — at least one HIGH (numeric-mismatch / expired-hard)
//   2 — only MEDIUM (expired-soft / qualifier-warn) and no HIGH
//   The CI lane runs `--check --strict` (HIGH-or-MEDIUM both fail with 1).
//
// Determinism contract:
//   The module body MUST NOT call Date.now(), new Date() with no args,
//   Math.random(), crypto.randomUUID(), crypto.randomBytes(), or
//   performance.now(). The reference instant arrives as the `refInstant`
//   parameter to every public function. main() reads it from
//   $CORTEX_LINT_NOW (ISO 8601). If neither flag nor env is set, main()
//   exits with code 2 — refuses to invent "now".
//
// Snapshot fetch:
//   lintFile + main fetch the live state snapshot by invoking
//   bin/cortex-doc-regen.cjs --json via spawnSync. If the binary is
//   missing (ENOENT) or the call fails (non-zero exit / unparseable
//   JSON), the linter FAILS OPEN — emits a `snapshot-unavailable`
//   advisory and skips numeric-claim checks (frontmatter expiry still
//   runs). Operator running the new doc shouldn't be blocked by a
//   regen-side bug.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// State-block marker frame (mirrors cortex-doc-regen.cjs LONG form).
// SSOT: standards/documentation.md § State block convention.
//
// Public regex for external callers (tests, downstream tooling).
// ---------------------------------------------------------------------------

const _STATE_BLOCK_RE = /<!--\s*BEGIN\s+cortex-x\s+[a-z0-9-]+\s+\(v\d+\)\s*-\s*managed\s+by\s+[a-z][a-z0-9-]*\s*-->[\s\S]*?<!--\s*END\s+cortex-x\s+[a-z0-9-]+\s*-->/g;

// ---------------------------------------------------------------------------
// Noun -> snapshot-key map.
// Only nouns listed here are linted — this is the closed-set whitelist that
// kills the "17 years of design experience" false-positive class.
// ---------------------------------------------------------------------------

const NOUN_TO_KEY = Object.freeze({
  'standards': 'standards',
  'action_kinds': 'action_kinds',
  'action kinds': 'action_kinds',
  // NOT bare 'tests'. The snapshot's `tests_total` counts test FILES
  // (tests/**/*.test.cjs), while every prose claim of the form "N tests" in
  // this repo means test CASES from `npm test` — two numbers an order of
  // magnitude apart. Mapping them produced a whole class of confidently
  // wrong HIGH findings ("3435 tests" -> "expected 165"), and `--apply`
  // would have rewritten correct prose into false prose. Only the explicitly
  // file-scoped phrasings map to this key.
  'test files': 'tests_total',
  'test file': 'tests_total',
  'capabilities': 'capabilities',
  // NOT bare 'agents' / 'skills' / 'profiles'. Surveyed every occurrence in
  // the linted corpus (CLAUDE.md + README.md + standards/**): all of them are
  // *concurrency* or *ecosystem* counts, never inventory —
  //   "3–5 agents"       = how many to fan out in a review pipeline
  //   "1000 agents"      = the runtime's per-run cap
  //   "3,984 skills"     = Snyk's ToxicSkills scan population
  //   "50 skills"        = a context-budget illustration
  //   "all 4 profiles"   = a policy allowance, not the profile count
  // Comparing those against the repo's own file counts produced 14 confidently
  // wrong HIGH findings. Authoritative inventory counts belong in cortex-doc-regen
  // marker blocks, which are regenerated rather than linted.
  'CLIs': 'clis',
  'clis': 'clis',
  'shims': 'shims',
  'sprints': 'sprints',
  'workflows': 'workflows',
  'criterion_kinds': 'criterion_kinds',
  'criterion kinds': 'criterion_kinds',
  'hooks': 'hooks',
  'prompts': 'prompts',
  'detectors': 'detectors',
});

const NOUN_ALTERNATION = Object.keys(NOUN_TO_KEY)
  .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .sort((a, b) => b.length - a.length)  // longest match wins ("action kinds" before "action")
  .join('|');

// Numeric claim regex — number (optional thousands separators) + optional `+`
// + whitespace + closed-set noun. `\b` anchors prevent partial-word hits.
const NUMERIC_CLAIM = new RegExp(
  '\\b(\\d{1,3}(?:[,.]\\d{3})*|\\d+)(\\+?)\\s+(' + NOUN_ALTERNATION + ')\\b',
  'gi'
);

// Trailing-qualifier scan — looks BACK from the claim's start position.
const QUALIFIER_RE = /\b(approximately|around|roughly|about|over|more\s+than|nearly|~)\s*$/i;

// Negative context — the digit names a rule tier, not a quantity.
// Matches the run-up of "Rule 1 standards" and "Rule 2/3 standards".
const RULE_TIER_PREFIX_RE = /\bRule\s+[\d./]*$/i;

// Negative context — the digit is the tail of a dotted section number, as in
// "### 5.1 Standards by tier" or "### 9.2 Detectors".
const SECTION_NUMBER_PREFIX_RE = /\d\.$/;

// Allowlist comment markers (HTML-comment form, ESLint-aligned).
const ALLOWLIST_NEXT_LINE = /<!--\s*doc-currency-disable-next-line\s*-->/;
const ALLOWLIST_DISABLE = /<!--\s*doc-currency-disable\s*-->/;
const ALLOWLIST_ENABLE = /<!--\s*doc-currency-enable\s*-->/;

// Path-based cadence defaults (days). Matched as path substring.
const CADENCE_BY_PATH = Object.freeze([
  { match: 'runbooks/', days: 30 },
  { match: 'cortex/atlas-', days: 30 },
  { match: 'cortex/capability-tree-', days: 30 },
  { match: 'prompts/', days: 60 },
  { match: 'standards/', days: 90 },
]);
const DEFAULT_CADENCE_DAYS = 180;
const GRACE_DAYS = 14;
const QUALIFIER_TOLERANCE_PCT = 15;

// ---------------------------------------------------------------------------
// Frontmatter parsing (minimal YAML subset — key: value, no nesting).
// ---------------------------------------------------------------------------

function parseFrontmatter(content) {
  // Strip a leading BOM defensively.
  const text = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  if (!text.startsWith('---')) {
    return { data: {}, bodyOffset: 0 };
  }
  // Find the closing --- on its own line.
  const closing = text.indexOf('\n---', 3);
  if (closing === -1) {
    return { data: {}, bodyOffset: 0 };
  }
  const block = text.slice(3, closing);
  const data = {};
  const lines = block.split(/\r?\n/);

  // Block-scalar tracking. Without this, `purpose: |` followed by indented
  // prose parses every continuation line as its own key — so a doc whose
  // description happens to contain a line like "expires: 2027-01-01" would
  // silently gain that key and switch off its own expiry enforcement. That is
  // a fail-open on the ingest boundary of the gate itself, which is the one
  // place fail-open is not acceptable. `blockIndent` is the indentation of the
  // key that opened the scalar; anything more-indented belongs to its value.
  let blockIndent = null;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (line.trim().length === 0 || line.trim().startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    if (blockIndent !== null) {
      if (indent > blockIndent) continue;   // still inside the scalar's value
      blockIndent = null;                    // dedented back out — resume parsing
    }

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();

    // `key: |`, `key: >`, and their chomping variants (|- |+ >- >+) open a
    // block scalar whose value is the indented lines that follow.
    if (/^[|>][-+]?$/.test(line.slice(idx + 1).trim())) {
      blockIndent = indent;
      continue;
    }
    let val = line.slice(idx + 1).trim();
    // Strip trailing comments.
    const hashIdx = val.indexOf(' #');
    if (hashIdx >= 0) val = val.slice(0, hashIdx).trim();
    // Strip surrounding quotes.
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Coerce true/false/numbers.
    if (val === 'true') { data[key] = true; continue; }
    if (val === 'false') { data[key] = false; continue; }
    if (/^-?\d+(\.\d+)?$/.test(val)) { data[key] = Number(val); continue; }
    data[key] = val;
  }
  // bodyOffset = position past closing --- + newline.
  const bodyOffset = closing + 4;  // '\n---' (4 chars)
  // Skip trailing newline after closing fence.
  const afterFence = text.slice(bodyOffset);
  const nlMatch = afterFence.match(/^\r?\n/);
  return { data, bodyOffset: bodyOffset + (nlMatch ? nlMatch[0].length : 0) };
}

// ---------------------------------------------------------------------------
// Date helpers (deterministic — no argless Date constructors).
// ---------------------------------------------------------------------------

function parseIsoDate(s) {
  if (typeof s !== 'string') return null;
  const trimmed = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return null;
  // Accept either YYYY-MM-DD or full ISO timestamp.
  const iso = /T/.test(trimmed) ? trimmed : `${trimmed}T00:00:00Z`;
  const d = new Date(iso);  // single-arg ctor — deterministic given input
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function daysBetween(later, earlier) {
  const ms = later.getTime() - earlier.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function defaultCadenceForPath(filePath) {
  const norm = String(filePath || '').replace(/\\/g, '/');
  for (const entry of CADENCE_BY_PATH) {
    if (norm.includes(entry.match)) return entry.days;
  }
  return DEFAULT_CADENCE_DAYS;
}

// ---------------------------------------------------------------------------
// checkExpiry — frontmatter -> expiry verdict.
// ---------------------------------------------------------------------------

function checkExpiry(frontmatter, refInstant, opts) {
  const o = opts || {};
  const fm = frontmatter || {};
  const ref = refInstant instanceof Date ? refInstant : parseIsoDate(refInstant);
  if (!ref) {
    return { state: 'silent', findings: [] };
  }

  // point_in_time: true => never expires, never lints claims.
  if (fm.point_in_time === true) {
    return { state: 'silent', findings: [], pointInTime: true };
  }

  // Blanket waiver until a future date.
  if (fm.doc_currency_waive_until) {
    const waiveUntil = parseIsoDate(fm.doc_currency_waive_until);
    if (waiveUntil && ref.getTime() <= waiveUntil.getTime()) {
      return { state: 'silent', findings: [], waived: true };
    }
  }

  // Compute expiry date.
  let expiry = null;
  let source = null;
  if (fm.expires) {
    expiry = parseIsoDate(fm.expires);
    source = 'expires';
  } else if (fm.last_human_review) {
    const reviewed = parseIsoDate(fm.last_human_review);
    if (reviewed) {
      const cadence = (typeof fm.cadence_days === 'number' && fm.cadence_days > 0)
        ? fm.cadence_days
        : (o.cadenceDays > 0 ? o.cadenceDays : defaultCadenceForPath(o.filePath || ''));
      expiry = new Date(reviewed.getTime() + cadence * 24 * 60 * 60 * 1000);
      source = 'last_human_review+cadence';
    }
  }

  if (!expiry) {
    // No opt-in field present — silent.
    return { state: 'silent', findings: [] };
  }

  const daysOverdue = daysBetween(ref, expiry);
  const grace = (typeof o.graceDays === 'number') ? o.graceDays : GRACE_DAYS;

  if (daysOverdue <= 0) {
    // Within window. Warn if within 7 days of expiring.
    if (daysOverdue >= -7) {
      return {
        state: 'green',
        daysOverdue,
        findings: [{
          ruleId: 'doc-currency/expiring-soon',
          severity: 1,
          message: `Document expires in ${-daysOverdue} day(s) (source: ${source}).`,
          source,
          daysOverdue,
        }],
      };
    }
    return { state: 'green', daysOverdue, findings: [] };
  }
  if (daysOverdue <= grace) {
    return {
      state: 'yellow',
      daysOverdue,
      findings: [{
        ruleId: 'doc-currency/expired-soft',
        severity: 1,
        message: `Document expired ${daysOverdue} day(s) ago, within ${grace}-day grace (source: ${source}).`,
        source,
        daysOverdue,
      }],
    };
  }
  return {
    state: 'red',
    daysOverdue,
    findings: [{
      ruleId: 'doc-currency/expired-hard',
      severity: 2,
      message: `Document expired ${daysOverdue} day(s) ago, past ${grace}-day grace (source: ${source}).`,
      source,
      daysOverdue,
    }],
  };
}

// ---------------------------------------------------------------------------
// detectClaims — scan content for `<digits>+? <noun>` claims, skipping
// excluded regions (BEGIN/END marker blocks, code fences, inline code,
// frontmatter, allowlist-disabled spans).
// ---------------------------------------------------------------------------

function _findMarkerBlockSpans(content) {
  const spans = [];
  // Reset regex state with a fresh RegExp.
  const re = new RegExp(_STATE_BLOCK_RE.source, 'g');
  let m;
  while ((m = re.exec(content)) !== null) {
    spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function _findFrontmatterSpan(content) {
  const text = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  if (!text.startsWith('---')) return null;
  const closing = text.indexOf('\n---', 3);
  if (closing === -1) return null;
  // Include the trailing newline after the closing fence.
  let end = closing + 4;
  const tail = text.slice(end);
  const nlMatch = tail.match(/^\r?\n/);
  if (nlMatch) end += nlMatch[0].length;
  return [0, end];
}

function _findCodeFenceSpans(content) {
  // Triple-backtick fences spanning lines.
  const spans = [];
  const re = /```/g;
  let m;
  const positions = [];
  while ((m = re.exec(content)) !== null) {
    positions.push(m.index);
  }
  for (let i = 0; i + 1 < positions.length; i += 2) {
    // Include the fence markers themselves in the span.
    const startFence = positions[i];
    const endFence = positions[i + 1] + 3;
    spans.push([startFence, endFence]);
  }
  return spans;
}

function _findInlineCodeSpans(content) {
  const spans = [];
  // Match `...` within a single line, non-greedy. Avoid eating fences.
  const re = /`([^`\n]+)`/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function _findAllowlistSpans(content) {
  // doc-currency-disable ... doc-currency-enable spans (block form).
  const spans = [];
  const disableRe = /<!--\s*doc-currency-disable\s*-->/g;
  const enableRe = /<!--\s*doc-currency-enable\s*-->/g;
  let disable;
  while ((disable = disableRe.exec(content)) !== null) {
    const startScan = disable.index + disable[0].length;
    enableRe.lastIndex = startScan;
    const enable = enableRe.exec(content);
    const end = enable ? enable.index + enable[0].length : content.length;
    spans.push([disable.index, end]);
  }
  return spans;
}

function _isInsideAny(offset, spans) {
  for (const [s, e] of spans) {
    if (offset >= s && offset < e) return true;
  }
  return false;
}

function _isDisabledLine(content, offsetOfClaim) {
  // Find the line containing the claim, then look at the preceding line for
  // a doc-currency-disable-next-line comment.
  const lineStart = content.lastIndexOf('\n', offsetOfClaim - 1) + 1;
  if (lineStart === 0) return false;
  const prevLineEnd = lineStart - 1;
  const prevLineStart = content.lastIndexOf('\n', prevLineEnd - 1) + 1;
  const prevLine = content.slice(prevLineStart, prevLineEnd);
  return ALLOWLIST_NEXT_LINE.test(prevLine);
}

function detectClaims(content) {
  if (typeof content !== 'string' || content.length === 0) return [];

  const excludeSpans = [].concat(
    _findFrontmatterSpan(content) ? [_findFrontmatterSpan(content)] : [],
    _findMarkerBlockSpans(content),
    _findCodeFenceSpans(content),
    _findInlineCodeSpans(content),
    _findAllowlistSpans(content)
  );

  const claims = [];
  const re = new RegExp(NUMERIC_CLAIM.source, 'gi');
  let m;
  while ((m = re.exec(content)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (_isInsideAny(start, excludeSpans)) continue;
    if (_isDisabledLine(content, start)) continue;

    const rawValue = m[1].replace(/[,.]/g, '');
    const value = parseInt(rawValue, 10);
    if (!Number.isFinite(value)) continue;
    const trailingPlus = m[2] === '+';
    // Normalize noun spelling: collapse internal whitespace, leave case for lookup.
    const nounRaw = m[3];
    const nounNorm = nounRaw.replace(/\s+/g, ' ');
    // Lookup is case-insensitive — try direct, then lowercase, then specific-case.
    let snapKey = NOUN_TO_KEY[nounNorm];
    if (!snapKey) snapKey = NOUN_TO_KEY[nounNorm.toLowerCase()];
    if (!snapKey) {
      // CLIs vs clis (case-sensitive key set has both — but lowercase fallback covers it).
      continue;
    }

    // Look BACK at the text immediately preceding the match for a qualifier.
    // Scan up to 32 chars back, but never cross a newline.
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const scanStart = Math.max(lineStart, start - 32);
    const preceding = content.slice(scanStart, start);

    // Dotted section numbers: "### 5.1 Standards by tier", "### 9.2 Detectors".
    // The regex sees the fractional part as the quantity and the heading text
    // as the noun. Any digit run directly preceded by `<digit>.` is part of a
    // numbering scheme, never a count.
    if (SECTION_NUMBER_PREFIX_RE.test(preceding)) continue;

    // "Rule 1 standards" / "Rule 2/3 standards" name a TIER, not a count —
    // the digit belongs to the rule number, and the noun just follows it.
    // Without this guard the tier hierarchy (the most-cited concept in these
    // docs) reads as a stale inventory claim on every mention.
    if (RULE_TIER_PREFIX_RE.test(preceding)) continue;

    const qmatch = preceding.match(QUALIFIER_RE);
    // Sprint 2.46.2 R2 fix HIGH (edge-case-hunter): when only a trailing `+`
    // is present (no preceding "over"/"about"/"~"/etc.), leave qualifier=null
    // so the `claim.trailingPlus && !claim.qualifier` branch in _claimPasses
    // fires (passes if actual >= claimed). The original `(trailingPlus ? '+'
    // : null)` fallback set qualifier='+' which is not in lowerCount /
    // approxCount enums and triggered the exact-match fallthrough — "30+
    // standards" with actual 34 was wrongly flagged as a mismatch.
    const qualifier = qmatch ? qmatch[1].toLowerCase().replace(/\s+/g, ' ') : null;

    // Compute line/column (1-based).
    let line = 1;
    let lineOffset = 0;
    for (let i = 0; i < start; i++) {
      if (content.charCodeAt(i) === 10) {
        line++;
        lineOffset = i + 1;
      }
    }
    const column = start - lineOffset + 1;
    const endColumn = column + (end - start);

    claims.push({
      noun: nounNorm,
      snapshotKey: snapKey,
      value,
      qualifier,
      trailingPlus,
      offset: start,
      endOffset: end,
      line,
      column,
      endColumn,
      raw: m[0],
      rawDigits: m[1],
    });
  }
  return claims;
}

// ---------------------------------------------------------------------------
// lintFile — orchestrates frontmatter expiry + numeric claims.
// ---------------------------------------------------------------------------

function lintFile(filePath, snapshotJson, refInstant, opts) {
  const o = opts || {};
  const fileContent = typeof o.contentOverride === 'string'
    ? o.contentOverride
    : _safeRead(filePath);
  if (fileContent === null) {
    return {
      filePath,
      findings: [],
      expiry: { state: 'silent', findings: [] },
      error: 'file-unreadable',
    };
  }

  const { data: frontmatter } = parseFrontmatter(fileContent);
  const expiry = checkExpiry(frontmatter, refInstant, {
    filePath,
    cadenceDays: typeof frontmatter.cadence_days === 'number' ? frontmatter.cadence_days : undefined,
  });

  const findings = [];

  // Skip claim lint if point_in_time / doc_currency_disable / blanket waiver.
  const claimLintDisabled =
    frontmatter.point_in_time === true ||
    frontmatter.doc_currency_disable === true ||
    expiry.waived === true;

  let claims = [];
  if (!claimLintDisabled) {
    claims = detectClaims(fileContent);
  }

  // Compare each claim against snapshot.
  const snap = snapshotJson && typeof snapshotJson === 'object' ? snapshotJson : null;
  const counts = snap && snap.counts && typeof snap.counts === 'object' ? snap.counts : null;
  // Tests also accept a flat key-value snapshot.
  const flatLookup = (key) => {
    if (counts && key in counts) return counts[key];
    if (snap && key in snap) return snap[key];
    return undefined;
  };

  if (!claimLintDisabled) {
    if (counts === null && snap !== null && Object.keys(snap).length === 0) {
      // empty snapshot — fail-open: emit advisory, skip claim checks.
      findings.push({
        ruleId: 'doc-currency/snapshot-unavailable',
        severity: 1,
        message: 'No snapshot data — claim checks skipped.',
      });
    } else if (snap === null) {
      findings.push({
        ruleId: 'doc-currency/snapshot-unavailable',
        severity: 1,
        message: 'No snapshot data — claim checks skipped.',
      });
    } else {
      for (const claim of claims) {
        const actual = flatLookup(claim.snapshotKey);
        if (typeof actual !== 'number') continue;  // unknown noun -> silent
        const passes = _claimPasses(claim, actual);
        if (passes.ok) continue;
        findings.push({
          ruleId: 'doc-currency/numeric-mismatch',
          severity: passes.severity,
          line: claim.line,
          column: claim.column,
          endLine: claim.line,
          endColumn: claim.endColumn,
          noun: claim.noun,
          claim: claim.raw,
          qualifier: claim.qualifier,
          expected: actual,
          actual: claim.value,
          source: `snapshot:${claim.snapshotKey}`,
          message: `Prose claims ${claim.value} ${claim.noun}; snapshot reports ${actual}.`,
          offset: claim.offset,
          endOffset: claim.endOffset,
          rawDigits: claim.rawDigits,
        });
      }
    }
  }

  // Append expiry findings.
  for (const f of expiry.findings) {
    findings.push(f);
  }

  // Sort findings: by offset (if present), then ruleId.
  findings.sort((a, b) => {
    const ao = typeof a.offset === 'number' ? a.offset : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.offset === 'number' ? b.offset : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (a.ruleId || '').localeCompare(b.ruleId || '');
  });

  return { filePath, findings, expiry };
}

function _claimPasses(claim, actual) {
  // Bare claim (no qualifier, no +): must exact-match.
  if (!claim.qualifier && !claim.trailingPlus) {
    if (claim.value === actual) return { ok: true };
    return { ok: false, severity: 2 };
  }
  // Qualified ">=" forms ("over X", "more than X", "X+").
  const lowerCount = ['over', 'more than', 'more  than'];
  const approxCount = ['approximately', 'around', 'roughly', 'about', 'nearly', '~'];

  if (claim.qualifier && lowerCount.includes(claim.qualifier)) {
    // "over 30 standards" — passes if actual >= 30 (>= claim.value).
    if (actual >= claim.value) return { ok: true };
    return { ok: false, severity: 2 };
  }
  if (claim.trailingPlus && !claim.qualifier) {
    // "30+ standards" — passes if actual >= 30.
    if (actual >= claim.value) return { ok: true };
    // 5+ under floor = severity 1, otherwise 2.
    return { ok: false, severity: (claim.value - actual) >= 5 ? 2 : 1 };
  }
  if (claim.qualifier && approxCount.includes(claim.qualifier)) {
    // "approximately 30 standards" — passes within +-15% tolerance.
    const tolerance = Math.max(1, Math.ceil(claim.value * (QUALIFIER_TOLERANCE_PCT / 100)));
    if (Math.abs(actual - claim.value) <= tolerance) return { ok: true };
    return { ok: false, severity: 1 };
  }
  // Default fall-through: treat as exact.
  if (claim.value === actual) return { ok: true };
  return { ok: false, severity: 2 };
}

function _safeRead(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Snapshot fetch — invokes cortex-doc-regen.cjs --json. Fail-open.
// ---------------------------------------------------------------------------

function _fetchSnapshot(opts) {
  const o = opts || {};
  const regenPath = o.regenPath || path.resolve(__dirname, 'cortex-doc-regen.cjs');
  if (!fs.existsSync(regenPath)) {
    return { snapshot: null, error: 'snapshot-binary-missing', path: regenPath };
  }
  try {
    const stdout = execFileSync(process.execPath, [regenPath, '--json'], {
      encoding: 'utf8',
      timeout: 30 * 1000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    const parsed = JSON.parse(stdout);
    // Snapshot may be at top level or nested under .snapshot.
    const snap = parsed && parsed.snapshot && typeof parsed.snapshot === 'object'
      ? parsed.snapshot
      : parsed;
    return { snapshot: snap, error: null };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { snapshot: null, error: 'snapshot-binary-missing' };
    }
    return { snapshot: null, error: `snapshot-fetch-failed: ${err && err.message}` };
  }
}

// ---------------------------------------------------------------------------
// --apply substitution: rewrite digits ONLY for numeric-mismatch findings.
// Idempotent (re-run with no changes is a no-op).
// ---------------------------------------------------------------------------

function _applyDigitSubstitutions(originalContent, findings) {
  const subs = findings
    .filter((f) => f.ruleId === 'doc-currency/numeric-mismatch'
      && typeof f.offset === 'number'
      && typeof f.expected === 'number'
      && typeof f.rawDigits === 'string')
    .slice()
    .sort((a, b) => b.offset - a.offset);  // apply right-to-left to keep offsets valid

  let content = originalContent;
  let applied = 0;
  for (const f of subs) {
    const newDigits = String(f.expected);
    const before = content.slice(0, f.offset);
    const span = content.slice(f.offset, f.endOffset);
    const after = content.slice(f.endOffset);
    // Replace ONLY the leading digit run in `span`, preserving qualifier/noun/suffix.
    const newSpan = span.replace(f.rawDigits, newDigits);
    if (newSpan === span) continue;
    content = before + newSpan + after;
    applied++;
  }
  return { content, applied };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function _showHelp() {
  process.stdout.write(`Usage: cortex-doc-currency [options] [file...]

Sprint 2.46.2 hand-prose currency linter. Companion to cortex-doc-regen
(which manages BEGIN/END marker blocks). cortex-doc-currency lints
hand-written prose around those blocks for stale numeric claims and
frontmatter expiry.

Options:
  --check         Default mode. Exit 0 clean, 1 HIGH, 2 only MEDIUM.
  --json          Emit JSON findings array. Exit 0 regardless.
  --apply         Substitute stale digits in-place. Idempotent.
  --strict        With --check: any finding -> exit 1.
  --help, -h      Show this help.

Environment:
  CORTEX_LINT_NOW           ISO 8601 reference instant (required).
  CORTEX_DOC_LINT_DISABLED  When = "1", lint is a no-op (exit 0).

Exit codes:
  0   no findings, or only MEDIUM with default mode
  1   HIGH findings, or any finding with --strict
  2   tool failure (no reference instant, etc)
`);
}

function _splitArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set();
  const files = [];
  let nowOverride = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') { flags.add('help'); continue; }
    if (a === '--check') { flags.add('check'); continue; }
    if (a === '--json') { flags.add('json'); continue; }
    if (a === '--apply') { flags.add('apply'); continue; }
    if (a === '--strict') { flags.add('strict'); continue; }
    if (a === '--now') { nowOverride = args[++i] || null; continue; }
    if (a.startsWith('--now=')) { nowOverride = a.slice(6); continue; }
    if (a.startsWith('--')) continue;  // unknown flag -> ignore
    files.push(a);
  }
  return { flags, files, nowOverride };
}

function main(argv) {
  if (process.env.CORTEX_DOC_LINT_DISABLED === '1') {
    return 0;
  }
  const { flags, files, nowOverride } = _splitArgs(argv);
  if (flags.has('help')) { _showHelp(); return 0; }

  // Determine mode (default = check).
  let mode = 'check';
  if (flags.has('json')) mode = 'json';
  else if (flags.has('apply')) mode = 'apply';
  else if (flags.has('check')) mode = 'check';

  // Reference instant — required.
  const nowIso = nowOverride || process.env.CORTEX_LINT_NOW || null;
  if (!nowIso) {
    process.stderr.write('cortex-doc-currency: missing reference instant. Set --now=<iso> or $CORTEX_LINT_NOW.\n');
    return 2;
  }
  const refInstant = parseIsoDate(nowIso);
  if (!refInstant) {
    process.stderr.write(`cortex-doc-currency: invalid ISO date: ${nowIso}\n`);
    return 2;
  }

  if (files.length === 0) {
    process.stderr.write('cortex-doc-currency: no input files. Pass one or more markdown paths.\n');
    return 2;
  }

  const { snapshot, error: snapErr } = _fetchSnapshot({});
  // Fail-open on snapshot fetch error — frontmatter expiry still runs.

  const allResults = [];
  let highCount = 0;
  let mediumCount = 0;
  for (const f of files) {
    const result = lintFile(f, snapshot, refInstant, {});
    if (snapErr && snapshot === null) {
      result.findings.unshift({
        ruleId: 'doc-currency/snapshot-unavailable',
        severity: 1,
        message: `Snapshot fetch failed: ${snapErr}. Numeric-claim checks skipped.`,
      });
    }
    for (const finding of result.findings) {
      if (finding.severity === 2) highCount++;
      else if (finding.severity === 1) mediumCount++;
    }
    allResults.push(result);

    if (mode === 'apply') {
      const original = _safeRead(f);
      if (original !== null) {
        const { content, applied } = _applyDigitSubstitutions(original, result.findings);
        if (applied > 0 && content !== original) {
          try { fs.writeFileSync(f, content); } catch (err) {
            process.stderr.write(`cortex-doc-currency: write failed for ${f}: ${err && err.message}\n`);
          }
        }
      }
    }
  }

  if (mode === 'json') {
    const payload = {
      version: '1',
      summary: { files: files.length, high: highCount, medium: mediumCount },
      results: allResults,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return 0;
  }

  // stylish output for --check / --apply.
  for (const r of allResults) {
    if (r.findings.length === 0) continue;
    process.stdout.write(`\n${r.filePath}\n`);
    for (const f of r.findings) {
      const sev = f.severity === 2 ? 'error' : 'warn ';
      const loc = (f.line && f.column) ? `${f.line}:${f.column}` : '';
      process.stdout.write(`  ${sev}  ${loc.padEnd(8)}  ${f.message}  ${f.ruleId}\n`);
    }
  }

  if (flags.has('strict')) {
    return (highCount + mediumCount) > 0 ? 1 : 0;
  }
  if (highCount > 0) return 1;
  if (mediumCount > 0) return 2;
  return 0;
}

if (require.main === module) {
  let code = 0;
  try {
    code = main(process.argv) || 0;
  } catch (err) {
    process.stderr.write(`cortex-doc-currency: fatal: ${err && err.message}\n`);
    code = 2;
  }
  process.exit(code);
}

module.exports = {
  lintFile,
  detectClaims,
  checkExpiry,
  parseFrontmatter,
  main,
  _STATE_BLOCK_RE,
  _applyDigitSubstitutions,
  _fetchSnapshot,
};
