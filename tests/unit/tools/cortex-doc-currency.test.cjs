// SPDX-License-Identifier: Apache-2.0
'use strict';

/**
 * cortex-doc-currency.test.cjs
 *
 * Sprint 2.46.2 — unit tests for bin/cortex-doc-currency.cjs, the hand-prose
 * currency linter (companion to cortex-doc-regen.cjs).
 *
 * SSOT for hand-prose currency convention: standards/documentation.md
 *   § Hand-prose currency convention.
 *
 * Coverage map:
 *   T01 — detectClaims finds "20 CLIs" in hand-prose
 *   T02 — detectClaims ignores claims inside BEGIN/END marker
 *   T03 — detectClaims captures "approximately 20 CLIs" as qualified
 *   T04 — detectClaims handles multiple claims per line
 *   T05 — lintFile flags mismatched count as HIGH (severity 2)
 *   T06 — lintFile passes when count matches snapshot
 *   T07 — checkExpiry flags expired last_human_review (90-day cadence)
 *   T08 — checkExpiry flags explicit `expires` past reference instant
 *   T09 — checkExpiry honors point_in_time: true as never-expires
 *   T10 — checkExpiry warns expiring-soon within 7 days
 *   T11 — lintFile output deterministic (call twice with same inputs)
 *   T12 — CRLF input handled identically to LF (byte-equivalent findings)
 *   T13 — --apply substitutes digit ONLY (surrounding bytes identical)
 *   T14 — qualifier "over 30 standards" passes when actual >= 30
 *   T15 — claim inside inline code skipped
 */

const { describe, test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'bin', 'cortex-doc-currency.cjs');

const lib = require(SCRIPT);
const { lintFile, detectClaims, checkExpiry, parseFrontmatter } = lib;

const REF_ISO = '2026-06-03T00:00:00Z';
const REF_DATE = new Date(REF_ISO);

const TMP_DIRS = [];

function mkTmp(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cortex-doc-currency-${label}-`));
  TMP_DIRS.push(dir);
  return dir;
}

after(() => {
  for (const d of TMP_DIRS) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function writeFixture(label, name, content) {
  const dir = mkTmp(label);
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

const STATE_BEGIN = '<!-- BEGIN cortex-x state-snapshot (v1) - managed by cortex-doc-regen -->';
const STATE_END = '<!-- END cortex-x state-snapshot -->';

const SNAPSHOT = Object.freeze({
  counts: {
    skills: 8,
    agents: 14,
    clis: 22,           // production has 22 CLIs (>20 claim should be flagged when bare)
    standards: 34,
    prompts: 12,
    detectors: 7,
    workflows: 15,
    profiles: 9,
    tests_total: 2955,
  },
});

describe('cortex-doc-currency — detectClaims', () => {
  test('T01 — finds "20 CLIs" in hand-prose', () => {
    const content = 'cortex-x ships 20 CLIs across the bin/ directory.\n';
    const claims = detectClaims(content);
    assert.equal(claims.length, 1, `expected 1 claim, got ${claims.length}: ${JSON.stringify(claims)}`);
    assert.equal(claims[0].value, 20);
    assert.equal(claims[0].snapshotKey, 'clis');
    assert.equal(claims[0].qualifier, null);
  });

  test('T02 — ignores claims inside BEGIN/END marker block', () => {
    const content = [
      'Intro prose with no claim.',
      '',
      STATE_BEGIN,
      '- skills: 8',
      '- 30 standards',  // claim text inside marker -> MUST be skipped
      '- 22 CLIs',
      STATE_END,
      '',
      'Closing prose.',
    ].join('\n');
    const claims = detectClaims(content);
    assert.deepStrictEqual(claims, [], 'no claims should be detected inside marker block');
  });

  test('T03 — captures "approximately 20 CLIs" as qualified', () => {
    const content = 'There are approximately 20 CLIs in the bin/ tree.\n';
    const claims = detectClaims(content);
    assert.equal(claims.length, 1);
    assert.equal(claims[0].qualifier, 'approximately');
    assert.equal(claims[0].value, 20);
  });

  test('T04 — handles multiple claims per line', () => {
    const content = 'cortex-x has 8 prompts, 14 detectors, and 34 standards today.\n';
    const claims = detectClaims(content);
    assert.equal(claims.length, 3, `expected 3 claims, got ${claims.length}`);
    const keys = claims.map((c) => c.snapshotKey).sort();
    assert.deepStrictEqual(keys, ['detectors', 'prompts', 'standards']);
  });

  // --- 2026-08-10 precision pass -------------------------------------------
  // The lint reported 24 HIGH findings on its own corpus for two months and
  // none were actioned, because ~all of them were wrong. Each case below is
  // one false-positive class that was live in the shipped docs.

  test('T20 — bare "N tests" is not a claim (snapshot counts files, prose means cases)', () => {
    // "3435 tests" vs snapshot tests_total=165 — an order of magnitude apart.
    // `--apply` would have rewritten correct prose into false prose.
    assert.deepStrictEqual(detectClaims('the suite is at 3435 tests today.\n'), []);
  });

  test('T21 — explicit "N test files" still maps to tests_total', () => {
    const claims = detectClaims('the repo has 165 test files.\n');
    assert.equal(claims.length, 1);
    assert.equal(claims[0].snapshotKey, 'tests_total');
    assert.equal(claims[0].value, 165);
  });

  test('T22 — agents / skills / profiles are concurrency + ecosystem counts, not inventory', () => {
    for (const content of [
      'dispatch 3–5 agents in parallel for review.\n',
      'the runtime caps a run at 1000 agents.\n',
      'Snyk scanned 3,984 skills in the ToxicSkills audit.\n',
      '50 skills stay lazy in Level 0.\n',
      'all 4 profiles allowed for this kind.\n',
    ]) {
      assert.deepStrictEqual(detectClaims(content), [], `should not claim: ${content.trim()}`);
    }
  });

  test('T23 — "Rule N standards" names a tier, not a quantity', () => {
    assert.deepStrictEqual(detectClaims('Rule 1 standards (SSOT, Modular, Scalable).\n'), []);
    assert.deepStrictEqual(detectClaims('referenced from Rule 2/3 standards.\n'), []);
  });

  test('T24 — dotted section numbers are not quantities', () => {
    assert.deepStrictEqual(detectClaims('### 5.1 Standards by tier\n'), []);
    assert.deepStrictEqual(detectClaims('### 9.2 Detectors (deterministic probes)\n'), []);
  });

  test('T26 — block-scalar continuation lines cannot inject frontmatter keys', () => {
    // R2 correctness finding (2026-08-10): parseFrontmatter was a flat
    // `key: value` scanner, so `purpose: |` followed by indented prose turned
    // every continuation line into a key. A doc whose description happened to
    // contain "expires: <far future>" or "point_in_time: true" would silently
    // switch off its own expiry enforcement — fail-open on the ingest boundary
    // of the gate itself.
    const doc = [
      '---',
      'title: probe',
      'purpose: |',
      '  Refresh https://example.com/case-study before publishing',
      '  expires: 2099-01-01',
      '  point_in_time: true',
      'last_human_review: 2026-06-03',
      'cadence_days: 30',
      '---',
      'body',
    ].join('\n');

    const { data } = parseFrontmatter(doc);

    assert.equal('expires' in data, false, 'block-scalar line must not become an expires key');
    assert.equal('point_in_time' in data, false, 'block-scalar line must not become a point_in_time key');
    assert.equal('https' in data, false, 'a URL inside a block scalar must not become a key');

    // Real keys after the scalar still parse — the dedent must resume parsing.
    assert.equal(data.title, 'probe');
    assert.equal(data.last_human_review, '2026-06-03');
    assert.equal(data.cadence_days, 30);
  });

  test('T27 — folded and chomped block scalars are handled too', () => {
    for (const marker of ['>', '|-', '|+', '>-', '>+']) {
      const doc = ['---', `note: ${marker}`, '  expires: 2099-01-01', 'title: kept', '---', ''].join('\n');
      const { data } = parseFrontmatter(doc);
      assert.equal('expires' in data, false, `marker "${marker}" leaked a key`);
      assert.equal(data.title, 'kept', `marker "${marker}" swallowed the following key`);
    }
  });

  test('T25 — a real inventory claim still lints after all the guards', () => {
    const claims = detectClaims('cortex-x ships 30 standards across 5 tiers.\n');
    assert.equal(claims.length, 1);
    assert.equal(claims[0].snapshotKey, 'standards');
    assert.equal(claims[0].value, 30);
  });

  test('T15 — claim inside inline code is skipped', () => {
    const content = 'cortex-x docs note `20 CLIs` literal in a backticked span.\n';
    const claims = detectClaims(content);
    assert.deepStrictEqual(claims, []);
  });
});

describe('cortex-doc-currency — lintFile', () => {
  test('T05 — flags mismatched count as HIGH', () => {
    const content = 'cortex-x ships 30 standards across Rules 0-3.\n';
    const fp = writeFixture('t05', 'doc.md', content);
    const result = lintFile(fp, SNAPSHOT, REF_DATE, {});
    const numericFindings = result.findings.filter((f) => f.ruleId === 'doc-currency/numeric-mismatch');
    assert.equal(numericFindings.length, 1, `expected 1 numeric finding, got ${result.findings.length}: ${JSON.stringify(result.findings)}`);
    assert.equal(numericFindings[0].severity, 2);
    assert.equal(numericFindings[0].expected, 34);
    assert.equal(numericFindings[0].actual, 30);
  });

  test('T06 — passes when count matches snapshot', () => {
    const content = 'cortex-x ships 34 standards across Rules 0-3.\n';
    const fp = writeFixture('t06', 'doc.md', content);
    const result = lintFile(fp, SNAPSHOT, REF_DATE, {});
    const numericFindings = result.findings.filter((f) => f.ruleId === 'doc-currency/numeric-mismatch');
    assert.deepStrictEqual(numericFindings, []);
  });

  test('T11 — output is deterministic across repeated calls', () => {
    const content = 'cortex-x ships 30 standards and 20 CLIs.\n';
    const fp = writeFixture('t11', 'doc.md', content);
    const r1 = lintFile(fp, SNAPSHOT, REF_DATE, {});
    const r2 = lintFile(fp, SNAPSHOT, REF_DATE, {});
    assert.deepStrictEqual(r1, r2, 'two calls with same inputs must produce identical findings');
  });

  test('T12 — CRLF input handled identically to LF', () => {
    const lf = 'cortex-x ships 30 standards in Rules 0-3.\n';
    const crlf = 'cortex-x ships 30 standards in Rules 0-3.\r\n';
    const fpLF = writeFixture('t12lf', 'doc-lf.md', lf);
    const fpCRLF = writeFixture('t12crlf', 'doc-crlf.md', crlf);
    const rLF = lintFile(fpLF, SNAPSHOT, REF_DATE, {});
    const rCRLF = lintFile(fpCRLF, SNAPSHOT, REF_DATE, {});
    // Compare findings shape (drop filePath which differs).
    const stripFp = (r) => ({ findings: r.findings, expiry: r.expiry });
    assert.deepStrictEqual(stripFp(rLF), stripFp(rCRLF), 'CRLF must match LF');
  });

  test('T14 — qualifier "over 30 standards" passes when actual >= 30', () => {
    const content = 'cortex-x ships over 30 standards across Rules 0-3.\n';
    const fp = writeFixture('t14', 'doc.md', content);
    const result = lintFile(fp, SNAPSHOT, REF_DATE, {});
    const numericFindings = result.findings.filter((f) => f.ruleId === 'doc-currency/numeric-mismatch');
    assert.deepStrictEqual(numericFindings, []);
  });
});

describe('cortex-doc-currency — checkExpiry', () => {
  test('T07 — flags expired last_human_review (90-day default for standards/)', () => {
    // 2026-02-25 + 90 days = ~2026-05-26 (8 days past on 2026-06-03)
    const fm = { last_human_review: '2026-02-25' };
    const result = checkExpiry(fm, REF_DATE, { filePath: 'standards/example.md' });
    assert.equal(result.state, 'yellow', `expected yellow state, got ${result.state}`);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].ruleId, 'doc-currency/expired-soft');
    assert.equal(result.findings[0].severity, 1);
  });

  test('T08 — flags explicit `expires` past reference instant', () => {
    // 2026-05-01 + 14d grace = 2026-05-15. Today 2026-06-03 -> hard-expired.
    const fm = { expires: '2026-05-01' };
    const result = checkExpiry(fm, REF_DATE, { filePath: 'docs/foo.md' });
    assert.equal(result.state, 'red');
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].ruleId, 'doc-currency/expired-hard');
    assert.equal(result.findings[0].severity, 2);
  });

  test('T09 — honors point_in_time as never-expires', () => {
    const fm = {
      point_in_time: true,
      last_human_review: '2020-01-01',
      expires: '2020-01-02',
    };
    const result = checkExpiry(fm, REF_DATE, { filePath: 'cortex/adr-001.md' });
    assert.equal(result.state, 'silent');
    assert.deepStrictEqual(result.findings, []);
    assert.equal(result.pointInTime, true);
  });

  test('T10 — warns expiring-soon within 7 days', () => {
    // Standards cadence 90d. last_human_review 2026-03-10 -> expires ~2026-06-08
    // Today 2026-06-03 -> 5 days until expiry.
    const fm = { last_human_review: '2026-03-10' };
    const result = checkExpiry(fm, REF_DATE, { filePath: 'standards/foo.md' });
    assert.equal(result.state, 'green');
    const soonFindings = result.findings.filter((f) => f.ruleId === 'doc-currency/expiring-soon');
    assert.equal(soonFindings.length, 1, `expected 1 expiring-soon finding, got ${result.findings.length}: ${JSON.stringify(result.findings)}`);
    assert.equal(soonFindings[0].severity, 1);
  });
});

describe('cortex-doc-currency — parseFrontmatter', () => {
  test('parses key:value YAML subset', () => {
    const content = '---\nlast_human_review: 2026-06-03\npoint_in_time: true\ncadence_days: 30\n---\n# body\n';
    const { data } = parseFrontmatter(content);
    assert.equal(data.last_human_review, '2026-06-03');
    assert.equal(data.point_in_time, true);
    assert.equal(data.cadence_days, 30);
  });
});

describe('cortex-doc-currency — CLI', () => {
  function runCli(args, env) {
    return spawnSync(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, CORTEX_LINT_NOW: REF_ISO, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  test('T13 — --apply substitutes digit ONLY (surrounding bytes identical)', () => {
    // We bypass snapshot-fetch by calling lintFile + _applyDigitSubstitutions
    // directly, since the CLI shells out to cortex-doc-regen which requires
    // the live repo. Test verifies the substitution primitive is surgical.
    const before = 'cortex-x ships 30 standards across Rules 0-3.\n';
    const fp = writeFixture('t13', 'doc.md', before);
    const result = lintFile(fp, SNAPSHOT, REF_DATE, {});
    const numericFinding = result.findings.find((f) => f.ruleId === 'doc-currency/numeric-mismatch');
    assert.ok(numericFinding, 'expected a numeric-mismatch finding to drive the substitution');
    const { content: after, applied } = lib._applyDigitSubstitutions(before, result.findings);
    assert.equal(applied, 1);
    assert.equal(after, 'cortex-x ships 34 standards across Rules 0-3.\n');
    // Surrounding bytes must be byte-identical except for the digit run.
    const expectedPrefix = 'cortex-x ships ';
    const expectedSuffix = ' standards across Rules 0-3.\n';
    assert.equal(after.startsWith(expectedPrefix), true);
    assert.equal(after.endsWith(expectedSuffix), true);
    // Re-apply must be idempotent.
    const result2 = lintFile(fp, SNAPSHOT, REF_DATE, { contentOverride: after });
    const numericFindings2 = result2.findings.filter((f) => f.ruleId === 'doc-currency/numeric-mismatch');
    assert.deepStrictEqual(numericFindings2, [], '--apply must be idempotent');
  });

  test('--help exits 0 with usage', () => {
    if (!fs.existsSync(SCRIPT)) return;
    const res = runCli(['--help']);
    assert.equal(res.status, 0);
    assert.ok(/Usage:/i.test(res.stdout));
  });

  test('missing reference instant exits 2', () => {
    if (!fs.existsSync(SCRIPT)) return;
    const fp = writeFixture('cli-no-now', 'doc.md', 'hello\n');
    // Strip CORTEX_LINT_NOW from env.
    const env = { ...process.env };
    delete env.CORTEX_LINT_NOW;
    const res = spawnSync(process.execPath, [SCRIPT, '--check', fp], {
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(res.status, 2, `expected exit 2 when no reference instant, got ${res.status}`);
  });

  test('CORTEX_DOC_LINT_DISABLED kill-switch exits 0', () => {
    if (!fs.existsSync(SCRIPT)) return;
    const res = runCli(['--check'], { CORTEX_DOC_LINT_DISABLED: '1' });
    assert.equal(res.status, 0);
  });
});
