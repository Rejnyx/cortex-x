# cortex-x — capability registry

> **AUTO-GENERATED** by [`bin/cortex-capabilities.cjs`](../bin/cortex-capabilities.cjs). Re-run `npm run capabilities` to refresh. Last generated: 2026-09-25T09:49:00.567Z

> Single source of truth for "what cortex-x can do today." Sprint 2.15 ships this as operator-facing answer to *"I do not even know what we have anymore"* and as future Steward system-prompt injection substrate.

## TL;DR — counts

| Category | Count |
|---|---|
| Steward action_kinds | 21 |
| Steward primitives (`bin/steward/_lib/`) | 54 |
| Universal hooks (`shared/hooks/`) | 11 |
| Standards (rule tiers 0-3) | 35 |
| Profiles (`profiles/`) | 11 |
| Prompts (`prompts/`) | 20 |
| Review-pipeline agents (`agents/`) | 10 |
| GitHub workflows | 23 |
| Tests total | 3253 (unit 2950 · contract 114 · integration 189 · smoke 0) |
| Runtime LoC (`bin/`) | 36,169 |
| Test LoC (`tests/`) | 45,368 |

> _Test count is computed via regex over `test()`/`it()` invocations across `tests/{unit,contract,integration,smoke}/`. The authoritative count for CI/release gating is whatever `npm test` reports (Node test runner) — currently slightly higher (~2339 at HEAD) because `describe()` blocks and some `.skip`/`.todo` variants resolve differently. Both numbers track the same suite; the regex is the discovery-surface estimate, `npm test` is the gate._

## 1. Steward action_kinds (21)

What the Steward autonomous runtime is allowed to DO. Dispatched via cron, manual, or recommendation harvester.

| Action kind | Description |
|---|---|
| `dep_update_patch` | npm outdated → patch-only diffs → npm test gate → draft PR. Deterministic, no LLM call. |
| `doc_drift` | Scan exported symbols (function/class/const/type), check mention in README/CLAUDE.md/docs/, file gh issues for undocumented public API surface. Deterministic — no LLM call. |
| `evolve_daily` | Daily consolidation phase ("Dreaming"). Pure-deterministic scan of journal/ + insights/ + cortex/projects/ — schema-validates journal entries, flags stale-candidate files past freshness thresholds, emits advisory rollup to insights/proposals/<date>-evolve-daily.md. Industry slov… |
| `evolve_weekly` | Weekly consolidation phase ("Dreaming" Phase B). Mines repeated-mistake candidates from journal/*.jsonl across 14-day window, applies deterministic evidence gates (min_events=3, min_projects=2, min_days_span=7), then LLM-validates each surviving candidate via cortex-thinker-styl… |
| `flaky_test_repair` | Marker-based quarantine: scan source for `// HERMES-FLAKY: <reason>` markers above test/it/describe declarations, replace with .skip + remove marker + open gh issue. Deterministic, no LLM call. |
| `lint_fix_shipper` | Run ESLint --fix (auto-fix style + simple violations) + tsc --noEmit (type-check, file issues for non-fixable errors). Deterministic. Capability #8. |
| `mutation_score_drift` | Run incremental mutation tests on touched modules; write reports/mutation.json snapshot; compute drift vs prior baseline. v1: snapshot-only (no PR opening, no auto-test-generation). Deterministic — no LLM call. Sprint 2.3b will land the executor + detector once vitest migration … |
| `pattern_transfer` | Read allowlisted sibling projects (cortex/sibling-projects.json) read-only, distill cross-project patterns into the CURRENT project's lessons-learned.jsonl. v1: journal-only — never opens PRs, never edits sibling repos. LLM-driven. Capability #11. |
| `pr_review_responder` | Monitor open Steward-authored PRs for unresolved reviewer comments, file aggregation issue per PR. v1: deterministic surfacing only — auto-patch parked v0.9+. Capability #9. |
| `recommendation` | Standard cortex/recommendations.md item. LLM produces edits, gates on npm test, atomic commit, draft PR. |
| `recommendation_harvest` | Read closed PRs + CI failures + open issues, append candidate observations to recommendations.md. Read-only — no LLM, no edits to source code. |
| `recommendation_harvest_parallel` | Sprint 2.2 multi-agent variant of recommendation_harvest. Supervisor spawns N=2 workers in git worktrees, each proposes alternative recommendation sets; same-tier judge LLM picks best by rubric. Foundation v0 (Sprint 2.2) ships utilities only — spawner/worker/judge are Sprint 2.… |
| `release_notes_drafter` | After merge to main, read merged PRs since last release tag, draft release notes. Future capability for v1.0+ release-management automation. |
| `secret_history_sweep` | TruffleHog full-history scan with --only-verified. On verified hit: opens gh issue with severity LABEL. NO auto-PR. Read-only against working tree; only writes are journal entries + gh issue create. Fail-open if trufflehog binary missing. |
| `senior_tester_review` | 2-stage hybrid test-quality auditor: deterministic detector (~16 smells with regex; tsDetect 21 + Sandoval ESE 2025 13 + cortex-original 5 in registry) + optional LLM judge for strategic synthesis. Writes journal entry + opens ONE gh issue per run. Never edits source/test files … |
| `tdd_red_green` | Test-first implementation loop: name the target tests, write a failing test, confirm red, implement until green. Executor MUST inject targeted test context (which tests to check), never generic "do TDD" prose (TDAD: generic instructions regress harder than no intervention). Regi… |
| `tech_debt_audit` | Run qlty metrics + qlty smells + knip; snapshot to cortex/debt-snapshot.json; compute drift vs prior snapshot. v1: snapshot-only (no PR opening). Deterministic — no LLM call. |
| `test_coverage_gap` | Cross-reference coverage report (statements < threshold) + recently-edited files, file gh issue per gap. v1: deterministic detection only — LLM-driven test generation parked v0.9+. Capability #6. |
| `todo_triage` | Scan TODO/FIXME/XXX/HACK markers older than N days, dedupe vs open issues, file gh issues with git-blame context. Deterministic — no LLM call. |
| `wiki_consolidate` | Karpathy-style human-readable wiki layer over lessons.jsonl. Phase A is pure-deterministic — reads lessons.jsonl, groups by action_kind, emits one Obsidian-compatible article per kind to $CORTEX_DATA_HOME/wiki/<slug>/capabilities/<action_kind>.md. Frontmatter follows agentskills… |
| `workflow_hardener` | Advisory analyzer for .github/workflows/*.yml — flags unpinned action SHAs, missing permissions:/concurrency:/timeout-minutes:. v1 opens ONE gh issue with proposed patches; v1.5 will add auto-fix behind explicit env flag. |

## 2. Steward primitives (54)

Zero-deps CJS modules in `bin/steward/_lib/` implementing the safety + dispatch + memory layer.

| Module | Sprint | Description |
|---|---|---|
| [`action-engine`](../bin/steward/_lib/action-engine.cjs) | — | pluggable interface for "apply this action's edits" |
| [`action-kinds`](../bin/steward/_lib/action-kinds.cjs) | Sprint 1.8.1 | Sprint 1.8.1 typed action_kind registry |
| [`autoresearch`](../bin/steward/_lib/autoresearch.cjs) | Sprint 2.1 | Sprint 2.1 N-strategy serial autoresearch loop |
| [`cost-safety`](../bin/steward/_lib/cost-safety.cjs) | Sprint 1.9.1 | Sprint 1.9.1 multi-window cost safety + loop detector |
| [`doc-agent-readability`](../bin/steward/_lib/doc-agent-readability.cjs) | Sprint 2.8.3 | bin/steward/_lib/doc-agent-readability.cjs — Sprint 2.8.3 v0 |
| [`env`](../bin/steward/_lib/env.cjs) | — |  |
| [`eval-judge`](../bin/steward/_lib/eval-judge.cjs) | Sprint 3.0 | bin/steward/_lib/eval-judge.cjs — Sprint 3.0 v2 |
| [`eval-runner`](../bin/steward/_lib/eval-runner.cjs) | Sprint 3.0 | bin/steward/_lib/eval-runner.cjs — Sprint 3.0 v0 |
| [`eval-scorer`](../bin/steward/_lib/eval-scorer.cjs) | Sprint 3.0 | bin/steward/_lib/eval-scorer.cjs — Sprint 3.0 v0 |
| [`evolve-action`](../bin/steward/_lib/evolve-action.cjs) | Sprint 2.19 | bin/steward/_lib/evolve-action.cjs — Sprint 2.19 daily Dreaming handler |
| [`evolve-weekly-action`](../bin/steward/_lib/evolve-weekly-action.cjs) | Sprint 2.19 | bin/steward/_lib/evolve-weekly-action.cjs — Sprint 2.19 v1 |
| [`external-adapter`](../bin/steward/_lib/external-adapter.cjs) | Sprint 3.4 | bin/steward/_lib/external-adapter.cjs — Sprint 3.4 v0 |
| [`gh-ops`](../bin/steward/_lib/gh-ops.cjs) | Sprint 1.6.19 | GitHub CLI wrapper for Steward draft-PR creation (Sprint 1.6.19) |
| [`git-ops`](../bin/steward/_lib/git-ops.cjs) | — | atomic git operations for Hermes's commit-per-action contract |
| [`git-trailers`](../bin/steward/_lib/git-trailers.cjs) | — | build commit messages with parseable Git trailers (MUST-H3) |
| [`halt-check`](../bin/steward/_lib/halt-check.cjs) | — | file-based kill-switch detection (MUST-H5) |
| [`journal`](../bin/steward/_lib/journal.cjs) | — | append-only structured journal writer (MUST-H4) |
| [`lessons`](../bin/steward/_lib/lessons.cjs) | Sprint 1.8.3 | Sprint 1.8.3 ReasoningBank-lite memory module |
| [`lessons-exporter`](../bin/steward/_lib/lessons-exporter.cjs) | Sprint 2.8.1 | bin/steward/_lib/lessons-exporter.cjs — Sprint 2.8.1 |
| [`lessons-search`](../bin/steward/_lib/lessons-search.cjs) | Sprint 3.2 | bin/steward/_lib/lessons-search.cjs — Sprint 3.2 v0 |
| [`llm-judge-schema`](../bin/steward/_lib/llm-judge-schema.cjs) | Sprint 2.11.2 | Sprint 2.11.2 Correctness H2 fix |
| [`lock`](../bin/steward/_lib/lock.cjs) | — | per-project mutex for Hermes runs (MUST-H2) |
| [`loop-detector`](../bin/steward/_lib/loop-detector.cjs) | Sprint 2.12 | Sprint 2.12 intra-run tool-call loop detector |
| [`memory-decay`](../bin/steward/_lib/memory-decay.cjs) | Sprint 2.8 | Sprint 2.8 — importance-weighted memory decay primitive. |
| [`otel-emitter`](../bin/steward/_lib/otel-emitter.cjs) | Sprint 2.0 | Sprint 2.0 zero-deps OTLP HTTP emitter for Steward |
| [`otel-protobuf`](../bin/steward/_lib/otel-protobuf.cjs) | Sprint 2.0.1 | Sprint 2.0.1 zero-deps OTLP protobuf encoder |
| [`policy-check`](../bin/steward/_lib/policy-check.cjs) | — | Steward Ring 1 denylist (over block-destructive Ring 2) |
| [`project-ledger`](../bin/steward/_lib/project-ledger.cjs) | Sprint 2.2 | Sprint 2.2 (Ralph-inspired): append-only success-side |
| [`r2-verdict`](../bin/steward/_lib/r2-verdict.cjs) | Sprint 2.46 | SPDX-License-Identifier: Apache-2.0 |
| [`r2-verdict-journal`](../bin/steward/_lib/r2-verdict-journal.cjs) | Sprint 2.46.1 | SPDX-License-Identifier: Apache-2.0 |
| [`r2-verdict-keys`](../bin/steward/_lib/r2-verdict-keys.cjs) | Sprint 2.46.1 | SPDX-License-Identifier: Apache-2.0 |
| [`recommendations`](../bin/steward/_lib/recommendations.cjs) | — | parser for cortex/recommendations.md |
| [`research-trigger`](../bin/steward/_lib/research-trigger.cjs) | Sprint 2.14 | Sprint 2.14 research-when-uncertain rule mechanics |
| [`routing-policy`](../bin/steward/_lib/routing-policy.cjs) | Sprint 2.0b | Sprint 2.0b per-action USD cap + journal scan |
| [`routing-table`](../bin/steward/_lib/routing-table.cjs) | Sprint 2.0b | Sprint 2.0b action-kind-based model routing |
| [`rubric-extractor`](../bin/steward/_lib/rubric-extractor.cjs) | Sprint 3.0 | bin/steward/_lib/rubric-extractor.cjs — Sprint 3.0 v2 |
| [`safety`](../bin/steward/_lib/safety.cjs) | Sprint 2.5b | Shared SSOT for slug/date guards + markdown sanitization + |
| [`secret-sweep-action`](../bin/steward/_lib/secret-sweep-action.cjs) | Sprint 2.6b | Sprint 2.6b TruffleHog wrapper |
| [`self-invocation`](../bin/steward/_lib/self-invocation.cjs) | Sprint 2.13 | Sprint 2.13 self-invocation tracker + 4 hard guardrails |
| [`senior-tester-action`](../bin/steward/_lib/senior-tester-action.cjs) | Sprint 2.11 | Sprint 2.11 senior_tester_review Phase B + C |
| [`sibling-manifest`](../bin/steward/_lib/sibling-manifest.cjs) | Sprint 2.7 | Sprint 2.7 — sibling-projects manifest validator. |
| [`sibling-reader`](../bin/steward/_lib/sibling-reader.cjs) | Sprint 2.7 | Sprint 2.7 — sibling-projects read-only file access helper. |
| [`skill-scaffolder`](../bin/steward/_lib/skill-scaffolder.cjs) | Sprint 3.1 | bin/steward/_lib/skill-scaffolder.cjs — Sprint 3.1 v0 |
| [`snapshot-diff`](../bin/steward/_lib/snapshot-diff.cjs) | Sprint 2.5 | Sprint 2.5 — zero-deps JSON snapshot diff helper. |
| [`spec-verifier`](../bin/steward/_lib/spec-verifier.cjs) | Sprint 1.9.0 | Sprint 1.9.0 spec-driven verification runner |
| [`splice`](../bin/steward/_lib/splice.cjs) | Sprint 2.2.5 | Sprint 2.2.5 v0+v1: position-aware file edit primitive |
| [`tech-debt-audit`](../bin/steward/_lib/tech-debt-audit.cjs) | Sprint 2.5 | Sprint 2.5 — tech_debt_audit executor. |
| [`test-smell-detector`](../bin/steward/_lib/test-smell-detector.cjs) | Sprint 2.11 | Sprint 2.11 senior_tester_review Phase A |
| [`test-smell-registry`](../bin/steward/_lib/test-smell-registry.cjs) | Sprint 2.11 | Sprint 2.11 senior_tester_review smell taxonomy |
| [`topology`](../bin/steward/_lib/topology.cjs) | Sprint 2.2 | Sprint 2.2 v0 foundation: multi-agent supervisor/worker primitives |
| [`verifier`](../bin/steward/_lib/verifier.cjs) | — | runs the project's verification commands (`npm test` and |
| [`wiki-consolidate`](../bin/steward/_lib/wiki-consolidate.cjs) | Sprint 2.8.2 | bin/steward/_lib/wiki-consolidate.cjs — Sprint 2.8.2 v0 (Phase A only) |
| [`workflow-hardener-action`](../bin/steward/_lib/workflow-hardener-action.cjs) | Sprint 2.5b | Sprint 2.5b advisory analyzer |
| [`worktree-guard`](../bin/steward/_lib/worktree-guard.cjs) | Sprint 2.30 | Sprint 2.30 — refuse to run Steward in a non-primary |

## 3. Universal hooks (11)

Claude Code session hooks shipped to `~/.claude/shared/hooks/` via install. Apply to every project.

| Hook | Description |
|---|---|
| [`auto-orchestrate`](../shared/hooks/auto-orchestrate.cjs) | cortex-x UserPromptSubmit hook — auto-orchestration soft-gate. |
| [`block-destructive`](../shared/hooks/block-destructive.cjs) | // Filesystem destruction |
| [`post-compact`](../shared/hooks/post-compact.cjs) | cortex-x PostCompact hook — completes the compaction recovery loop. |
| [`post-tool-use`](../shared/hooks/post-tool-use.cjs) | ---- Silent error log (observability for catch-swallowed failures) ---- |
| [`pre-commit-review-gate`](../shared/hooks/pre-commit-review-gate.cjs) | cortex-x PreToolUse hook — commit-time review gate. |
| [`pre-compact`](../shared/hooks/pre-compact.cjs) | Build recovery file |
| [`pre-tool-use`](../shared/hooks/pre-tool-use.cjs) | ---- Silent error log (mirrors post-tool-use.cjs, shares redact lib) ---- |
| [`session-start`](../shared/hooks/session-start.cjs) | // Detect active sprint/phase (### or ####, NOT marked done) |
| [`subagent-start`](../shared/hooks/subagent-start.cjs) | cortex-x SubagentStart hook — discipline propagation into subagents. |
| [`task-completed`](../shared/hooks/task-completed.cjs) | cortex-x TaskCompleted hook — verification gate. |
| [`tirith-scan`](../shared/hooks/tirith-scan.cjs) | cortex-x SessionStart hook — context-file prompt-injection scanner (Tirith wrapper). |

## 4. Standards (35)

Rule tiers — see [`standards/RULE-1.md`](../standards/RULE-1.md) for hierarchy (Rule 0 distribution / 1 invariants / 1.5 coding behavior / 2 critical / 3 process).

| Standard | Title | Snippet |
|---|---|---|
| [`RULE-1`](../standards/RULE-1.md) | RULE 1 — Inviolable Architectural Invariants | Every piece of knowledge has **exactly one authoritative source**. No duplication. No drift. |
| [`accessibility`](../standards/accessibility.md) | Accessibility — Usable by Everyone | 1. **Perceivable** — content is presented in ways users can perceive (text alternatives, captions, color contrast) |
| [`ai-patterns`](../standards/ai-patterns.md) | AI Patterns — Agentic Architecture Standards | **Agentic-ready by default, agentic-heavy by intent.** |
| [`ai-sdks`](../standards/ai-sdks.md) | AI SDKs — Selection Standard | \| SDK \| Vendor \| Lang \| Model lock-in \| Best at \| |
| [`auto-optimization`](../standards/auto-optimization.md) | Auto-Optimization — Wizard Philosophy | **Rule 1.5 extension.** Not inviolable (Rule 1), but a contract on how cortex-x behaves. Violations degrade UX; don't break projects. |
| [`auto-orchestration`](../standards/auto-orchestration.md) | Standard — Auto-Orchestration (3-fronta rule) | \| Front \| Parallelize? \| Default count \| Evidence \| |
| [`coding-behavior`](../standards/coding-behavior.md) | Coding Behavior — Meta-Rules for LLM Code Generation | 2026-04-17 retrospective: the cortex-x scaffold work itself committed two behavioral anti-patterns caught only after the 5-agent review pipeline ran. Mass find-replace of a maintainer's name (drive-by refactor) and over-engineered 200-line |
| [`coding-behavior-examples`](../standards/coding-behavior-examples.md) | Coding Behavior — Concrete Examples | **Task:** "Add user export." |
| [`context-engineering`](../standards/context-engineering.md) | Context engineering | The working context is a budget, not a backpack. Past a point, every token you add makes the model reason *worse* — not because the window is full, but because attention dilutes. Manage the budget deliberately. |
| [`correctness`](../standards/correctness.md) | Correctness — Verification Beyond Structure | **Rule 2 (Critical)** — alongside Security, Testing, Observability. Must-have for any project moving beyond prototype. Review-pipeline flag = blocker. |
| [`documentation`](../standards/documentation.md) | Standard - Documentation (living docs + cortex-doc-regen) | This standard codifies the contract. It supersedes the legacy "Documentation - Knowledge That Outlives Your Memory" guidance for cortex-x repo docs; project-level docs (README, CLAUDE.md, PROGRESS.md, ADRs) keep their original conventions a |
| [`error-handling`](../standards/error-handling.md) | Error Handling — Fail Gracefully, Recover Automatically | 1. **Fail fast at boundaries, fail gracefully inside.** Validate at API entry, crash early. Within the app, catch and recover. |
| [`git-workflow`](../standards/git-workflow.md) | Git Workflow — Commit Like a Pro | ``` |
| [`modular`](../standards/modular.md) | Modular — Isolated Subsystems | Tightly coupled code is where bugs hide and velocity dies. When changing X requires touching A, B, C, you don't change X — you avoid it. Modularity buys you the ability to refactor, replace, and scale individual pieces without cascading rew |
| [`multi-agent-supervisor`](../standards/multi-agent-supervisor.md) | Multi-agent supervisor + agent-as-judge ensemble — when, why, how to gate | cortex-x Steward runs LLM-driven actions serially by default — one process, one prompt, one verified outcome. **Multi-agent parallelism is the wrong default** for shared-context coding tasks because (a) it amplifies errors when topology is |
| [`mutation-testing`](../standards/mutation-testing.md) | Mutation testing — fitness signal beyond "tests pass" | A passing test suite proves nothing about whether the tests would catch a regression. Mutation testing systematically modifies your code (one operator change at a time) and re-runs the tests. If the mutated code still passes all tests, the |
| [`observability`](../standards/observability.md) | Observability — See What's Happening in Production | 1. **Logs** — what happened |
| [`performance`](../standards/performance.md) | Performance — Fast by Default | - **Core Web Vitals targets (2026):** |
| [`scalable`](../standards/scalable.md) | Scalable — Patterns That Survive 10x Growth | You won't know in advance which project succeeds. The ones that take off punish you for shortcuts taken early. Scalable-by-default means growth is exciting, not a crisis. |
| [`security`](../standards/security.md) | Security — Layered Defense from Day One | 1. **No secrets in git.** `.env` in `.gitignore` from first commit. Pre-commit hook blocks accidental commits. |
| [`self-correction`](../standards/self-correction.md) | Self-Correction — What Actually Works in 2026 | **Rule 2 (Critical).** Alongside Correctness — this standard prevents adopting patterns that measurably degrade agent quality. |
| [`ship-ready`](../standards/ship-ready.md) | Ship-Ready — Governance Invariants for Distribution | Anything a stranger would never need to know about the maintainer must not live in templates, prompts, standards, profiles, hooks, or install scripts. Includes: |
| [`skill-validate`](../standards/skill-validate.md) | Skill validation — 3-tier model + ToxicSkills baseline | cortex does NOT reimplement broad spec-conformance lint. `agnix` (npm, 414 rules) already covers that surface well. `cortex-skill-validate` runs AFTER `agnix` and adds three cortex-opinionated layers — spec-driven failure mode, Claude-Code- |
| [`skills`](../standards/skills.md) | Skills — Portable, Progressive-Disclosure Agent Instructions | **Rule 3 (Process)** — should-have convention. Skills are optional for trivial projects but deliver large leverage when you have repeatable procedures. |
| [`sprint-pipeline`](../standards/sprint-pipeline.md) | Standard - Sprint pipeline (canonical 8-step sprint shape) | A cortex-x sprint is a bounded unit of integration work (typically 5–15 |
| [`ssot`](../standards/ssot.md) | SSOT — Single Source of Truth | Duplicated knowledge drifts. Labels in 3 files become 3 slightly different labels. Constants in 5 places become 5 different values after one hasty edit. Bug fixes get applied to 4 of 5 copies. Entropy wins. |
| [`steward-policy`](../standards/steward-policy.md) | Steward Policy — Refusal List, Denylist, MUST patterns | Steward refuses the following at the tool-wrapper layer, **not via system prompt**. Promptword-only enforcement fails under prompt injection (Replit Agent prod-DB wipe, July 2025, is the canonical incident). All seven refusals are encoded i |
| [`story-sizing`](../standards/story-sizing.md) | Story Sizing — Rule 3 | Cortex-x scaffolds projects whose recommendation backlogs are consumed by autonomous agents (Steward, manual `/audit`, Ralph-style loops). Action items must be sized so an LLM can complete one in a single context window without losing track |
| [`test-types-catalog`](../standards/test-types-catalog.md) | Test Types — Exhaustive 2026 Catalog (SSOT) | **For the audit (Phase 5 selection oracle):** |
| [`testing`](../standards/testing.md) | Testing — Confidence Through Layered Coverage | Without tests: |
| [`verification-loop`](../standards/verification-loop.md) | Verification loop | Every implementation step must be paired with a verification step. Building proves the code compiles; verification proves the code does what was asked. |
| [`visual-taste`](../standards/visual-taste.md) | Visual Taste | Use this standard whenever a task lands frontend code or visuals — directly |
| [`voice`](../standards/voice.md) | Voice — cortex-x identity & tone charter | The framework is invisible by default. **Claude is the actor, cortex is the environment.** This document is what cortex sounds like across all skills, so the operator hears one coherent agent — not eleven different bots wearing the cortex h |
| [`web-research`](../standards/web-research.md) | Web Research — Rule 3 standard | cortex-x assumes Claude's training cutoff is **older than the relevant external state** for most non-trivial tasks. Framework versions, library APIs, CVEs, regulatory thresholds, and design trends move faster than any model release. **Imple |
| [`workflows`](../standards/workflows.md) | Standard Workflows (dynamic multi-agent orchestration) | Decision tree — pick the orchestration primitive that fits the shape of the task, |

## 5. Profiles (11)

Project archetypes used by the scaffold. Each declares stack, ai_sdk, agentic posture.

| Profile | Agentic-ready | AI SDK | Description |
|---|---|---|---|
| [`ai-agent`](../profiles/ai-agent.yaml) | — | claude-agent # autonomy tier: filesystem/shell, Skills, MCP, subagents | Autonomous multi-step AI agent — Claude Agent SDK primary, Vercel AI SDK optional for web surface, three-layer memory, MCP integration |
| [`astro-static`](../profiles/astro-static.yaml) | — | none | Static site (portfolio, blog, docs) — Astro 5 with Content Layer, Server Islands, zero-JS default |
| [`browser-agent`](../profiles/browser-agent.yaml) | — | — | Agent that drives a real browser (CDP/Playwright) — scraping, RPA, automated testing, onboarding flows, workflow automation. Extends ai-agent profile with browser-specific security + tooling. |
| [`chatbot-platform`](../profiles/chatbot-platform.yaml) | — | vercel # primary: streaming + provider-agnostic for multi-tenant flexibility | Multi-tenant chatbot platform — channel adapters (Telegram, WhatsApp, Web, Chatwoot), RLS tenant isolation, orchestrator |
| [`cli-tool`](../profiles/cli-tool.yaml) | — | none # most CLIs are non-AI. Set to 'claude-agent' for AI-primary CLIs. | Node.js CLI tool distributed via npm — command-line utility with prompts, colored output, cross-platform |
| [`kiosek`](../profiles/kiosek.yaml) | — | none | Restaurant self-service touch kiosk — PWA, offline-first, large tap targets, idle timeout |
| [`minimal`](../profiles/minimal.yaml) | — | none | Minimal scaffold for quick prototypes and experiments — no heavy architecture |
| [`nextjs-saas`](../profiles/nextjs-saas.yaml) | ✅ | vercel # web tier: streaming UI, provider-agnostic, Next.js-native | Next.js 16 + Supabase + AI SaaS — the primary agentic-SaaS stack, AGENTIC-READY by default. Even without AI at MVP, structure allows plug-in without refactor. |
| [`qa-engineer`](../profiles/qa-engineer.yaml) | ✅ | vercel # web tier; AI-aug agents like Claude Code MCP slot in here | QA-focused profile — for projects where the audit + retrofit goal is testing strategy specifically (existing repo, AI-augmented tester, ISO 25010 + ASVS 5.0 alignment). Pairs with /test-audit prompt. |
| [`tauri-desktop`](../profiles/tauri-desktop.yaml) | — | vercel # webview frontend; works well for embedded chat UIs | Cross-platform desktop app — Tauri 2 (Rust backend + Web frontend), 3MB binary, iOS/Android targets |
| [`waas-template`](../profiles/waas-template.yaml) | — | vercel # ready for per-tenant AI features (chatbots, copy gen) | Website-as-a-Service template — multi-tenant website with design system, style presets, per-client customization |

## 6. Prompts (20)

Reusable Claude Code prompts in `prompts/`. Invoke via `/`-commands or paste-into-session.

| Prompt | Title | Purpose |
|---|---|---|
| [`95-confidence`](../prompts/95-confidence.md) | 95% confidence prompt fragment |  |
| [`README`](../prompts/README.md) | prompts/ | \| Prompt \| Cadence \| Purpose \| |
| [`agent-first-audit`](../prompts/agent-first-audit.md) | Agent-first docs audit — Sprint 2.8.3 v0 |  |
| [`auto-review`](../prompts/auto-review.md) | Auto-Review — post-implementation parallel pipeline |  |
| [`code-review`](../prompts/code-review.md) | Code Review — Parallel Adversarial Pipeline |  |
| [`cortex-doctor`](../prompts/cortex-doctor.md) | Cortex Doctor — Self-Healthcheck + Drift Detection |  |
| [`cortex-evolve`](../prompts/cortex-evolve.md) | Cortex Evolve — Self-Improvement Loop | Účel:** cortex-x se sám zlepšuje z akumulovaných dat napříč uživatelovými projekty. Weekly consolidation + monthly refinement. **Nikdy nepřepisuje sám sebe** — vždy otevře PR, uživatel reviewuje. |
| [`cortex-goal`](../prompts/cortex-goal.md) | /cortex-goal — plan-first wrapper for Claude Code's native `/goal` |  |
| [`cortex-load`](../prompts/cortex-load.md) | Cortex Load — The Mental Model |  |
| [`cortex-reflect`](../prompts/cortex-reflect.md) | Cortex Reflect Prompt — Manual Deep Reflection |  |
| [`cortex-sync`](../prompts/cortex-sync.md) | Cortex Sync Prompt |  |
| [`existing-project-audit`](../prompts/existing-project-audit.md) | Existing Project Audit — Deep 12-Dimension Analysis + Auto-Research + Retrofit |  |
| [`new-project`](../prompts/new-project.md) | New Project — Discovery + Auto-Research + Architect + Scaffold + Adapt |  |
| [`onboarding-first-10min`](../prompts/onboarding-first-10min.md) | Onboarding — first 10 minutes after fresh install |  |
| [`project-scan`](../prompts/project-scan.md) | Universal Project Scan Prompt (SLIM) |  |
| [`qa-retrofit`](../prompts/qa-retrofit.md) | QA Retrofit — Deep Test-Strategy Audit + Risk Worm-Through + Cited Gap Backlog |  |
| [`retrofit`](../prompts/retrofit.md) | Retrofit — apply cortex-x structure to an existing (messy) project |  |
| [`retrospective`](../prompts/retrospective.md) | Retrospective — Post-Sprint Reflection → cortex library |  |
| [`sprint-status`](../prompts/sprint-status.md) | Sprint Status — Parse PROGRESS.md and Report |  |
| [`steward-setup`](../prompts/steward-setup.md) | Steward setup — guided activation flow |  |

## 7. Review-pipeline agents (10)

Specialized review agents dispatched by R2 review pipeline. Each lives in `agents/` with its own tool allowlist.

| Agent | Tools | Description |
|---|---|---|
| [`README`](../agents/README.md) | — |  |
| [`acceptance-auditor`](../agents/acceptance-auditor.md) | - Read | Reviews diff against acceptance criteria (story/spec/PROGRESS.md). Checks that the implementation actually does what was asked, no more, no less. Has read access to PROGRESS.md, CLAUDE.md, and specs. |
| [`blind-hunter`](../agents/blind-hunter.md) | - Read | Reviews code diff WITHOUT project context. Catches bugs that contextual reviewers rationalize away. Input: git diff only. No project access, no history, no specs. Surfaces: obvious bugs, typos, logic errors, missing error handling, security |
| [`correctness-auditor`](../agents/correctness-auditor.md) | - Read | Correctness-focused code review against cortex-x/standards/correctness.md. Checks: trust-boundary validation (Zod/Pydantic), property-based test coverage on invariant code, eval suite for LLM endpoints, mutation score on critical modules, s |
| [`cortex-thinker`](../agents/cortex-thinker.md) | - Read | Meta-agent that reflects on cortex-x state, detects cross-project patterns, and surfaces proactive suggestions. Invoked at SessionStart, Stop events, or manually via /cortex-reflect. Reads cortex-x/projects/ library and proposes insights gr |
| [`edge-case-hunter`](../agents/edge-case-hunter.md) | - Read | Walks every branching path and boundary condition in changed code. Reports ONLY unhandled edge cases. Has project read access for context, but focuses on what inputs would break the code. Orthogonal to adversarial review — method-driven, no |
| [`planner`](../agents/planner.md) | — | Reads detected stack + project context, picks 3-5 most relevant research topics from the {profile} × {concern} matrix. Used by Phase 5 Adapt (new-project) and Phase 4 Research (existing-project-audit). Returns a prioritized JSON list of top |
| [`security-auditor`](../agents/security-auditor.md) | - Read | Security-focused code review against cortex-x/standards/security.md 8-layer model. Checks: secrets leakage, RLS violations, injection vectors, auth bypass, missing rate limits, insecure defaults. Flags findings with severity + CWE reference |
| [`ssot-enforcer`](../agents/ssot-enforcer.md) | - Read | Scans diff for SSOT (Single Source of Truth) violations per cortex-x/standards/ssot.md. Detects duplicated constants, hardcoded labels that should be in config, copy-paste code that should be extracted, multiple sources of truth for the sam |
| [`synthesizer`](../agents/synthesizer.md) | — | Reads parallel research outputs (planner-dispatched topics) and writes the per-project recommendations.md plus a § Stack reality check section appended to CLAUDE.md. Enforces three-hop citation traceability (claim → finding ID → source URL) |

## 8. GitHub workflows (23)

CI + Steward cron workflows in `.github/workflows/`.

| Workflow | Triggers | Description |
|---|---|---|
| [`capabilities-refresh`](../.github/workflows/capabilities-refresh.yml) | manual · push · pull_request | Auto-regenerate cortex/capabilities.{md,json} when filesystem inputs |
| [`install-smoke`](../.github/workflows/install-smoke.yml) | cron(17 3 * * *) · manual · push · pull_request | 5-lane matrix: linux/macOS bash + Windows (Git Bash, pwsh 7, Windows PowerShell 5.1). |
| [`no-pii`](../.github/workflows/no-pii.yml) | push · pull_request | Two-mode CI gate. |
| [`steward autoresearch (weekly Sunday)`](../.github/workflows/steward-autoresearch.yml) | cron(0 2 * * 0) · manual | steward-autoresearch.example.yml — Sprint 2.1 weekly autoresearch overnight |
| [`steward dep-patch`](../.github/workflows/steward-dep-patch.yml) | cron(0 4 * * 0) · manual | steward-dep-patch.yml — autonomous Steward patch-only dep updater workflow. |
| [`steward doc-drift`](../.github/workflows/steward-doc-drift.yml) | cron(0 5 1 * *) · manual | steward-doc-drift.yml — autonomous Steward documentation-drift detector. |
| [`steward eval-baseline`](../.github/workflows/steward-eval-baseline.yml) | manual | steward-eval-baseline.yml — Sprint 3.0 v1 + LR.1 closure. |
| [`steward evolve-daily`](../.github/workflows/steward-evolve-daily.yml) | cron(0 3 * * *) · manual | steward-evolve-daily.yml — Sprint 2.19 daily Dreaming / consolidation cron. |
| [`steward evolve-weekly`](../.github/workflows/steward-evolve-weekly.yml) | cron(0 4 * * 0) · manual | steward-evolve-weekly.yml — Sprint 2.19 v1 weekly Dreaming Phase B. |
| [`steward flaky-test-repair`](../.github/workflows/steward-flaky-test-repair.yml) | cron(0 7 * * 2) · manual | steward-flaky-test-repair.yml — autonomous Steward flaky-test quarantiner. |
| [`steward harvest`](../.github/workflows/steward-harvest.yml) | cron(0 3 * * *) · manual | steward-harvest.yml — autonomous Steward recommendation harvester workflow. |
| [`steward lint-fix`](../.github/workflows/steward-lint-fix.yml) | cron(0 8 * * 3) · manual | steward-lint-fix.yml — autonomous Steward eslint --fix shipper. |
| [`steward nightly`](../.github/workflows/steward.yml) | cron(0 4 * * *) · manual | steward.yml — autonomous Steward runtime workflow (renamed from hermes.yml |
| [`steward openrouter-key-probe`](../.github/workflows/steward-key-probe.yml) | manual | steward-key-probe.yml — Sprint 3.0+ operator-paced smoke test. |
| [`steward pr-review-responder`](../.github/workflows/steward-pr-review-responder.yml) | cron(0 */4 * * *) · manual | steward-pr-review-responder.yml — autonomous Steward PR comment responder. |
| [`steward secret-history-sweep`](../.github/workflows/steward-secret-history-sweep.yml) | cron(0 2 * * 0) · manual | steward-secret-history-sweep.yml — Sprint 2.6b weekly cron. |
| [`steward senior-tester-review`](../.github/workflows/steward-senior-tester-review.yml) | cron(0 4 1 * *) · manual | steward-senior-tester-review.yml — Sprint 2.11 monthly cron. |
| [`steward tech-debt-audit`](../.github/workflows/steward-tech-debt-audit.yml) | cron(0 9 * * 4) · manual | steward-tech-debt-audit.yml — autonomous Steward qlty + knip snapshot. |
| [`steward test-coverage-gap`](../.github/workflows/steward-test-coverage-gap.yml) | cron(0 6 * * 1) · manual | steward-test-coverage-gap.yml — autonomous Steward coverage-gap detector. |
| [`steward todo-triage`](../.github/workflows/steward-todo-triage.yml) | cron(0 4 1 * *) · manual | steward-todo-triage.yml — autonomous Steward TODO/FIXME triage workflow. |
| [`steward workflow-hardener`](../.github/workflows/steward-workflow-hardener.yml) | cron(0 3 * * 0) · manual | steward-workflow-hardener.yml — Sprint 2.5b weekly cron. |
| [`stryker-mutation`](../.github/workflows/stryker.yml) | manual | Mutation-testing workflow — Sprint 2.3 v0 measure-only posture. |
| [`test`](../.github/workflows/test.yml) | manual · push · pull_request | Fast lane — Linux only, runs the full test suite on every PR + push. |

---

## Regeneration

```bash
npm run capabilities          # writes cortex/capabilities.md + .json
node bin/cortex-capabilities.cjs --json    # machine output
node bin/cortex-capabilities.cjs           # human markdown to stdout
```

A GitHub Actions workflow (`capabilities-refresh.yml`) re-generates this file on every push to `main`. Manual runs are also OK.
