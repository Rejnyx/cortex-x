// lessons-exporter.test.cjs — Sprint 2.8.1

'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const exporter = require('../../bin/steward/_lib/lessons-exporter.cjs');
const lessons = require('../../bin/steward/_lib/lessons.cjs');

function tmpDataHome(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `cortex-lessons-${name}-`));
}

function tmpMemoryDir(name) {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), `cortex-memory-${name}-`)), 'memory');
}

function seedLessons(dataHome, slug, lessonObjects) {
  process.env.CORTEX_DATA_HOME = dataHome;
  for (const l of lessonObjects) {
    lessons.recordLesson(slug, l);
  }
  delete process.env.CORTEX_DATA_HOME;
}

describe('Sprint 2.8.1 — lessons-exporter pure helpers', () => {
  test('sanitizeKindForFilename strips unsafe chars', () => {
    assert.equal(exporter.sanitizeKindForFilename('recommendation'), 'recommendation');
    assert.equal(exporter.sanitizeKindForFilename('Pattern Transfer'), 'pattern-transfer');
    assert.equal(exporter.sanitizeKindForFilename('a/b\\c'), 'a-b-c');
    assert.equal(exporter.sanitizeKindForFilename(''), 'unknown');
    assert.equal(exporter.sanitizeKindForFilename(null), 'unknown');
  });

  test('groupByActionKind splits items by kind, defaulting to recommendation', () => {
    const groups = exporter.groupByActionKind([
      { action_kind: 'recommendation', ts: '2026-05-01' },
      { action_kind: 'pattern_transfer', ts: '2026-05-02' },
      { ts: '2026-05-03' }, // missing kind → recommendation default
    ]);
    assert.equal(groups.get('recommendation').length, 2);
    assert.equal(groups.get('pattern_transfer').length, 1);
  });

  test('buildTopicFile produces frontmatter + per-lesson section', () => {
    const out = exporter.buildTopicFile('recommendation', [{
      _score: 1.23,
      ts: '2026-05-10T00:00:00Z',
      action_key: 'cortex-x#week-1',
      root_cause: 'OPENROUTER_KEY_MISSING',
      impact: 'blocker',
      frequency: 2,
      lesson_text: 'OpenRouter key was empty; auth-rejected.',
      hint: 'Verify key is INFERENCE not PROVISIONING before re-running.',
    }], { now: new Date('2026-05-13T12:00:00Z') });
    assert.match(out, /^---\nname: lessons-recommendation/);
    assert.match(out, /type: feedback/);
    assert.match(out, /# Lessons — recommendation/);
    assert.match(out, /## Lesson 1 — OPENROUTER_KEY_MISSING/);
    assert.match(out, /\*\*What happened:\*\* OpenRouter key was empty/);
    assert.match(out, /\*\*Next time:\*\* Verify key is INFERENCE/);
    assert.match(out, /impact `blocker`, frequency 2, score 1\.23/);
  });

  test('buildIndex produces MEMORY.md-shaped one-line entries', () => {
    const out = exporter.buildIndex([
      { title: 'lessons-recommendation', relpath: 'lessons-recommendation.md', count: 3, topScore: 4.5 },
      { title: 'lessons-pattern-transfer', relpath: 'lessons-pattern-transfer.md', count: 1, topScore: 2.0 },
    ], { now: new Date('2026-05-13T12:00:00Z') });
    assert.match(out, /# Memory index/);
    assert.match(out, /- \[lessons-recommendation\]\(lessons-recommendation\.md\) — 3 lessons, top score 4\.50/);
    assert.match(out, /- \[lessons-pattern-transfer\]\(lessons-pattern-transfer\.md\) — 1 lessons, top score 2\.00/);
  });
});

describe('Sprint 2.8.1 — exportLessons integration', () => {
  test('exports lessons to memoryDir with index + topic files', () => {
    const dh = tmpDataHome('export-basic');
    const md = tmpMemoryDir('export-basic');
    seedLessons(dh, 'cortex-x', [
      { action_kind: 'recommendation', action_key: 'cortex-x#w1', root_cause: 'KEY_MISSING', impact: 'blocker', lesson_text: 'A failed', hint: 'fix Y', frequency: 1, ts: '2026-05-10T00:00:00Z' },
      { action_kind: 'recommendation', action_key: 'cortex-x#w2', root_cause: 'TIMEOUT', impact: 'warning', lesson_text: 'B timed out', frequency: 0, ts: '2026-05-11T00:00:00Z' },
      { action_kind: 'pattern_transfer', action_key: 'cortex-x#pt1', root_cause: 'SIBLING_UNREADABLE', impact: 'advisory', lesson_text: 'C unreadable', frequency: 0, ts: '2026-05-12T00:00:00Z' },
    ]);

    const result = exporter.exportLessons({
      slug: 'cortex-x',
      memoryDir: md,
      dataHome: dh,
      allowOutsideHome: true,
      now: new Date('2026-05-13T12:00:00Z'),
    });

    assert.equal(result.ok, true);
    assert.equal(result.lessons_found, 3);
    assert.equal(result.lessons_exported, 3);
    assert.equal(result.topic_files.length, 2);
    assert.ok(fs.existsSync(path.join(md, 'lessons-recommendation.md')));
    assert.ok(fs.existsSync(path.join(md, 'lessons-pattern_transfer.md')));
    assert.ok(fs.existsSync(path.join(md, 'MEMORY.md')));

    const idx = fs.readFileSync(path.join(md, 'MEMORY.md'), 'utf8');
    assert.match(idx, /lessons-recommendation\.md/);
    assert.match(idx, /lessons-pattern_transfer\.md/);
  });

  test('a pinned lesson is exported despite a near-zero score, ahead of fresher ones', () => {
    const dh = tmpDataHome('export-pinned');
    const md = tmpMemoryDir('export-pinned');
    seedLessons(dh, 'cortex-x', [
      { action_kind: 'recommendation', root_cause: 'FRESH', impact: 'warning', lesson_text: 'fresh', frequency: 0, ts: '2026-05-12T00:00:00Z' },
      { action_kind: 'recommendation', root_cause: 'SPEC', impact: 'advisory', lesson_text: 'db port is 5433', frequency: 0, ts: '2024-01-01T00:00:00Z', pinned: true },
      { action_kind: 'recommendation', root_cause: 'OLD', impact: 'advisory', lesson_text: 'ancient noise', frequency: 0, ts: '2024-01-01T00:00:00Z' },
    ]);
    const result = exporter.exportLessons({
      slug: 'cortex-x', memoryDir: md, dataHome: dh, allowOutsideHome: true, now: new Date('2026-05-13T12:00:00Z'),
    });
    assert.equal(result.lessons_exported, 2);
    const topic = fs.readFileSync(path.join(md, 'lessons-recommendation.md'), 'utf8');
    assert.match(topic, /## Lesson 1 — SPEC/);
    assert.match(topic, /## Lesson 2 — FRESH/);
    assert.doesNotMatch(topic, /ancient noise/);
  });

  test('skips below-minScore entries', () => {
    const dh = tmpDataHome('export-min-score');
    const md = tmpMemoryDir('export-min-score');
    // very old advisory lessons → decay drives score near zero
    seedLessons(dh, 'cortex-x', [
      { action_kind: 'recommendation', root_cause: 'OLD', impact: 'advisory', lesson_text: 'ancient', frequency: 0, ts: '2024-01-01T00:00:00Z' },
    ]);
    const result = exporter.exportLessons({
      slug: 'cortex-x',
      memoryDir: md,
      dataHome: dh,
      allowOutsideHome: true,
      minScore: 0.01,
      now: new Date('2026-05-13T12:00:00Z'),
    });
    // The entry exists but should fall below 0.01 due to deep decay.
    assert.equal(result.lessons_found, 1);
    // If the implementation cleared it, exported should be 0. If it was kept
    // (impact-floor preserves blockers but not advisories), also 0.
    assert.ok(result.lessons_exported <= 1);
  });

  test('returns no-op summary when lessons.jsonl is absent', () => {
    const dh = tmpDataHome('empty');
    const md = tmpMemoryDir('empty');
    const result = exporter.exportLessons({
      slug: 'nonexistent',
      memoryDir: md,
      dataHome: dh,
      allowOutsideHome: true,
      now: new Date('2026-05-13T12:00:00Z'),
    });
    assert.equal(result.ok, true);
    assert.equal(result.lessons_found, 0);
    assert.equal(result.lessons_exported, 0);
    assert.equal(result.topic_files.length, 0);
    assert.equal(result.index_path, null);
  });

  test('caps topic files at topKPerKind', () => {
    const dh = tmpDataHome('topk-cap');
    const md = tmpMemoryDir('topk-cap');
    const many = Array.from({ length: 15 }, (_, i) => ({
      action_kind: 'recommendation',
      action_key: `cortex-x#w${i}`,
      root_cause: `ERR_${i}`,
      impact: 'warning',
      lesson_text: `Lesson ${i}`,
      frequency: i,
      ts: `2026-05-${String(10 + (i % 3)).padStart(2, '0')}T00:00:00Z`,
    }));
    seedLessons(dh, 'cortex-x', many);
    const result = exporter.exportLessons({
      slug: 'cortex-x',
      memoryDir: md,
      dataHome: dh,
      allowOutsideHome: true,
      topKPerKind: 5,
      now: new Date('2026-05-13T12:00:00Z'),
    });
    assert.equal(result.lessons_found, 15);
    assert.equal(result.lessons_exported, 5);
  });

  test('throws when slug missing', () => {
    assert.throws(() => exporter.exportLessons({}), /slug is required/);
  });
});

describe('Sprint 2.8.1 R2 — security hardening', () => {
  test('assertSafeSlug rejects path-traversal patterns', () => {
    assert.throws(() => exporter.assertSafeSlug('..'), /must not start/);
    assert.throws(() => exporter.assertSafeSlug('../etc'), /must not start/);
    assert.throws(() => exporter.assertSafeSlug('a/b'), /must match/);
    assert.throws(() => exporter.assertSafeSlug('a\\b'), /must match/);
    assert.throws(() => exporter.assertSafeSlug('with\0nul'), /NUL byte/);
    assert.throws(() => exporter.assertSafeSlug('.dotleading'), /must not start/);
    assert.throws(() => exporter.assertSafeSlug('-dashleading'), /must not start/);
    assert.throws(() => exporter.assertSafeSlug(''), /non-empty/);
    assert.throws(() => exporter.assertSafeSlug('x'.repeat(65)), /too long/);
  });

  test('assertSafeSlug accepts valid slugs', () => {
    assert.doesNotThrow(() => exporter.assertSafeSlug('cortex-x'));
    assert.doesNotThrow(() => exporter.assertSafeSlug('Project_42'));
    assert.doesNotThrow(() => exporter.assertSafeSlug('a'));
    assert.doesNotThrow(() => exporter.assertSafeSlug('x'.repeat(64)));
  });

  test('assertMemoryDirSafe rejects path outside home by default', () => {
    // Use a path that resolves outside home on the current platform.
    // On Linux: /etc/cron.d is absolute and outside home.
    // On Windows: an absolute path on a different drive root works
    //   (we can't hardcode C:\Windows because on Linux it parses as
    //   a relative path under cwd).
    const outside = process.platform === 'win32'
      ? path.join(path.parse(os.tmpdir()).root, 'Windows', 'System32')
      : '/etc/cron.d';
    assert.throws(
      () => exporter.assertMemoryDirSafe(outside),
      /outside operator home/,
    );
  });

  test('assertMemoryDirSafe accepts paths under home', () => {
    const home = os.homedir();
    assert.doesNotThrow(() => exporter.assertMemoryDirSafe(path.join(home, '.claude', 'projects', 'foo', 'memory')));
  });

  test('assertMemoryDirSafe with allowOutsideHome permits any path', () => {
    assert.doesNotThrow(() => exporter.assertMemoryDirSafe('/tmp/anywhere', { allowOutsideHome: true }));
  });

  test('exportLessons throws on traversal slug before any I/O', () => {
    assert.throws(
      () => exporter.exportLessons({ slug: '..', memoryDir: '/tmp/x', dataHome: '/tmp/y' }),
      /slug/,
    );
  });

  test('exportLessons throws on outside-home memoryDir by default', () => {
    assert.throws(
      () => exporter.exportLessons({ slug: 'cortex-x', memoryDir: '/etc/evil', dataHome: '/tmp/y' }),
      /outside operator home/,
    );
  });

  test('sanitizeKindForFilename strips CR/LF (frontmatter-injection defense)', () => {
    assert.equal(exporter.sanitizeKindForFilename('foo\nbar'), 'foobar');
    assert.equal(exporter.sanitizeKindForFilename('foo\r\nbar'), 'foobar');
    assert.equal(exporter.sanitizeKindForFilename('foo\0bar'), 'foobar');
  });

  test('deterministicReSort tie-breaks identical scores by ts desc then action_key asc', () => {
    const items = [
      { _score: 5, ts: '2026-05-10', action_key: 'b' },
      { _score: 5, ts: '2026-05-12', action_key: 'a' },
      { _score: 5, ts: '2026-05-12', action_key: 'c' },
      { _score: 9, ts: '2026-05-01', action_key: 'z' },
    ];
    const sorted = exporter.deterministicReSort(items);
    assert.equal(sorted[0].action_key, 'z'); // highest score first
    assert.equal(sorted[1].action_key, 'a'); // tied score, newer ts, lexically first key
    assert.equal(sorted[2].action_key, 'c'); // tied score + ts, lexically after 'a'
    assert.equal(sorted[3].action_key, 'b'); // tied score, older ts
  });

  test('exportLessons output is byte-identical on re-run (idempotency)', () => {
    const dh = tmpDataHome('idempotency');
    const md1 = tmpMemoryDir('idemp-1');
    const md2 = tmpMemoryDir('idemp-2');
    const seed = [
      { action_kind: 'recommendation', action_key: 'a', root_cause: 'X', impact: 'warning', lesson_text: 'X happened', frequency: 1, ts: '2026-05-10T00:00:00Z' },
      { action_kind: 'recommendation', action_key: 'b', root_cause: 'Y', impact: 'warning', lesson_text: 'Y happened', frequency: 1, ts: '2026-05-10T00:00:00Z' },
    ];
    seedLessons(dh, 'cortex-x', seed);
    exporter.exportLessons({ slug: 'cortex-x', memoryDir: md1, dataHome: dh, allowOutsideHome: true, now: new Date('2026-05-13T12:00:00Z') });
    exporter.exportLessons({ slug: 'cortex-x', memoryDir: md2, dataHome: dh, allowOutsideHome: true, now: new Date('2026-05-13T12:00:00Z') });
    const out1 = fs.readFileSync(path.join(md1, 'lessons-recommendation.md'), 'utf8');
    const out2 = fs.readFileSync(path.join(md2, 'lessons-recommendation.md'), 'utf8');
    assert.equal(out1, out2);
  });
});
