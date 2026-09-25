---
title: Verification loop discipline
status: standard
last_review: 2026-05-14
applies_to: every cortex-x project, every Claude Code session
rule_tier: Rule 2 (Critical — verification = correctness gate)
---

# Verification loop

Every implementation step must be paired with a verification step. Building proves the code compiles; verification proves the code does what was asked.

## The pattern (task-list-anchored)

Anchor this on the session task list. On Opus 4.8 / Sonnet 5 / Fable 5 and newer, Claude Code (v2.1.233+) no longer offers `TaskCreate` / `TodoWrite`: keep the list as a checklist in the reply or in PROGRESS.md, or set `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` to restore the tools. Either way, each unit of work comes in pairs:

```
Implementation: build the password reset endpoint
Verification:   curl + grep for 200 + assert email sent (manual mailtrap inbox check)

Implementation: wire avatar upload UI in profile page
Verification:   chrome-devtools MCP → screenshot → assert thumbnail renders + S3 URL persists

Implementation: add `read_set` criterion kind to spec-verifier
Verification:   npm test -- --filter=spec-verifier + grep journal for criterion_ok=true
```

Before commit, the verification task MUST be checked off. A green build is necessary, not sufficient.

## Three failure modes (and their verification primitives)

| Failure mode | What goes wrong | Verification primitive |
|---|---|---|
| **Visual drift** | UI renders but looks wrong (cropped, misaligned, contrast fail, mobile broken) | `chrome-devtools` MCP → screenshot → visual diff against the brief. For polished assets: also Lighthouse a11y. |
| **Functional regression** | Handler responds 200 but does the wrong thing (writes to wrong table, races, drops fields) | Integration test hitting a real DB + asserting state, OR manual smoke with `curl` + grep, OR DevTools network panel + payload assertion |
| **Data-shape drift** | Endpoint returns valid JSON but missing fields the consumer expects | Zod runtime parse at boundary, OR `read_set` spec-verifier criterion asserting which files/fields the action touched, OR contract test against captured fixture |

The verification primitive is dictated by the failure mode, not by personal habit. UI work without a screenshot is a discipline gap.

## "95% confidence" baseline (Sprint 2.27 from `32-tricks-claude-code.md` hack #9)

For ambiguous briefs, ask clarifying questions until you're at ~95% confidence about scope + acceptance criteria BEFORE the first edit. One round of questions saves 3-4 rounds of corrections. Canonical phrasing lives in `prompts/95-confidence.md` — reference it instead of inlining the prompt.

The 95% bar applies most strongly to:
- New features (scope, error states, edge cases)
- Refactors (which call sites move, what stays)
- Bug reports (repro steps, expected vs actual, severity)

For trivial mechanical edits (renames, typo fixes, dependency bumps), skip the confirmation round — the cost of a wrong assumption is lower than the cost of latency.

## Cross-references

- [standards/correctness.md](standards/correctness.md) — Practice 1 (validate at boundaries), Practice 2 (property tests on invariants), Practice 3 (eval-driven dev)
- [standards/testing.md](standards/testing.md) — 5 pillars per test + AI-specific tests
- [standards/context-engineering.md](context-engineering.md) — smart-zone discipline; a reviewer in a fresh/small context is smarter than one in a polluted window
- [prompts/95-confidence.md](prompts/95-confidence.md) — canonical phrasing
- `bin/cortex-claude-md-augment.cjs` BLOCK_VERSION 5 — auto-injects this discipline into operator sessions
- Anthropic's "Building effective agents" (2025) — verifier-loop pattern as a published best practice

## Why this is Rule 2 (Critical), not Rule 3 (Process)

A test suite that passes proves the code compiles + behaves the way the test asserts. It does NOT prove the test asserts what the user asked for. Verification — the human-or-MCP loop closing the gap between "tests pass" and "feature works" — is the layer that turns shipped code into shipped value. Treat it as critical.
