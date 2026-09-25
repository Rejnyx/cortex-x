'use strict';

// Sprint 2.8 — memory-decay primitive tests.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const decay = require('../../../bin/steward/_lib/memory-decay.cjs');

describe('halfLifeToLambda', () => {
  test('30-day half-life → λ ≈ 0.0231', () => {
    const lambda = decay.halfLifeToLambda(30);
    assert.ok(Math.abs(lambda - 0.02310) < 0.0001);
  });

  test('120-day half-life → λ ≈ 0.0058', () => {
    const lambda = decay.halfLifeToLambda(120);
    assert.ok(Math.abs(lambda - 0.00578) < 0.0001);
  });

  test('zero / negative half-life returns 0', () => {
    assert.equal(decay.halfLifeToLambda(0), 0);
    assert.equal(decay.halfLifeToLambda(-30), 0);
    assert.equal(decay.halfLifeToLambda(NaN), 0);
  });
});

describe('impactValue', () => {
  test('blocker > warning > advisory', () => {
    assert.equal(decay.impactValue('blocker'), 1.0);
    assert.equal(decay.impactValue('warning'), 0.5);
    assert.equal(decay.impactValue('advisory'), 0.1);
  });

  test('unknown impact treated as advisory', () => {
    assert.equal(decay.impactValue('unknown'), 0.1);
    assert.equal(decay.impactValue(null), 0.1);
    assert.equal(decay.impactValue(undefined), 0.1);
  });
});

describe('halfLifeForImpact', () => {
  test('blocker → 120 days, advisory → 30 days', () => {
    assert.equal(decay.halfLifeForImpact('blocker'), 120);
    assert.equal(decay.halfLifeForImpact('warning'), 60);
    assert.equal(decay.halfLifeForImpact('advisory'), 30);
  });
});

describe('ageDays', () => {
  test('returns 0 for missing ts (backward compat with Sprint 1.8.3 lessons)', () => {
    // Sprint 2.8.1 R2 retro M4: missing ts → fresh (0); malformed ts → max-decay.
    assert.equal(decay.ageDays({}, new Date()), 0);
    assert.equal(decay.ageDays({ ts: null }, new Date()), 0);
    assert.equal(decay.ageDays({ ts: undefined }, new Date()), 0);
  });

  test('Sprint 2.8.1 R2 retro M4: malformed ts → Infinity (score → 0 via decay)', () => {
    // Distinguishes "missing field" (treat as fresh) from "corrupted journal
    // entry with garbage ts" (rank below all healthy items).
    assert.equal(decay.ageDays({ ts: 'not-a-date' }, new Date()), Infinity);
    assert.equal(decay.ageDays({ ts: 'Infinity' }, new Date()), Infinity);
    assert.equal(decay.ageDays({ ts: 'garbage' }, new Date()), Infinity);
  });

  test('clamps negative ages to 0 (future timestamps)', () => {
    const item = { ts: '2099-01-01T00:00:00Z' };
    assert.equal(decay.ageDays(item, new Date('2026-05-09')), 0);
  });

  test('computes integer-ish day delta', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const item = { ts: '2026-05-02T00:00:00Z' };
    const days = decay.ageDays(item, now);
    assert.ok(Math.abs(days - 7) < 0.01);
  });
});

describe('computeImportanceScore', () => {
  test('fresh blocker scores higher than fresh advisory', () => {
    const now = new Date();
    const ts = now.toISOString();
    const blocker = decay.computeImportanceScore({ ts, impact: 'blocker' }, { now });
    const advisory = decay.computeImportanceScore({ ts, impact: 'advisory' }, { now });
    assert.ok(blocker > advisory);
  });

  test('frequency boosts score', () => {
    const now = new Date();
    const ts = now.toISOString();
    const high = decay.computeImportanceScore({ ts, impact: 'advisory', frequency: 100 }, { now });
    const low = decay.computeImportanceScore({ ts, impact: 'advisory', frequency: 0 }, { now });
    assert.ok(high > low);
  });

  test('age halves blocker score at 120 days', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const ts = '2026-01-09T00:00:00Z'; // 120 days earlier
    const fresh = decay.computeImportanceScore({ ts: now.toISOString(), impact: 'blocker' }, { now });
    const aged = decay.computeImportanceScore({ ts, impact: 'blocker' }, { now });
    // Aged should be ~half of fresh.
    assert.ok(Math.abs(aged - fresh / 2) < 0.01, `aged=${aged}, fresh=${fresh}`);
  });

  test('age halves advisory score at 30 days', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const ts = '2026-04-09T00:00:00Z'; // 30 days earlier
    const fresh = decay.computeImportanceScore({ ts: now.toISOString(), impact: 'advisory' }, { now });
    const aged = decay.computeImportanceScore({ ts, impact: 'advisory' }, { now });
    assert.ok(Math.abs(aged - fresh / 2) < 0.01);
  });

  test('non-object input → 0', () => {
    assert.equal(decay.computeImportanceScore(null), 0);
    assert.equal(decay.computeImportanceScore('not-an-object'), 0);
  });
});

describe('scoreItems', () => {
  test('annotates items with _score and sorts descending', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const items = [
      { ts: now.toISOString(), impact: 'advisory', id: 'a' },
      { ts: now.toISOString(), impact: 'blocker', id: 'b' },
      { ts: now.toISOString(), impact: 'warning', id: 'c' },
    ];
    const scored = decay.scoreItems(items, { now });
    assert.equal(scored.length, 3);
    assert.equal(scored[0].id, 'b'); // blocker first
    assert.equal(scored[2].id, 'a'); // advisory last
    assert.ok(scored[0]._score > scored[1]._score);
    assert.ok(scored[1]._score > scored[2]._score);
  });

  test('does not mutate input items', () => {
    const items = [{ ts: '2026-05-09T00:00:00Z', impact: 'blocker' }];
    decay.scoreItems(items);
    assert.equal(items[0]._score, undefined, 'original items must not be mutated');
  });

  test('returns empty array for non-array input', () => {
    assert.deepEqual(decay.scoreItems(null), []);
    assert.deepEqual(decay.scoreItems('string'), []);
  });
});

describe('decayPass', () => {
  test('archives bottom 5% by default', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const items = [];
    for (let i = 0; i < 100; i += 1) {
      items.push({
        ts: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
        impact: 'advisory',
        id: `i${i}`,
      });
    }
    const result = decayPassWithDefaults(items, now);
    assert.equal(result.archive.length, 5);
    assert.equal(result.keep.length, 95);
    // Archive contains the oldest items (lowest scores).
    for (const a of result.archive) {
      const idx = Number(a.id.replace('i', ''));
      assert.ok(idx >= 95, `archived ${a.id} should be one of the oldest 5`);
    }
  });

  test('thresholdScore variant filters absolutely', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const items = [
      { ts: now.toISOString(), impact: 'blocker', id: 'b' },     // score ≈ 2.0
      { ts: now.toISOString(), impact: 'advisory', id: 'a' },     // score ≈ 0.2
    ];
    const result = decay.decayPass(items, { thresholdScore: 1.0, now });
    assert.equal(result.keep.length, 1);
    assert.equal(result.keep[0].id, 'b');
    assert.equal(result.archive.length, 1);
    assert.equal(result.archive[0].id, 'a');
  });

  test('archiveBottomFraction = 0.5 archives half', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const items = [];
    for (let i = 0; i < 10; i += 1) {
      items.push({
        ts: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
        impact: 'advisory',
      });
    }
    const result = decay.decayPass(items, { archiveBottomFraction: 0.5, now });
    assert.equal(result.archive.length, 5);
    assert.equal(result.keep.length, 5);
  });

  test('empty input returns empty arrays', () => {
    const result = decay.decayPass([]);
    assert.deepEqual(result.keep, []);
    assert.deepEqual(result.archive, []);
  });

  test('clamps fraction to [0, 1]', () => {
    const items = [{ ts: new Date().toISOString(), impact: 'advisory' }];
    const r1 = decay.decayPass(items, { archiveBottomFraction: 2.0 });
    assert.ok(r1.archive.length <= items.length);
    const r2 = decay.decayPass(items, { archiveBottomFraction: -1.0 });
    assert.equal(r2.archive.length, 0);
  });
});

function decayPassWithDefaults(items, now) {
  return decay.decayPass(items, { now });
}

describe('archiveBucket', () => {
  test('returns YYYY-WNN format', () => {
    const bucket = decay.archiveBucket(new Date('2026-05-09T00:00:00Z'));
    assert.match(bucket, /^\d{4}-W\d{2}$/);
    assert.equal(bucket, '2026-W19');
  });

  test('handles year-start (week 1)', () => {
    const bucket = decay.archiveBucket(new Date('2026-01-03T00:00:00Z'));
    assert.equal(bucket, '2026-W01');
  });
});

describe('isBucketExpired', () => {
  test('returns false for current bucket', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const current = decay.archiveBucket(now);
    assert.equal(decay.isBucketExpired(current, now), false);
  });

  test('returns true for >12-week-old bucket', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    // 14 weeks earlier
    const old = decay.archiveBucket(new Date(now.getTime() - 14 * 7 * 24 * 60 * 60 * 1000));
    assert.equal(decay.isBucketExpired(old, now), true);
  });

  test('returns false for invalid bucket key', () => {
    assert.equal(decay.isBucketExpired('not-a-bucket', new Date()), false);
    assert.equal(decay.isBucketExpired(null, new Date()), false);
  });

  test('respects custom retentionWeeks', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const old = decay.archiveBucket(new Date(now.getTime() - 6 * 7 * 24 * 60 * 60 * 1000));
    assert.equal(decay.isBucketExpired(old, now, 4), true);  // 6 > 4 → expired
    assert.equal(decay.isBucketExpired(old, now, 8), false); // 6 < 8 → not yet
  });
});

describe('Sprint 2.8.1 R2 hardening', () => {
  test('H1: ancient items maintain relative ordering by impact (no underflow to 0)', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    // Use truly ancient ts (50,000 days ≈ 137 years).
    const ts = new Date(now.getTime() - 50_000 * 24 * 60 * 60 * 1000).toISOString();
    const blocker = decay.computeImportanceScore({ ts, impact: 'blocker' }, { now });
    const advisory = decay.computeImportanceScore({ ts, impact: 'advisory' }, { now });
    // Both decayed near 0 but blocker > advisory still.
    assert.ok(blocker > advisory, `ancient blocker=${blocker} must rank above advisory=${advisory}`);
  });

  test('H1: malformed ts (Infinity ageDays) scores at minimum decay floor', () => {
    const score = decay.computeImportanceScore({ ts: 'garbage', impact: 'blocker' });
    // Infinity * lambda → -Infinity → exp → 0. Floored at 1e-12.
    // Score = base * 1e-12. base for blocker = 2 * 1.0 = 2. So score ≈ 2e-12.
    assert.ok(score > 0 && score < 1e-9, `floored score should be near 0 but positive: ${score}`);
  });

  test('H3: small-list (≥10 items) archives at least 1 even at 5% fraction', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const items = [];
    for (let i = 0; i < 10; i += 1) {
      items.push({ ts: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(), impact: 'advisory' });
    }
    // 10 * 0.05 = 0.5 → floor=0. With min_archive_floor=10, ceil-equivalent kicks in.
    const result = decay.decayPass(items, { now });
    assert.ok(result.archive.length >= 1, `expected ≥1 archived, got ${result.archive.length}`);
  });

  test('H3: very small list (<10 items) still archives 0 (no decay shock for early adopters)', () => {
    const now = new Date('2026-05-09T00:00:00Z');
    const items = [];
    for (let i = 0; i < 5; i += 1) {
      items.push({ ts: now.toISOString(), impact: 'advisory' });
    }
    const result = decay.decayPass(items, { now });
    assert.equal(result.archive.length, 0, '<10 items should not archive (avoid decay shock)');
  });
});

describe('pinned items', () => {
  const now = new Date('2026-09-25T00:00:00Z');
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  test('fraction path never archives a pinned advisory, even when it scores lowest', () => {
    const items = [];
    for (let i = 0; i < 20; i += 1) items.push({ id: `a${i}`, ts: daysAgo(i), impact: 'advisory' });
    items.push({ id: 'spec', ts: daysAgo(900), impact: 'advisory', pinned: true });
    const result = decay.decayPass(items, { archiveBottomFraction: 0.5, now });
    assert.ok(!result.archive.some((i) => i.id === 'spec'), 'pinned item was archived');
    assert.ok(result.keep.some((i) => i.id === 'spec'));
    assert.equal(result.archive.length, 10, 'archive quota still drawn from unpinned items');
  });

  test('threshold path keeps a pinned item below the threshold', () => {
    const items = [
      { id: 'spec', ts: daysAgo(900), impact: 'advisory', pinned: true },
      { id: 'noise', ts: daysAgo(900), impact: 'advisory' },
    ];
    const result = decay.decayPass(items, { thresholdScore: 1.0, now });
    assert.deepEqual(result.keep.map((i) => i.id), ['spec']);
    assert.deepEqual(result.archive.map((i) => i.id), ['noise']);
  });

  test('only a literal true pins — truthy strings do not', () => {
    const items = [{ id: 'x', ts: daysAgo(900), impact: 'advisory', pinned: 'yes' }];
    const result = decay.decayPass(items, { thresholdScore: 1.0, now });
    assert.equal(result.archive.length, 1);
  });
});

describe('lessons schema extension (Sprint 2.8 R1 §10)', () => {
  const lessons = require('../../../bin/steward/_lib/lessons.cjs');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');

  test('recordLesson populates agent_id, failure_origin, impact, frequency defaults', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-2.8-'));
    const prev = process.env.CORTEX_DATA_HOME;
    process.env.CORTEX_DATA_HOME = home;
    try {
      const result = lessons.recordLesson('test-slug', {
        action_kind: 'recommendation',
        root_cause: 'TEST_FAILURE',
        lesson_text: 'something went wrong',
      });
      assert.equal(result.agent_id, 'default');
      assert.equal(result.failure_origin, null);
      assert.equal(result.impact, 'advisory');
      assert.equal(result.frequency, 0);
    } finally {
      if (prev === undefined) delete process.env.CORTEX_DATA_HOME;
      else process.env.CORTEX_DATA_HOME = prev;
    }
  });

  test('lessonFromExecuteResult derives impact + failure_origin', () => {
    const lessons = require('../../../bin/steward/_lib/lessons.cjs');
    // Spec violation → blocker
    const blocker = lessons.lessonFromExecuteResult({ ok: false, code: 'SPEC_VIOLATION:no_destructive_rewrite', error: 'shrunk too much' });
    assert.equal(blocker.impact, 'blocker');
    assert.equal(blocker.failure_origin, 'SPEC_VIOLATION:no_destructive_rewrite');

    // Auth issue → warning
    const warn = lessons.lessonFromExecuteResult({ ok: false, code: 'OPENROUTER_KEY_MISSING', error: 'env var missing' });
    assert.equal(warn.impact, 'warning');
    assert.equal(warn.failure_origin, 'error_code:OPENROUTER_KEY_MISSING');

    // Generic transient → advisory
    const adv = lessons.lessonFromExecuteResult({ ok: false, code: 'OPENROUTER_NETWORK_ERROR', error: 'transient' });
    assert.equal(adv.impact, 'advisory');
  });

  test('Sprint 2.8.1 R2 retro H5: classifyImpact covers Sprint 2.4 + 2.5 codes', () => {
    const lessons = require('../../../bin/steward/_lib/lessons.cjs');
    // Sprint 2.4 codes
    assert.equal(lessons.classifyImpact('CLAUDE_CLI_BILLING_LEAK'), 'blocker');
    assert.equal(lessons.classifyImpact('CLAUDE_CLI_FORBIDDEN_FLAG'), 'blocker');
    assert.equal(lessons.classifyImpact('CLAUDE_CLI_AUTH_REJECTED'), 'warning');
    assert.equal(lessons.classifyImpact('CLAUDE_CLI_AUTH_NOT_CONFIGURED'), 'warning');
    assert.equal(lessons.classifyImpact('CLAUDE_CLI_QUOTA_EXHAUSTED'), 'warning');
    assert.equal(lessons.classifyImpact('CLAUDE_CLI_RATE_LIMITED'), 'advisory');
    assert.equal(lessons.classifyImpact('CLAUDE_CLI_PROTOCOL_DRIFT'), 'advisory');
    // Sprint 2.5 codes
    assert.equal(lessons.classifyImpact('TECH_DEBT_SNAPSHOT_CORRUPT'), 'blocker');
    assert.equal(lessons.classifyImpact('TECH_DEBT_THRESHOLD_EXCEEDED'), 'warning');
    assert.equal(lessons.classifyImpact('TECH_DEBT_QLTY_MISSING'), 'advisory');
    // Sprint 2.7 codes
    assert.equal(lessons.classifyImpact('STEWARD_CROSS_REPO_EDIT'), 'blocker');
    assert.equal(lessons.classifyImpact('SIBLING_REALPATH_OUTSIDE_ROOT'), 'blocker');
    assert.equal(lessons.classifyImpact('SIBLING_WRITE_ATTEMPTED'), 'blocker');
    // Unknown → advisory floor
    assert.equal(lessons.classifyImpact('SOMETHING_TOTALLY_NEW'), 'advisory');
    assert.equal(lessons.classifyImpact(null), 'advisory');
  });

  test('IMPACT_CLASSIFIER is exported as frozen array', () => {
    const lessons = require('../../../bin/steward/_lib/lessons.cjs');
    assert.ok(Array.isArray(lessons.IMPACT_CLASSIFIER));
    assert.ok(Object.isFrozen(lessons.IMPACT_CLASSIFIER));
  });
});
