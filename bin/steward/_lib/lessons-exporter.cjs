// bin/steward/_lib/lessons-exporter.cjs — Sprint 2.8.1
//
// Periodically writes top-scored entries from lessons.jsonl out as topic
// files in a target memory directory, formatted for Claude Code's
// auto-memory pipeline (frontmatter-tagged markdown that the next claude
// session will pick up automatically).
//
// Design (Sprint 2.8.1 v0):
//   1. Read $CORTEX_DATA_HOME/journal/<slug>/lessons.jsonl
//   2. Score every lesson via memory-decay.cjs (importance × decay).
//   3. Group by action_kind. Each kind → one topic file under
//      <memoryDir>/lessons-<kind>.md. Top-K per group (default 10).
//   4. Write a single MEMORY.md index pointing at each topic file.
//
// Properties:
//   - Pure-deterministic; no LLM call.
//   - Idempotent: re-running with no new lessons produces byte-identical
//     output (lessons sorted by score desc + ts desc).
//   - Never deletes files outside <memoryDir>. Never touches lessons.jsonl
//     itself — the original is the SSOT.
//
// Claude Code auto-memory file contract (per cortex-x's CLAUDE.md
// scaffold + Anthropic's CLAUDE.md memory pattern, May 2026):
//
//   ---
//   name: lessons-<action_kind>
//   description: Distilled failure lessons from <action_kind> action runs
//   type: feedback
//   ---
//
//   # Lessons — <action_kind>
//
//   ## Lesson 1 — <short title>
//   <body>
//
// claude-cli auto-memory uses MEMORY.md as the index pointing at sibling
// files (one-line entries: `- [Title](file.md) — one-line hook`).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const lessons = require('./lessons.cjs');
const decay = require('./memory-decay.cjs');

const DEFAULT_TOP_K_PER_KIND = 10;
const DEFAULT_MIN_SCORE = 0.01; // skip near-zero entries

function resolveDataHome() {
  return process.env.CORTEX_DATA_HOME || path.join(os.homedir(), '.cortex');
}

// Sprint 2.8.1 R2 fix (correctness-auditor HIGH): slug flows into both
// memoryDir default path AND lessons.jsonl read path. A malicious or
// typo-shaped slug can read/write arbitrary filesystem locations. Reject
// path-traversal patterns at the trust boundary (correctness.md §Practice
// 1). Constraints: 1–64 chars, alphanumeric + `_` + `-` only.
function assertSafeSlug(slug) {
  if (typeof slug !== 'string' || slug.length === 0) {
    throw new Error('lessons-exporter: slug must be a non-empty string');
  }
  if (slug.length > 64) {
    throw new Error(`lessons-exporter: slug too long (${slug.length} > 64 chars)`);
  }
  if (slug.includes('\0')) {
    throw new Error('lessons-exporter: slug contains NUL byte');
  }
  if (slug === '.' || slug === '..' || slug.startsWith('.') || slug.startsWith('-')) {
    throw new Error(`lessons-exporter: slug must not start with "." or "-" (got "${slug}")`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
    throw new Error(`lessons-exporter: slug must match /^[A-Za-z0-9_-]+$/ (got "${slug}")`);
  }
}

// Sprint 2.8.1 R2 fix (correctness-auditor HIGH): user-supplied --memory-dir
// flag writes files to arbitrary disk locations. Defense-in-depth: realpath-
// resolve the parent (since memoryDir may not yet exist) and assert the
// resolved path is descended from an allowed root (operator's home dir by
// default). Operator can opt out via `allowOutsideHome:true` for advanced
// use cases (e.g. shared host with non-default Claude Code data dir).
function assertMemoryDirSafe(memoryDir, { allowOutsideHome = false } = {}) {
  if (typeof memoryDir !== 'string' || memoryDir.length === 0) {
    throw new Error('lessons-exporter: memoryDir must be a non-empty string');
  }
  if (memoryDir.includes('\0')) {
    throw new Error('lessons-exporter: memoryDir contains NUL byte');
  }
  if (allowOutsideHome) return;
  const home = os.homedir();
  const absMemoryDir = path.resolve(memoryDir);
  // Walk up to find an existing ancestor (memoryDir may not exist yet)
  let existing = absMemoryDir;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  let resolvedExisting;
  try { resolvedExisting = fs.realpathSync(existing); } catch { resolvedExisting = existing; }
  const remainder = path.relative(existing, absMemoryDir);
  const resolved = path.join(resolvedExisting, remainder);
  const resolvedHome = (() => {
    try { return fs.realpathSync(home); } catch { return home; }
  })();
  const rel = path.relative(resolvedHome, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `lessons-exporter: memoryDir resolves outside operator home (${resolved}); ` +
      `pass allowOutsideHome:true if intentional`,
    );
  }
}

function sanitizeKindForFilename(kind) {
  // Strip control chars + non-portable filename chars. action_kind values
  // come from lessons.jsonl which can be operator-controlled — defense-in-
  // depth against frontmatter injection (\r\n) + filename traversal.
  return String(kind || 'unknown')
    .replace(/[\r\n\0]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

// Sprint 2.8.1 R2 fix (correctness-auditor MED): file-header contract claims
// "sorted by score desc + ts desc" but scoreItems sorts by score only. Make
// the deterministic-output claim true by re-applying a stable secondary +
// tertiary sort here (do not modify memory-decay.cjs which has its own tests).
function deterministicReSort(scored) {
  return [...scored].sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    const tsA = Date.parse(a.ts || '');
    const tsB = Date.parse(b.ts || '');
    const tsCmp = (Number.isFinite(tsB) ? tsB : 0) - (Number.isFinite(tsA) ? tsA : 0);
    if (tsCmp !== 0) return tsCmp;
    return String(a.action_key || '').localeCompare(String(b.action_key || ''));
  });
}

function groupByActionKind(items) {
  const groups = new Map();
  for (const it of items) {
    const k = it.action_kind || 'recommendation';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  return groups;
}

function formatLessonEntry(lesson, idx) {
  const score = typeof lesson._score === 'number' ? lesson._score.toFixed(2) : 'n/a';
  const ts = lesson.ts || 'unknown';
  const ak = lesson.action_key || '—';
  const root = lesson.root_cause || 'UNKNOWN';
  const impact = lesson.impact || 'advisory';
  const freq = Number.isFinite(lesson.frequency) ? lesson.frequency : 0;
  const lessonText = (lesson.lesson_text || '').trim() || '_(no lesson text recorded)_';
  const hint = (lesson.hint || '').trim();

  const lines = [];
  lines.push(`## Lesson ${idx + 1} — ${root}`);
  lines.push('');
  lines.push(`**What happened:** ${lessonText}`);
  if (hint) {
    lines.push('');
    lines.push(`**Next time:** ${hint}`);
  }
  lines.push('');
  lines.push(`*Metadata: action_key \`${ak}\`, impact \`${impact}\`, frequency ${freq}, score ${score}, recorded ${ts}*`);
  lines.push('');
  return lines.join('\n');
}

function buildTopicFile(kind, scored, opts = {}) {
  const k = sanitizeKindForFilename(kind);
  const frontmatter = [
    '---',
    `name: lessons-${k}`,
    `description: Distilled failure lessons from ${kind} action runs (auto-exported by cortex-x lessons-exporter, Sprint 2.8.1)`,
    'type: feedback',
    `last_updated: ${(opts.now || new Date()).toISOString()}`,
    '---',
    '',
    `# Lessons — ${kind}`,
    '',
    `> Auto-generated from \`$CORTEX_DATA_HOME/journal/<slug>/lessons.jsonl\`. Top ${scored.length} by importance × decay score (Sprint 2.8 memory-decay primitive). Re-run \`cortex-export-lessons\` to refresh.`,
    '',
  ];
  const body = scored.map((l, i) => formatLessonEntry(l, i));
  return [...frontmatter, ...body].join('\n');
}

function buildIndex(topicFiles, opts = {}) {
  const lines = [];
  lines.push('# Memory index');
  lines.push('');
  lines.push(`> Auto-generated by cortex-x \`lessons-exporter\` (Sprint 2.8.1) on ${(opts.now || new Date()).toISOString()}.`);
  lines.push('> Per topic: distilled failure lessons from Steward action runs, decay-weighted by impact × frequency × age.');
  lines.push('');
  for (const tf of topicFiles) {
    lines.push(`- [${tf.title}](${tf.relpath}) — ${tf.count} lessons, top score ${tf.topScore.toFixed(2)}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Export top-scored lessons for a slug into topic files in a memory dir.
 * @param {object} opts
 * @param {string} opts.slug           — required
 * @param {string} [opts.memoryDir]    — target dir for topic files (mkdir -p)
 * @param {string} [opts.dataHome]     — override CORTEX_DATA_HOME
 * @param {number} [opts.topKPerKind]  — default 10
 * @param {number} [opts.minScore]     — default 0.01
 * @param {Date}   [opts.now]
 * @returns {object} summary
 */
function exportLessons(opts = {}) {
  if (!opts.slug) throw new Error('lessons-exporter.exportLessons: slug is required');
  const slug = opts.slug;
  assertSafeSlug(slug); // Sprint 2.8.1 R2 — block path-traversal via slug
  const memoryDir = opts.memoryDir
    || path.join(os.homedir(), '.claude', 'projects', slug, 'memory');
  assertMemoryDirSafe(memoryDir, { allowOutsideHome: opts.allowOutsideHome === true });
  const dataHome = opts.dataHome;
  const topK = Number.isFinite(opts.topKPerKind) && opts.topKPerKind > 0
    ? Math.floor(opts.topKPerKind) : DEFAULT_TOP_K_PER_KIND;
  const minScore = Number.isFinite(opts.minScore) ? opts.minScore : DEFAULT_MIN_SCORE;
  const now = opts.now || new Date();

  // Honor opts.dataHome via env override (lessons.cjs reads CORTEX_DATA_HOME)
  const prevDataHome = process.env.CORTEX_DATA_HOME;
  if (dataHome) process.env.CORTEX_DATA_HOME = dataHome;
  let all;
  try {
    all = lessons.readAllLessons(slug);
  } finally {
    if (dataHome) {
      if (prevDataHome === undefined) delete process.env.CORTEX_DATA_HOME;
      else process.env.CORTEX_DATA_HOME = prevDataHome;
    }
  }

  if (!Array.isArray(all) || all.length === 0) {
    return {
      ok: true,
      slug,
      memoryDir,
      lessons_found: 0,
      lessons_exported: 0,
      topic_files: [],
      index_path: null,
      summary: `No lessons.jsonl for slug=${slug} at ${dataHome || resolveDataHome()} — nothing to export.`,
    };
  }

  // Score + sort (deterministic tie-break for idempotency claim)
  const scored = deterministicReSort(decay.scoreItems(all, { now }));

  // Group by action_kind, slice top-K per group, filter near-zero scores
  const groups = groupByActionKind(scored);
  const topicFiles = [];

  fs.mkdirSync(memoryDir, { recursive: true });

  let totalExported = 0;
  for (const [kind, items] of groups) {
    // Pinned lessons skip the score floor and lead the top-K: they are the
    // operator's never-degrade facts, however old or rarely recalled.
    const filtered = [
      ...items.filter((it) => it.pinned === true),
      ...items.filter((it) => it.pinned !== true && it._score >= minScore),
    ].slice(0, topK);
    if (filtered.length === 0) continue;
    const content = buildTopicFile(kind, filtered, { now });
    const fname = `lessons-${sanitizeKindForFilename(kind)}.md`;
    const full = path.join(memoryDir, fname);
    fs.writeFileSync(full, content, 'utf8');
    topicFiles.push({
      kind,
      title: `lessons-${sanitizeKindForFilename(kind)}`,
      relpath: fname,
      count: filtered.length,
      topScore: filtered[0]._score,
      fullpath: full,
    });
    totalExported += filtered.length;
  }

  // Write the MEMORY.md index
  let indexPath = null;
  if (topicFiles.length > 0) {
    const indexContent = buildIndex(topicFiles, { now });
    indexPath = path.join(memoryDir, 'MEMORY.md');
    fs.writeFileSync(indexPath, indexContent, 'utf8');
  }

  return {
    ok: true,
    slug,
    memoryDir,
    lessons_found: all.length,
    lessons_exported: totalExported,
    topic_files: topicFiles.map((tf) => ({
      kind: tf.kind,
      count: tf.count,
      top_score: tf.topScore,
      path: path.relative(memoryDir, tf.fullpath).replace(/\\/g, '/'),
    })),
    index_path: indexPath ? path.relative(memoryDir, indexPath).replace(/\\/g, '/') : null,
    summary: `Exported ${totalExported} lessons across ${topicFiles.length} action_kinds to ${memoryDir}`,
  };
}

module.exports = {
  exportLessons,
  // exported for tests
  assertSafeSlug,
  assertMemoryDirSafe,
  groupByActionKind,
  buildTopicFile,
  buildIndex,
  sanitizeKindForFilename,
  deterministicReSort,
  DEFAULT_TOP_K_PER_KIND,
  DEFAULT_MIN_SCORE,
};
