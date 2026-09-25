// Sprint 2.8 — importance-weighted memory decay primitive.
//
// Replaces the time-based "3-month unused → delete" rule with a frequency-
// and impact-weighted exponential decay that keeps high-impact lessons
// alive longer than advisory chatter. Per Sprint 2.8 R1 §6:
//
//   U(item, t) = (w_freq × frequency + w_impact × impact) × e^(−λ × age_days)
//
// Defaults:
//   w_freq = 1.0    — frequency = retrieval count (defaults 0)
//   w_impact = 2.0  — impact dominates (blocker > warning > advisory)
//   λ_advisory = ln(2)/30   ≈ 0.0231/day  (30-day half-life)
//   λ_blocker  = ln(2)/120  ≈ 0.0058/day  (120-day half-life)
//
// Score interpretation: any value ≥ 0. Higher = keep. Bottom 5% (or below
// hard floor) → archive. After 12 weeks in archive → hard delete.
//
// Pure logic; zero-deps. fs binding lives in journal.cjs / lessons.cjs.

'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

// Half-life → λ. Standard exponential decay: e^(−λ·t).
// For half-life H: e^(−λ·H) = 0.5 → λ = ln(2)/H.
function halfLifeToLambda(halfLifeDays) {
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) return 0;
  return Math.LN2 / halfLifeDays;
}

const DEFAULT_PARAMS = Object.freeze({
  w_freq: 1.0,
  w_impact: 2.0,
  half_life_advisory_days: 30,
  half_life_warning_days: 60,
  half_life_blocker_days: 120,
});

// Map impact label → numeric weight.
function impactValue(impact) {
  switch (impact) {
    case 'blocker': return 1.0;
    case 'warning': return 0.5;
    case 'advisory': return 0.1;
    default: return 0.1; // unknown → treat as advisory floor
  }
}

// Pick half-life for an impact tier (per R1 §6 — blockers persist longer).
function halfLifeForImpact(impact, params = DEFAULT_PARAMS) {
  switch (impact) {
    case 'blocker': return params.half_life_blocker_days;
    case 'warning': return params.half_life_warning_days;
    case 'advisory': return params.half_life_advisory_days;
    default: return params.half_life_advisory_days;
  }
}

// Compute age in days between item.ts and now. Negative ages clamp to 0.
//
// Sprint 2.8.1 hardening (R2 retro M4): distinguish "missing ts" (return 0,
// item is fresh — backward compat with Sprint 1.8.3 lessons) from "malformed
// ts" (return Infinity, score → 0 via decay). Previously NaN-ts was silently
// treated as fresh, which meant `{ts:'Infinity', impact:'blocker'}` scored
// 2.0 (max). That hid clock corruption in journal data.
function ageDays(item, now) {
  if (!item || item.ts === undefined || item.ts === null) return 0;
  const ts = Date.parse(item.ts);
  if (Number.isNaN(ts)) return Infinity; // malformed → max-decay (score → 0)
  const ageMs = now.getTime() - ts;
  return Math.max(0, ageMs / DAY_MS);
}

// Sprint 2.8.1 hardening (R2 retro H1): floor decay so ancient items with
// huge ages (e.g., 14,300 days where Math.exp underflows to 0) keep relative
// ordering by impact tier. Without this, every legacy item drops to score=0
// simultaneously and decayPass({thresholdScore: X}) loses signal for blocker
// vs advisory tier preservation. Floor at 1e-12 keeps differences visible
// while still ranking aged items below fresh ones.
const DECAY_FLOOR = 1e-12;

// Compute importance score for a single item.
function computeImportanceScore(item, opts = {}) {
  const params = { ...DEFAULT_PARAMS, ...(opts.params || {}) };
  const now = (opts.now instanceof Date && !isNaN(opts.now.getTime())) ? opts.now : new Date();
  if (!item || typeof item !== 'object') return 0;
  const freq = Number.isFinite(item.frequency) ? Math.max(0, item.frequency) : 0;
  const impact = impactValue(item.impact);
  const halfLife = halfLifeForImpact(item.impact, params);
  const lambda = halfLifeToLambda(halfLife);
  const days = ageDays(item, now);
  // Floor decay at DECAY_FLOOR so ancient items still preserve relative
  // ordering by impact (Sprint 2.8.1 R2 retro H1).
  const decay = Math.max(Math.exp(-lambda * days), DECAY_FLOOR);
  const base = (params.w_freq * freq) + (params.w_impact * impact);
  return base * decay;
}

// Score every item + sort descending. Returns the same items annotated
// with `_score` (does NOT mutate originals).
function scoreItems(items, opts = {}) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({ ...item, _score: computeImportanceScore(item, opts) }))
    .sort((a, b) => b._score - a._score);
}

// Decay decision pass: input array of items (with `ts`, `impact`,
// `frequency`?), returns:
//   {
//     keep:    [...],   // items above threshold
//     archive: [...],   // items below threshold (eligible for archive)
//     params:  effective params used,
//   }
//
// Threshold: opts.thresholdScore (absolute) OR opts.archiveBottomFraction
// (e.g. 0.05 = bottom 5%). If both unset, defaults to 0.05.
function decayPass(items, opts = {}) {
  const params = { ...DEFAULT_PARAMS, ...(opts.params || {}) };
  if (!Array.isArray(items) || items.length === 0) {
    return { keep: [], archive: [], params };
  }
  const scored = scoreItems(items, { ...opts, params });
  // Never archived on either path: blockers encode load-bearing failure
  // knowledge (Sprint 2.8 R1), and `pinned: true` marks operator facts that
  // must not degrade regardless of impact tier. Only a literal boolean pins.
  const isProtected = (it) => it.impact === 'blocker' || it.pinned === true;
  if (typeof opts.thresholdScore === 'number') {
    const below = (i) => i._score < opts.thresholdScore && !isProtected(i);
    const keep = scored.filter((i) => !below(i));
    const archive = scored.filter(below);
    return { keep, archive, params };
  }
  const fraction = typeof opts.archiveBottomFraction === 'number'
    ? Math.max(0, Math.min(1, opts.archiveBottomFraction))
    : 0.05;
  // Sprint 2.8.1 hardening (R2 retro H3): for small lists where floor()
  // would archive 0 items (e.g. 10 items × 0.05 = 0), use Math.ceil so the
  // sweep produces at least 1 archived item once items.length crosses
  // MIN_ARCHIVE_FLOOR (default 10). Avoids "decay shock" where the first
  // 19 weeks archive nothing and the 20th suddenly archives 1, then 2.
  const minArchiveFloor = typeof opts.minArchiveFloor === 'number'
    ? Math.max(1, Math.floor(opts.minArchiveFloor))
    : 10;
  // The fraction applies to the archivable pool: counting protected items in
  // would let a store full of pinned facts archive every unpinned one at once.
  const unprotected = scored.filter((it) => !isProtected(it));
  const protectedItems = scored.filter(isProtected);
  const pool = unprotected.length;
  let archiveCount;
  if (pool >= minArchiveFloor && fraction > 0) {
    archiveCount = Math.max(1, Math.floor(pool * fraction));
  } else {
    archiveCount = Math.floor(pool * fraction);
  }
  if (archiveCount === 0) {
    return { keep: scored, archive: [], params };
  }
  // Sprint 2.9.7b property-test fix: Sprint 2.8 R1 acceptance criterion
  // ("zero blocker lessons archived") was declared but never enforced.
  // Property test in tests/unit/steward/memory-decay-properties.test.cjs
  // surfaced the gap. Now: archive ONLY from the non-blocker pool. Blocker
  // lessons encode load-bearing failure-mode knowledge and must persist
  // (until hard-coded retention sweep, which is itself out of scope here).
  const cappedArchiveCount = Math.min(archiveCount, unprotected.length);
  const archive = unprotected.slice(unprotected.length - cappedArchiveCount);
  const keptUnprotected = unprotected.slice(0, unprotected.length - cappedArchiveCount);
  const keep = [...protectedItems, ...keptUnprotected].sort((a, b) => b._score - a._score);
  return { keep, archive, params };
}

// Determine an item's archive bucket — archived items get a YYYY-WW key.
// Sprint 2.8 R1 §7: 12-week retention then hard-delete.
function archiveBucket(now) {
  const d = (now instanceof Date && !isNaN(now.getTime())) ? now : new Date();
  const year = d.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const elapsedDays = Math.floor((d.getTime() - start) / DAY_MS);
  const week = Math.floor(elapsedDays / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Should a previously-archived bucket be hard-deleted? True if archived bucket
// is older than `retentionWeeks` weeks (default 12).
function isBucketExpired(bucketKey, now, retentionWeeks = 12) {
  if (typeof bucketKey !== 'string') return false;
  const m = bucketKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return false;
  const year = Number(m[1]);
  const week = Number(m[2]);
  // Approximate: convert (year, week) to a Date.
  const start = Date.UTC(year, 0, 1) + (week - 1) * 7 * DAY_MS;
  const ref = (now instanceof Date && !isNaN(now.getTime())) ? now.getTime() : Date.now();
  const ageMs = ref - start;
  const ageWeeks = ageMs / (7 * DAY_MS);
  return ageWeeks > retentionWeeks;
}

module.exports = {
  computeImportanceScore,
  scoreItems,
  decayPass,
  halfLifeToLambda,
  halfLifeForImpact,
  impactValue,
  ageDays,
  archiveBucket,
  isBucketExpired,
  DEFAULT_PARAMS,
};
