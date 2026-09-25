/**
 * Memory health — measured at session start, never repaired here.
 *
 * cortex-x ships consolidation tools (cortex-dream, memory-decay, cortex-sync)
 * but none of them runs on its own, and nothing told the operator when memory
 * had rotted. On 2026-09-25 the cortex-x library entry was 142 days old with
 * dozens of commits since, and the Claude Code auto-memory index sat at 68% of
 * the loader's byte limit with two-thirds of its entries describing finished
 * sprints. Both were invisible until someone went looking.
 *
 * So this module only measures and reports. Fixing stays a deliberate operator
 * action: consolidation needs judgment, and a hook that silently rewrites
 * memory would be worse than one that stays quiet.
 */
const fs = require('fs');
const path = require('path');

const DAY_MS = 24 * 60 * 60 * 1000;

// Claude Code loads the first 200 lines or 25 KB of MEMORY.md, whichever
// comes first (code.claude.com/docs/en/memory). Anything past that is not
// seen at session start, so warn well before the cut.
const INDEX_MAX_LINES = 200;
const INDEX_MAX_BYTES = 25 * 1024;
const INDEX_WARN_RATIO = 0.75;

// A project memory nobody touched for this long is usually about finished work.
const STALE_PROJECT_DAYS = 120;

// Library entry counts as behind when it is this old AND the repo moved on.
const LIBRARY_STALE_DAYS = 30;
const LIBRARY_STALE_COMMITS = 10;

// Frontmatter lives at the top; never read more than this per memory file, so a
// huge or special file can't stall session start.
const HEAD_BYTES = 4096;

/**
 * Claude Code stores auto-memory under <config>/projects/<root with every
 * non-alphanumeric char replaced by '-'>/memory, where <root> is the git
 * repository (shared by all worktrees and subdirectories) or the project dir
 * outside git (code.claude.com/docs/en/memory). Callers pass candidate roots in
 * priority order. On Windows the drive letter's case depends on how the session
 * was launched ("c--Users-…" vs "C--Users-…"), so fold case there — only there,
 * because on a case-sensitive filesystem /a/App and /a/app are two projects.
 */
function autoMemoryDir(roots, configDir, { foldCase = process.platform === 'win32' } = {}) {
  const projectsDir = path.join(configDir, 'projects');
  let entries;
  // Symlinked / junctioned project folders count too; silence would read as healthy.
  try { entries = fs.readdirSync(projectsDir, { withFileTypes: true }).filter((e) => e.isDirectory() || e.isSymbolicLink()); } catch { return null; }
  for (const root of [].concat(roots).filter(Boolean)) {
    const exact = String(root).replace(/[^a-zA-Z0-9]/g, '-');
    const candidates = entries
      .filter((e) => e.name === exact || (foldCase && e.name.toLowerCase() === exact.toLowerCase()))
      .sort((a, b) => (b.name === exact) - (a.name === exact));
    for (const c of candidates) {
      const dir = path.join(projectsDir, c.name, 'memory');
      if (fs.existsSync(path.join(dir, 'MEMORY.md'))) return dir;
    }
  }
  return null;
}

/**
 * `autoMemoryDirectory` from settings — read from any scope per the docs;
 * highest precedence first (local → project → user). Managed policy and
 * --settings are not visible to a hook and are ignored.
 *
 * Returns null when no setting exists, otherwise `{ dir }` where dir is null if
 * the configured folder has no MEMORY.md yet. A configured-but-empty folder must
 * NOT fall back to the default one: that would report on an index Claude no
 * longer reads.
 */
function configuredMemoryDir(projectRoot, configDir, home) {
  const files = [
    path.join(projectRoot, '.claude', 'settings.local.json'),
    path.join(projectRoot, '.claude', 'settings.json'),
    path.join(configDir, 'settings.json'),
  ];
  for (const f of files) {
    let v;
    try { v = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')).autoMemoryDirectory; } catch { continue; }
    if (typeof v !== 'string' || !v.trim()) continue;
    const expanded = v.trim().replace(/^~(?=$|[\\/])/, home);
    const dir = path.resolve(path.dirname(path.dirname(f)), expanded);
    return { dir: fs.existsSync(path.join(dir, 'MEMORY.md')) ? dir : null };
  }
  return null;
}

/** First HEAD_BYTES of a regular file, or null (symlink, FIFO, dir, unreadable). */
function readHead(file) {
  let fd;
  try {
    if (!fs.lstatSync(file).isFile()) return null;
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(HEAD_BYTES);
    const n = fs.readSync(fd, buf, 0, HEAD_BYTES, 0);
    return buf.subarray(0, n).toString('utf8');
  } catch {
    return null;
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch { /* ignore */ }
  }
}

/** Frontmatter fields this module cares about; tolerant of both schema shapes. */
function readFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const lines = m[1].split(/\r?\n/);
  const field = (name) => {
    for (const line of lines) {
      const f = line.match(new RegExp(`^[ \\t]*${name}:[ \\t]*["']?([^"'#]*?)["']?[ \\t]*(?:#.*)?$`));
      if (f) return f[1];
    }
    return null;
  };
  const pinned = field('pinned');
  return { type: field('type'), modified: field('modified'), pinned: pinned !== null && pinned.toLowerCase() === 'true' };
}

/**
 * Local link targets in the index, normalised to paths relative to the memory
 * dir: `[T](file.md)`, `[T](./file.md)`, `[T](file.md "title")`,
 * `[T](file.md#anchor)`. URLs are skipped.
 */
function indexLinks(indexText) {
  const out = new Set();
  const re = /\]\(\s*([^)\s#]+?\.md)(?:#[^)\s]*)?(?:\s+"[^"]*")?\s*\)/g;
  let m;
  while ((m = re.exec(indexText)) !== null) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(m[1])) continue;
    let target = m[1];
    try { target = decodeURIComponent(target); } catch { /* keep raw */ }
    out.add(path.posix.normalize(target).normalize('NFC'));
  }
  return out;
}

// Bigger than this is far past the loader limit already; don't parse it.
const INDEX_READ_CAP = 1024 * 1024;

/** ISO-ish date not in the future, else NaN — "7.5.2026" or a typo'd year must not mask staleness. */
function parseModified(value, nowMs) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return NaN;
  const ms = Date.parse(value);
  return ms > nowMs + DAY_MS ? NaN : ms;
}

function inspectAutoMemory(dir, nowMs, { foldCase = process.platform === 'win32' } = {}) {
  const indexPath = path.join(dir, 'MEMORY.md');
  const indexBytes = fs.statSync(indexPath).size;
  const indexText = indexBytes <= INDEX_READ_CAP ? fs.readFileSync(indexPath, 'utf8') : '';
  const key = (name) => (foldCase ? name.toLowerCase() : name);
  const links = indexLinks(indexText);
  const linkKeys = new Set([...links].map(key));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');

  const stale = [];
  for (const f of files) {
    const text = readHead(path.join(dir, f));
    if (text === null) continue;
    let mtimeMs;
    try { mtimeMs = fs.statSync(path.join(dir, f)).mtimeMs; } catch { continue; }
    const fm = readFrontmatter(text);
    if (fm.type !== 'project' || fm.pinned) continue;
    const modifiedMs = parseModified(fm.modified, nowMs);
    const touchedMs = Number.isNaN(modifiedMs) ? mtimeMs : modifiedMs;
    if (nowMs - touchedMs > STALE_PROJECT_DAYS * DAY_MS) stale.push(f);
  }

  return {
    indexBytes,
    // A trailing newline ends the last line; it does not start another.
    indexLines: indexText.replace(/\r?\n$/, '').split('\n').length,
    missing: [...links].filter((l) => !fs.existsSync(path.join(dir, l))).sort(),
    orphans: indexText ? files.filter((f) => !linkKeys.has(key(f.normalize('NFC')))).sort() : [],
    stale: stale.sort(),
  };
}

/**
 * Age of the library entry plus the exact ISO instant to count commits from.
 * A future mtime (clock skew, copied file) reads as fresh, not negative.
 */
function libraryAge(entryPath, nowMs) {
  let mtimeMs;
  try { mtimeMs = fs.statSync(entryPath).mtimeMs; } catch { return null; }
  const since = Math.min(mtimeMs, nowMs);
  return { ageDays: Math.floor((nowMs - since) / DAY_MS), sinceIso: new Date(since).toISOString() };
}

// File names go into model context: keep them to a plain charset and short, so
// a crafted name (newlines, instructions) can't masquerade as session context.
const safeName = (n) => {
  const s = String(n).replace(/[^\p{L}\p{N}_.\/ -]/gu, '_');
  return s.length > 120 ? `${s.slice(0, 119)}…` : s;
};
const list = (names) => {
  const shown = names.slice(0, 3).map(safeName).join(', ');
  return names.length <= 3 ? shown : `${shown} +${names.length - 3}`;
};

/**
 * Lines for the session context. Empty when everything is within bounds, so a
 * healthy install stays silent.
 *
 * @param {object} p
 * @param {ReturnType<typeof inspectAutoMemory>|null} p.memory
 * @param {{slug: string, ageDays: number|null, commitsSince: number|null}|null} p.library
 */
function formatMemoryHealth({ memory, library }) {
  const out = [];
  if (memory) {
    const byteRatio = memory.indexBytes / INDEX_MAX_BYTES;
    const lineRatio = memory.indexLines / INDEX_MAX_LINES;
    if (byteRatio >= INDEX_WARN_RATIO || lineRatio >= INDEX_WARN_RATIO) {
      const kb = (memory.indexBytes / 1024).toFixed(1);
      out.push(`  auto-memory index at ${kb} KB / ${memory.indexLines} lines (loader stops at ${INDEX_MAX_BYTES / 1024} KB or ${INDEX_MAX_LINES} lines) — consolidate before entries stop loading`);
    }
    if (memory.missing.length) out.push(`  ${memory.missing.length} index link(s) point to missing files: ${list(memory.missing)}`);
    if (memory.orphans.length) out.push(`  ${memory.orphans.length} memory file(s) not linked from MEMORY.md: ${list(memory.orphans)}`);
    if (memory.stale.length) out.push(`  ${memory.stale.length} project memories untouched for ${STALE_PROJECT_DAYS}+ days: ${list(memory.stale)} — review, merge or delete (add \`pinned: true\` to keep one)`);
  }
  if (library && library.ageDays !== null && library.ageDays >= LIBRARY_STALE_DAYS
      && library.commitsSince !== null && library.commitsSince >= LIBRARY_STALE_COMMITS) {
    out.push(`  cortex library entry ${safeName(library.slug)}.md is ${library.ageDays} days old with ${library.commitsSince} commits since — offer prompts/cortex-sync.md at a natural stopping point`);
  }
  return out.length ? ['Memory health:', ...out] : [];
}

module.exports = {
  autoMemoryDir,
  configuredMemoryDir,
  inspectAutoMemory,
  libraryAge,
  formatMemoryHealth,
  readFrontmatter,
  indexLinks,
  INDEX_MAX_LINES,
  INDEX_MAX_BYTES,
  STALE_PROJECT_DAYS,
  LIBRARY_STALE_DAYS,
  LIBRARY_STALE_COMMITS,
};
