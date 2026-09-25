// subagent-start.test.cjs — SubagentStart discipline-propagation hook.
//
// Why this hook exists: the cortex discipline block lives in ~/.claude/CLAUDE.md
// and is loaded into the MAIN session only. Subagents start with a fresh
// context that has never seen R1/R2, the voice charter, or the Windows path
// caveat, so an R2 review pipeline grades against generic best practice
// instead of cortex standards.
//
// Contract (per code.claude.com/docs/en/hooks):
//   - Input: { session_id, transcript_path, cwd, hook_event_name,
//              agent_id, agent_type }
//   - Output: { continue, hookSpecificOutput: { hookEventName:
//              'SubagentStart', additionalContext } }
//   - Context-only event: NO blocking capability. The hook must never emit
//     a decision field, or a future Claude Code build could interpret it.
//   - Exit 0 always (fail-open).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { runHook, parseHookOutput } = require('../../_helpers/run-hook.cjs');

function run(payload, env) {
  const r = runHook('subagent-start', payload, env ? { env } : undefined);
  return { raw: r, out: parseHookOutput(r.stdout) };
}

describe('subagent-start: core discipline injection', () => {
  test('emits additionalContext under the SubagentStart event name', () => {
    const { raw, out } = run({ hook_event_name: 'SubagentStart', agent_type: 'general-purpose' });
    assert.equal(raw.exitCode, 0);
    assert.ok(out, 'stdout must be JSON');
    assert.equal(out.hookSpecificOutput.hookEventName, 'SubagentStart');
    assert.ok(out.hookSpecificOutput.additionalContext.length > 0);
  });

  test('core rules are present regardless of agent type', () => {
    const { out } = run({ agent_type: 'some-unknown-agent' });
    const ctx = out.hookSpecificOutput.additionalContext;
    // The four load-bearing rules. If any one silently drops out of the
    // preamble, subagents lose the discipline this hook exists to carry.
    assert.match(ctx, /R1 — research before you assert/);
    assert.match(ctx, /Surgical scope/);
    assert.match(ctx, /Voice charter/);
    assert.match(ctx, /Windows host/);
  });

  test('never emits a decision field (context-only event)', () => {
    const { out } = run({ agent_type: 'blind-hunter' });
    assert.equal(out.decision, undefined);
    assert.equal(out.continue, true);
  });
});

describe('subagent-start: per-agent-type addenda', () => {
  const CASES = [
    ['security-auditor', /8-layer model/],
    ['correctness-auditor', /trust/i],
    ['ssot-enforcer', /Rule 1 violations are automatic PR/],
    ['acceptance-auditor', /Scope creep is a finding|Scope creep/],
    ['blind-hunter', /NO project context/],
    ['edge-case-hunter', /ONLY unhandled edge cases/],
    ['Plan', /verification-loop\.md/],
  ];

  for (const [agentType, expected] of CASES) {
    test(`${agentType} receives its role addendum`, () => {
      const { out } = run({ agent_type: agentType });
      const ctx = out.hookSpecificOutput.additionalContext;
      assert.match(ctx, new RegExp(`Role addendum — \`${agentType}\``));
      assert.match(ctx, expected);
    });
  }

  test('unknown agent_type gets core only, no empty addendum section', () => {
    const { out } = run({ agent_type: 'totally-made-up' });
    const ctx = out.hookSpecificOutput.additionalContext;
    assert.doesNotMatch(ctx, /Role addendum/);
  });

  test('missing agent_type does not crash', () => {
    const { raw, out } = run({ hook_event_name: 'SubagentStart' });
    assert.equal(raw.exitCode, 0);
    assert.ok(out.hookSpecificOutput.additionalContext.length > 0);
  });
});

describe('subagent-start: fail-open + opt-out', () => {
  test('empty stdin → exit 0 with valid JSON', () => {
    const { raw, out } = run('');
    assert.equal(raw.exitCode, 0);
    assert.ok(out);
  });

  test('malformed JSON stdin → exit 0, still injects core', () => {
    const { raw, out } = run('{not valid json');
    assert.equal(raw.exitCode, 0);
    assert.ok(out.hookSpecificOutput.additionalContext.length > 0);
  });

  test('CORTEX_SUBAGENT_CONTEXT_DISABLED=1 suppresses injection entirely', () => {
    const { raw, out } = run(
      { agent_type: 'security-auditor' },
      { CORTEX_SUBAGENT_CONTEXT_DISABLED: '1' }
    );
    assert.equal(raw.exitCode, 0);
    assert.equal(out.hookSpecificOutput, undefined);
    assert.equal(out.continue, true);
  });
});
