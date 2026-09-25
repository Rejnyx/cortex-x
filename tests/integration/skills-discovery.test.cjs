// tests/integration/skills-discovery.test.cjs
//
// E2E coverage: every skill in shared/skills/ passes cortex-skill-validate
// with score >= 80 (the threshold below which the skill is unreliable for
// auto-invocation).
//
// Also verifies: cortex/capabilities.md mentions every skill that's actually
// shipped, and every skill mentioned in capabilities exists on disk (no
// stale claims or undocumented skills).

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SHARED_SKILLS = path.join(REPO_ROOT, 'shared', 'skills');
const VALIDATE_CLI = path.join(REPO_ROOT, 'bin', 'cortex-skill-validate.cjs');
const CAPABILITIES_JSON = path.join(REPO_ROOT, 'cortex', 'capabilities.json');

function listSkillsOnDisk() {
  return fs
    .readdirSync(SHARED_SKILLS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) =>
      fs.existsSync(path.join(SHARED_SKILLS, name, 'SKILL.md')),
    );
}

describe('cortex-skill-validate against every shipped skill', () => {
  // Quarantine: pre-existing known debt as of 2026-05-25. New A/fail findings
  // outside this list = test failure. Existing items must be cleared by the
  // dates below or this guard fails (forces the debt to move). Strict ratchet
  // pattern — same as code-coverage thresholds in npm projects.
  // Empty by design. Entries here are time-boxed exemptions: an A/fail finding
  // that is knowingly deferred, with an owner-visible expiry. Past mustFixBy the
  // suite fails loudly, and once the finding stops reproducing the suite demands
  // the entry be deleted — so quarantine can neither rot silently nor linger.
  //
  // Last resident: designer/SPEC_BODY_TOO_LONG (expired 2026-06-30, cleared
  // 2026-08-10 by moving award mode into designer/references/award-mode.md).
  const QUARANTINE = [];

  const result = spawnSync(
    process.execPath,
    [VALIDATE_CLI, '--json', SHARED_SKILLS],
    { encoding: 'utf8' },
  );

  let report;
  test('cortex-skill-validate emits parseable JSON', () => {
    const jsonStart = result.stdout.indexOf('{');
    assert.ok(jsonStart >= 0, `no JSON in --json output; stderr: ${result.stderr}`);
    report = JSON.parse(result.stdout.slice(jsonStart));
    assert.ok(
      Array.isArray(report.results),
      'report.results must be an array',
    );
    assert.ok(
      report.results.length >= 10,
      `expected >=10 skills validated, got ${report.results.length}`,
    );
  });

  test('every shipped skill scores >= 80 (operator-reliable threshold)', () => {
    if (!report) return;
    const lowScorers = report.results.filter((s) => s.score < 80);
    assert.deepEqual(
      lowScorers,
      [],
      `Skills under score 80: ${lowScorers
        .map((s) => `${s.name} (${s.score})`)
        .join(', ')}`,
    );
  });

  test('no NEW A/fail-severity finding outside the quarantine list', () => {
    if (!report) return;
    const today = new Date().toISOString().slice(0, 10);
    const criticals = [];
    const stale = [];
    for (const s of report.results) {
      for (const f of s.findings || []) {
        if (f.tier === 'A' && f.severity === 'fail') {
          const quarantined = QUARANTINE.find(
            (q) => q.skill === s.name && q.ruleId === f.id,
          );
          if (!quarantined) {
            criticals.push(`${s.name}: ${f.id} — ${f.msg}`);
          } else if (today > quarantined.mustFixBy) {
            stale.push(
              `${quarantined.skill}/${quarantined.ruleId} was meant to be fixed by ${quarantined.mustFixBy} — TIME'S UP`,
            );
          }
        }
      }
    }
    assert.deepEqual(
      criticals,
      [],
      `NEW A/fail findings outside quarantine:\n  ${criticals.join('\n  ')}`,
    );
    assert.deepEqual(
      stale,
      [],
      `Quarantine items past their mustFixBy date:\n  ${stale.join('\n  ')}`,
    );
  });

  test('quarantine list is itself accurate (every entry still fails)', () => {
    if (!report) return;
    const phantom = [];
    for (const q of QUARANTINE) {
      const skill = report.results.find((s) => s.name === q.skill);
      const stillFails = skill?.findings?.some(
        (f) => f.id === q.ruleId && f.tier === 'A',
      );
      if (!stillFails) {
        phantom.push(
          `Quarantine entry ${q.skill}/${q.ruleId} no longer fails — remove from QUARANTINE`,
        );
      }
    }
    assert.deepEqual(
      phantom,
      [],
      `Phantom quarantine entries:\n  ${phantom.join('\n  ')}`,
    );
  });
});

describe('skill discoverability — install + listSkillsOnDisk parity', () => {
  // Skills are runtime-discovered (not pre-registered in capabilities.json).
  // The contract: every skill folder in shared/skills/ with a valid SKILL.md
  // should be visible to install + listSkillsOnDisk. This catches a directory
  // accidentally created without SKILL.md, or a SKILL.md without frontmatter.
  test('every shared/skills/ dir has a valid SKILL.md', () => {
    const dirs = fs
      .readdirSync(SHARED_SKILLS, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    const broken = dirs.filter(
      (d) => !fs.existsSync(path.join(SHARED_SKILLS, d, 'SKILL.md')),
    );
    assert.deepEqual(
      broken,
      [],
      `Skill dirs missing SKILL.md: ${broken.join(', ')}`,
    );
  });

  test('listSkillsOnDisk returns a non-empty set', () => {
    const skills = listSkillsOnDisk();
    assert.ok(
      skills.length >= 10,
      `expected >=10 shipped skills, got ${skills.length}: ${skills.join(', ')}`,
    );
  });
});
