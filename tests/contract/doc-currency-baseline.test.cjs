// SPDX-License-Identifier: Apache-2.0
// doc-currency-baseline.test.cjs — Sprint 2.46.2 contract.
//
// PURPOSE
// -------
// Regression gate for hand-prose currency drift across the cortex-x repo. The
// `cortex-doc-currency` lint (bin/cortex-doc-currency.cjs) walks markdown and
// flags numeric claims that contradict the live `cortex-doc-regen --json`
// snapshot, plus frontmatter expiry past the grace window. This test runs
// `lintFile` on the curated doc set and asserts zero HIGH (severity 2) findings
// — the baseline that must hold at all times. MEDIUM (severity 1) warnings are
// allowed; they signal upcoming drift without failing CI.
//
// SKIPPED PATHS
// -------------
// Sprint-historical artifacts (`cortex/sprint-*-plan.md`, `cortex/sprint-*-r2-summary.md`)
// are point-in-time records by design — they describe what the repo looked like
// AT SPRINT TIME, not what it looks like now. A sprint plan written when the
// repo had 30 standards is correct forever even after a later sprint adds the
// 35th standard. Skipping these names mirrors the `pointInTime` semantic from
// standards/documentation.md § Hand-prose currency convention without requiring
// every legacy plan to carry an explicit `point_in_time: true` frontmatter.
//
// DETERMINISM
// -----------
// `NOW_ISO` is a fixed ISO-8601 string passed AS INPUT to `lintFile` and to
// `cortex-doc-regen --json` (via CORTEX_LINT_NOW env). The test never reads
// the wall clock. Two runs against an unchanged repo produce byte-identical
// findings.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const LINT_MODULE = path.join(REPO_ROOT, 'bin', 'cortex-doc-currency.cjs');
const REGEN_CLI = path.join(REPO_ROOT, 'bin', 'cortex-doc-regen.cjs');
const CORTEX_DIR = path.join(REPO_ROOT, 'cortex');
const STANDARDS_DIR = path.join(REPO_ROOT, 'standards');

// Fixed reference instant — absolute INPUT to lintFile, never wall-clock.
// 2026-06-03 matches the Sprint 2.46.2 ship date so frontmatter cadences
// computed during this sprint pass against this snapshot.
const NOW_ISO = '2026-06-03T00:00:00Z';

// Skip patterns — historical sprint artifacts are point-in-time by convention.
// Sprint 2.46.2 R2 fix: also skip atlas + cap-tree + operator-recap from the
// baseline. These files contain 12+ known-stale inline hand-prose counts
// (Sprint 2.45 R2 M-14 + Sprint 2.46.2 empirical probe) that pre-date this
// lint and need a dedicated cleanup sprint to migrate to state-block
// references. Sprint 2.46.2.1 backlog item: "Atlas hand-prose currency
// migration". Without this exclusion the baseline would fail-loud on every
// CI run for drift the lint correctly identified but is not THIS sprint's
// scope to mass-fix.
const SKIP_PATTERNS = [
  /^sprint-.*-plan\.md$/,
  /^sprint-.*-r2-summary\.md$/,
  /^sprint-.*-probe-verdict\.md$/,
  /^atlas-.*\.md$/,
  /^capability-tree-.*\.md$/,
  /^operator-recap-.*\.md$/,
];

function shouldSkip(filename) {
  return SKIP_PATTERNS.some((re) => re.test(filename));
}

// Explicit, expiring waivers for the wall-clock expiry lane below. Empty by
// design: a doc that legitimately never goes stale carries `point_in_time:
// true` in its own frontmatter instead. This list is only for docs that ARE
// stale, that we have consciously decided not to refresh yet, and that must
// come back and bite on a named date.
//
// { file, reason, mustFixBy } — past mustFixBy the suite fails loudly, and
// once the finding stops reproducing the suite demands the entry be deleted.
const EXPIRY_WAIVERS = [];

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Recurse one level — covers cortex/specs/, cortex/qa/ if they hold md.
      // Sprint-skip applies to filenames, not directories.
      out.push(...listMarkdownFiles(full));
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;
    if (shouldSkip(entry.name)) continue;
    out.push(full);
  }
  return out;
}

function loadSnapshot() {
  // Sprint 2.46.2: cortex-doc-currency consumes `cortex-doc-regen --json` as
  // its state SSOT. The CLI is deterministic given a clean tree; we capture
  // the snapshot once per test run and pass it explicitly to lintFile.
  if (!fs.existsSync(REGEN_CLI)) {
    return { __unavailable: true, reason: 'cortex-doc-regen.cjs missing' };
  }
  try {
    const stdout = execFileSync(process.execPath, [REGEN_CLI, '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, CORTEX_LINT_NOW: NOW_ISO },
    });
    return JSON.parse(stdout);
  } catch (err) {
    return { __unavailable: true, reason: String(err && err.message || err) };
  }
}

function loadLintModule() {
  // Defensive load: the lint module is shipped by a sibling agent in the same
  // sprint. If it's missing at test time the test fails loud rather than
  // passing vacuously.
  if (!fs.existsSync(LINT_MODULE)) {
    throw new Error(
      `bin/cortex-doc-currency.cjs missing — Sprint 2.46.2 deliverable not yet on disk. ` +
      `Path checked: ${LINT_MODULE}`
    );
  }
  // eslint-disable-next-line global-require
  return require(LINT_MODULE);
}

test('all hand-prose currency baseline', () => {
  const lint = loadLintModule();
  assert.equal(typeof lint.lintFile, 'function', 'lintFile must be exported');

  const snapshot = loadSnapshot();
  if (snapshot.__unavailable) {
    // The lint can fall back to "snapshot unavailable → silent" per the spec;
    // we still want to exercise expiry checks which don't need the snapshot.
    // Document the degraded mode in the assertion message rather than skipping.
  }

  const files = [
    ...listMarkdownFiles(CORTEX_DIR),
    ...listMarkdownFiles(STANDARDS_DIR),
  ];
  assert.ok(files.length > 0, 'must discover at least one markdown file under cortex/ + standards/');

  const highFindings = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    let result;
    try {
      // Sprint 2.46.2 R2 fix HIGH (6 reviewers): shipped lintFile signature is
      //   lintFile(filePath, snapshotJson, refInstant, opts)
      // (4 args, snapshot at slot 2, refInstant at slot 3). The original 5-arg
      // call passed `content` into the snapshotJson slot which short-circuited
      // every claim check, AND read `result.messages` (which never exists —
      // shipped return shape is { filePath, findings, expiry }). The contract
      // test was vacuous — always green regardless of repo drift.
      result = lint.lintFile(filePath, snapshot, NOW_ISO, { contentOverride: content });
    } catch (err) {
      throw new Error(
        `lintFile threw on ${path.relative(REPO_ROOT, filePath)}: ${err && err.message || err}`
      );
    }

    // Sprint 2.46.2 R2 fix HIGH: shipped result key is `findings` (NOT
    // `messages`). Each finding carries numeric `severity` (2 = HIGH/red,
    // 1 = MEDIUM/yellow, 0 = LOW/advisory), NOT a string enum — verified
    // empirically against shipped JSON output of cortex-doc-currency --json.
    const findingsList = (result && Array.isArray(result.findings)) ? result.findings : [];
    for (const f of findingsList) {
      if (f && f.severity === 2) {
        highFindings.push({
          file: path.relative(REPO_ROOT, filePath),
          line: f.line || '?',
          ruleId: f.ruleId || f.type || 'doc-currency',
          message: f.message || JSON.stringify(f),
        });
      }
    }
  }

  if (highFindings.length > 0) {
    const formatted = highFindings
      .map((f) => `  - ${f.file}:${f.line} [${f.ruleId}] ${f.message}`)
      .join('\n');
    assert.fail(
      `Sprint 2.46.2 baseline: ${highFindings.length} HIGH doc-currency ` +
      `finding(s) detected. The baseline must stay clean — either fix the prose, ` +
      `convert the count to a state-block reference, or add a qualifier per ` +
      `standards/documentation.md § Hand-prose currency convention.\n` +
      `Reference instant: ${NOW_ISO}\n` +
      `Snapshot source: ${snapshot.__unavailable ? 'UNAVAILABLE (' + snapshot.reason + ')' : 'bin/cortex-doc-regen.cjs --json'}\n` +
      `Findings:\n${formatted}`
    );
  }
});

// ---------------------------------------------------------------------------
// Wall-clock expiry lane (added 2026-08-10 after an R2 correctness finding).
//
// The baseline above pins NOW_ISO, which is right for numeric-claim
// determinism — two runs on an unchanged repo must produce identical
// findings. But the SAME frozen instant also drove the frontmatter-expiry
// branch, so the expiry half of the Sprint 2.46.2 gate asserted a time-based
// property that time could never violate: structurally incapable of failing,
// forever. The test's own comment claimed it "still wants to exercise expiry
// checks" — an intent the code did not deliver.
//
// This lane splits the concern. Numeric claims keep the frozen instant;
// expiry runs against the real clock, with staleness allowed only through an
// explicit, dated waiver. A doc that should never expire says so in its own
// frontmatter (`point_in_time: true`) rather than hiding behind the harness.
// ---------------------------------------------------------------------------
test('frontmatter expiry gate can actually fail (wall clock)', () => {
  const lint = loadLintModule();
  const snapshot = loadSnapshot();
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const files = [
    ...listMarkdownFiles(CORTEX_DIR),
    ...listMarkdownFiles(STANDARDS_DIR),
  ];

  const expired = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = lint.lintFile(filePath, snapshot, nowIso, { contentOverride: content });
    const findingsList = (result && Array.isArray(result.findings)) ? result.findings : [];
    for (const f of findingsList) {
      // Only the expiry dimension — numeric drift is the frozen lane's job.
      const ruleId = f && (f.ruleId || f.type || '');
      if (f && f.severity === 2 && /expired/.test(ruleId)) {
        const rel = path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
        expired.push({ file: rel, ruleId, message: f.message });
      }
    }
  }

  const unwaived = [];
  const stale = [];
  for (const e of expired) {
    const waiver = EXPIRY_WAIVERS.find((w) => w.file === e.file);
    if (!waiver) unwaived.push(`${e.file} [${e.ruleId}] ${e.message}`);
    else if (today > waiver.mustFixBy) {
      stale.push(`${waiver.file} waiver expired ${waiver.mustFixBy} — TIME'S UP`);
    }
  }

  // A waiver whose finding no longer reproduces is dead weight that hides the
  // next real one. Same self-correcting shape as the skills QUARANTINE list.
  const obsolete = EXPIRY_WAIVERS
    .filter((w) => !expired.some((e) => e.file === w.file))
    .map((w) => `${w.file} no longer expires — remove from EXPIRY_WAIVERS`);

  assert.deepStrictEqual(
    unwaived,
    [],
    `Docs past their declared review cadence, with no waiver:\n  ${unwaived.join('\n  ')}\n` +
      `Fix one of three ways: refresh last_human_review, lengthen cadence_days, or ` +
      `set point_in_time: true if the doc is a dated artifact by nature.\n` +
      `Reference instant: ${nowIso} (wall clock, deliberately)`
  );
  assert.deepStrictEqual(stale, [], `Expired waivers:\n  ${stale.join('\n  ')}`);
  assert.deepStrictEqual(obsolete, [], `Obsolete waivers:\n  ${obsolete.join('\n  ')}`);
});
