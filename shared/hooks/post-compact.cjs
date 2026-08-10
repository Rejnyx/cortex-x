#!/usr/bin/env node
// cortex-x PostCompact hook — completes the compaction recovery loop.
//
// Why this exists: pre-compact.cjs writes `.claude/compact-state.md` before
// every compaction, and until now NOTHING read it back. The mechanism was
// built from one half. On an AUTO compaction mid-session, SessionStart never
// fires again, so the saved sprint state simply sat on disk unused.
//
// PostCompact itself is side-effects-only per the hooks reference — it
// cannot inject context. So this hook drops a small pending marker, and the
// next UserPromptSubmit (auto-orchestrate.cjs) picks it up and injects the
// saved state as additionalContext, then consumes the marker.
//
//   PreCompact       → writes .claude/compact-state.md
//   PostCompact      → writes .claude/compact-recovery-pending.json  (here)
//   UserPromptSubmit → injects compact-state.md, deletes the marker
//
// Contract (per Claude Code hooks reference):
//   stdin  — { session_id, transcript_path, cwd, hook_event_name }
//   stdout — ignored for decision purposes; this event has no decision control
//   matcher — filters on trigger: "manual" | "auto"
//
// Opt-out: CORTEX_COMPACT_RECOVERY_DISABLED=1
//
// Fail-open: compaction has already happened by the time this runs. Nothing
// this hook does may surface as a session error.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, '.claude', 'compact-state.md');
const MARKER_FILE = path.join(ROOT, '.claude', 'compact-recovery-pending.json');

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function main() {
  if (process.env.CORTEX_COMPACT_RECOVERY_DISABLED === '1') {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const input = readInput();

  // No saved state means pre-compact never ran (or ran in another cwd).
  // Nothing to recover — do not leave a marker that would inject an empty
  // block into the next turn.
  if (!fs.existsSync(STATE_FILE)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const marker = {
    at: new Date().toISOString(),
    session_id: typeof input.session_id === 'string' ? input.session_id : null,
    trigger: typeof input.trigger === 'string' ? input.trigger : 'unknown',
    state_file: STATE_FILE,
  };

  try {
    fs.mkdirSync(path.dirname(MARKER_FILE), { recursive: true });
    fs.writeFileSync(MARKER_FILE, JSON.stringify(marker, null, 2));
  } catch (_) {
    // Unwritable .claude/ — recovery is best-effort, never fatal.
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

try {
  main();
} catch (_err) {
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch (_) {}
  process.exit(0);
}
