# cortex-x Standards

<!-- 32 is the count of standards proper. The snapshot key counts every file in
     standards/, which is 35 = 32 + RULE-1.md + the 2 supporting reference docs
     this same sentence enumerates. Both numbers are correct; they measure
     different things. -->
<!-- doc-currency-disable-next-line -->
> **32 standards** organized in 5 tiers (+ 1 meta-standard at `RULE-1.md` + 2 supporting reference docs). **Rule 0 + Rule 1 are inviolable.** Read [`RULE-1.md`](./RULE-1.md) first — it establishes the hierarchy + active enforcement.

## Tier hierarchy

| Tier | Standard | Status | Enforcement |
|---|---|---|---|
| **🚢 RULE 0** | [Ship-Ready](./ship-ready.md) | Distribution gate | PII grep + license scan + stranger-reproducible install — precedes everything |
| **🔒 RULE 1** | [Rule 1 meta-standard](./RULE-1.md) | — | Contract + active enforcement |
| | &nbsp;&nbsp;[SSOT](./ssot.md) | Inviolable | Scaffold + ssot-enforcer always-on + PR block |
| | &nbsp;&nbsp;[Modular](./modular.md) | Inviolable | ssot-enforcer + architecture-guard patterns |
| | &nbsp;&nbsp;[Scalable](./scalable.md) | Inviolable | RLS + indexes + rate-limits from day 1 |
| **🧠 RULE 1.5** | [Coding behavior](./coding-behavior.md) | Behavioral contract | Think Before Coding · Simplicity First · Surgical Changes — PR guideline |
| (Behavior) | &nbsp;&nbsp;[Coding examples](./coding-behavior-examples.md) | Supporting | Concrete before/after pairs for coding-behavior |
| | [Auto-optimization](./auto-optimization.md) | Wizard philosophy | Detect > suggest > auto-apply; reviewer-pipeline guideline |
| | [Auto-orchestration](./auto-orchestration.md) | Hook trigger | 6-agent parallel review auto-dispatch on non-trivial diffs |
| | [Self-correction](./self-correction.md) | Pattern | Reflexion + Voyager skill cache + autoDream consolidation |
| **⚠️ RULE 2** | [Security](./security.md) | Must-have | Review pipeline flag = blocker |
| (Critical) | [Testing](./testing.md) | Must-have | Review pipeline flag = blocker |
| | [Observability](./observability.md) | Must-have | Review pipeline flag = blocker |
| | [Correctness](./correctness.md) | Must-have | Zod boundaries + property tests + mutation testing; blocker |
| | [Verification loop](./verification-loop.md) | Must-have | Pair every implementation todo with verification todo (screenshot · DevTools MCP · spec-verifier); blocker |
| | [Context engineering](./context-engineering.md) | Must-have | Smart-zone budget (40–60% utilization) · clear tool-noise / compact into artifacts · CLAUDE.md right-altitude; blocker |
| | [Mutation testing](./mutation-testing.md) | Must-have | Stryker 9.6 measurement infra (Sprint 2.3 v0 measure-only) — ratchet to break-threshold after 2-week baseline |
| | [Multi-agent supervisor](./multi-agent-supervisor.md) | Must-have | Sprint 2.2 foundation — when parallel is right, 6 safety contracts the v1 spawner must respect, $1.50 default per-tree USD cap |
| | [Steward policy](./steward-policy.md) | Must-have | Steward runtime safety contract (denylist + caps + actor); blocker for Steward PRs |
| **📋 RULE 3** | [Performance](./performance.md) | Should-have | Review pipeline flag = warning |
| (Process) | [Accessibility](./accessibility.md) | Should-have | Review pipeline flag = warning |
| | [Error handling](./error-handling.md) | Should-have | Review pipeline flag = warning |
| | [Git workflow](./git-workflow.md) | Should-have | Review pipeline flag = warning |
| | [Documentation](./documentation.md) | Should-have | Review pipeline flag = warning |
| | [AI Patterns](./ai-patterns.md) | Should-have | Should-have for non-static profiles |
| | [AI SDKs](./ai-sdks.md) | Should-have | Required `ai_sdk:` key in every profile YAML |
| | [Web research](./web-research.md) | Should-have | Research-before-implement default + citation discipline; warning |
| | [Voice](./voice.md) | Should-have | Cross-skill identity + citation discipline + 5 failure-mode templates; warning |
| | [Skills](./skills.md) | Should-have | agentskills.io SKILL.md spec adoption; required for shared skills |
| | [Skill validation](./skill-validate.md) | Should-have | 3-tier validator (spec / Claude Code / cortex opinion) + ToxicSkills security regex pass; Sprint 2.22 v0 |
| | [Visual taste](./visual-taste.md) | Should-have | Anti-slop rules for frontend (3 dials · em-dash ban · pre-flight checklist · GSAP skeletons); consumed by `designer` Phase 2-3; MIT-vendored from taste-skill (Sprint 2.40) |
| **📚 Supporting** | [Test types catalog](./test-types-catalog.md) | Reference | Catalogue of test kinds (unit/contract/integration/property/mutation/eval) |
| | [Story sizing](./story-sizing.md) | Reference | Story-sizing heuristic for PROGRESS.md |

## Why tiered

Security can be added. Testing can be retrofitted. Observability can be layered on.

**But Rule 1 violations compound into rewrites.** SSOT drift in a 50-file codebase = architectural surgery. Modular violation = cross-feature coupling hell. Scalable violation = works at MVP, dies at PMF.

Tier 1 is the only tier you can't fix later.

## Why 32 (across 5 tiers)

Rule 0 is the distribution gate — without it nothing else matters. Rule 1 is the inviolable architectural foundation (SSOT/Modular/Scalable) — violations compound into rewrites. Rule 1.5 is the behavioral contract for AI-assisted edits (Think Before Coding, Surgical Changes) plus the auto-orchestration + self-correction patterns that keep cortex itself learning. Rule 2 is must-have technical quality (security/testing/observability/correctness) + verification-loop + mutation-testing (Sprint 2.3) + multi-agent-supervisor (Sprint 2.2) + Steward runtime safety. Rule 3 is process polish + cross-cutting concerns (a11y, perf, error handling, git, docs, AI patterns/SDKs, voice charter, web-research, skills standard, skill-validate, visual-taste). Supporting docs (test-types-catalog, story-sizing) are reference material referenced from Rule 2/3 standards.

**Two added 2026-05-14 (Sprint 2.2 + 2.3 v0):** [`mutation-testing.md`](./mutation-testing.md) (Rule 2 — Stryker measure-only baseline as fitness signal beyond "tests pass") and [`multi-agent-supervisor.md`](./multi-agent-supervisor.md) (Rule 2 — 6 safety contracts S1-S6 the v1 spawner must respect: tree-budget cap, depth limit, judge order randomization, fingerprint-based dedup, worker-judge same-tier rule, fail-safe rollback).

**One added 2026-05-28 (Sprint 2.31):** [`context-engineering.md`](./context-engineering.md) (Rule 2 — smart-zone/dumb-zone budget discipline: 40–60% utilization target, reasoning-degrades-faster-than-retrieval, clear-tool-noise vs. compact-into-artifacts decision, CLAUDE.md right-altitude). Validates the existing `pre-compact.cjs` hook as "intentional compaction".

**One added 2026-05-28 (Sprint 2.40):** [`visual-taste.md`](./visual-taste.md) (Rule 3 — anti-slop visual rules selectively vendored from MIT-licensed [taste-skill](https://github.com/Leonxlnx/taste-skill) by Leon Lin: the three taste dials (VARIANCE / MOTION / DENSITY), the em-dash ban, the pre-flight checklist (eyebrow count, hero discipline, zigzag cap, WCAG button/form contrast, consistency locks, copy self-audit, fake-precision ban), the canonical GSAP skeletons (sticky-stack / horizontal-pan / scroll-reveal). Consumed by `designer` Phase 2-3 as the rules layer over the existing process flow.

Most indie projects skip ~80% of this surface. cortex-x ships all of it as defaults.

## How to use

- **Reading:** Skim all once. Deep-read when you hit the topic in practice.
- **In projects:** Linked from CLAUDE.md. Referenced by review agents (code-reviewer checks against these).
- **In PRs:** Reviewer uses standards as checklist.
- **In review pipeline:** Specialized agents enforce subset (security-checker reads security.md, test-writer reads testing.md).

## What's NOT here

- **Language-specific style** (TypeScript, Python idioms) — project CLAUDE.md handles
- **Framework-specific** (Next.js routing, React patterns) — profile YAMLs handle
- **Domain-specific** (medical compliance, financial reporting) — project CLAUDE.md handles

Standards are universal. Profiles are domain-specific. CLAUDE.md is project-specific.

## Evolving

If a new pattern is learned (from incident, from review, from research):
1. Update relevant standard
2. Commit to cortex-x
3. Re-install → all future projects inherit
4. Existing projects pull update via their CLAUDE.md reference

This is the **cortex-x update cycle** — learn once, apply everywhere.
