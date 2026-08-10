// task-completed.test.cjs — TaskCompleted verification gate.
//
// Turns standards/verification-loop.md from prose into enforcement: an
// implementation task cannot be marked completed until the agent has named
// the verification primitive that proved it works.
//
// The three properties that make this gate safe rather than annoying:
//   1. nudge-once — a blocked task always passes on retry, so no loop
//   2. narrow trigger — trivial work and already-verified tasks pass through
//   3. fail-open — unknown payload shape, unwritable state dir, any throw
//      → task completes
//
// Each test uses a unique task string, because the nudge-once ledger is
// keyed by (session_id, task text) and persists in os.tmpdir() for 24h.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { runHook, parseHookOutput } = require('../../_helpers/run-hook.cjs');

let seq = 0;
function uniqueSession() {
  return `test-session-${process.pid}-${Date.now()}-${seq++}`;
}

function complete(content, opts = {}) {
  const payload = {
    hook_event_name: 'TaskCompleted',
    session_id: opts.session_id || uniqueSession(),
    task: { content },
  };
  const r = runHook('task-completed', payload, opts.env ? { env: opts.env } : undefined);
  return { raw: r, out: parseHookOutput(r.stdout), payload };
}

function isBlocked(out) {
  return out && out.decision === 'block';
}

describe('task-completed: gates unverified implementation tasks', () => {
  const IMPLEMENTATION = [
    'implement the password reset endpoint',
    'build the invoice PDF generator',
    'wire up the Stripe webhook handler',
    'add a new API route for tenant switching',
    'fix the bug in the session refresh race',
    'implementuj nový endpoint pro fakturaci',
    'refactor the auth middleware',
  ];

  for (const content of IMPLEMENTATION) {
    test(`blocks first completion of: "${content}"`, () => {
      const { raw, out } = complete(content);
      assert.equal(raw.exitCode, 0, 'gate expresses blocking via JSON, never exit 2');
      assert.ok(isBlocked(out), `expected block for "${content}"`);
      assert.match(out.reason, /verification-loop\.md/);
    });
  }

  test('block reason names the concrete verification primitives', () => {
    const { out } = complete('implement the avatar upload handler');
    assert.match(out.reason, /screenshot/i);
    assert.match(out.reason, /integration test|curl/i);
  });
});

describe('task-completed: nudge-once (must never loop)', () => {
  test('same task + same session passes on the second attempt', () => {
    const session_id = uniqueSession();
    const content = 'implement the nudge-once regression fixture';

    const first = complete(content, { session_id });
    assert.ok(isBlocked(first.out), 'first attempt should be gated');

    const second = complete(content, { session_id });
    assert.ok(!isBlocked(second.out), 'second attempt MUST pass — otherwise the agent loops');
    assert.equal(second.out.continue, true);
  });

  test('ledger is keyed per task, not per session', () => {
    const session_id = uniqueSession();
    complete('implement widget alpha for ledger keying', { session_id });

    // A DIFFERENT task in the SAME session is still a fresh gate.
    const other = complete('implement widget beta for ledger keying', { session_id });
    assert.ok(isBlocked(other.out), 'a distinct task must get its own nudge');
  });
});

describe('task-completed: does not fire where it would be noise', () => {
  const PASS_THROUGH = [
    // already names a verification primitive
    'run npm test and confirm green',
    'screenshot the hero and assert the thumbnail renders',
    'verify the migration applied',
    'curl the endpoint and assert 200',
    'ověř že build prošel',
    // trivial
    'fix typo in README',
    'rename UserService to AccountService',
    'reformat with prettier',
    'bump the dependency',
    'update the changelog',
    // not implementation-shaped at all
    'read the roadmap and summarize it',
    'ask the operator which profile to use',
  ];

  for (const content of PASS_THROUGH) {
    test(`passes through: "${content}"`, () => {
      const { raw, out } = complete(content);
      assert.equal(raw.exitCode, 0);
      assert.ok(!isBlocked(out), `should NOT gate "${content}"`);
    });
  }
});

describe('task-completed: fail-open', () => {
  test('empty stdin → allow', () => {
    const r = runHook('task-completed', '');
    assert.equal(r.exitCode, 0);
    assert.ok(!isBlocked(parseHookOutput(r.stdout)));
  });

  test('malformed JSON → allow', () => {
    const r = runHook('task-completed', '{nope');
    assert.equal(r.exitCode, 0);
    assert.ok(!isBlocked(parseHookOutput(r.stdout)));
  });

  test('unrecognized payload shape → allow (never guess)', () => {
    const r = runHook('task-completed', { hook_event_name: 'TaskCompleted', mystery: { nested: 1 } });
    assert.equal(r.exitCode, 0);
    assert.ok(!isBlocked(parseHookOutput(r.stdout)));
  });

  test('CORTEX_VERIFY_GATE_DISABLED=1 disables the gate', () => {
    const { raw, out } = complete('implement the disabled-flag regression endpoint', {
      env: { CORTEX_VERIFY_GATE_DISABLED: '1' },
    });
    assert.equal(raw.exitCode, 0);
    assert.ok(!isBlocked(out));
  });
});

describe('task-completed: alternate payload carriers', () => {
  // The TaskCompleted payload shape is not pinned in the public hooks
  // reference, so the hook probes several plausible carriers. If a future
  // Claude Code build moves the field, these tests localize the break.
  const CARRIERS = ['content', 'description', 'subject', 'title', 'text'];

  for (const key of CARRIERS) {
    test(`reads task text from task.${key}`, () => {
      const payload = {
        hook_event_name: 'TaskCompleted',
        session_id: uniqueSession(),
        task: { [key]: `implement the ${key} carrier probe route` },
      };
      const r = runHook('task-completed', payload);
      assert.ok(isBlocked(parseHookOutput(r.stdout)), `task.${key} should be read`);
    });
  }

  test('reads top-level task_content', () => {
    const payload = {
      hook_event_name: 'TaskCompleted',
      session_id: uniqueSession(),
      task_content: 'implement the top-level carrier probe route',
    };
    const r = runHook('task-completed', payload);
    assert.ok(isBlocked(parseHookOutput(r.stdout)));
  });
});
