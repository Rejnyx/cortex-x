// post-compact.test.cjs — PostCompact half of the compaction recovery loop.
//
// Before this hook existed, pre-compact.cjs wrote .claude/compact-state.md
// and nothing ever read it back: on an AUTO compaction mid-session,
// SessionStart never fires again, so the saved sprint state sat unused.
//
// PostCompact is side-effects-only per the hooks reference, so the loop is:
//   PreCompact       → writes .claude/compact-state.md
//   PostCompact      → writes .claude/compact-recovery-pending.json  (here)
//   UserPromptSubmit → injects the state, deletes the marker
//
// This file covers the middle step plus the end-to-end handoff to
// auto-orchestrate.cjs, which is where the loop actually pays off.

'use strict';

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runHook, parseHookOutput } = require('../../_helpers/run-hook.cjs');

const MARKER = '.claude/compact-recovery-pending.json';
const STATE = '.claude/compact-state.md';

const created = [];
function makeProject(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-postcompact-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

afterEach(() => {
  while (created.length) {
    const d = created.pop();
    try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) {}
  }
});

const SAMPLE_STATE = [
  '# Compact Recovery State',
  '## Active Phase',
  'Sprint 2.47 — verification gate',
  '## Stories',
  '| A | hook | in-progress |',
].join('\n');

describe('post-compact: marker write', () => {
  test('writes the pending marker when saved state exists', () => {
    const cwd = makeProject({ [STATE]: SAMPLE_STATE });
    const r = runHook('post-compact', { hook_event_name: 'PostCompact', trigger: 'auto', session_id: 's1' }, { cwd });

    assert.equal(r.exitCode, 0);
    const markerPath = path.join(cwd, MARKER);
    assert.ok(fs.existsSync(markerPath), 'marker must be written');

    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    assert.equal(marker.session_id, 's1');
    assert.equal(marker.trigger, 'auto');
    assert.ok(marker.at, 'marker carries a timestamp');
  });

  test('writes NO marker when there is no saved state to recover', () => {
    // Otherwise every session without a PreCompact snapshot would inject an
    // empty recovery block on its next turn.
    const cwd = makeProject({});
    const r = runHook('post-compact', { hook_event_name: 'PostCompact' }, { cwd });

    assert.equal(r.exitCode, 0);
    assert.equal(fs.existsSync(path.join(cwd, MARKER)), false);
  });

  test('CORTEX_COMPACT_RECOVERY_DISABLED=1 writes no marker', () => {
    const cwd = makeProject({ [STATE]: SAMPLE_STATE });
    const r = runHook('post-compact', { hook_event_name: 'PostCompact' }, {
      cwd,
      env: { CORTEX_COMPACT_RECOVERY_DISABLED: '1' },
    });

    assert.equal(r.exitCode, 0);
    assert.equal(fs.existsSync(path.join(cwd, MARKER)), false);
  });

  test('fail-open on empty and malformed stdin', () => {
    const cwd = makeProject({ [STATE]: SAMPLE_STATE });
    assert.equal(runHook('post-compact', '', { cwd }).exitCode, 0);
    assert.equal(runHook('post-compact', '{bad', { cwd }).exitCode, 0);
  });
});

describe('compaction recovery: end-to-end handoff to auto-orchestrate', () => {
  function promptHook(cwd, prompt) {
    const r = runHook('auto-orchestrate', { prompt, session_id: 's1' }, { cwd });
    return { raw: r, out: parseHookOutput(r.stdout) };
  }

  test('saved state is re-injected on the next prompt, then consumed', () => {
    const cwd = makeProject({ [STATE]: SAMPLE_STATE });
    runHook('post-compact', { hook_event_name: 'PostCompact', trigger: 'auto' }, { cwd });

    const first = promptHook(cwd, 'what were we doing?');
    assert.equal(first.raw.exitCode, 0);
    const ctx = first.out.hookSpecificOutput.additionalContext;
    assert.match(ctx, /cortex-x compaction recovery/);
    assert.match(ctx, /Sprint 2\.47 — verification gate/);

    // Exactly once: the marker is gone and the next turn is clean.
    assert.equal(fs.existsSync(path.join(cwd, MARKER)), false, 'marker must be consumed');
    const second = promptHook(cwd, 'ok continue');
    assert.equal(second.out.hookSpecificOutput, undefined, 'recovery must not repeat');
  });

  test('recovery fires on ANY prompt, not just implementation-shaped ones', () => {
    // The orchestration guidance is trigger-gated; recovery must not be.
    const cwd = makeProject({ [STATE]: SAMPLE_STATE });
    runHook('post-compact', { hook_event_name: 'PostCompact' }, { cwd });

    const { out } = promptHook(cwd, 'thanks');
    assert.match(out.hookSpecificOutput.additionalContext, /compaction recovery/);
  });

  test('recovery and orchestration guidance compose in one injection', () => {
    const cwd = makeProject({ [STATE]: SAMPLE_STATE });
    runHook('post-compact', { hook_event_name: 'PostCompact' }, { cwd });

    const { out } = promptHook(cwd, 'implement a new endpoint for billing');
    const ctx = out.hookSpecificOutput.additionalContext;
    assert.match(ctx, /compaction recovery/);
    assert.match(ctx, /auto-orchestrate/);
  });

  test('orphaned marker (state file deleted) is consumed without injecting', () => {
    const cwd = makeProject({ [STATE]: SAMPLE_STATE });
    runHook('post-compact', { hook_event_name: 'PostCompact' }, { cwd });
    fs.rmSync(path.join(cwd, STATE));

    const { out } = promptHook(cwd, 'hello');
    assert.equal(out.hookSpecificOutput, undefined);
    assert.equal(fs.existsSync(path.join(cwd, MARKER)), false, 'orphan must not retry forever');
  });

  test('oversized state is truncated so it cannot flood the turn', () => {
    const huge = `# Compact Recovery State\n${'x'.repeat(9000)}`;
    const cwd = makeProject({ [STATE]: huge });
    runHook('post-compact', { hook_event_name: 'PostCompact' }, { cwd });

    const { out } = promptHook(cwd, 'hi');
    const ctx = out.hookSpecificOutput.additionalContext;
    assert.match(ctx, /truncated/);
    assert.ok(ctx.length < 6000, `injection should stay bounded; got ${ctx.length}`);
  });
});
