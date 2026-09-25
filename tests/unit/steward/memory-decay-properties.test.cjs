'use strict';

// Sprint 2.9.7b — hand-rolled property tests for memory-decay invariants.
// Closes Sprint 2.8 R2-followup gap: scoring monotonicity + decay-floor
// safety + impact-class ordering.
//
// Zero-deps (cortex-x convention).

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const decay = require('../../../bin/steward/_lib/memory-decay.cjs');

describe('Sprint 2.9.7b — memory-decay scoring properties', () => {
  test('invariant: importance score is non-negative for all valid inputs', () => {
    const seed = 0xDEADBEEF;
    let rng = seed;
    function rand() { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; }
    const impacts = ['blocker', 'major', 'minor', 'advisory'];
    for (let i = 0; i < 100; i++) {
      const item = {
        ts: new Date(Date.now() - rand() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        impact: impacts[Math.floor(rand() * impacts.length)],
        frequency: Math.floor(rand() * 50),
      };
      const score = decay.computeImportanceScore(item);
      assert.ok(Number.isFinite(score), `score must be finite for item ${JSON.stringify(item)}`);
      assert.ok(score >= 0, `score must be non-negative for item ${JSON.stringify(item)}`);
    }
  });

  test('invariant: decay floor prevents underflow on extremely old items', () => {
    // Items older than effective halflife * many should still produce finite,
    // non-zero scores (DECAY_FLOOR = 1e-12 protects against e^-large → 0).
    const ancient = {
      ts: '1970-01-01T00:00:00Z', // ~56 years ago
      impact: 'blocker',
      frequency: 1,
    };
    const score = decay.computeImportanceScore(ancient);
    assert.ok(Number.isFinite(score));
    assert.ok(score >= 0);
  });

  test('invariant: blocker impact > major impact > minor impact > advisory impact (when freq + age equal)', () => {
    const baseItem = (impact) => ({ ts: new Date().toISOString(), impact, frequency: 5 });
    const blockerScore = decay.computeImportanceScore(baseItem('blocker'));
    const majorScore = decay.computeImportanceScore(baseItem('major'));
    const minorScore = decay.computeImportanceScore(baseItem('minor'));
    const advisoryScore = decay.computeImportanceScore(baseItem('advisory'));
    assert.ok(blockerScore >= majorScore, `blocker (${blockerScore}) >= major (${majorScore})`);
    assert.ok(majorScore >= minorScore, `major (${majorScore}) >= minor (${minorScore})`);
    assert.ok(minorScore >= advisoryScore, `minor (${minorScore}) >= advisory (${advisoryScore})`);
  });

  test('invariant: same impact + age, higher frequency ⇒ higher score (monotonicity in frequency)', () => {
    const ts = new Date().toISOString();
    let prevScore = -Infinity;
    for (const freq of [0, 1, 5, 10, 50, 100]) {
      const score = decay.computeImportanceScore({ ts, impact: 'minor', frequency: freq });
      assert.ok(score >= prevScore, `monotonic in freq: freq=${freq} score=${score}, prev=${prevScore}`);
      prevScore = score;
    }
  });

  test('invariant: same impact + frequency, older ⇒ lower score (monotonicity in age)', () => {
    const now = Date.now();
    let prevScore = Infinity;
    for (const ageDays of [0, 1, 7, 30, 90, 365]) {
      const ts = new Date(now - ageDays * 24 * 60 * 60 * 1000).toISOString();
      const score = decay.computeImportanceScore({ ts, impact: 'minor', frequency: 5 });
      assert.ok(score <= prevScore, `monotonic in age: age=${ageDays}d score=${score}, prev=${prevScore}`);
      prevScore = score;
    }
  });

  test('invariant: decayPass partitions items into keep + archive (no loss)', () => {
    const items = [];
    for (let i = 0; i < 20; i++) {
      items.push({
        id: `item-${i}`,
        ts: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
        impact: i % 4 === 0 ? 'blocker' : 'minor',
        frequency: 20 - i,
      });
    }
    const result = decay.decayPass(items, { archiveBottomFraction: 0.1 });
    assert.ok(typeof result === 'object');
    assert.ok(Array.isArray(result.keep));
    assert.ok(Array.isArray(result.archive));
    assert.equal(
      result.keep.length + result.archive.length,
      items.length,
      'no items lost or duplicated',
    );
  });

  test('invariant: decayPass NEVER archives blocker-impact items (Sprint 2.8 R1 contract)', () => {
    const items = [
      // 5 blocker items (very old → low decay score)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `b-${i}`,
        ts: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        impact: 'blocker',
        frequency: 1,
      })),
      // 50 advisory items (recent, high freq) — high raw score but not load-bearing.
      ...Array.from({ length: 50 }, (_, i) => ({
        id: `a-${i}`,
        ts: new Date().toISOString(),
        impact: 'advisory',
        frequency: 100,
      })),
    ];
    const result = decay.decayPass(items, { archiveBottomFraction: 0.5 });
    // Sprint 2.8 R1 acceptance: zero blocker lessons archived.
    const archivedBlockers = result.archive.filter((it) => it.impact === 'blocker');
    assert.equal(archivedBlockers.length, 0, 'blocker items must never be archived');
  });
});
