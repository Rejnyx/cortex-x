#!/usr/bin/env node
// cortex-hooks-register — opt-in registration of cortex-x hooks in
// ~/.claude/settings.json with strong safety mechanics.
//
// Why this exists: cortex install never auto-edits ~/.claude/settings.json
// (Principle 1). But without hook registration, fresh users LOSE the
// load-bearing parts of cortex: SessionStart context injection, block-
// destructive safety, auto-orchestrate parallel agent suggestions,
// post-tool-use journal/budget, pre-compact state save.
//
// This helper is the bridge: explicit user consent → safe idempotent JSON
// merge that preserves every non-cortex entry in settings.json.
//
// Identity rule: a hook entry is "cortex-owned" iff its hooks[].command
// references a script under ~/.claude/shared/hooks/. We only ever add,
// remove, or replace cortex-owned entries. User's own hook entries are
// untouched, even on --remove.
//
// Modes:
//   --apply        register cortex hooks (default if no mode flag)
//   --remove       remove cortex-owned hook entries
//   --status       print current state, no mutation
//   --dry-run      print planned diff, no mutation
//
// Flags:
//   --yes / -y     skip interactive confirmation
//   --json         machine-readable output
//   --help / -h
//
// Exit codes:
//   0   success / nothing-to-do
//   1   user-visible failure (cannot parse JSON, permission denied, etc.)
//   2   internal bug

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseConfirmReply, confirmInteractive } = require('./_lib/confirm.cjs');
const { backupFile, writeFileAtomic } = require('./_lib/atomic-write.cjs');

const HOME = os.homedir();
const SETTINGS_PATH = path.join(HOME, '.claude', 'settings.json');

// Canonical cortex hook entries. Mirror what install.sh's INSTALL_NOTES.md
// documents. If you add a new hook, add it here AND keep INSTALL_NOTES.md
// in sync (SSOT enforcement: tests check the two stay aligned).
const HOOK_SPEC = Object.freeze({
  PreToolUse: [
    { matcher: 'Bash', hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/block-destructive.cjs"', timeout: 5 }] },
    { matcher: 'Bash', hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/pre-commit-review-gate.cjs"', timeout: 6 }] },
    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/pre-tool-use.cjs"', timeout: 3 }] },
  ],
  PostToolUse: [
    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/post-tool-use.cjs"', timeout: 5 }] },
  ],
  UserPromptSubmit: [
    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/auto-orchestrate.cjs"', timeout: 3 }] },
  ],
  SessionStart: [
    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/session-start.cjs"', timeout: 5 }] },
  ],
  PreCompact: [
    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/pre-compact.cjs"', timeout: 5 }] },
  ],
  PostCompact: [
    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/post-compact.cjs"', timeout: 5 }] },
  ],
  SubagentStart: [
    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/subagent-start.cjs"', timeout: 3 }] },
  ],
  TaskCompleted: [
    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/shared/hooks/task-completed.cjs"', timeout: 3 }] },
  ],
});

const CORTEX_PATH_RE = /[\\/]\.claude[\\/]shared[\\/]hooks[\\/]/;

function parseArgs(argv) {
  const args = {
    mode: 'apply',
    yes: false, json: false, help: false, dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.mode = 'apply';
    else if (a === '--remove') args.mode = 'remove';
    else if (a === '--status') args.mode = 'status';
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--yes' || a === '-y') args.yes = true;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else {
      console.error(`cortex-hooks-register: unknown flag '${a}'. Use --help for usage.`);
      process.exit(1);
    }
  }
  return args;
}

function printHelp() {
  console.log('cortex-hooks-register — opt-in registration of cortex-x hooks in ~/.claude/settings.json');
  console.log('');
  console.log('Usage:');
  console.log('  cortex-hooks-register             register cortex hooks (default)');
  console.log('  cortex-hooks-register --remove    remove cortex-owned hook entries');
  console.log('  cortex-hooks-register --status    print current state, no mutation');
  console.log('  cortex-hooks-register --dry-run   print planned diff, no mutation');
  console.log('  cortex-hooks-register --yes       skip interactive confirmation');
  console.log('  cortex-hooks-register --json      machine-readable output');
  console.log('');
  console.log('Identity rule: entries with hooks[].command pointing under');
  console.log('  ~/.claude/shared/hooks/ are cortex-owned. Others are left alone.');
}

function isCortexEntry(entry) {
  if (!entry || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some(
    (h) => h && typeof h.command === 'string' && CORTEX_PATH_RE.test(h.command)
  );
}

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { exists: false, json: {}, raw: '' };
  }
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
  // Strip BOM if present.
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const e = new Error(`settings.json is not valid JSON: ${err.message}`);
    e.code = 'INVALID_JSON';
    throw e;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const e = new Error('settings.json must be a JSON object at top level');
    e.code = 'NOT_OBJECT';
    throw e;
  }
  return { exists: true, json: parsed, raw };
}

function backupSettings(raw) {
  return backupFile(SETTINGS_PATH, raw);
}

function writeSettings(json) {
  // Pretty-print with 2-space indent matches Claude Code's settings.json convention.
  const out = JSON.stringify(json, null, 2) + '\n';
  writeFileAtomic(SETTINGS_PATH, out);
}

// Compute the planned state given current settings.hooks and the requested mode.
// Returns { next: <new hooks block>, summary: { added, removed, kept } }.
function computePlan(currentHooks, mode) {
  const next = {};
  const summary = { added: [], removed: [], kept: [] };

  const events = new Set([
    ...Object.keys(currentHooks || {}),
    ...Object.keys(HOOK_SPEC),
  ]);

  for (const event of events) {
    const cur = Array.isArray(currentHooks?.[event]) ? currentHooks[event] : [];
    // Always preserve non-cortex entries verbatim.
    const userOwned = cur.filter((e) => !isCortexEntry(e));
    for (const _ of userOwned) summary.kept.push(event);

    const cortexCurrent = cur.filter((e) => isCortexEntry(e));
    const cortexDesired = mode === 'apply' ? (HOOK_SPEC[event] || []) : [];

    // Count removed = cortex entries currently present that won't be in next.
    // Count added = cortex entries in next that weren't already byte-equal in current.
    const desiredJson = cortexDesired.map((e) => JSON.stringify(e));
    const currentJson = cortexCurrent.map((e) => JSON.stringify(e));
    for (const c of currentJson) {
      if (!desiredJson.includes(c)) summary.removed.push(event);
    }
    for (const d of desiredJson) {
      if (!currentJson.includes(d)) summary.added.push(event);
    }

    const combined = [...userOwned, ...cortexDesired];
    if (combined.length > 0) next[event] = combined;
  }

  return { next, summary };
}

// Sprint 2.28.3 parity backport: confirmInteractive + parseConfirmReply
// moved to bin/_lib/confirm.cjs. Semantics changed from "empty=yes" (Sprint
// 2.21.2) to "empty=abort" (Sprint 2.28.1 edge HIGH #11). Same threat model
// as cortex-permissions-register: writes settings.json, closed stdin must
// not auto-confirm. Helpers imported at top of file.

// Sprint 2.21.2 R2 hardening: tolerate `"hooks": null` and `"hooks": []`
// in settings.json. Both are valid JSON but neither is a usable hooks block.
// Without this guard, Object.entries(null) throws and exits 2 ("internal
// bug"); Object.entries([]) silently drops the array contents on write.
function normalizeHooksField(value) {
  if (value === null || value === undefined) return {};
  if (Array.isArray(value)) return {};
  if (typeof value !== 'object') return {};
  return value;
}

function statusReport(json) {
  const hooks = normalizeHooksField(json && json.hooks);
  const present = {};
  let totalCortexEntries = 0;
  for (const [event, entries] of Object.entries(hooks)) {
    const cortex = (Array.isArray(entries) ? entries : []).filter(isCortexEntry);
    if (cortex.length > 0) {
      present[event] = cortex.length;
      totalCortexEntries += cortex.length;
    }
  }
  return { settings_present: fs.existsSync(SETTINGS_PATH), cortex_entries_total: totalCortexEntries, per_event: present };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); return 0; }

  let settings;
  try {
    settings = readSettings();
  } catch (err) {
    if (args.json) {
      console.log(JSON.stringify({ ok: false, error: err.message, code: err.code || 'READ_FAILED' }, null, 2));
    } else {
      console.error(`cortex-hooks-register: ${err.message}`);
      console.error(`  Path: ${SETTINGS_PATH}`);
      console.error('  Fix it manually, or move it aside, then re-run.');
    }
    return 1;
  }

  if (args.mode === 'status') {
    const report = statusReport(settings.json);
    if (args.json) {
      console.log(JSON.stringify({ ok: true, ...report }, null, 2));
    } else {
      console.log(`cortex-hooks-register status:`);
      console.log(`  settings.json: ${report.settings_present ? SETTINGS_PATH : '(not present)'}`);
      console.log(`  cortex hook entries: ${report.cortex_entries_total}`);
      for (const [event, count] of Object.entries(report.per_event)) {
        console.log(`    ${event}: ${count} entry(s)`);
      }
      if (report.cortex_entries_total === 0) {
        console.log('  → run `cortex-hooks-register` to register');
      }
    }
    return 0;
  }

  const currentHooks = normalizeHooksField(settings.json.hooks);
  const { next, summary } = computePlan(currentHooks, args.mode);

  const noChange = summary.added.length === 0 && summary.removed.length === 0;
  if (noChange) {
    if (args.json) {
      console.log(JSON.stringify({ ok: true, mode: args.mode, no_change: true, summary }, null, 2));
    } else {
      console.log(`cortex-hooks-register: nothing to do (already in desired state).`);
    }
    return 0;
  }

  if (args.dryRun) {
    if (args.json) {
      console.log(JSON.stringify({ ok: true, mode: args.mode, dry_run: true, summary, next_hooks: next }, null, 2));
    } else {
      console.log('cortex-hooks-register dry-run:');
      console.log(`  add events:    ${[...new Set(summary.added)].join(', ') || '(none)'}`);
      console.log(`  remove events: ${[...new Set(summary.removed)].join(', ') || '(none)'}`);
      console.log(`  user entries preserved in events: ${[...new Set(summary.kept)].join(', ') || '(none)'}`);
      console.log(`  target: ${SETTINGS_PATH}`);
    }
    return 0;
  }

  if (!args.yes) {
    const verb = args.mode === 'apply' ? 'register' : 'remove';
    const promptText =
      `cortex-hooks-register will ${verb} cortex-owned hook entries in ${SETTINGS_PATH}.\n` +
      `  add:    ${[...new Set(summary.added)].join(', ') || '(none)'}\n` +
      `  remove: ${[...new Set(summary.removed)].join(', ') || '(none)'}\n` +
      `  (user-owned entries are left untouched.)\n` +
      `Proceed? [y/N] `;
    if (!confirmInteractive(promptText)) {
      if (args.json) {
        console.log(JSON.stringify({ ok: true, aborted: true }, null, 2));
      } else {
        console.log('cortex-hooks-register: aborted.');
      }
      return 0;
    }
  }

  let backupPath = null;
  if (settings.exists) {
    try {
      backupPath = backupSettings(settings.raw);
    } catch (err) {
      console.error(`cortex-hooks-register: backup failed: ${err.message}`);
      console.error('  refusing to proceed without backup.');
      return 1;
    }
  }

  const newJson = { ...settings.json, hooks: next };
  // If next is empty (all events removed), strip the hooks key cleanly.
  if (Object.keys(next).length === 0) {
    delete newJson.hooks;
  }
  try {
    writeSettings(newJson);
  } catch (err) {
    console.error(`cortex-hooks-register: write failed: ${err.message}`);
    if (backupPath) console.error(`  backup preserved at: ${backupPath}`);
    return 1;
  }

  if (args.json) {
    console.log(JSON.stringify({
      ok: true, mode: args.mode, summary, backup_path: backupPath, settings_path: SETTINGS_PATH,
    }, null, 2));
  } else {
    console.log(`cortex-hooks-register: ${args.mode === 'apply' ? 'registered' : 'removed'} cortex hooks.`);
    if (backupPath) console.log(`  backup: ${backupPath}`);
    console.log(`  next session of Claude Code will pick up the new hook config.`);
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (err) {
    console.error('cortex-hooks-register: internal error:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
}

module.exports = {
  HOOK_SPEC,
  CORTEX_PATH_RE,
  isCortexEntry,
  computePlan,
  parseArgs,
  statusReport,
  normalizeHooksField,
  parseConfirmReply,
};
