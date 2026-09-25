#!/usr/bin/env node
// cortex-x SubagentStart hook — discipline propagation into subagents.
//
// Why this exists: the cortex discipline block lives in ~/.claude/CLAUDE.md,
// which is loaded into the MAIN session only. Subagents (blind-hunter,
// security-auditor, general-purpose research fan-out, ...) start with a fresh
// context that has NEVER seen R1/R2, the voice charter, the surgical-changes
// rule, or the Windows path caveat. So a six-agent R2 pipeline reviews code
// against generic best practice instead of against cortex standards.
//
// This hook closes that gap: it injects a compact discipline preamble into
// each subagent's own transcript, tailored to the agent_type.
//
// SSOT: the preamble POINTS AT standards files, it does not restate them.
// A fourth copy of the rules would rot. Paths under ~/.claude/shared/ are
// readable by every subagent that has the Read tool.
//
// Contract (per Claude Code hooks reference):
//   stdin  — { session_id, transcript_path, cwd, hook_event_name,
//              agent_id, agent_type }
//   stdout — { continue: true, hookSpecificOutput: {
//                hookEventName: 'SubagentStart', additionalContext } }
//   Context only — this event has NO blocking capability.
//
// Opt-out: CORTEX_SUBAGENT_CONTEXT_DISABLED=1
//
// Fail-open on every error. A broken hook must never break a session.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SHARED_DIR = path.join(os.homedir(), '.claude', 'shared');
const STANDARDS_DIR = path.join(SHARED_DIR, 'standards');

// Universal preamble — applies to every subagent regardless of type.
// Kept deliberately short: subagent context is the scarcest resource in a
// fan-out, and a 200-line preamble would crowd out the actual task.
const CORE = [
  '# cortex-x discipline (injected by SubagentStart hook)',
  '',
  'You are a subagent in a cortex-x session. The operator is David Rajnoha.',
  'These rules override your defaults for the duration of this task.',
  '',
  '- **R1 — research before you assert.** Training data is frozen. If a claim',
  '  depends on current state (versions, pricing, APIs, availability, CVEs),',
  '  verify it before stating it as fact. Cite URLs. Never present frozen',
  '  knowledge as current truth.',
  '- **Surgical scope.** Do exactly the task. No extra refactors, no helpers',
  '  for one-shot operations, no error handling for impossible states.',
  '- **Voice charter.** No greetings, no emoji, no emotion words',
  '  ("perfect!", "great!"). State findings and counts directly.',
  '- **Windows host.** Paths are win32. Write scratch files to `c:\\tmp` or',
  '  `os.tmpdir()`. `/tmp` silently fails here.',
  '- **Evidence over confidence.** Every claim you return must be anchored to',
  '  a `file:line` or a URL. If you could not verify it, label it unverified.',
].join('\n');

// Per-agent-type addenda. Key = agent_type as Claude Code reports it.
// Values point at the standard that agent is meant to enforce, so the
// reviewer grades against cortex rules rather than generic best practice.
const BY_TYPE = Object.freeze({
  'security-auditor': [
    'Grade against `standards/security.md` — the 8-layer model plus',
    '§ Agentic Security (lethal trifecta, 7 MUST patterns) and',
    '§ Browser Automation Security. Report severity + CWE per finding.',
  ],
  'correctness-auditor': [
    'Grade against `standards/correctness.md` — Zod/Pydantic at trust',
    'boundaries, property-based coverage on invariant code, eval suite for',
    'LLM endpoints, mutation score on critical modules.',
  ],
  'ssot-enforcer': [
    'Grade against `standards/ssot.md`. Rule 1 violations are automatic PR',
    'blocks, not suggestions. Duplicated constants and second sources of',
    'truth are the target.',
  ],
  'acceptance-auditor': [
    'Grade the diff against the stated acceptance criteria only. Scope creep',
    'is a finding. Silently narrowed scope is a finding.',
  ],
  'blind-hunter': [
    'You intentionally have NO project context. Do not ask for it and do not',
    'rationalize away a bug because it "probably has a reason". Report what',
    'the diff alone shows.',
  ],
  'edge-case-hunter': [
    'Method-driven, not attitude-driven: walk every branch and boundary in',
    'the changed code. Report ONLY unhandled edge cases.',
  ],
  'general-purpose': [
    'If this task is research, R1 applies hard: search first, cite URLs, and',
    'cache findings under `$CORTEX_DATA_HOME/research/`.',
  ],
  Explore: [
    'Return locations and conclusions, not file dumps. Anchor every answer to',
    '`file:line`.',
  ],
  Plan: [
    'Follow `standards/coding-behavior.md`: Think Before Coding, Simplicity',
    'First, Surgical Changes. Pair every implementation step with a',
    'verification step per `standards/verification-loop.md`.',
  ],
});

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function standardsAvailable() {
  try {
    return fs.existsSync(STANDARDS_DIR);
  } catch (_) {
    return false;
  }
}

function buildContext(agentType) {
  const parts = [CORE];

  const addendum = agentType && BY_TYPE[agentType];
  if (addendum) {
    parts.push('', `## Role addendum — \`${agentType}\``, '', addendum.join('\n'));
  }

  if (standardsAvailable()) {
    parts.push(
      '',
      `Standards SSOT (readable, ${STANDARDS_DIR}): browse only what this task needs.`
    );
  }

  return parts.join('\n');
}

function emit(payload) {
  try {
    process.stdout.write(JSON.stringify(payload));
  } catch (_) {}
}

function main() {
  if (process.env.CORTEX_SUBAGENT_CONTEXT_DISABLED === '1') {
    emit({ continue: true });
    return;
  }

  const input = readInput();
  const agentType = typeof input.agent_type === 'string' ? input.agent_type : null;

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: buildContext(agentType),
    },
  });
}

try {
  main();
} catch (_err) {
  emit({ continue: true });
  process.exit(0);
}
