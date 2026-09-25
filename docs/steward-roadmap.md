---
title: Steward / cortex-x roadmap — v0.8 → v1.0 → enterprise-adjacent
status: living document — updated as sprints land
created: 2026-05-09
last_review: 2026-05-08 (5-agent research dispatch + Tier 1 expansion: 2.0.1 + 2.4-2.8)
scope: Single source of truth for the post-Sprint-1.8.13 trajectory. Captures all directions surfaced in the 2026-05-08 SOTA brainstorm + the 4-repo inspection (NousResearch hermes-agent, agent0ai/agent-zero, browser-use/browser-harness) + Karpathy autoresearch. Every sprint here is a hypothesis to refine, not a commitment to ship as-written.
based_on:
  - Brainstorm research dispatch 2026-05-08 (SOTA autonomous agent techniques)
  - Inspection research dispatch 2026-05-08 (4 inspiration sources)
  - Sprint 1.8.12 + 1.8.13 incident loop (real validation gap demonstration)
  - VentureBeat Karpathy autoresearch piece (March 9, 2026, 8.6M views)
---

# Steward / cortex-x roadmap

## 0. North Star

> **Cortex-x evolves from "senior dev compressed into a repo" to "self-extending agent ecosystem that runs while the operator sleeps."** Every sprint must demonstrably move us closer to one of three north-star metrics:
>
> 1. **Verification fidelity** — % of agent edits that don't introduce regressions undetected by `npm test`.
> 2. **Throughput per operator-hour** — net useful PRs Steward opens per hour of operator review time.
> 3. **Self-evolution rate** — # of new capabilities/skills/strategies the agent itself contributes per week.

We currently score: ~70% / ~1 PR per 5 review-min / 0 self-contributions per week.
Frontier (2026-05): ~95% / ~5 PRs per 5 review-min / measurable self-evolution.

## 1. Operating principles for this roadmap

These rules are non-negotiable. Each sprint must satisfy all of them before merge.

| # | Principle | Enforcement |
|---|---|---|
| **R1** | **Research-before-implement.** Every sprint kicks off with a focused web-research dispatch (general-purpose agent, ~600-1200 word brief) on the SOTA for that specific direction *as of the day work starts*. The 2026 frontier shifts in weeks; the cached 2026-05 research expires fast. | Sprint cannot move from "planned" to "in-progress" without a `docs/research/<sprint>-<topic>-<date>.md` decision memo committed. |
| **R2** | **Review pipeline mandatory.** Every sprint that touches `bin/steward/_lib/` or any Rule 1/2 module gets the 6-agent parallel review (acceptance + blind + correctness + security + ssot + edge-case) before commit lands on main. Pattern proven in Sprint 1.6.18 + reused continuously. | `cortex-evolve` review pipeline run, all blocker-severity findings closed. |
| **R3** | **One incident class = one defense layer = one regression test.** Sprint 1.8.12/1.8.13 set the precedent: every real failure mode shipped today produced a code defense + a regression test. No class is fully closed without both. | Test count grows monotonically. Today: 790. After v1.0: ≥1500. |
| **R4** | **Cost ceiling preserved.** Current full-cadence Steward spend is ~$0.024/month. Multi-agent / overnight burst sprints will raise this — but never above $5/month at full cadence per project. Anything bigger needs explicit operator authorization. | `STEWARD_DAILY_USD_CAP` enforcement + monthly journal cost rollup. |
| **R5** | **No human-only edits become Steward-able.** `standards/`, `prompts/`, `profiles/`, `agents/`, top-level `CLAUDE.md`/`README.md`/`module.yaml` are human-only forever. Any sprint extending Steward capability that wants to relax this is automatically rejected. | `bin/steward/_lib/policy-check.cjs` HUMAN_ONLY_PATH + HUMAN_ONLY_TOPLEVEL rules. |
| **R6** | **Backward-compatible by default.** Existing 9 action_kinds keep working through every sprint. New capabilities are additive. Breaking changes are reserved for explicit `vN.0.0` major bumps. | `MIGRATIONS.md` entry per sprint + tests for all 9 existing kinds stay green. |

## 2. Current state (post v0.3.0 ship — 2026-05-14)

| Layer | Status |
|---|---|
| 18-kind action palette (incl. `recommendation_harvest_parallel` registry-only) | ✅ shipped (v0.3.0) |
| Safety: halt-check + lock + journal + denylist + policy-check + multi-window USD caps + loop detector | ✅ shipped |
| Pre-LLM defenses: apiKey trim + KEY_MALFORMED reject | ✅ Sprint 1.8.12b |
| Post-LLM defenses: AUTH_REJECTED distinct + content-preservation | ✅ Sprint 1.8.12c + 1.8.13 |
| Spec-driven verification (7 criterion kinds: shell · file_predicate · regex · ears_text · llm_judge · read_set · mutation_score) | ✅ Sprint 1.9 + 2.18 + 2.3.1 |
| Mutation-testing fitness signal (Stryker measure-only baseline + ratchet criterion) | ✅ Sprint 2.3 v0 (measure-only) + Sprint 2.3.1 v1 (ratchet, advisory) |
| Multi-agent: foundation utilities (topology.cjs canonicalize/budget/Fisher-Yates/validateTopologySafe) | ✅ Sprint 2.2 v0 — spawner deferred to Sprint 2.2.1 |
| Self-improvement: lessons.jsonl + FTS5 index + daily/weekly Dreaming + AlphaEvolve A/B + LLM-as-judge | ✅ Sprint 2.8 + 2.19 + 3.0 + 3.2 |
| Observability: Phoenix OTLP traces + file-based journal + status CLI + cost ledger | ✅ Sprint 2.0 |
| Cron coverage | ✅ 15 active workflows incl. daily Dreaming + weekly Dreaming + Stryker Sun 03:00 |
| Auto-PR creation | ✅ real auto-PRs since 2026-05-09 |
| Tests | **2955** ✅ (0 fail, 2 pre-existing skips) |
| CI grid | test ✅ install-smoke ✅ no-pii ✅ stryker (measure-only) ✅ |
| Anthropic Memory Tool integration | 📋 Sprint 3.X deferred — 3 of 4 blockers active (claude-cli engine collision + value/ceremony ratio + OpenRouter beta-header; the last one partially cleared 2026-09-25, see Sprint 3.X) |

## 3. Tier 1 — Foundation for v1.0 (next 6 weeks, Sprint 1.9 → 2.3)

**Goal**: close the verification gap, enable multi-agent throughput, get measurable observability. Each Tier 1 sprint is a hard prerequisite for at least one Tier 2 sprint.

### Sprint 1.9 — Spec-driven verification ✅ SHIPPED 2026-05-09

**Status**: ✅ Shipped 2026-05-09 (commit `c5d0c8f`). 871/871 → 900/900 tests across all 3 CI lanes. R1 decision memo: `docs/research/sprint-1.9-spec-driven-verification-2026-05-09.md`. Operator approved Option D with all 5 default answers.

**What shipped (vs original scope)**:
- ❌ NOT `cortex/specs/<kind>.spec.yaml` — operator-approved memo Option D rejected the YAML schema for in-registry declaration. SSOT = `bin/steward/_lib/action-kinds.cjs acceptance_criteria[]`. cortex/specs/ kept as extension-spec archive (markdown narrative + plan-override examples).
- ✅ New module `bin/steward/_lib/spec-verifier.cjs` (~530 LoC) — 5 criterion kinds (shell, file_predicate, regex, ears_text, llm_judge), runs BEFORE `npm test` (Q5 default).
- ✅ 8 new error codes: `SPEC_VIOLATION`, `SPEC_WARNING`, `SPEC_MALFORMED`, `SPEC_PREDICATE_THREW`, `SPEC_SHELL_TIMEOUT`, `SPEC_REGEX_NO_MATCH`, `SPEC_OVERRIDE_REJECTED`, `SPEC_LLM_JUDGE_NOT_IMPLEMENTED`.
- ✅ Sprint 1.8.13's hardcoded `EDIT_DESTRUCTIVE_REWRITE` removed from action-engine.cjs; lives only as `recommendation` kind's `no_destructive_rewrite` criterion.
- ✅ Defense-in-depth: `PREDICATE_DENYLIST` blocks `process|require|globalThis|Function|eval|child_process|...` tokens at validateCriterion time.
- ✅ 81 new tests (69 unit + 6 contract + 7 integration; old 1.8.13 tests migrated).
- ✅ `cortex-steward status` renders `spec_violations` rollup (by_criterion_id + recent failures).
- ✅ R2 review pipeline ran 5/6 agents (blind-hunter blocked on path); 9 must-fix items applied before commit (partial-write rollback, Promise predicate detection, ENOENT vs SHELL_TIMEOUT, applies_to:[] semantics, runChecks try/catch, system prompt SSOT, EARS doc 4→5 patterns, lessons root_cause encoding, status spec_failures rendering).

**Follow-up sprints unlocked**: 2.0 (Langfuse), 2.0b (model routing — see PIVOT below), 2.1 (autoresearch fitness signal feeds spec-verifier), 2.3 (mutation testing of spec-verifier itself), 5.1 (souls have their own acceptance_criteria).

**Sprint 1.9.1 backlog**: ears_text runtime semantics, render `spec_failures` block in PR body, EISDIR + symlink hardening in applyEditsToFilesystem, property tests for spec-verifier invariants.

---

### Sprint 1.9.1 — Multi-window cost safety + cross-session loop detector ✅ SHIPPED 2026-05-09

**Status**: ✅ Shipped 2026-05-09. `bin/steward/_lib/cost-safety.cjs` adds `STEWARD_WEEKLY_USD_CAP` ($25 default), `STEWARD_MONTHLY_USD_CAP` ($80), `STEWARD_TOKEN_VELOCITY_CAP` (50K/5min), cross-session loop detector (5x same criterion id in 7 days → write `STEWARD_HALT`), `cortex-steward status --forecast` flag. 4 new error codes. Operator-suggested gap analysis after 2026-05-09 audit ("daily $5 × 30 = $150/month would have passed without alarm").

**Why before Sprint 2.x**: today we have `STEWARD_DAILY_USD_CAP` $5/day + `STEWARD_FAILURE_BREAKER` 3 fails/1h per-action_key. Mid-week burst (Sprint 2.1 autoresearch overnight) or month-long slow drift (Sprint 2.0 Langfuse instrumentation that hits provider's hot path every action) can quietly accumulate $150/month before any single day trips the daily cap. Real-incident anchor: April 2026 dev's $437 retry-loop bill. Lower-effort sprint with high blast-radius reduction; ship before unleashing autoresearch.

**Scope**:
- `STEWARD_WEEKLY_USD_CAP` (default $25) — sliding 7-day journal window sum.
- `STEWARD_MONTHLY_USD_CAP` (default $80) — calendar-month journal window sum.
- `STEWARD_TOKEN_VELOCITY_CAP` (default 50K tokens / 5min sliding window) — burst protection for ensemble + autoresearch.
- **Cross-session loop detector**: same `spec_failures[0].id` fires ≥ 5x in last 7 days for same action_key → write `.cortex/STEWARD_HALT` with reason `LOOP_DETECTED:<criterion_id>:<action_key>`. Halt is operator-cleared (manual `rm` per existing kill-switch UX).
- **Budget warnings**: when current spend reaches 80% of daily/weekly/monthly cap, journal a `budget_warning` event (not blocking) so `cortex-steward status` shows the operator they're approaching the cap.
- `cortex-steward status --forecast` flag: extrapolate current rate × days remaining in window → projected end-of-window spend. JSON + human modes both expose forecast block.

**New error codes**:
- `BUDGET_WEEKLY_CAP_REACHED` (parallel to existing `BUDGET_CAP_REACHED` for daily)
- `BUDGET_MONTHLY_CAP_REACHED`
- `TOKEN_VELOCITY_CAP_REACHED`
- `LOOP_DETECTED` (halt reason in STEWARD_HALT)

**Acceptance criteria for the sprint itself**:
- [ ] All 3 caps work in the existing pre-flight gate location (before lock acquisition, like daily cap).
- [ ] Token velocity gate has 5-min sliding window precision.
- [ ] Loop detector triggers on simulated 5x same-criterion failure pattern (integration test).
- [ ] Forecast shown when spend > 50% of any cap.
- [ ] Existing daily cap behaviour unchanged (regression).
- [ ] ≥ 15 new tests, full suite stays green.

**Implementation files**:
- New `bin/steward/_lib/cost-safety.cjs` (~200 LoC) — window-sum + velocity computation.
- `bin/steward/execute.cjs` — hook the new gates in pre-flight order: daily → weekly → monthly → velocity → loop.
- `bin/steward/status.cjs` — render new caps + forecast block.
- New `tests/unit/steward/cost-safety.test.cjs` (~12 tests) + `tests/integration/cost-safety-pipeline.test.cjs` (~5 tests).

**Out of scope**: alerting (email/Telegram). Operator reads status output during normal cadence; alert pipeline waits for Sprint 2.0 (Langfuse handles it).

**Stolen from**: industry incident response patterns + cortex-x's own R3 principle (one incident = one defense layer + one regression test). Audit-of-the-audit: the absence of monthly/velocity gates was flagged by operator's intuition during 2026-05-09 review, validated by web research showing Anthropic OAuth restrictions + similar runaway-cost incidents.

---

### Sprint 2.0 — Observability-as-a-service ✅ SHIPPED 2026-05-08 (commit `aadeef4`)

**Status**: ✅ Shipped 2026-05-08. Phoenix self-hosted single-container observability + zero-deps OTLP/JSON emitter (~530 LoC). 12 must-fix items from 6-agent R2 review applied pre-commit. **Followup Sprint 2.0.1 below addresses Phoenix protobuf-only constraint discovered in manual dogfood.**

**REFINED 2026-05-08 (Sprint 2.0 R1 memo)** — see `docs/research/sprint-2.0-langfuse-observability-2026-05-08.md`. Original plan was Langfuse self-hosted; **research flipped this to Phoenix (Arize)** as the default, Langfuse parked as a documented opt-in upgrade for Tier 3. Five findings drove the flip:

1. **Langfuse v3 is a 6-container stack** (postgres + clickhouse + redis + minio + 2× pods) with documented unbounded ClickHouse log-table growth — fresh installs filling 100 GB/day at zero activity unless TTLs pre-tuned. Footgun for single-dev ops.
2. **Phoenix is `docker run -p 6006:6006 arizephoenix/phoenix:latest`** — single container, SQLite persistence, native OpenInference + native OpenRouter integration. Zero ops drama for ~1 trace/night.
3. **Langfuse paywalls** the Tier 2 features Steward's prompt-evolution roadmap actually wants (Prompt Playground, LLM-as-Judge evals, prompt experiments, annotation queues are EE-only on self-host). Phoenix has them open.
4. **Helicone is RIP** (Mintlify acquisition 2026-03-03, self-host code untouched, dropped from candidate list).
5. **Langfuse's built-in cost tracking** doesn't cover DeepSeek/V4-Flash (Steward's default model) — would need community sync script. Steward's own `addCostFields` is already authoritative; Langfuse UI just wouldn't display correct numbers.

**Why second** (unchanged): zero meaningful evolution without measurement. Current journal is fine for forensics but useless for "did week-over-week prompt change improve recommendation quality?"

**Scope (refined)**:
- Self-hosted **Phoenix** via `templates/observability/docker-compose.phoenix.yml` (single container, SQLite at `PHOENIX_WORKING_DIR`, OTLP receiver on `:4317`).
- Land `bin/steward/_lib/otel-emitter.cjs` — zero-deps hand-rolled OTLP HTTP POST against the OpenInference attribute set. Honors Steward's "zero runtime deps" principle (no `@opentelemetry/api`).
- Plumb emitter through `execute.cjs` Phase boundaries: AGENT root span (workflow=steward-nightly) → LLM child (provider=openrouter, model=...) → TOOL children (npm_test, spec_verifier, git_commit_and_pr).
- Journal stays SSOT — Phoenix is **additive**, never replaces JSONL. Both write on every run.
- Fail-open: with `STEWARD_OTEL_ENDPOINT` unset or unreachable, Steward must complete normally and log a single warning per run (not per span).

**Acceptance criteria** (full list in memo §6):
- `docker compose -f templates/observability/docker-compose.phoenix.yml up` starts Phoenix in <30 s on a clean machine.
- A Steward dry-run with `STEWARD_OTEL_ENDPOINT` set produces a parent AGENT span with ≥1 LLM child and ≥1 TOOL child, viewable at `localhost:6006`.
- Cost numbers from `gen_ai.usage.input_tokens`/`output_tokens` match `addCostFields` output to rounding error on 5 dogfood runs.
- Journal still writes (SSOT preserved).

**Stolen from**: Phoenix (Arize) self-hosted reference deployment + OpenInference semantic-conventions spec + OTel `gen_ai.*` semconv. Langfuse path documented as Tier 3 upgrade for prompt-evolution sprints.

---

### Sprint 2.0.1 — OTLP protobuf encoder for Phoenix compatibility ✅ SHIPPED 2026-05-08 (commit `2981ea7`)

**Status**: ✅ Shipped 2026-05-08. Manual end-to-end dogfood revealed Phoenix 15.5.1 returns HTTP 415 on `Content-Type: application/json` even though OTLP HTTP spec permits both encodings. Zero-deps OTLP protobuf encoder (~370 LoC, `bin/steward/_lib/otel-protobuf.cjs`) replaces Sprint 2.0's JSON path. R2 review pipeline (2 focused agents) found 2 BLOCKER (negative BigInt zero-coerce, hex traceId/spanId truncation) + 8 MAJOR (type-tag corruption on negative Number, Number-above-2^53 precision loss, etc.) — all fixed pre-commit. Trace `aa105a439194024f65a0531befd82c53` validated end-to-end in live Phoenix UI with full AGENT→TOOL hierarchy + Sprint 2.0b routing tags. Tests 1095 → 1134.

**Lesson for future cortex-x sprints (added to ritual §7 as 13th step)**: **Spec-permissive ≠ receiver-permissive.** When a spec allows N encodings and we ship 1, manual integration smoke is the only thing that catches "real receiver only accepts the OTHER N-1." Unit tests with mocked transport will always pass. Every cortex-x sprint with new transport/wire format must include a manual end-to-end smoke gate against the real production receiver before declaring done.

**Out of scope (deferred to Sprint 2.0.2)**: protobufjs round-trip property test for mutation-survival on `encodeVarint` loop. Would add devDependency. Current hand-computed byte vectors + real-Phoenix integration smoke provide floor coverage.

---

### Sprint 2.0b — Action-kind-based model routing ✅ SHIPPED 2026-05-08 (commit `79c101a`)

**PIVOT rationale (2026-05-09 web research)**: original scope was RouteLLM-style query-difficulty classification. 2026 SOTA literature converges on **role/task-type routing**: Augment Code (Opus coordinate / Sonnet implement / Haiku navigate / GPT-5.2 review), Anthropic multi-agent research (role-routed +90.2% over single-Opus on retrieval), Karpathy compound-systems framing. NousResearch hermes-agent's 4-mode pattern (`cheap` / `fix` / `code` / `plan`) is the same idea.

**Cortex-x has the taxonomy for free**: 9 `action_kinds` are already a clean role taxonomy. RouteLLM-style classifier training is unnecessary.

**Scope**:
- Per-`action_kind` model mapping in `bin/steward/_lib/action-kinds.cjs` (or sibling `model-routing.cjs` to keep registry focused on contracts):
  - **cheap tier** (no LLM): `recommendation_harvest`, `dep_update_patch`, `flaky_test_repair`, `doc_drift`, `todo_triage`, `test_coverage_gap`, `lint_fix_shipper`, `pr_review_responder` — already deterministic, no model call.
  - **balanced tier**: `recommendation` → `deepseek/deepseek-v4-flash` (today's default).
  - **premium tier**: future `architecture_review`, `release_notes_drafter` → `claude-opus-4-7` or `gpt-5.3`.
  - **ensemble tier** (optional): `recommendation` can route to 3-cheap-model ensemble + agent-as-judge consensus before applying — kept as opt-in `HERMES_ROUTING_PROFILE=ensemble`.
- New env knob: `HERMES_ROUTING_PROFILE=cheap|balanced|premium|ensemble` (default: `balanced`).
- New CLI flag: `--mode plan|code|fix|cheap` (NousResearch hermes-agent UX surface) — ergonomic override that maps to balanced/balanced/cheap/cheap.
- `extractUsage` already accepts array shape (Sprint pre-2.0 housekeeping) — ensemble tier ready to use without further refactor.

**Pre-implementation research dispatch (R1)**:
- "Q2 2026 update on Augment Code role-based routing + Anthropic multi-agent research. Specific model pairings for 9 action_kinds × 4 routing profiles. Cost/latency reality of DeepSeek V4 Flash vs Qwen3 Coder Flash vs GPT-5.2 Mini for code-edit + judge use."

**Stolen from**: Augment Code routing guide 2026 + Anthropic multi-agent research stack + NousResearch hermes-agent mode UX.

**Effort drop**: was M (RouteLLM training + classifier serving), now S (mapping table + env knob + CLI flag).

---

### Sprint 2.1 — Steward autoresearch / overnight burst mode ✅ SHIPPED 2026-05-08 (commit `b3e6656`, ⭐ TRANSFORMATIVE)

**Why third (after 1.9 + 2.0)**: Karpathy autoresearch has 8.6M views in 2 days. The pattern is mainstream as of 2026-03. We are running 1 experiment per night while frontier runs 100+. Order-of-magnitude throughput delta.

**Scope**:
- New mode: `node bin/cortex-steward.cjs autoresearch --max-actions=20 --max-budget-usd=2 --max-time-min=300 --diverge-strategies=3`.
- New workflow `.github/workflows/hermes-autoresearch.yml` cron `0 22 * * *` (22:00 UTC = 00:00 CEST, true overnight).
- For each picked action: generate 3 candidate strategies (3 LLM calls), apply each, run npm test + spec criteria (Sprint 1.9), judge picks best, others rollback.
- After 20 actions / $2 / 5h, opens a single master draft PR with N atomic commits.
- Cost: ~$2/month at full cadence (still 100× under Devin/Codex).

**Pre-implementation research dispatch**:
- "Karpathy autoresearch follow-ups May-June 2026. Hyperspace AI distributed variants. Failure modes (validation set spoilage, over-fitting). What's the actual best-practice for run-budget shaping + judge prompts in 2026-Q2?"

**Stolen from**: Karpathy's 630-line script (MIT) + Hyperspace AI distributed pattern + AlphaEvolve / OpenEvolve.

---

### Sprint 2.2 — Worktree supervisor + agent-as-judge ensemble (L effort) — ✅ FOUNDATION v0 SHIPPED 2026-05-14, spawner v1 (Sprint 2.2.1) deferred

**REFINED 2026-05-08 (anthill R1 memo)** — see `docs/research/swarm-self-spawning-agents-2026-05-08.md`. Operator's "anthill" intuition is real (+90.2% on Anthropic research evals via role-routed sub-agents) but comes with three hard constraints: **15× token overhead, multi-agent is wrong for shared-context coding tasks** (so ~6 of our 9 capability kinds stay single-process), and the **DeepMind Dec-2025 finding shows unstructured agent networks amplify errors up to 17.2×** vs single-agent baseline. The memo's verdict: **verifier > spawner**. Our 1.9.0 spec-verifier is the architectural moat. Sprint 2.2 ships **MVP only** — 1 supervisor + 1 spawned worker, **`recommendation_harvest_parallel` only** (breadth-first kind, ideal shape) — not "all 9 kinds become multi-agent."

**Why after 2.1**: 2.1 proves the multi-strategy pattern serial; 2.2 makes it parallel via git worktrees. Claude Agent SDK's orchestrator-worker primitive is the reference (depth-cap=2 built-in, per-sub-agent maxTurns/effort/model/permissionMode, but **no built-in per-tree token cap — we must implement**).

**Scope (refined)**:
- New capability kind `recommendation_harvest_parallel` (does NOT replace 1.8.2c kind — coexists, opt-in).
- Split `runExecute()` into `runSupervisor()` + `runWorker(N)`.
- `git worktree add cortex/steward-run-{N}` per worker.
- Lock manager generalized from 1-mutex to N-mutex.
- Judge agent prompt evaluates N branches against spec criteria + commit clarity + cost.
- 4 workers in parallel = ~4× throughput at ~4× cost; per-tree cap keeps total <$10/month at full cadence.

**Pre-work (must land before 2.2 implementation)**:
- **Per-tree token cap**: new env `STEWARD_TREE_USD_CAP` ($1.50 default, ~2× single-call dogfood). Cap enforced at supervisor *before* spawning; running tally from `extractUsage` on every sub-agent return. Adds 4th window alongside daily/weekly/monthly (1.9.1).
- **Cross-tree loop detector**: 1.9.1 detector operates on single-agent fingerprints — wouldn't catch the public **$47K runaway-loop incident** (2-agent ping-pong, 11 days, no useful output). Extend detector to write criterion-id × parent-tree-id fingerprints; 3× repeat in 24h → `STEWARD_HALT`.
- **Per-worker spec-verifier gate**: spec-verifier runs *per worker output* AND once on synthesized plan. Both must pass before `applyAction`.

**Acceptance criteria (10 items)** — see anthill memo §10. Includes failure-injection test (single worker returns garbage JSON → supervisor completes with N-1 workers, no retry-storm) + cost-cap test (artificial cost spike mid-fan-out → supervisor halts cleanly, journals `STEWARD_TREE_CAP_EXCEEDED`).

**Pre-implementation research dispatch**:
- "Composio Agent Orchestrator + Cursor Parallel Agents + Claude Code Agent Teams + Grok Build worktree patterns. State-of-the-art supervisor↔worker protocols 2026-05. Conflict resolution + judge prompting techniques."

**Stolen from**: Anthropic multi-agent research stack (orchestrator-Opus + worker-Sonnet + Haiku-navigator) + Claude Agent SDK orchestrator-worker primitive + Composio AO + agent-zero subordinate hierarchy + Team Atlanta ensemble patching.

**Where multi-agent is WRONG for cortex-x**: `dep_update_patch`, `lint_fix_shipper`, `flaky_test_repair`, `test_coverage_gap`, `doc_drift`, `todo_triage` — all need shared context with the codebase mutation. Single-agent + spec-verifier (1.9.0 architecture) stays the right shape. Don't multi-agent these. Memo §10 lists explicit kinds that DO benefit (recommendation_harvest, future whole_repo_security_audit, pr_review_responder).

---

### Sprint 2.2.5 — `edit.position` primitive in action-engine (M effort) — ✅ SHIPPED 2026-05-10 (v0/v1)

**Status**: ✅ Shipped 2026-05-10. Action-engine now supports `edit_ops[]` shape with `append` / `create` / `insert` / `str_replace` operations + `expectedSha256` SHA pinning gate. R1 memo: `docs/research/sprint-2.3-edit-position-2026-05-10.md` (filename intentionally `2.3-` for chronological order; sprint label is 2.2.5). Three-stage validation: LLM emits op + SHA → engine validates SHA matches pre-edit content → engine applies op → spec-verifier gates result.

**Why before mutation testing**: 2026-05-10 dogfood proved that current LLMs (DeepSeek V4 Flash + likely all current production models) cannot reliably return full-file content for "insert N bytes into existing >200 B file" tasks. Today's edit shape is `{ path, content, replace_all? }`. LLM either returns empty response or partial-content rewrite — `no_destructive_rewrite` correctly blocks 100 % of these. **Result**: 3 of 7 cortex-x recommendations had to be marked `[HUMAN-ONLY]` as same-incident-class. Most production cortex-x recommendations will hit the same wall until we ship a richer edit primitive.

**Without 2.2.5, autoresearch + nightly produce zero LLM-driven value on edit-existing-file tasks**, regardless of model quality. With 2.2.5, the same recommendations become Steward-actionable.

**Scope (pending R1 finalization)**:
- Extend edit shape: `{ path, content, position?: 'append' | 'before_line:N' | 'after_pattern:X' | 'replace_all' }`. Default stays `replace_all: false` for backward-compat with existing edits.
- `applyEditsToFilesystem` honors `position`; for `append` uses `fs.appendFile`; for `before_line`/`after_line` does line-array splice; for `after_pattern` does single-occurrence regex match (uniqueness validated).
- Update LLM system prompt: "PŘI insert tasks, vrať `position` + chunk, NE celý file."
- Spec-verifier alignment: `no_destructive_rewrite` fires only when `position === 'replace_all'` or unset (backstop preserved). New criteria added per R1 safety memo: anchor uniqueness, line-bound check, post-edit-grows-when-append.
- Property tests: `position: 'append'` MUST grow file size; `before_line:N` MUST preserve all pre-edit lines; anchor with N matches MUST throw rather than randomly pick.

**Stolen from**: Aider search-replace blocks, Claude Code Edit tool's `old_string` uniqueness, GitHub apply_patch unified-diff format. R1 will rank.

**Unblocks**: re-trigger autoresearch / nightly on currently `[HUMAN-ONLY]`-marked recommendations (#5 docs append, #6 JSDoc insert, #7 constant insert) without operator intervention. Sprint 2.3 mutation testing benefits indirectly (mutation scoring on *edited* code requires reliable edits).

**Risk**: low. Backward-compat: missing `position` = current behavior. Deletion of feature = revert single commit + spec-verifier criterion → no data corruption.

---

### Sprint 2.3 — Mutation testing as fitness signal (S-M effort) — ✅ SHIPPED v0 2026-05-14 (measure-only baseline phase) · ✅ SHIPPED v1 2026-06-03 (ratchet via Sprint 2.3.1)

**Status**: ✅ v0 shipped 2026-05-14. Three R1 memos (2026-05-09 original + 2026-05-10 refresh + 2026-05-14 fresh) converge on Stryker 9.6.1 + measure-only `break: null` posture. Ships: `package.json` devDep `@stryker-mutator/core ^9.6.1` + `stryker.conf.json` (6-file auth-tier hard-gate scope: splice / spec-verifier / halt-check / cost-safety / recommendations / policy-check) + `.github/workflows/stryker.yml` (weekly Sun 03:00 UTC full + per-push incremental + workflow_dispatch manual) + `standards/mutation-testing.md` Rule 2 reference + `npm run test:mutation[:incremental]` scripts. Conservative defaults: command testRunner (`npm test`), 50% concurrency, public-repo free GHA tier (no self-hosting), 2-week observation period before ratchet activation.

- ✅ **v1 shipped 2026-06-03 via Sprint 2.3.1** — `mutation_score` criterion kind landed as the 7th spec-verifier kind. Per-action_kind thresholds (55–70%) wired into all **7** LLM-touching registry entries (recommendation/flaky_test_repair/test_coverage_gap/lint_fix_shipper/tech_debt_audit/senior_tester_review/**tdd_red_green**); 14 deterministic/read-only kinds carry `N/A` (omitted). All thresholds ship `advisory: true` for the calibration window; promotion to enforced requires 60+ green journal entries + zero `cortex-doctor` false-fail reports (gated on Sprint 2.3.2). `STRYKER_RATCHET_MIN_PERCENTAGE` env override is shipped + functional; the `cortex/state/mutation-allowlist.yaml` operator escape hatch documented in `standards/mutation-testing.md § Ratchet activation` is **NOT YET IMPLEMENTED** in v1 — verifier never opens the file; promotion to enforced (Sprint 2.3.2) is gated on this allowlist landing. 5 emitted error codes (`SPEC_MUTATION_SCORE_BELOW_MIN`, `SPEC_MUTATION_REPORT_MISSING`, `SPEC_MUTATION_REPORT_MALFORMED`, `SPEC_MUTATION_NO_VALID_MUTANTS` fail-OPEN advisory, `SPEC_MUTATION_SCORE_OK` clean-pass advisory). 14 unit tests (`tests/unit/steward/spec-verifier-mutation.test.cjs`) + 6 fixtures under `tests/fixtures/stryker/`. v1 deferred: `mutation_score_drift` calibration, allowlist runtime, write_set→target_files seam, report-staleness mtime check, per-directory matrix → Sprint 2.3.2. **Sprint 2.3.1 R2 fix HIGH**: previous version of this line named `edit_ops` (not a registered action_kind) instead of `tdd_red_green` — drift corrected in-commit.

**Why round out Tier 1**: makes verification *more* rigorous than just "tests pass". If LLM patch passes tests but mutation score regresses, reject — the existing tests aren't actually exercising the diff.

**R1 recommendation (from web research dispatch)**: StrykerJS 9.6 incremental mode + risk-tiered thresholds (80% `bin/steward/_lib`, 70% orchestrators, 75% `bin/cortex/tools`, 60% advisory `detectors/`). Companion fast-check property tests (Sprint 2.9.7b already established the pattern). Defer Meta ACH (FSE 2025) LLM mutation generation to Sprint 3.x. GHA quota burn flagged HIGH; mitigation = weekly-only nightly OR self-hosted runner.

**Scope (R1 §4)**:
- Stryker (JS mutation testing) integrated into `verifier.cjs` as a post-`npm test` gate (only for `recommendation` kind initially, since deterministic kinds don't change code logic).
- Pre-edit baseline mutation score captured to journal.
- Post-edit mutation score must be ≥ baseline; if lower → `EDIT_MUTATION_REGRESSION`.
- New action_kind `mutation_score_drift` (Sprint 2.5 tech_debt_audit pattern) — files gh issue when nightly mutation score drops > 5pp.

**Companion: Property-Generated Solver pattern** — fast-check + hand-rolled property tests for halt-check, cost-safety, spec-verifier, action-engine, path-safety. Sprint 2.9.7b shipped the first wave (78 hand-rolled property tests).

**Open questions for operator (R1 §8)**:
1. Cadence: per-PR incremental + nightly full, OR weekly-only full (GHA quota concern)?
2. Self-hosted runner for full mutation runs?
3. Initial threshold: 80% hard from day 1 OR measure-only mode 2 weeks → ratchet?

**Stolen from**: StrykerJS 9.6 incremental mode + Property-Generated Solver (arXiv 2506.18315) + Meta ACH (arXiv 2501.12862, FSE 2025).

---

### Sprint 2.4 — Anthropic `claude-cli` engine via Max subscription ✅ SHIPPED 2026-05-09 (commit `3f9575d`, ⭐ COST PIVOT)

**Status**: ✅ Shipped 2026-05-09. New `claudeCliEngine` inline in `bin/steward/_lib/action-engine.cjs` (~470 LoC including helpers). Three-layer billing-leak defense: env scrub + `total_cost_usd === 0` assert + fleet `STEWARD_HALT` write. Auth via `CLAUDE_CODE_OAUTH_TOKEN` only; `--bare` hard-prohibited via `CLAUDE_CLI_FORBIDDEN_FLAGS` freeze-list. R2 review pipeline (6 agents in parallel) found 1 BLOCKER + 3 HIGH + 11 MAJOR + 14 MINOR; 13 must-fix items applied pre-commit. R1 memo: `docs/research/sprint-2.4-anthropic-claude-cli-engine-2026-05-08.md`. 1158 → 1164 tests (29 new).

### Sprint 2.4.1 — Per-action_kind effort tuning ✅ SHIPPED 2026-05-11

Grounded in: `docs/research/sprint-2.4.1-extended-thinking-research-2026-05-11.md`. Anthropic effort parameter (`low`/`medium`/`high`/`xhigh`/`max`) bifurcated from legacy `budget_tokens` in Opus 4.7. Claude Code v2.1.117+ defaults to `xhigh` — every cortex-x action was silently paying for xhigh-tier thinking before this fix. Sprint 2.4.1 adds `effort` field per LLM-requiring action_kind (recommendation/pattern_transfer → `high`; senior_tester_review/release_notes_drafter → `medium`) + `resolveEffortLevel()` precedence (env > opts > action_kind > default `medium`) + `--effort <level>` arg injection into claudeCliEngine + journal capture for retro analysis. Test enforces NO default `xhigh`/`max` (anti-overthinking; community reports max-effort looping behavior). ~80 LoC, 16 tests. Operator escape hatch: `CLAUDE_CODE_EFFORT_LEVEL` env var.

**(Original sprint memo retained below for design context.)**



**Why**: research dispatch 2026-05-08 (R3 — see `docs/research/sprint-2.4-anthropic-max-routing-2026-05-08.md` when written) confirmed that Anthropic Max x20 subscription is **programmatically reachable via `claude -p` non-interactive CLI** with `CLAUDE_CODE_OAUTH_TOKEN` set + `ANTHROPIC_API_KEY` unset. ToS explicitly permits this for personal autonomous agents on operator's own repos (Green Tier per claudefa.st safe-use guide). Anthropic April 2026 OpenClaw crackdown was specifically token-extraction in third-party harnesses — not legitimate `claude` subprocess invocation.

**Strategic impact**: this is the **cost-economy pivot** of Tier 1. Today Steward calls OpenRouter at ~$0.0008/run avg ($0.024/month full cadence). After 2.4, the LLM-driven action_kinds (`recommendation` + autoresearch judge + future `pattern_transfer`) become **zero marginal cost** under the operator's existing Max sub. OpenRouter stays as overflow only (when Max weekly cap exhausted or `claude -p` returns auth error). Hardware decision (lokální 30k CZK box) deferred until this is validated and remaining spend is measured.

**Scope**:
- New engine file `bin/steward/_lib/engine-claude-cli.cjs` (~80 LoC, zero new deps) — spawns `claude -p "<prompt>" --output-format json`, parses stdout JSON, returns same shape as `engine-openrouter.cjs`.
- **Cost guard (critical)**: assert `result.total_cost_usd === 0` after each invocation. Nonzero means OAuth degraded silently to API mode (issue #43333, #37686 — $1,800 incident); halt with new error code `CLAUDE_CLI_BILLING_LEAK` + write `STEWARD_HALT`.
- Engine seam wiring in `bin/steward/_lib/action-engine.cjs` — `STEWARD_ENGINE=claude-cli` env or `--engine claude-cli` CLI flag selects this path; existing `mock`/`openrouter` paths unchanged (R6 backward-compat).
- Routing-table integration: `cheap`/`balanced`/`premium`/`ensemble` profiles get a parallel `_via_max` variant that prefers `claude-cli` when `CLAUDE_CODE_OAUTH_TOKEN` is set, falls back to `openrouter` engine on auth/cap-reached errors.
- `STEWARD_CLAUDE_CLI_PATH` env (default: resolve `claude` from PATH) for portable testing.
- Subprocess hardening: `child_process.spawn` (not `exec`), 120s timeout (configurable via `STEWARD_CLAUDE_CLI_TIMEOUT_MS`), explicit env scrubbing (delete `ANTHROPIC_API_KEY` from spawned env to prevent the leak class), kill on parent process exit.

**New error codes**:
- `CLAUDE_CLI_NOT_FOUND` (PATH lookup or env var path miss)
- `CLAUDE_CLI_AUTH_REJECTED` (401/403 from Anthropic — Max cap exhausted or OAuth expired)
- `CLAUDE_CLI_BILLING_LEAK` (`total_cost_usd > 0` post-invocation; halts via STEWARD_HALT)
- `CLAUDE_CLI_OUTPUT_MALFORMED` (JSON parse fail)
- `CLAUDE_CLI_TIMEOUT`

**Acceptance criteria**:
- [ ] `STEWARD_ENGINE=claude-cli node bin/cortex-steward.cjs execute` completes a `recommendation` action end-to-end with `total_cost_usd: 0` recorded in journal.
- [ ] When `CLAUDE_CODE_OAUTH_TOKEN` unset → engine returns `CLAUDE_CLI_AUTH_REJECTED` cleanly without crash.
- [ ] When subprocess returns nonzero `total_cost_usd` → halt with `CLAUDE_CLI_BILLING_LEAK` + `STEWARD_HALT` written.
- [ ] OpenRouter engine path unchanged (regression test).
- [ ] ≥ 12 new tests; full suite stays green.

**Pre-implementation research dispatch (R1)**:
- "Anthropic Claude Code CLI `-p` non-interactive headless mode 2026-Q3 status. Max subscription billing-tier behaviors confirmed via official docs + operator dogfood. Concurrent `claude -p` invocations from same OAuth token — rate limit + concurrency expectations. Validate `total_cost_usd === 0` reliability across recent versions."

**Out of scope**: Claude Agent SDK migration (still API-key only per GH issue #559), Claude Code Routines cloud cron (Sprint 5.0 evaluates), browser-based Anthropic SDK (premature). Telegram/Discord forwarding moved to Sprint 2.6.

**Stolen from**: claudefa.st safe-use guide + claude-ollama-dual repo (smart-orchestrator pattern) + Anthropic headless docs + cortex-x's existing engine seam (Sprint 1.6.13).

---

### Sprint 2.5 — `tech_debt_audit` action_kind ✅ SHIPPED 2026-05-09 (commit `b9d25b5`)

**Status**: ✅ Shipped 2026-05-09. 10th action_kind, deterministic (zero LLM cost), runs nightly, snapshots code-health to `cortex/debt-snapshot.json` (committed audit trail). qlty + knip toolchain. Fail-open on missing tools. R2 review pipeline (6 agents) found 2 BLOCKER + 3 HIGH + 11 MAJOR + many MINOR; 14 must-fix items applied pre-commit (dispatcher wire, scrubEnv, byte-cap, parser hardening, fs walk symlink protection, error-code reconciliation, 3 fixture-based integration tests). R1 memo: `docs/research/sprint-2.5-tech-debt-audit-2026-05-08.md`. 1187 → 1199 tests (35 new).

**(Original sprint memo retained below for design context.)**



**Why**: research dispatch 2026-05-08 (R5) flagged "nightly janitor" as high-payoff deterministic kind. Compounds with autoresearch (Sprint 2.1) — every overnight run optionally surfaces tech-debt drift before agent productivity work begins. Zero LLM cost (pure heuristics + qlty CLI), so it can run on every cron tick.

**Scope**:
- New action_kind `tech_debt_audit` in `bin/steward/_lib/action-kinds.cjs` (10th kind, deterministic). Acceptance criteria: snapshot file produced, no false halt, drift below threshold = no PR opened.
- Tool: **qlty** (Rust CLI, Apache + BSL/DOSP, free for commercial) installed once via `qlty init` → `.qlty/qlty.toml`. Polyglot, 70+ analyzers, `qlty metrics` subcommand for code-health rollup.
- Heuristics aggregated nightly:
  - File LoC growth rate (>20% w/w on a single file = flag)
  - Cyclomatic complexity drift (qlty metrics, threshold 10)
  - Duplication % trend (qlty CPD)
  - Test:source ratio drop
  - Dead-code count (`ts-prune` / `knip` for TS, language-specific equivalents)
- Snapshot stored at `cortex/debt-snapshot.json`, diffed against prior week.
- Drift threshold (default: 10% degradation in any single metric) → opens advisory PR with the diff. Below threshold → silent journal entry only.
- Halt criterion: never. This kind is read + report; no edits. PR is review-only for operator.

**New error codes**:
- `TECH_DEBT_QLTY_MISSING` (qlty not installed)
- `TECH_DEBT_SNAPSHOT_CORRUPT` (prior snapshot unreadable; silently regenerates baseline)
- `TECH_DEBT_THRESHOLD_EXCEEDED` (advisory, not blocking)

**Acceptance criteria**:
- [ ] First nightly run produces `cortex/debt-snapshot.json` baseline.
- [ ] Second run produces a diff. If above threshold → draft advisory PR opened.
- [ ] Zero LLM cost recorded in journal (no engine call).
- [ ] ≥ 10 new tests + 1 fixture-based integration test (synthetic snapshot pair).
- [ ] Fail-open: missing qlty installer → kind skipped with single warn line, doesn't halt cron.

**Pre-implementation research dispatch (R1)**:
- "qlty vs CodeScene CLI vs SonarQube CLI 2026-Q3 maturity. Heuristic vs ML tech-debt detection state-of-art. Best practices for snapshot drift detection (sliding window vs week-over-week vs since-last-release)."

**Out of scope**: AI-generated remediation suggestions (Sprint 3.0 prompt evolution can build on the snapshot data later), per-file ownership routing (no team in single-operator scope), license-compliance audits (`qlty` doesn't cover; separate kind if needed).

**Stolen from**: qlty CLI + ksimback `tech-debt-skill` for Claude Code + general "tech debt as deterministic linter" pattern.

---

### Sprint 2.6 — Discord remote control ✅ SHIPPED 2026-05-09 (commit `27c3529`, v0 alpha; hardening 2.6.1 follow-up)

**Status**: ✅ Shipped 2026-05-09. `bin/discord-bridge/` sibling-folder pattern preserves zero-deps Steward core; bridge has its own `package.json` with `discord.js` 14.x. v0 ships testable zero-deps parts (auth + commands + journal-tail); Gateway WebSocket wiring deferred to operator setup. R2 retro review found 2 BLOCKER + 5 HIGH + 5 MAJOR; all BLOCKERs and most HIGHs landed in same-day Sprint 2.6.1 hardening commit (HMAC token reuse defense via consumed-tokens Set, SECRET ≥32 enforcement, ephemeral:true on all mutation embeds, `crypto.randomBytes` actionId, `!` prefix removed from Discord-side names per API spec, `appendRecommendation` mkdirSync + symlink TOCTOU defense). R1 memo: `docs/research/sprint-2.6-discord-remote-control-2026-05-08.md`. 1262 → ~1276 tests.

**(Original sprint memo retained below for design context.)**



**Why**: research dispatch 2026-05-08 (R5) compared Telegram vs Discord vs Slack vs email for single-operator mobile control. **Discord wins on channel organization** (`#alerts` / `#research` / `#failures` / `#cost`) which is the right shape as cortex-x adds more capabilities. Telegram has higher 4K char limit but no native channel structure for one operator — turns into a single chat scroll fast. Email is YAGNI (Mailgun free 1-route only solves async batch ingest, not interactive control). Slack is B2B-shaped — wrong tool. **Operator confirmed Discord 2026-05-08 conversation.**

**Scope**:
- New module `bin/steward/_lib/remote-discord.cjs` (~150 LoC) using **discord.js** (most mature 2026 library, used by majority of agent integrations).
- 4-channel default layout: `#steward-alerts` (cron failures, halt events), `#steward-research` (autoresearch winner summaries), `#steward-failures` (spec_failures rollup), `#steward-cost` (daily/weekly/monthly cap status).
- Long-polling (no webhook) — operator runs from home network, no inbound TLS surface.
- 4-layer security per R5:
  1. Whitelist `from.id` middleware via env `STEWARD_DISCORD_ALLOWED_USER_IDS=<comma-list>`.
  2. HMAC-signed action confirmations for destructive ops (push, deploy) — operator replies with token derived from `action_id + STEWARD_DISCORD_SECRET`.
  3. Bot token rotation reminder (calendar entry, 90-day cadence).
  4. Read-only commands by default; mutating commands explicit `/!` prefix.
- Slash commands (mobile-friendly):
  - `/status` — `cortex-steward status --json` summary
  - `/forecast` — Sprint 1.9.1 cap forecast block
  - `/halt <reason>` — write `STEWARD_HALT` (HMAC-confirmed)
  - `/resume` — clear halt (HMAC-confirmed)
  - `/recommend <text>` — append voice/text recommendation to `recommendations.md` via authorized commit (Sprint 4.3 unblock)
  - `/why <commit-sha>` — Steward's commit trailer + journal entry rendered to Discord embed

**Acceptance criteria**:
- [ ] Bot connects to single Discord guild, registers 6 slash commands.
- [ ] Whitelist rejects non-allowed user_id silently (logs + drops; no acknowledgment to attacker).
- [ ] HMAC token mechanism prevents replay across 90s window.
- [ ] All 6 commands work from Discord mobile app.
- [ ] Bot crash-recovery: `systemd` (Linux dev box) / launchd (macOS) keeps it running; long-polling reconnects on network blip.
- [ ] ≥ 15 new tests + 1 e2e fixture-bot test.

**Pre-implementation research dispatch (R1)**:
- "discord.js v14 + slash command + HMAC pattern 2026-Q3. Discord rate limits for personal-bot use. Long-polling vs gateway intent caveats. Persistent process supervision options (systemd vs pm2 vs launchd) for single-operator use."

**Out of scope (Tier 2/3 follow-ups)**: voice-message → Whisper → recommendation pipeline (Sprint 4.3 dedicated), Telegram parallel surface (deferred unless Discord painful), web-based dashboard (Sprint 4.8 covers).

**Stolen from**: discord.js docs + grammy-guard whitelist pattern (adapted) + Telegram bot 4-layer security best-practices (carried over from 2026 ZeroClaw guide).

---

### Sprint 2.7 — Cross-project `pattern_transfer` action_kind ✅ SHIPPED 2026-05-09 (commit `b80ebdf`, v0; hardening 2.7.1 follow-up)

**Status**: ✅ Shipped 2026-05-09. 11th action_kind, LLM-driven, journal-only. v0 ships testable zero-deps parts (manifest validator + sibling-reader path safety + glob matcher + assertEditWithinCwd); LLM dispatch deferred to Sprint 2.7.1 (needs operator-populated `cortex/sibling-projects.json`). R2 retro review found 2 BLOCKER + 4 HIGH + 3 MAJOR; both BLOCKERs landed in same-day Sprint 2.7.1 hardening commit (acceptance predicate now rejects UNC paths `\\server\share`, dispatcher returns `ACTION_KIND_NOT_DISPATCHABLE` until LLM wiring lands so cron operators see the gap explicitly). `assertEditWithinCwd` documented as wired-but-dormant pending dispatcher wiring. R1 memo: `docs/research/sprint-2.7-pattern-transfer-2026-05-08.md`. 1307 → ~1315 tests.

**(Original sprint memo retained below for design context.)**



**Why**: research dispatch 2026-05-08 (R5) confirmed cross-project pattern transfer is a **known 2026 pattern** (repowise, meta-repo pattern, Karpathy LLM-wiki). Pitched: cortex-x reads from a maintainer-curated allowlist of sibling project paths (e.g. `${HOME}/dev/<project-slug>`) for pattern inspiration without write access. **R5 strong recommendation: don't build full repowise; build narrow allowlist + read-only + new LLM action_kind.**

**Scope**:
- New config `cortex/sibling-projects.yaml` — explicit allowlist with per-repo `read_only: true`, `purpose: pattern-transfer`, `paths_allowed: [src/, docs/]`, `paths_denied: [.env*, secrets/, node_modules/]`.
- New helper `bin/steward/_lib/sibling-read.cjs` — wraps existing `clampPath` + `realpath` containment, refuses writes, refuses symlink-following outside allowlist. Defense in depth: invokes `node --permission --allow-fs-read=<each allowed root>` for the LLM call (built-in stable since Node v22.13.0 / v24.0.0).
- New action_kind `pattern_transfer` (LLM, premium tier — needs deep code understanding): reads sibling project, writes recommendation into *current* project's `lessons-learned.jsonl`. **Never edits sibling.**
- Acceptance criteria for the kind: output entry has `source_repo` field with absolute path; no `applyEdits` call paths to non-current-repo locations; spec-verifier rejects if any edit would land outside `process.cwd()`.
- Hardening per CVE-2025-55130 (Node.js fs permission symlink bypass): every read goes through `realpath`-then-validate, never raw path.
- Initial allowlist seed: maintainer-curated per-machine in gitignored `cortex/sibling-projects.json`; example with placeholder slugs ships in `cortex/sibling-projects.example.json`.

**New error codes**:
- `SIBLING_NOT_ALLOWLISTED` (path outside `sibling-projects.yaml` roots)
- `SIBLING_REALPATH_OUTSIDE_ROOT` (symlink escape attempt)
- `SIBLING_WRITE_ATTEMPTED` (LLM tried to edit sibling — halt + STEWARD_HALT)
- `SIBLING_DENIED_PATH` (matched `paths_denied` pattern)

**Acceptance criteria**:
- [ ] `cortex/sibling-projects.yaml` validates against contract test schema.
- [ ] Read-helper refuses writes (test: open `O_RDWR` to sibling file → throws `SIBLING_WRITE_ATTEMPTED`).
- [ ] Realpath escape test: symlink in sibling pointing to operator home → blocked by `SIBLING_REALPATH_OUTSIDE_ROOT`.
- [ ] First `pattern_transfer` run produces a recommendation in current project's `lessons-learned.jsonl` with `source_repo: "<sibling-path>"`.
- [ ] When `--engine claude-cli` (Sprint 2.4) selected, this kind runs zero-cost under Max sub.
- [ ] ≥ 18 new tests including fixture-based sibling-tree integration.

**Pre-implementation research dispatch (R1)**:
- "Node.js fs permission model `--allow-fs-read` 2026-Q3 stability + CVE remediation status. repowise / meta-repo patterns 2026-Q3 evolution. Cross-repo agent context safety patterns from Anthropic + Cursor + Cline ecosystems."

**Out of scope (Tier 2/3 follow-ups)**: full federated lesson sync (Sprint 4.5), GraphRAG over allowlist roots (Sprint 3.3), cross-repo refactoring with edits (deliberately forever-out — defeats SSOT containment).

**Stolen from**: repowise multi-repo MCP pattern + meta-repo pattern (seylox blog) + Karpathy LLM-wiki + cortex-x's existing `clampPath` (Sprint 1.6.18).

---

### Sprint 2.8 — Memory Foundation v0 ✅ SHIPPED 2026-05-09 (commit `86b2472`, ⭐ MEMORY GATE; hardening 2.8.1 follow-up)

**Status**: ✅ Shipped 2026-05-09. v0 ships zero-deps memory-decay primitive (`bin/steward/_lib/memory-decay.cjs`, ~150 LoC) + lessons.cjs schema extension (agent_id, failure_origin, impact, frequency forward-compat fields). Anthropic Memory Tool migration + retrieval-at-decision-time MaTTS + LLM failure-distillation deferred to Sprint 2.8.1 (operator-cost-validated). R2 retro review found 0 BLOCKER + 5 HIGH + 4 MAJOR + 4 MINOR; key HIGHs landed in same-day Sprint 2.8.1 hardening commit (decay floor at 1e-12 to prevent ancient-item underflow ranking loss, SSOT impact classifier covering all CLAUDE_CLI_* + TECH_DEBT_* + SIBLING_* error codes, small-list archive policy avoids decay-shock under 10 items, malformed ts → score 0 instead of fresh). R1 memo: `docs/research/sprint-2.8-memory-foundation-2026-05-08.md`. 1337 → ~1345 tests.

**(Original sprint memo retained below for design context.)**



**Why before Tier 2**: Tier 2's Sprint 3.0 (AlphaEvolve prompt evolution) needs a *reliable* memory + lessons substrate to evolve against. Research dispatch 2026-05-08 (R1 + R4 converged independently): three changes give **+39% (Anthropic memory tool) + +34% (ReasoningBank failures) + +10% (importance-weighted decay)** with **zero new runtime deps**. Doing AlphaEvolve before this = evolving against rotting markdown.

**Scope** (3 stacked upgrades):

1. **Migrate to Anthropic native `memory_20250818` tool**:
   - Map existing `~/.claude/projects/.../memory/` directory to memory tool's filesystem API (file-based, client-side, fully cortex-x-controlled).
   - Steward's existing markdown layout becomes the memory tool's working dir — no new schema, no migration.
   - `bin/steward/_lib/memory-tool.cjs` (~120 LoC) — thin wrapper exposing `read/write/delete/list` to action-engine, hooked into Claude API requests via `tools: [{ type: "memory_20250818" }]`.
   - Free +29-39% per Anthropic internal evals when combined with context-editing tool (`tool_clear_at_least` 1024 tokens default).
   - Backward-compat: works with or without memory tool; `STEWARD_MEMORY_TOOL=off` disables and falls back to current "stuff lessons into system prompt" path.

2. **Extend ReasoningBank-lite (Sprint 1.8.3) → ingest failures**:
   - Currently captures successful trajectories only. Paper (arXiv 2509.25140) shows **+34% effectiveness, –16% steps** when failures are distilled with same fidelity as successes.
   - New journal-side hook in `bin/steward/_lib/lessons.cjs`: on `spec_failures.length > 0` OR `execute.cjs` error code → distill into title + one-line description + actionable principle (LLM call, ~$0.0002/op, batched at end of nightly run).
   - Preserve provenance: `failure_origin: "spec_failures[N].id" | "error_code:<code>"` field for future analysis.
   - Retrieval-at-decision-time (paper's MaTTS pattern): action-engine queries lessons WHERE `applies_to.includes(actionKind)` BEFORE generating prompt, not just at boot.

3. **Importance-weighted memory decay** (replaces 2026-07-17 audit's "3 months unused → delete" rule):
   - Score: `U(item, t) = (w_freq × frequency + w_impact × impact) × e^(−λ × age)`. Frequency = retrieval count; impact = `0.0` for advisory, `0.5` for warning, `1.0` for blocker; λ tuned for ~30-day half-life on advisory entries, ~120-day on blockers.
   - Nightly cron tick: scores all entries, archives bottom 5% to `cortex/memory-archive/<year>-<week>/` (recoverable), deletes only after 12 weeks in archive.
   - Per Mem0's State-of-AI-Agent-Memory 2026 warning: append-only memory rots. Decay is non-optional before more tiers.

**New error codes**:
- `MEMORY_TOOL_INIT_FAILED` (memory dir unwritable)
- `LESSON_DISTILL_FAILED` (LLM call for failure-distillation timed out — fail-open, store raw failure + retry next run)
- `MEMORY_DECAY_LOCK_HELD` (concurrent decay run; skip and log)

**Acceptance criteria**:
- [ ] `STEWARD_MEMORY_TOOL=on` → first action with memory tool produces same outcome as without; journal records `memory_tool_used: true`.
- [ ] `spec_failures` from a forced action produce a distilled lesson within 60s of journal flush.
- [ ] Lessons retrieved per `actionKind` in next run's system prompt (test: assert lesson text appears in API request body).
- [ ] After 30 simulated daily ticks, decay correctly archives lowest-scoring 5% of advisory lessons and zero blocker lessons.
- [ ] Decay archive is recoverable (fixture-based test: archived file in week N → restored manually → next nightly tick respects restoration).
- [ ] Tier 1 backward-compat: `STEWARD_MEMORY_TOOL=off` (default) preserves all existing behavior. Zero regressions.
- [ ] ≥ 25 new tests (10 memory-tool + 8 failure-distill + 7 decay).

**Pre-implementation research dispatch (R1)**:
- "Anthropic memory_20250818 + context-editing tool API 2026-Q3 production-readiness. ReasoningBank failure-distillation prompt patterns + retrieval-at-decision-time integration 2026-Q3. Importance-weighted memory decay parameters + Mem0/A-MEM/Letta production tradeoffs as of 2026-Q3."

**Out of scope (Sprint 3.x territory)**: vector DB (sqlite-vec triggered at ~100 memory files), knowledge graph (Tier 4), per-agent personal memory (R1 said no at <12 specialists), memory exchange between agents (premature; pull-based shared kb is right primitive).

**Stolen from**: Anthropic Memory Tool docs (Sept 2025 release) + Anthropic context-editing docs + ReasoningBank paper (arXiv 2509.25140) + Google ReasoningBank blog + Mem0 State-of-AI-Agent-Memory 2026 + cortex-x's existing Sprint 1.8.3 lessons machinery.

---

### Sprint 2.10 — QA Retrofit infrastructure ✅ SHIPPED 2026-05-09 (M effort, operator-targeted dogfood)

**Status**: ✅ Shipped 2026-05-09 late evening. Operator request: "udělej cortex master of testing guru pro novou kolegyni testerku — projet jak červ celý projekt, najít všechny slabiny, ale opravdu hluboké a dávající smysl." Field-test target: `<colleague-storefront-repo>` + `<colleague-admin-repo>`. R1 memo: `docs/research/sprint-2.10-qa-retrofit-2026-05-09.md` — 38 cited sources via 4 parallel research agents.

**Why**: 75% of orgs target AI-driven testing, only 16% successfully adopt — differentiator is starting with audit baseline before automating (testdevlab 2026). cortex-x already has audit infra (existing-project-audit, planner, synthesizer, research dispatch); the QA lens closes the gap with a senior-consultant deliverable on day 1.

**Position**: "AI-augmented tester" not "tester replacement". 2026 industry consensus = QA → Quality Architect / SDET-AI; AI handles regression + maintenance, humans own exploratory + business-intent + risk decisions.

**What shipped**:
- `prompts/qa-retrofit.md` — 7-phase audit (P0 detect → P1 inventory + tsDetect 5-detector smell scan → P2 4-agent ISO 25010:2023 9-char + 3 cortex extras with Bach HTSM SFDPOT depth traversal → P3 5-Q human gate → P4 QA-specific 10-concern research → P5 testing-strategy.md + testing-gaps.md synthesis → P6 sample-test seeding opt-in)
- `profiles/qa-engineer.yaml` — framework-agnostic lens; risk-tiered quality gates (high-risk: 80% line + 70% branch + 75% mutation, mid: 70/60/60, low: advisory); ASVS L1/L2/L3 compliance mappings
- `templates/testing-strategy.md.hbs` + `templates/testing-gaps.md.hbs` — Handlebars templates with full 3-hop citation traceability slots; 9 ISO 25010:2023 char target rows; pyramid plan; P0/P1/P2/SKIP/OPEN/off-limits backlog format
- `shared/skills/test-audit/SKILL.md` — `/test-audit` slash command, auto-distributed via existing `install.{sh,ps1}` `shared/*` recursive copy
- `agents/planner.md` — extended with QA-engineer profile override (10 QA-specific concerns); topic naming `{stack-or-profile}-qa-{concern}-{year}`

**Grounded in**: ISO/IEC 25010:2023 (9 chars including new Safety, promoted from sub-char), OWASP ASVS 5.0 (May 2025), Bach HTSM SFDPOT, Feathers characterization tests + seams, Gregory/Crispin Agile Testing Quadrants, Peruma et al. tsDetect FSE'20 (5-detector starter at 85-100% precision), Trail of Bits 2026 mutation-testing-for-the-agentic-era, Anthropic Claude Code best-practices doc.

**Tests**: +46 — `tests/unit/qa-retrofit-structure.test.cjs` (artifact existence + 7-phase prompt structure + grounded-references + risk-tiered profile + template hbs slots + skill cross-references + planner override + R1 memo 30+ sources + 3-hop traceability tags).

**Field-test plan**: colleague clones cortex-x → `./install.ps1` → in her duplicate of `<colleague-storefront-repo>` invokes `/cortex-init` (general retrofit) then `/test-audit` (QA lens) → 30-min audit produces 6 deliverables in `cortex/qa/`. Optional `--seed-tests` materializes top 3 P0 gaps as runnable test files. Repeat for `<colleague-admin-repo>`. Expected wow moment: she walks in day 2 with a senior-consultant deliverable already done; reviews + executes, doesn't build.

**Out of scope** (explicit non-goals): auto-running mutation testing in `qa-retrofit` (recommended in P5, not executed; Stryker integration = Sprint 2.3 work); auto-generating > 3 sample tests; replacing `/audit` (siblings, not overlap); profile auto-detection (qa-engineer is invoked explicitly).

---

### Sprint 2.9.7 + 2.9.7a + 2.9.7b — All-green cron + R2 hardening + property tests ✅ SHIPPED 2026-05-09 (S-M effort)

**Status**: ✅ Shipped 2026-05-09 across 3 commits (`dec9acf` + `47cc2a7` + `2c8a290`). Tests 1517 → 1601 (+84). Closes "all crons green" goal modulo GHA billing.

**Sprint 2.9.7 (`dec9acf`)** — three coordinated tracks:
- **Track 1**: 3 fresh LLM-able items in `cortex/recommendations.md` (TROUBLESHOOTING append, JSDoc, version constant). Append-only, well under spec-verifier shrink threshold.
- **Track 2**: Surgical `exitCode:0` fix — SPEC_VIOLATION + `STEWARD_AUTORESEARCH_ALL_CANDIDATES_FAILED` (defense layers fired correctly) now exit clean. Result shape stays `ok:false + code:SPEC_VIOLATION` (existing test contract intact); only process exit code changes 1 → 0. Other SPEC_* codes (MALFORMED, PREDICATE_THREW, etc.) still exit 1.
- **Track 3**: 6 new cron YAMLs (`steward-{doc-drift,test-coverage-gap,pr-review-responder,flaky-test-repair,lint-fix,tech-debt-audit}.yml`) with staggered schedules.

**Sprint 2.9.7a (`47cc2a7`)** — R2 hardening (3 reviewers in parallel: blind + security + edge-case):
- HIGH NaN/Infinity exitCode validation: `validExitCodeOrDefault` helper, `Number.isInteger(x) && 0 ≤ x ≤ 255`.
- HIGH qlty pipe-to-shell removed from tech-debt-audit YAML (compromised qlty.sh + `contents:write` was a real supply-chain risk; detector fail-opens cleanly).
- MEDIUM flaky_test_repair path allow-list: regex restricts edits to `*.test.* / *.spec.* / __tests__ / tests / test` paths; production source with misplaced markers is skipped.
- Cost-cap env block on deterministic skip_commit workflows (shared-ledger gate against prior LLM spend).

**Sprint 2.9.7b (`2c8a290`)** — property-based tests + bug fix:
- 78 new hand-rolled property tests (zero-deps): annotation-routing 16-perm sweep, bash forbidden-pattern 32 known-bad + 24 known-safe + idempotency, glob.globToRegex invariants, memory-decay scoring monotonicity + impact ordering + decay floor + partition completeness.
- **Real bug surfaced + fixed**: `bin/steward/_lib/memory-decay.cjs decayPass()` now actually enforces Sprint 2.8 R1 acceptance criterion "zero blocker lessons archived". Old behavior took bottom N% scored items irrespective of impact (could archive blockers if very old + low frequency). New: filter into nonBlockers + blockers; archive ONLY from nonBlockers pool capped at nonBlockers.length.

**Companion R1 memos (autonomous evening session)** — awaiting operator approval:
- `docs/research/sprint-2.7.1-pattern-transfer-llm-dispatch-2026-05-09.md` — design for closing pattern_transfer ACTION_KIND_NOT_DISPATCHABLE gap.
- `docs/research/sprint-2.3-mutation-testing-fitness-2026-05-09.md` — web-research-backed (10 sources) Stryker integration design.

**Final cron verification BLOCKED by GHA billing** (NOT a code regression). All 11 manually-triggered workflows died at job-start with GitHub error: *"recent account payments have failed or your spending limit needs to be increased."* (Maintainer handover notes captured under gitignored `docs/dogfood/`.)

---

### Sprint 2.9.6 — dry-run dispatcher gap + cron infrastructure complete ✅ SHIPPED 2026-05-09 (S effort)

**Status**: ✅ Shipped 2026-05-09 across 5 micro-commits (`17ad518` 2.9.6 dispatcher branches, `e5bf7cb` 2.9.6b skip_commit validation, `0ae1084` 2.9.6c skip Phase 5 checkout + early probe, `c267ca2` 2.9.6d NO_CANDIDATES whitelist, `6861c7b` 2.9.6e CLI formatter, `15e671f` Sprint 4.7 rebrand finishing).

**Why**: "Turn on all crons" session-trigger surfaced a pre-existing v0.7-era bug — `bin/steward/dry-run.cjs` only handled `recommendation` + `recommendation_harvest`. Cron workflows for `todo_triage` (Sprint 1.8.7) and `dep_update_patch` (Sprint 1.8.4) had been registered for months but never ran successfully end-to-end. Each kind fell through to the default LLM path and either crashed on `OPENROUTER_API_KEY` requirement or wasted daily cap on irrelevant recommendations.

**What shipped**:
- `buildDeterministicPlan` helper in dry-run.cjs.
- Dispatch branches for all 9 deterministic kinds: `todo_triage`, `dep_update_patch`, `flaky_test_repair`, `doc_drift`, `lint_fix_shipper`, `test_coverage_gap`, `pr_review_responder`, `tech_debt_audit`, `pattern_transfer` (last hard-fails per Sprint 2.7.1 status).
- `recommendations.md` parse + slug-check gated to kinds that need it (`recommendation` + `recommendation_harvest`); deterministic kinds run on bare repos cleanly.
- Early detector probes for `todo_triage` + `dep_update_patch` at dry-run time → clean `no_actionable_step` exits.
- `execute.cjs` Phase 5 (checkoutNewBranch) gated on `!plan.skip_commit` — skip_commit kinds (todo_triage, doc_drift, etc.) don't need a branch.
- `execute.cjs` plan validation: `branch + commit_message` only required when `!skip_commit`.
- `NO_CANDIDATES_CODES` whitelist — detector "scanned, nothing to do" exits as success-shape `no_action: true` instead of failure.
- CLI formatter defensive on skip_commit results (no more "Cannot read properties of undefined (reading 'join')" on success).

**Sprint 4.7 rebrand finishing** (15e671f): cron workflow YAML `name:`, step names, concurrency groups, git identity, journal artifact prefixes, branch-prefix comments, gh issue label all renamed `hermes/Hermes` → `steward/Steward`. 2 historical references preserved (migration trace + backward-compat doc).

**End-to-end cron verification 2026-05-09**:
- ✅ steward harvest (recommendation_harvest)
- ✅ steward todo-triage (todo_triage) — first successful run ever
- ✅ steward dep-patch (dep_update_patch) — first successful run ever
- ⚠️ steward nightly (recommendation) — spec-verifier `no_destructive_rewrite` blocks unsafe LLM rewrites; expected behavior given current `cortex/recommendations.md` only has HUMAN-ONLY items
- ⚠️ steward autoresearch — same root cause; ensemble of 3 candidates all spec-verifier-blocked

**Tests**: 1502 → 1513 (+11 dispatcher tests + 1 cross-platform bash regex test).

**Follow-up needed**: operator adds fresh LLM-able items to `cortex/recommendations.md` so nightly + autoresearch produce real PRs. Current items are HUMAN-ONLY (D-1 git history purge, MIGRATIONS append) by design.

---

### Sprint 2.9 — Tools Foundation v0 ✅ SHIPPED 2026-05-09 (M effort, ⭐ STRATEGIC)

**Status**: ✅ Shipped 2026-05-09. New `bin/cortex/tools/` module tree (~2k LoC): descriptor spec + validator + 6 reference tools (read/write/edit/glob/grep/bash) + 4 runtime adapters (toMcpServer primary, toClaudeAgentSdk, toOpenAiAgents, toVercelAiSdk-stub) + annotation routing + 2 shared libs (`_lib/path-safety.cjs` + `_lib/limits.cjs`). 6-agent R2 review pipeline (acceptance + blind + correctness + security + ssot + edge-case) surfaced 6 BLOCKER + 18 HIGH + 9 MEDIUM findings; all BLOCKERs and key HIGHs fixed in hardening pass before merge. 1349 → 1502 tests (+153). R1 memo: `docs/research/sprint-2.9-tools-foundation-2026-05-09.md`.

**Hardening pass shipped (R2 closed-out)**:
- Extracted `_lib/path-safety.cjs` (5 duplicates → 1 SSOT) with fail-closed semantics + UNC/device-prefix rejection + Windows case-insensitive containment + parent-mode for `write`.
- Extracted `_lib/limits.cjs` (4 duplicates of MAX_FILE_BYTES + 2 of MAX_DEPTH/MAX_RESULTS → 1 SSOT).
- TOCTOU symlink-swap defense in `write` + `edit` via `O_NOFOLLOW` on POSIX (Windows: lstat-only fallback).
- Bash forbidden-token list rewritten as REGEX patterns: rm -rf `[/home, /etc, /var, /usr, /opt, /]`, disk-device writes (`> /dev/sd*` / `nvme*` / `hd*` / `vd*` / `xvd*`), pipe-to-shell (curl/wget/fetch | sh/bash/zsh/ksh/fish/python/ruby/perl/node), process-substitution `bash <(curl …)`, eval/source curl, halt with full trailing context, Windows-specific `del /F /S /Q`, `format X: /Y`, `Remove-Item -Recurse -Force`.
- Bash env scrub: switched from denylist (5 keys) → ALLOWLIST (PATH, HOME, USER, USERPROFILE, LANG, TZ, SHELL, TEMP, TMP, SystemRoot, COMSPEC + STEWARD_BASH_ENV_PASSTHROUGH).
- Bash output-cap: track Buffer arrays not string concat (UTF-8 multibyte truncation defense).
- Bash empty `STEWARD_BASH_ALLOWLIST` (after trim) now FAIL-CLOSED instead of silent-disable.
- Bash spawn null-check stdout/stderr + sync-error handler.
- Bash `\s` Unicode whitespace + `/u` flag for NBSP/NNBSP/MMSP/IDEOGRAPHIC bypass defense.
- `read.cjs` magic-byte sniff for binary files (NUL byte in first 8 KiB → `TOOL_READ_BINARY`).
- `read.cjs` EOL detection (lf/crlf/mixed) for round-trip fidelity.
- `edit.cjs` non-overlapping count (`aa` in `aaaa` counts 2, not 3 — Sprint 1.6.18 lesson class).
- `edit.cjs` shrink defense applied unconditionally (was inverted boolean — replace_all=true is MORE destructive, not less).
- `edit.cjs` directory-target rejection + `not-a-file` rejection.
- `write.cjs` directory-target rejection + parent-not-directory rejection.
- `glob.cjs` recursive alternative translation (`{*.cjs,*.js}` no longer crashes).
- `glob.cjs` Windows-friendly `dev:ino==0:0` path-key fallback.
- `grep.cjs` per-line regex deadline (`GREP_PER_LINE_REGEX_DEADLINE_MS=50` → ReDoS defense).
- `grep.cjs` count-mode `total_matches` accurate (was hardcoded 0).
- `grep.cjs` default-exclude `node_modules / .git / dist / build / .next / target / .venv / __pycache__ / .cache / coverage / .nyc_output / .turbo / .parcel-cache / .svelte-kit` (opt-in via `include_noise=true`).
- `validate-descriptor.cjs` strict `AsyncFunction.constructor.name` check (was tautology accepting any function).
- `validate-descriptor.cjs` `$ref` walker (was `JSON.stringify().includes('"$ref"')` — false-positive on enum values).
- `validate-descriptor.cjs` filename-match enforced via `index.cjs` `FILENAME_BY_TOOL` map at load-time.
- `toMcpServer.cjs` proto-pollution defense: reject `__proto__` / `constructor` / `prototype` keys recursively in `validateArgs`; `Object.create(null)` for tool lookup.
- `toMcpServer.cjs` buffer cap (`MCP_MAX_LINE_BYTES=10MiB`) → JSON-RPC `-32700` parse error response on overflow.
- `toMcpServer.cjs` parse-error response (was stderr-only, leaving client hanging).
- `toMcpServer.cjs` notifications (no `id`) get NO response per JSON-RPC spec.
- `toMcpServer.cjs` `additionalProperties: false` enforced even when `properties` is empty.
- New tests: 153 (validator + 6 tool handlers + 4 adapters + annotation routing + path-safety + Tier 5 catalog hash regression).
- New SKILL.md template: `templates/skills/example-using-cortex-tools.md`.

**Out-of-v0-scope findings (deferred to Sprint 2.9.5+ or operator-acknowledged)**:
- Full Pattern 2 architectural split (reader-only + writer-only MCP servers) — Sprint 4.0 marketplace concern.
- Pattern 5 HITL gate on raw MCP for destructive tools — Sprint 2.9.5 (when MCP server exposed beyond Steward internal use).
- Pattern 1 `<untrusted>` markers around tool output — Sprint 2.9.5.
- Property-based tests (fast-check on globToRegex + annotation 16-perm sweep + edit invariants) — Sprint 2.3 + 2.9.5 territory.
- Stryker mutation testing config — Sprint 2.3 territory.
- Vercel AI SDK adapter actual TS implementation with Zod re-wrap — Sprint 2.9.5.
- WebFetch + WebSearch tools with `openWorldHint` cost-window integration — Sprint 2.9.5.
- Annotation-routing → action-engine integration — Sprint 2.9.5 (currently dead code from Steward POV; routing helpers + tests verify contract holds).
- Lethal-trifecta architectural verdict (reader + writer + bash in one session) — accepted as v0 limit; Steward upstream gates (acceptance criteria + spec-verifier + halt-check + cost-windows) compensate for internal use.

**Why now**: operator-instinct dispatch 2026-05-09 confirmed that Claude Code's curated tool palette (Read / Write / Edit / Glob / Grep / Bash + ~18 others) is the right set of names to borrow, BUT the right *spec format* is **MCP** (Model Context Protocol — donated to Linux Foundation Dec 2025, governed by Anthropic + OpenAI + Google + MSFT + AWS, embedded in Claude Agent SDK as the lingua franca). Sprint 2.9 ships a neutral tool-descriptor spec (MCP-shaped JSON Schema + annotation taxonomy) + 6 reference tools + 4 runtime adapters. **Strategic moat**: tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) integrate **for free** with Steward's existing safety mechanics — Sprint 1.9.0 spec-verifier, halt-check, journal write-trailers, cost-windows. No other framework's tool catalog wires into a verifier-driven autonomous runtime.

**Strategic impact**: this is the **interoperability pivot** of Tier 1 → Tier 2. After 2.9, every cortex-x skill ships with a portable tool descriptor that runs unchanged in Steward (CJS), Claude Agent SDK, Vercel AI SDK projects, OpenAI Agents SDK, and any MCP client (Cursor, Codex, Aider, Windsurf). Combined with SKILL.md (already supported by 12 runtimes), cortex-x becomes the only framework where the *same tool* can power both a Claude Code session and an autonomous Steward run with **zero code changes** — and the same descriptor automatically gates destructive ops through the spec-verifier.

**Scope**:
- New module tree `bin/cortex/tools/` — descriptor spec + 6 reference tools + validator + 4 adapters.
- `bin/cortex/tools/_spec.md` — human-readable descriptor spec (JSON Schema + annotation taxonomy + naming regex `^[a-z0-9_-]{1,32}$`).
- `bin/cortex/tools/_lib/validate-descriptor.cjs` — runtime validator with cross-checks (e.g. `readOnlyHint=true` rejected if handler invokes `assertEditWithinCwd`).
- 6 reference tools as CJS: `read`, `write`, `edit`, `glob`, `grep`, `bash` — borrowed taxonomy from Claude Code, expressed in MCP-shaped descriptors.
- `_adapters/toMcpServer.cjs` (primary, stdio JSON-RPC) + `toClaudeAgentSdk.cjs` + `toVercelAiSdk.cjs` (TS) + `toOpenAiAgents.cjs`.
- Steward `action-engine.cjs` consumes descriptors and routes through annotations:
  - `destructiveHint=true` → mandatory `acceptance_criteria[]` (Sprint 1.9.0).
  - `readOnlyHint=true` → skip halt-check pre-condition + skip journal write-trailer.
  - `idempotentHint=true` → safe-to-retry hint for cost-safety.
  - `openWorldHint=true` (network) → daily/weekly/monthly windows from Sprint 1.9.1 apply.
- Sample SKILL.md in `templates/skills/example.md` references the new palette.
- Tier 4 contract test — descriptor roundtrips losslessly through all 4 adapters.
- Tier 5 prompt-regression test — stable hash of tool catalog detects drift.
- Defense-in-depth: `bash.cjs` reuses Sprint 2.7 path-traversal hardening + Sprint 2.4 `containsShellMetacharacters` + `_FORBIDDEN_FLAGS`; `read`/`write` reuse `assertEditWithinCwd`.

**Out of scope (Sprint 2.9.5 / 3.x)**:
- `webfetch` / `websearch` tools — need `openWorldHint` cost wiring + `STEWARD_DAILY_USD_CAP` integration (Sprint 2.9.5).
- Tool marketplace / registry (Sprint 4.0).
- `NotebookEdit` / `Task` / `TodoWrite` / `Plan` tools — don't fit autonomous Steward runtime.
- Standalone MCP server binary (Sprint 4.0 marketplace concern).

**New error codes**:
- `TOOL_DESCRIPTOR_MALFORMED` — validator rejected at load time.
- `TOOL_ANNOTATION_INCONSISTENT` — `readOnlyHint=true` declared but handler signature implies destructive op.
- `TOOL_HANDLER_MISSING` — descriptor without `handler` export.
- `TOOL_ADAPTER_ROUNDTRIP_DIVERGENCE` — descriptor lost data through adapter (contract-test only).

**Acceptance criteria (10)** — see `docs/research/sprint-2.9-tools-foundation-2026-05-09.md` §4.

**Pre-implementation research dispatch (R1)** — ✅ DONE 2026-05-09. Memo: `docs/research/sprint-2.9-tools-foundation-2026-05-09.md`. 14 sources cited; recommendation = Option (b) neutral spec + adapters with MCP as the spec format.

**Open questions for operator** (R1 §8):
1. Tool naming: lowercase per MCP regex (`read` / `write` / `edit`) or capitalized like Claude Code (`Read` / `Write` / `Edit`)? Memo recommends lowercase + document the mapping.
2. Ship `bash` from day 1 or punt to 2.9.5? Memo recommends ship with hardened policy-check.
3. CJS + TS adapters together or CJS-first? Memo recommends CJS-first.
4. MCP transport: stdio only or stdio + SSE? Memo recommends stdio-only for v0.

**Stolen from**: Claude Code tool catalog (taxonomy) + MCP spec (descriptor format + annotations) + Claude Agent SDK `createSdkMcpServer` (proof MCP is lingua franca at Anthropic) + Vercel AI SDK v6 `tool()` (TS surface) + OpenAI Agents SDK `FunctionTool` (strict_json_schema discipline) + agentskills.io / SKILL.md (distribution format) + cortex-x Sprint 1.9.0 spec-verifier (integration anchor).

---

### Sprint 2.5b — `workflow_hardener` action_kind (S effort) ✅ SHIPPED 2026-05-10 (commit `213ea72`)

**Status**: 📋 Proposed 2026-05-10 from housekeeping audit synthesis. R1 memo: `docs/research/cortex-x-housekeeping-audit-2026-05-10.md` §3 + `sprint-2.5b-2.6b-devops-hygiene-research-2026-05-10.md`. Awaiting operator approval.

**Why**: GitHub's [Aug 2025 policy](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/) enforces SHA pinning; the [2026 roadmap](https://github.com/orgs/community/discussions/190621) adds workflow lockfiles. cortex-x's `dep_update_patch` covers version drift, but not workflow security hardening (missing `permissions:`/`concurrency:`/`timeout-minutes:` blocks, branch-protection drift). Direct precedent = [StepSecurity Secure-Repo](https://github.com/step-security/secure-repo); Renovate-Mend explicitly does NOT cover this niche. Pre-public-launch ship gate.

**Scope (deterministic, zero LLM cost)**:
- Replace `uses: actions/checkout@v4` with `uses: actions/checkout@<sha> # v4` via `gh api repos/:o/:r/git/refs/tags/<v>` resolution.
- Inject missing `permissions: { contents: read }` at workflow root if absent.
- Inject missing `concurrency:` and `timeout-minutes:` defaults.
- Audit `gh api repos/:o/:r/branches/main/protection` against committed SSOT `.github/branch-protection.json`; diff = file gh issue.
- PR-only output for workflow file edits; gh-issue for branch-protection drift.

**Cadence**: weekly cron `0 03 * * 0` (Sunday 03:00 UTC, before existing dep-patch 04:00).

**Acceptance criteria**:
- [ ] All workflow `uses:` references SHA-pinned with version comment after Sprint 2.5b first run.
- [ ] All workflows have `permissions:`, `concurrency:`, `timeout-minutes:`.
- [ ] Branch-protection drift detected when SSOT file diverges from live config.
- [ ] Touched files restricted to `.github/workflows/*.yml` + `.github/branch-protection.json` (acceptance criterion).
- [ ] Zero LLM cost recorded in journal.
- [ ] ≥ 12 new tests + 1 fixture-based integration test.

**New error codes**:
- `WORKFLOW_GH_API_FAILED` (SHA resolution failed; fail-open, log warning)
- `BRANCH_PROTECTION_DRIFT` (advisory, not blocking)

**Stolen from**: StepSecurity Secure-Repo logic, but in zero-dep CJS.

**Out of scope**: SBOM generation (no shipped artifact), license compliance (Dependabot covers), CODEOWNERS sync (single-maintainer repo).

---

### Sprint 2.6b — `secret_history_sweep` action_kind (S effort) ✅ SHIPPED 2026-05-10 (commit `213ea72`)

**Status**: 📋 Proposed 2026-05-10 from housekeeping audit synthesis. R1 memo: `docs/research/cortex-x-housekeeping-audit-2026-05-10.md` §3. Awaiting operator approval.

**Why**: Pre-public-flip MUST. cortex-x has `no-pii.yml` (regex-only at HEAD) + `policy-check.cjs` `NO_SECRET_READ` (Sprint pre-2.0). Neither covers **rotated-but-leaked keys, encoded blobs, deep history**. [TruffleHog](https://github.com/trufflesecurity/trufflehog) full-history with `--only-verified` covers 800+ secret types and verifies them as currently-active. The moment cortex-x flips public, any verified credential in history is exposed; this sweep catches it the week before.

**Scope (deterministic, zero LLM cost)**:
- `trufflehog git file://. --only-verified --json --since-commit=<last-sweep-sha>`
- On verified hit: open `gh issue` with severity LABEL.
- **NO auto-PR** — secret revocation requires human (rotate key, then commit-history rewrite is destructive + governed by R5 human-only).
- Update journal with last-swept-sha.

**Cadence**: weekly cron `0 02 * * 0` (Sunday 02:00 UTC, before workflow_hardener 03:00).

**Acceptance criteria**:
- [ ] First sweep produces `journal/secret-sweep-<date>.jsonl` with `last_swept_sha` baseline.
- [ ] Subsequent sweeps run incrementally `--since-commit=<last_swept_sha>`.
- [ ] Verified hit opens gh issue; non-verified hit logged but not surfaced.
- [ ] Read-only against working tree; only writes are journal entries + `gh issue create`.
- [ ] Zero LLM cost recorded in journal.
- [ ] Fail-open: missing `trufflehog` installer → kind skipped with single warn line.
- [ ] ≥ 10 new tests + 1 fixture-based integration test (synthetic dirty-history repo).

**New error codes**:
- `TRUFFLEHOG_NOT_FOUND` (PATH lookup miss; fail-open)
- `SECRET_HISTORY_HIT` (advisory, not blocking — issue is the surface)

**Stolen from**: TruffleHog Apache-2.0 CLI direct integration; weekly-verified-history pattern from [appsecsanta.com gitleaks-vs-trufflehog](https://appsecsanta.com/sast-tools/gitleaks-vs-trufflehog).

**Out of scope**: pre-commit hooks (Steward doesn't enforce dev config), SaaS GitGuardian / TruffleHog Enterprise (Apache-2.0 OSS CLI is sufficient).

---

### Sprint 2.5c — `tech_debt_audit` test_count delta extension (XS effort) — ✅ SHIPPED

**Status**: ✅ Shipped (verified 2026-05-12). `test_count` field threaded through `fallbackTestSourceRatio()` in `bin/steward/_lib/tech-debt-audit.cjs:277-322`; added to `metrics` envelope; `DEFAULT_TRIGGERS` in `bin/steward/_lib/snapshot-diff.cjs:120` includes `{ metric: 'test_count', kind: 'pct_drop', threshold: 5 }`. Test coverage in `tests/unit/steward/tech-debt-audit.test.cjs:106-138`. No new infra; folds into existing nightly cron via `tech_debt_audit` action_kind.

**Scope**: Add `test_count` field to `cortex/debt-snapshot.json`; alarm if month-over-month delta < -5 %. No new action_kind; folds into existing nightly cron.

**Why**: Catches regression where tests get deleted or skipped en-masse without operator awareness. Zero new infra; ~10 LoC.

---

### Sprint 2.11 — `senior_tester_review` action_kind (M effort, ⭐ DIFFERENTIATOR) ✅ SHIPPED 2026-05-10 (commit `e3829a3`)

**Status**: 📋 Proposed 2026-05-10 from housekeeping audit synthesis. R1 memo: `docs/research/cortex-x-housekeeping-audit-2026-05-10.md` §2 + `sprint-2.11-senior-tester-research-2026-05-10.md`. Awaiting operator approval.

**Why**: **Open niche, real research lane (2024Q4-2025Q4)**. UTRefactor (FSE'25, [arxiv:2409.16739](https://arxiv.org/abs/2409.16739)) — 89% smell reduction. Agentic-LMs (IEEE Software, [arxiv:2504.07277](https://arxiv.org/abs/2504.07277)) — Phi-4-14B pass@5 75.3% within 5% of frontier. ESE 2025 ([DOI 10.1007/s10664-025-10718-x](https://link.springer.com/article/10.1007/s10664-025-10718-x)) — 13 new test smells in 4 categories, explicit tsDetect extension for AI-generated tests. **No SaaS or GitHub App ships cron-driven "audit existing tests" mode** — Diffblue Cover (Test Review/Test Asset Insights) generates new tests rather than auditing existing quality. Mabl/Functionize/TestSprite/Applitools/Virtuoso all sit in authoring lane. cortex-x positioning: "AI-augmented tester, not replacement" (already in Sprint 2.10 framing) — this kind makes that real on a cron.

**Distinct from existing kinds** (no overlap):
- ≠ `flaky_test_repair` (runtime symptom, not static smell)
- ≠ `test_coverage_gap` (coverage delta, not quality at fixed coverage)
- ≠ `mutation_score_drift` (oracle strength via mutation, not broader suite-quality)
- ≠ `tech_debt_audit` (non-test code-quality)
- ≠ Sprint 2.10 `/test-audit` (one-shot retrofit lens; this is monthly cron with different deliverables)

**Architecture**: 2-stage hybrid (deterministic detector + LLM judge).

```
PHASE A — DETECT (deterministic, $0)
  ├─ tsDetect / JNose                     (Java)
  ├─ PyNose                               (Python)
  ├─ cortex-x-owned JS/TS pattern grep    (Tier-1 audience)
  └─ Layer-balance: count tests per layer; flag pyramid skew (target 70/20/10 unit/integration/e2e)

PHASE B — JUDGE (LLM, single call)
  ├─ Input: ranked smell list (top 20) + 3-5 redacted test files +
  │         project profile + ISO 25010 + Bach HTSM lens
  ├─ Output (JSON-mode): {findings[], layer_balance_assessment,
  │                       top_3_strategic_gaps, est_npm_test_pass_after_fixes}
  └─ Default model: deepseek-v4-flash (~$0.005/run); escalate to
       claude-sonnet for ≥10 findings (per Sprint 2.0b routing)

PHASE C — DELIVER (deterministic)
  ├─ Write journal/senior-tester-YYYY-MM.md
  ├─ Open ONE GitHub issue with checklist (don't fragment into 20)
  ├─ Emit OTLP trace span (Sprint 2.0)
  └─ DO NOT auto-refactor in v1 — refactor = separate v1.5, gated on
     mutation_score_drift baseline + delta ≥ 0
```

**Cadence**: monthly cron `0 04 1 * *` (1st of month, 04:00 UTC). Auto-trigger when `tech_debt_audit` flags test-folder hotspot.

**Cost ceiling (R4)**: ~$0.25/month at full cadence × 5 active projects. Well under Sprint 1.9.1 caps.

**Acceptance criteria**:
- [ ] Phase A deterministic detection runs zero-cost on Java + Python + JS/TS.
- [ ] Phase B LLM judge produces structured JSON with findings + layer-balance + strategic gaps.
- [ ] One gh issue opened per run with checklist (not N issues).
- [ ] OTLP span emitted to Phoenix.
- [ ] DO NOT auto-edit source/test files (acceptance criterion: `touchedFiles.every((p) => p.startsWith("journal/"))`)
- [ ] ≥ 18 new tests + 1 fixture-based integration test (5 fixture repos with known-bad test suites).

**Pre-ship gates**:
1. Encode tsDetect 21 + ESE'25 13 = **34-smell registry** as cortex-x SSOT JSON.
2. Wire JS/TS pattern detectors first; Java/Python next.
3. Eval suite entry: 5 fixture repos with expected findings.
4. R2 review pipeline (acceptance + correctness + security + ssot + edge-case).
5. Document in `docs/steward-runtime.md` § action_kinds.

**Open question for operator**: v1 = **review-only** OR review + propose-PR-with-refactor? Recommendation: **review-only v1**, refactor in v1.5 gated on mutation_score baseline existing AND delta ≥ 0 post-refactor. Rationale: [arxiv:2506.07594](https://arxiv.org/abs/2506.07594) shows LLM refactors *introduce new smells* in non-trivial fraction of cases; R5 (human-only paths inviolate) reinforces.

**Stolen from**: UTRefactor DSL refactor rules + Agentic-LMs multi-agent loop pattern + tsDetect 21-smell taxonomy + ESE 2025 13-smell extension + cortex-x Sprint 2.10 qa-engineer profile + qa-retrofit prompt (different cadence, same grounding sources).

---

### Sprint 2.15 — cortex-capabilities auto-generated registry ✅ SHIPPED 2026-05-11

**Status**: ✅ Shipped 2026-05-11 (commit `59a91a8`; R2 hardening Sprint 2.15.1 follow-up). Operator-facing answer to *"I do not even know what we have anymore."* `bin/cortex-capabilities.cjs` walks the repo filesystem and produces SSOT `cortex/capabilities.md` + `cortex/capabilities.json` listing every action_kind, Steward primitive, universal hook, standard, profile, prompt, review-pipeline agent, GitHub workflow, and test count. Current counts live in the auto-generated [`cortex/capabilities.md`](../cortex/capabilities.md) TL;DR — referencing them here would drift the moment a category gains an entry. Header comments are SSOT — each module owns its description; script aggregates. Zero-deps, fail-open, side-effect-free without `--write`. npm script `npm run capabilities`. Contract tests cover shape, idempotency, markdown validity.

**Future**: Sprint 3.X may inject capability summary into Steward system prompt so the autonomous runtime knows its own toolset (currently the registry is operator-facing only).

---

### Sprint 2.18 — `read_set` acceptance-criterion kind (read-coverage proof) — ✅ SHIPPED 2026-05-12

**Status**: ✅ Shipped 2026-05-12. R1 → R2 → review pipeline → R2 hardening all same day. 6-agent parallel review (acceptance + blind + correctness + security + ssot + edge-case) found 1 HIGH symlink termination, 1 HIGH expected_glob path-traversal, 1 HIGH padding bypass via expected_count, 1 HIGH mergeCriteria override weakening, 4 MED (NFC normalize, excludes merge-vs-replace, rootMissing → SPEC_MALFORMED, min_coverage=0 contradiction) — all fixed pre-commit. 2270 → 2338 tests (+68 read_set + R2 regression). R1 memo: `docs/research/sprint-2.18-read-coverage-proof-research-2026-05-12.md`. Operator-flagged after a 2026-05-12 Facebook incident discussion: agent for API doc generation read 64/278 methods and confabulated the remaining 214. Class of failure invisible to every current Steward gate because the edit-side artifact is internally consistent — it's just wrong about coverage of the input set.

**Why this is one criterion-kind, not a new architectural layer**:
- Current spec-verifier (Sprint 1.9) gates the **edit side** via 5 criterion kinds (shell, file_predicate, regex, ears_text, llm_judge). Sprint 2.18 adds a **6th kind: `read_set`** — folds into the existing dispatcher, no new top-level subsystem.
- Claude Agent SDK already exposes `PostToolUse` hook with `tool_input.file_path` for every Read invocation ([code.claude.com/docs/en/agent-sdk/hooks](https://code.claude.com/docs/en/agent-sdk/hooks)) — the host harness can build an authoritative read manifest the agent **cannot lie about** because the SDK boundary captures every Read call independently of agent self-report. cortex-x just needs to log + verify the manifest.
- GitNexus has already proven the architectural pattern at the indexed-codebase level ([github.com/abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus)) — `gitnexus status` + PostToolUse stale-index hook is structurally identical to "declared-scope coverage check."

**Scope** (~150 LoC verifier + ~80 LoC hook + 1 error code + ~12 tests, half-day to one day):
- `kind: read_set` criterion handler in `bin/steward/_lib/spec-verifier.cjs` — declarative fields:
  - `expected_glob: '<glob>'` — file set the action claims to fully cover
  - `expected_count: <N>` (optional) — pinned method/file/entity count from plan
  - `min_coverage: 1.0` — fraction of `expected_glob` that must appear in read manifest (default = 1.0)
- PostToolUse hook handler `shared/hooks/post-tool-use-read-manifest.cjs` — writes JSONL entry per Read invocation to `$CORTEX_DATA_HOME/journal/read-manifest-<action_key>.jsonl`. Hook is event-driven, no polling, no overhead when not gating.
- New error code: `SPEC_READ_SET_INCOMPLETE` — fires when manifest count < expected_count OR manifest set ∩ expected_glob enumeration < min_coverage.
- Plan-side schema extension: `acceptance_criteria` array can include `{ kind: 'read_set', expected_glob, min_coverage, expected_count? }`.

**Action_kinds that benefit immediately** (3 candidates already in current registry):
- `pattern_transfer` — reads sibling repos read-only. Without read_set, agent can claim "I read all 5 allowlisted siblings" while having only read 2. Sprint 2.7 ✅ shipped + Sprint 2.18 closes the read-coverage gap.
- `release_notes_drafter` — reads merged PRs since last tag. Read_set ensures the draft notes actually cover the full PR range.
- `senior_tester_review` (Sprint 2.11 📋 in flight) — reads test files + source. Sprint 2.18 is the natural co-ship gate ("the senior tester actually read what it claims to have read").

**R1 grounding**:
- No 2026 framework ships a first-class read-coverage primitive — confirmed against Letta, AutoGen, LangGraph, CrewAI, OpenAI Agents SDK, Cursor, Devin, Replit Agent in the R1 memo. Terminology hasn't crystallized ("completion proof", "coverage attestation", "read-set verification" return no canonical hits).
- CloudAPIBench ([arxiv.org/abs/2407.09726](https://arxiv.org/abs/2407.09726)) quantifies the doc-generation hallucination class — not a one-off anecdote.
- "Execution Hallucination" taxonomy ([arxiv.org/html/2509.18970v1](https://arxiv.org/html/2509.18970v1)) scopes only tool-invocation claims, not read-side claims — leaving cortex-x to ship a **named differentiator**, not a me-too.
- TheAgentCompany checkpoint pattern ([arxiv.org/html/2412.14161v2](https://arxiv.org/html/2412.14161v2)) — programmatic evaluators baked into task definition, structurally similar to acceptance_criteria. Best frontier model autonomous completion = 30.3%, meaning the agent-claimed vs agent-achieved gap **is** the dominant signal in production.

**Acceptance criteria for the sprint itself** (recursive defense — read_set criterion gates the sprint's own ship):
- [ ] `spec-verifier.cjs` handles `kind: read_set` for all 3 candidate action_kinds without breaking existing tests
- [ ] PostToolUse hook writes manifest JSONL per Read invocation; survives concurrent action runs (mutex via Sprint 2.7 lock primitive)
- [ ] `SPEC_READ_SET_INCOMPLETE` error fires when agent claim > manifest reality
- [ ] Property test: random `expected_glob` × random partial-read manifest → verifier correctly detects under-coverage
- [ ] Manual dogfood: `pattern_transfer` action with read_set criterion catches simulated 60% partial-read

**Anti-scope** (deliberately excluded — narrow scope per R1 recommendation):
- ❌ No new top-level capability layer. Folds into existing Sprint 1.9 verifier dispatcher.
- ❌ No retroactive read-set criteria on existing 16 action_kinds — opt-in per kind, ship 3 candidates only.
- ❌ No edit-side coverage proof — Sprint 2.2.5 `expectedSha256` on str_replace/insert already covers that.
- ❌ No OTel export of manifest in v0 — Sprint 2.0 Phoenix path can consume it later if needed.

**Stolen from**: GitNexus PostToolUse hook architecture + Claude Agent SDK hooks-as-audit-boundary + TheAgentCompany checkpoint pattern + CloudAPIBench failure-class quantification.

**Co-ship candidate**: when Sprint 2.11 `senior_tester_review` lands, add `read_set` criterion to its acceptance_criteria as the first real production usage. Read-heavy reviewer is the perfect first beneficiary.

---

### Sprint 2.17 — `/cortex-help` skill (one-screen capability menu) ✅ SHIPPED 2026-05-11

**Status**: ✅ Shipped 2026-05-11. `shared/skills/cortex-help/SKILL.md` — auto-discovered after `install.{sh,ps1}` sync, invokable as `/cortex-help` or via natural language ("co umíš?", "what can cortex do?"). Lightweight user-facing menu of invokable slash commands, complementing the machine-readable `cortex/capabilities.md` registry from Sprint 2.15. **Namespaced as `/cortex-help` because `/help` is a Claude Code built-in slash command** — initial Sprint 2.17 shipped as `/help` and collided with the built-in (Claude Code rejected loading the custom skill); same-day fix renames to `/cortex-help` matching the existing `cortex-*` prefix convention (`cortex-init`, `cortex-doctor`, `cortex-reflect`, `cortex-sync`).

**Why**: the capability registry (Sprint 2.15) answers *"what IS in cortex-x?"* exhaustively. But after install, a new user doesn't want a wall of categories — they want a 60-second answer to *"what can I type next?"* The `/cortex-help` skill is that menu: 10 invokable slash commands, one line each, plus a project-state-aware "default next" nudge (`.cortex-bootstrap-pending` → resume; `cortex/AUDIT.md` → `/retrofit`; empty folder → `/cortex-init`).

**Composition**:
- Reads existing capability metadata via the published `cortex/capabilities.md` link; never duplicates the registry. Counts stay SSOT in the auto-generated file.
- 5 quick filesystem peeks for project-state detection — fail-open if any fail.
- Czech / English language-aware (reads prior-turn signal, defaults to English).
- Print → nudge → stop. No auto-invocation.

**Scope**: SKILL.md only (~120 LoC markdown). Zero runtime code added.

---

### Sprint 2.16 — `/designer` skill (Claude Design-style flow inside Claude Code) ✅ SHIPPED 2026-05-11

**Status**: ✅ Shipped 2026-05-11. `shared/skills/designer/SKILL.md` — auto-discovered after `install.{sh,ps1}` sync, invokable as `/designer` or via natural language ("navrhni mi landing page"). Reproduces the public Claude Design recipe: intake questioning flow + library-palette decision (shadcn / Aceternity / Hero UI + GSAP / Lenis / Framer Motion) + parallel worktree exploration (3-4 variations, operator picks winner, rest discarded) + iteration loop + handoff to `cortex/STYLE.md`.

**Why**: Claude Design is Claude Code + a skill + Opus 4.7's vision upgrade (1.15 → 3.75 MP). The weekly limit and design-to-code handoff are the actual user-facing pains in the standalone product. Inside Claude Code we have:
- Real code output (not a throwaway prototype)
- Git-integrated iteration (revert, branch, worktree)
- No design-budget cliff (same Max sub, same effort budget as everything else)
- Parallel subagent worktrees for variation exploration — feature Claude Design doesn't have

**Scope**: SKILL.md only (~280 LoC markdown). Zero runtime code added. Composes with existing `senior_tester_review` (a11y / motion-overuse review) and roadmapped Sprint 4.6 (Playwright-MCP UI verification).

**Source-recipe analysis**: [docs/transcripts/Claude Design Is Actually A Trap.txt](./transcripts/Claude%20Design%20Is%20Actually%20A%20Trap.txt) public Claude Design post-mortem.

**Future**: when Sprint 4.6 (Playwright-MCP) lands, designer flow auto-runs visual-regression check on the chosen variation before merge.

---

### Sprint 3.4 — External tool capability adapters (M effort, ⭐ ECOSYSTEM) — ✅ v0 SHIPPED 2026-05-13 · R1 ✅ DONE

**v0 shipped 2026-05-13** — invocation contract + first adapter scaffold:
- `bin/steward/_lib/external-adapter.cjs` (~230 LoC) — pure-deterministic SKILL.md `external_dependency` frontmatter parser + 4-tier license gate. Validators: HTTPS-only repo URL, install_cmd allowlist (shell metachars rejected), version semver-constraint regex, adapter_slug + secret_env constraints. `probeAdapter(skillDir)` returns frozen adapter descriptor or structured error.
- `shared/skills/external-adapter-hyperframes/SKILL.md` — first adapter scaffold (Hyperframes, Apache-2.0, oss-permissive tier). v0 ships frontmatter contract only — Docker sandbox + actual render call is v1.
- 28 tests covering: frontmatter parse, schema validation (8 failure paths), license gate per-tier (5 tiers × 2 paths), workspace path resolution, integration with Hyperframes SKILL.md.
- **R2 (security-auditor) closed 2 HIGH contract-debt findings in-commit**:
  - **Finding 4 (slug spoofing, CWE-345)**: malicious skill could declare `adapter_slug: hyperframes` in its frontmatter and inherit Hyperframes' STEWARD_LICENSE_AUTHORIZED grant + cache-poison its workspace. Fix: directory name is authoritative; frontmatter `adapter_slug` must match dir or be omitted; `EXTERNAL_DEP_SLUG_MISMATCH` rejection.
  - **Finding 2 (install_cmd shell injection, CWE-78)**: install_cmd was length-bounded only. v1 executor (`child_process`) would inherit shell-injection exposure. Fix: `INSTALL_CMD_RE` allowlist rejecting `; & | $ \` ( ) { } < > ' " newline`. Accepts typical npm/pip/cargo invocations + flags.
- v0/v1 boundary explicit: this commit ships the **invocation contract**; v1 ships the **executor** (git clone + Docker sandbox + Hyperframes render call + Remotion adapter for license_required tier).

**Deferred to Sprint 3.4 v1+**:
- Docker-per-action sandbox executor (matches existing `bin/steward/execute.cjs` mutex model)
- git clone + install_cmd execution (with `spawn` shell:false + arg array, per R2 lethal-trifecta blueprint)
- Hyperframes end-to-end render smoke test (Linux CI + Win11 dogfood)
- Second adapter: Remotion (proves `per_invocation_metered` tier + `$100/mo floor`)
- Cost attribution rollup into journal with `license_tier` annotation
- Acceptance criteria for v1: SKILL.md schema lint via `bin/cortex-capabilities.cjs`, R2 Finding 1 (skillDir trusted-root check) + Finding 5 (CORTEX_DATA_HOME normalize)



**Status**: 📋 Proposed 2026-05-11. R1 research dispatch completed same day — `docs/research/sprint-3.4-external-adapters-research-2026-05-11.md`. Formalizes the architectural shape for "cortex-x knows how to drive external repos" — Hyperframes (HTML → video, agent-native), Remotion (React programmatic video, licensed), Lottie generators, Figma plugins, Playwright codegen, etc. Gated on Sprint 2.8 Memory Foundation (so adapter usage records into lessons.jsonl) and complementary to Sprint 3.1 (self-extending capabilities — adapters are first-class skill targets).

**Why this is one sprint, not 50 per-tool skills**:
- The HARD part is the **invocation contract** (sandboxing, output discovery, error normalization, cost attribution, license/secret scoping) — not the specific tool wrapper.
- Per-tool skills are Sprint 4.0 (capability marketplace) — that's the distribution layer once the adapter pattern is proven.
- R1 confirmed CLI-based agent adapters are **10-32× cheaper on tokens than MCP** for identical tasks ([Firecrawl 2026 CLI roundup](https://www.firecrawl.dev/blog/best-cli-tools)) — pattern direction is validated by external data before we ship.
- Named precedent to cite: `claude-agent-acp` (Zed Industries) wraps Claude Code CLI as ACP provider. Microsoft Agent Framework v1.0 (2026-04-02) bakes "clone repo + prepare deps + invoke CLI" into its contract ([microsoft/agent-framework](https://github.com/microsoft/agent-framework)).

**Scope**:
- New SKILL.md schema extension: `external_dependency:` block declaring repo URL, install command, version constraint, **license tier** (`oss-permissive` / `license_required` / `seat_metered` / `per_invocation_metered`), secret requirements.
- New helper `bin/steward/_lib/external-adapter.cjs` — clones/symlinks external repo into `~/.cortex/external/<slug>/`, runs install, exposes invocation handle.
- **Sandbox**: Docker-per-action-kind for first slice (matches existing `bin/steward/execute.cjs` mutex model, no new auth surface). E2B upgrade path reserved for Sprint 4.0 marketplace (multi-tenant) — see [Letta E2B usage](https://docs.letta.com/quickstart/docker), [Docker AI sandboxes](https://docs.docker.com/ai/sandboxes/).
- Cost attribution: external-tool invocations bill against the adapter's own `cost_envelope` field + license tier; rolls up via existing journal. `license_required` adapters refuse to run when `STEWARD_LICENSE_AUTHORIZED=<adapter-slug>` env unset (R4 budget gate).
- **First adapter (proof-of-concept): Hyperframes** — [github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes), 17.2k★, Apache-2.0, v0.5.7 (2026-05-10), tagline literally "Built for agents." Already ships agentskills.io-aligned skill bundle (`npx skills add heygen-com/hyperframes` registers `/hyperframes`, `/hyperframes-cli`, `/website-to-hyperframes`, etc.) consumable by Claude Code / Cursor / Codex out of the box. No per-render fees, no seat caps, deterministic ("same input = identical output"). Node ≥ 22 + FFmpeg + Puppeteer-driven Chrome headless. Adapter is **thinner than expected** — we wire into capability registry + action_kind dispatcher, not invent a translation layer.
- **Second adapter: Remotion** — forces design of license/cost-meter axis. NOT permissive OSS: Automators tier $0.01/render with **$100/mo floor** ([Remotion license](https://www.remotion.dev/docs/license), [pricing](https://www.remotion.pro/license)). Real R4 budget item. Programmatic surface: `getCompositions() → selectComposition() → renderMedia()`. Docker image 1.2-1.8 GB. **Windows-shell `--props` quirk**: inline JSON broken on Windows, must use file (operator dogfoods on Win11 — Steward Linux cron unaffected, but operator-invoked path must use file-mode).
- Failure mode: external tool absent → adapter records `EXTERNAL_TOOL_MISSING` + tells operator how to install, never silently degrades.

**Acceptance criteria for v0**:
- [ ] SKILL.md extension schema documented + linted by `bin/cortex-capabilities.cjs`
- [ ] Hyperframes adapter renders a 5-second test composition end-to-end (Linux CI + Win11 dogfood)
- [ ] Remotion adapter scaffold present but gated on `STEWARD_LICENSE_AUTHORIZED=remotion` env — proves the license-tier gate works without paying yet
- [ ] Docker sandbox: external-adapter actions run in container, never on host filesystem
- [ ] Existing 16 action_kinds unaffected (R6 backward-compat)
- [ ] Cost attribution validated — adapter invocations show in `cortex-steward status` journal with license_tier annotation

**Pre-ship verifications (from R1 § Unverified)**:
- [ ] Hyperframes maintenance signal stable through 2026-Q3 (commit cadence check before ship date)
- [ ] Hyperframes Windows-shell smoke test (operator dogfoods on Win11 — Puppeteer + FFmpeg path needs verification)
- [ ] agentskills.io spec stability re-check at ship time (skill-bundle advantage evaporates if spec drifts)

**Why this is "promote Sprint 3.1's substrate, don't pre-multiply"**: the operator's intuition that cortex-x should orchestrate Hyperframes / Remotion / project-X is correct — R1 confirms the pattern direction is winning over MCP by 10-32× cost margin. The trap is shipping 50 wrappers. The right unit is the ADAPTER PROTOCOL. Once that ships, the operator (and Steward via Sprint 3.1 self-extending) can author new adapters in a single SKILL.md without runtime changes.

---

### Sprint 3.5 — SaaS-unit positioning (app + web + media as one delivered artifact) — 📋 ROADMAP-ADD 2026-05-11

**Status**: 📋 Roadmap-add 2026-05-11. This is **positioning**, not a single feature — it composes Sprint 2.16 (designer) + Sprint 3.4 (external adapters) + existing `waas-template` profile + existing `pattern_transfer` action_kind into a single delivery flow.

**Why**: operator's 2026-05-11 brainstorm — "cortex-x by mohl být totální SaaS builder, kde z jednoho promptu vyleze app + web + animace na promo + designové variace." Each piece exists separately today. The positioning shift is **explicit composition** + a single entry point that orchestrates them.

**Competitive landscape (R1-grounded, research memo §4)**: nobody is shipping the **full** composite under one brand in 2026, but four adjacent quadrants exist —
- [Flatlogic](https://flatlogic.com/generator) and [Fuzen](https://www.fuzen.io/posts/ai-saas-website-builder) own "text → working SaaS app"
- [WeWeb](https://www.weweb.io/blog/best-saas-website-builder-tools) owns "best SaaS website builder, no-code"
- [Agent Opus / Opus.pro](https://www.opus.pro/agent/workflows/saas-product-video-maker) owns "URL → promo video"

**Nobody glues both halves under one operator-grade autonomous-agent shell.** That's the cortex-x white space — and Sprint 2.16 (designer) + 3.4 (Hyperframes adapter) + existing `waas-template` profile + `pattern_transfer` already cover all four quadrants individually. Sprint 3.5 = compose them under one entry point.

**Scope (composition, not new runtime)**:
- New prompt `prompts/saas-unit.md` — multi-phase flow: `/start` (app scaffold) → `/designer` (web hero + landing) → `external-adapter:remotion` (promo video) → optional `external-adapter:hyperframes` (avatar pitch) → `pattern_transfer` from previously-shipped the operator projects (a Next.js SaaS project patterns into new project).
- Updated `waas-template` profile — declares `composes_with: [designer, external-adapters, pattern_transfer]`.
- Positioning update in `README.md` + landing copy: cortex-x as "the agentic-first **SaaS-unit builder** — one entry point produces production-grade app, marketing site, design variations, and promo media, all as real shippable code."

**Why this isn't a feature sprint**: nothing here requires new runtime. Sprint 2.16 + 3.4 + existing `waas-template` + `pattern_transfer` already cover the substrate. This sprint **wires the pieces into one operator-facing flow** + updates positioning. Effort lives in writing + integration testing, not core engineering.

**Gated on**: Sprint 3.4 v0 (need at least 1 external adapter for the "media" leg) + Sprint 2.16 (need designer skill landed — ✅ done).

**Anti-scope** (out of this sprint, in case the temptation is to bundle):
- ❌ Phone control / Discord remote — Sprint 2.6 already shipped (Discord) and Sprint 4.3 covers voice (Telegram).
- ❌ Local LLM as primary engine — Sprint 5.0 (self-hosted Steward) covers this; orthogonal axis.
- ❌ Whole-PC manipulation — R5 (human-only paths inviolate) holds; cross-project READ is fine, cross-project WRITE stays scoped per action_kind policy.

---

### Sprint 2.8.1 — lessons.jsonl → MEMORY.md exporter (S effort) — ✅ SHIPPED 2026-05-13 (v0)

**v0 shipped 2026-05-13**:
- `bin/steward/_lib/lessons-exporter.cjs` (~180 LoC) — pure-deterministic exporter: scores lessons via memory-decay.cjs, groups by action_kind, writes top-K per kind to `lessons-<kind>.md` topic files in target memory dir, emits MEMORY.md index.
- `bin/cortex-export-lessons.cjs` — operator-facing CLI (`--slug`, `--memory-dir`, `--data-home`, `--top-k`, `--min-score`, `--json`, `--dry-run`).
- 9 tests (tests/unit/lessons-exporter.test.cjs).
- Default target: `~/.claude/projects/<slug>/memory/` — Claude Code's native auto-memory directory.
- Topic file frontmatter: `name`, `description`, `type: feedback`, `last_updated` — matches Claude Code auto-memory contract from CLAUDE.md scaffold.
- v0 design decisions (resolves 3 open questions from original proposal): (a) **per-topic files** (one per action_kind), not single MEMORY.md — better claude-cli auto-load scoping; (b) **decay-aware top-K**, default 10 per kind; (c) **uni-directional write** — claude-cli does not write back (per CLAUDE.md auto-memory spec).

**Original proposal (2026-05-11)**: 📋 Proposed 2026-05-11 as smaller-bite alternative to full Anthropic Memory Tool integration (Sprint 3.X).

**Status**: 📋 Proposed 2026-05-11 as smaller-bite alternative to full Anthropic Memory Tool integration (Sprint 3.X). Decision deferred from autonomous-ship to operator review because schema design needs review.

**Why**: Sprint 2.4 claude-cli engine doesn't expose Anthropic's native Memory Tool (`memory_20250818`) — that's API-only and would re-introduce API-key billing that Sprint 2.4 deliberately killed. ALE Claude Code has its own auto-memory pipeline at `~/.claude/projects/<project>/memory/`. cortex-x's `lessons.jsonl` (Sprint 1.8.3 ReasoningBank-lite) already captures durable failure-distilled lessons — exposing them as topic files under auto-memory's directory makes them visible to claude-cli sessions automatically.

**Scope**: ~80 LoC, zero API-key dependency. Periodically writes lessons.jsonl entries as topic files. Open design questions:
- Per-topic file (e.g. `lessons-recommendation.md`, `lessons-pattern_transfer.md`) vs single MEMORY.md?
- Decay-aware write — only top-K by importance score?
- Bidirectional sync — does claude-cli's auto-memory write back? (Probably not — but verify.)

**Defer reason**: operator may want to design the write-format before this lands; the auto-memory pipeline interaction needs investigation.

**R1 memo**: `docs/research/anthropic-memory-tool-deferred-research-2026-05-11.md` (covers full Anthropic Memory Tool research + why this smaller bite is the right shape).

---

### Sprint 2.8.2 — Karpathy-style wiki layer (lessons + insights → human-readable Obsidian-shaped markdown) (S-M effort) — ✅ SHIPPED v0 2026-05-13 (verified 2026-05-14)

**Status**: ✅ Shipped v0 — `bin/cortex-wiki-consolidate.cjs` CLI + `bin/steward/_lib/wiki-consolidate.cjs` library + `wiki_consolidate` registered in `action-kinds.cjs` + ~20 R2-hardened tests (idempotency, lessons cap, YAML escaping, Windows reserved names, tie-break, mixed timestamps). Phase A is pure-deterministic (no LLM). Sprint 2.8.2 v1 (LLM-validated cross-family synthesis) deferred to a future sprint when Sprint 2.19 v1 LLM-validator pattern is more mature. Status flipped from 📋 PROPOSED → ✅ SHIPPED during Sprint 2.26 verification sweep — same drift pattern as Sprint 2.20.

**Original spec source**: [Karpathy "From Vibe Coding to Agentic Engineering" transcript](./transcripts/andrej-karpathy-from-vibe-coding-to-agentic-engineering.md):
> "I really enjoy whenever I read an article I have my wiki that's being built up from these articles and I love asking questions about things ... these are tools to enhance understanding."

Plus [Chase Agentic OS transcript](./transcripts/claude-code-agentic-os.md) Karpathy-Obsidian-RAG structure (vault → raw / wiki / output).

**Why**: cortex-x already has the **raw** layer (`journal/*.jsonl`) and the **wiki SQL index** (Sprint 3.2 FTS5) and the **output proposals** (`insights/proposals/*.md`). What's missing is the **human-readable wiki layer between raw + output** — Markdown articles synthesized from lessons + insights, browsable in any Obsidian-compatible viewer. Karpathy's framing: "I gain insight whenever I see a different projection onto information." We have the data, we have the projection (Sprint 2.19 v1 LLM validator), we just don't emit the wiki shape yet.

**Scope (v0)**:
- New action_kind `wiki_consolidate` (Phase 5 monthly cadence, complement to evolve_daily/weekly).
- Reads: `journal/*.jsonl` (raw), `lessons.jsonl` (distilled), `insights/proposals/*.md` (LLM-validated).
- Writes: `wiki/<topic-slug>.md` markdown articles with frontmatter (`name`, `topic`, `last_updated`, `source_count`, `confidence_band`).
- Topic grouping: by `action_kind` initially (lessons-recommendation, lessons-tech-debt, lessons-spec-criterion, …), then by emergent themes from Sprint 2.19 v1 transferable_to lists.
- Output dir: `wiki/` at repo root (mirrors raw/wiki/output Karpathy layout) OR `$CORTEX_DATA_HOME/wiki/<slug>/` (XDG-clean separation). Operator decides at v0 ship.
- LLM-validated synthesis: cross-family Sonnet (same pattern as Sprint 2.19 v1 + 3.0 v2). Budget cap shares the `STEWARD_WEEKLY_USD_CAP`.

**Differs from**: Sprint 2.8.1 `lessons-exporter` (writes raw lesson rows to MEMORY.md — claude-cli auto-memory contract). 2.8.2 writes **synthesized articles** — Obsidian-shaped, human-first.

**Non-goals**: no Obsidian app integration (markdown files are universal), no vector DB (FTS5 covers retrieval per Sprint 3.2 v1).

**Acceptance criteria (≥3 kinds)**:
- `shell`: `node bin/cortex-wiki-consolidate.cjs --slug=cortex-x --dry-run` exits 0 + lists ≥1 article slug.
- `file_predicate`: every emitted article has frontmatter with required keys + body ≥200 chars.
- `read_set`: wiki_consolidate reads `journal/`, `lessons.jsonl`, `insights/proposals/` only (not source code paths).

---

### Sprint 2.8.3 — Agent-first docs audit + retrofit (S effort, fast win) — ✅ SHIPPED v0 2026-05-14

**Status**: ✅ Shipped v0 — `prompts/agent-first-audit.md` skill + `bin/cortex-doc-audit.cjs` scorer + persistent snapshot at `docs/agent-first-audit.md` (2026-05-14). All 7 user-facing docs score 90-100, no critical retrofit needed (README install at line 18 = 100/100 satisfies "lead with copy-paste-to-agent" without aggressive retrofit that would harm informativeness). 4 v1 candidates backlogged in the snapshot (frontmatter completion, anchor TOC for vision.md, code-block examples for troubleshooting.md, ALL_CAPS reframing for steward-usage.md). Install-smoke matrix unaffected (no doc rewrites in v0).

**Original spec source**: [Karpathy transcript](./transcripts/andrej-karpathy-from-vibe-coding-to-agentic-engineering.md):
> "Why are people still telling me what to do? I don't want to do anything. What is the thing I should copy paste to my agent? ... every time I'm told go to this URL or something, it's just ahhh."

**Why**: cortex-x docs are mostly already agent-first (`CLAUDE.md`, `prompts/*.md`, `standards/*.md` all directly readable by Claude). But some surfaces remain human-first — install instructions ("download Node 22+"), `docs/install-walkthrough.md`, README install block, `docs/steward-usage.md`. **Karpathy's test**: can the operator copy-paste a single block into any agent and have the agent do the whole setup without manual URL navigation? Today: partly. Target: yes.

**Scope**:
- New skill `prompts/agent-first-audit.md` — runs across all `*.md` in cortex-x, scores each for "agent-first vs human-first" on 4 axes (copy-paste shape, URL-vs-content density, manual-steps count, "go to" / "open" / "click" trigger words).
- Output: `docs/agent-first-audit.md` ranked gap list.
- Retrofit pass: top 5 highest-impact docs rewritten to lead with **"copy this block to your agent →"** before the human-readable explainer. README.md install block first target.
- Optional v1: `cortex-help` skill emits an **"install via agent"** mode that returns one paste-block including OS detection.

**Stolen from**: Karpathy transcript + `agentskills.io` spec philosophy (SKILL.md format already designed for agent consumption).

**Acceptance criteria**:
- ≥5 user-facing docs scored + at least 1 (README install) retrofitted in v0.
- Manual test: paste retrofitted README install block into a fresh Claude Code session → cortex-x installs correctly without operator intervention.
- No regression: install-smoke 5-lane CI matrix stays green.

---

### Sprint 3.X — Anthropic-native context plane (Memory Tool + context-editing) — 📋 STILL DEFERRED (verified 2026-05-14, 3 of 4 blockers active)

**Status**: 📋 Roadmap-add 2026-05-11. Deferred from autonomous-ship after R1 research dispatch identified three blockers. Gated on Sprint 2.8 Memory Foundation schema work.

**Why STILL deferred 2026-05-14** — fresh R1 dispatch (memo: `docs/research/sprint-3.x-anthropic-memory-tool-2026-05-14.md`) confirmed 3 of 4 blockers remain ACTIVE:

1. **claude-cli engine collision — STILL BLOCKING + policy worsened.** Anthropic's 2026-04-04 cutoff explicitly excludes third-party harnesses from Max-OAuth subscription quota. cortex-x is a third-party harness. `total_cost_usd === 0` detector is mechanically correct but policy meaning shifted from "free path" to "borderline-compliant operator-opt-in."
2. **Sprint 2.8 Memory Foundation gate — RESOLVED.** Sprint 2.8 v0 + 2.8.1 + 2.8.2 all shipped 2026-05-09 → 2026-05-14. ReasoningBank schema in place.
3. **Value/ceremony ratio — STILL GATED.** The 39% perf claim is Anthropic-internal multi-turn agentic search eval; Steward's short-context actions don't benefit yet. Becomes applicable when `/cortex-goal` (Sprint 2.24, shipped 2026-05-14) sees long-running session usage OR autoresearch-v2 ships.
4. **NEW BLOCKER (2026-05-14): OpenRouter does NOT forward `anthropic-beta: context-management-2025-06-27`.** Per `OpenRouterTeam/ai-sdk-provider#111`, arbitrary anthropic-beta headers are silently dropped. Memory Tool today requires a fourth engine path (`STEWARD_ENGINE=anthropic`) with API-key billing — a new architectural decision.
   - **Update 2026-09-25 (partial):** the memory-tool docs now state the tool itself "doesn't require a beta header"; only the SDK helpers sit in the beta namespace ([memory-tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)). That removes the header problem for Memory Tool **alone**. Context editing (`clear_tool_uses`) — the half that carries most of the token win (blocker 3) — was not re-verified, and neither was whether OpenRouter passes the `memory_20250818` tool type through. Re-run R1 on both before un-deferring.

**New security signal from fresh R1**: CVE-2026-41686 / GHSA-p7fg-763f-g4gf on Anthropic's official `BetaLocalFilesystemMemoryTool` (TS SDK) — default `0o666`/`0o777` perms world-readable/writable. When/if `memory-store-fs.cjs` lands, MUST set `{mode: 0o600}` files + `{mode: 0o700}` dirs explicitly. Pre-write acceptance criterion now.

**Unblock triggers** (any one):
- (A) Direct-Anthropic-API engine ships independently (new engine-strategy sprint).
- (B) OpenRouter publicly adds `context-management-*` beta pass-through.
- (C) cortex-x long-context action class ships (`/cortex-goal` reaches multi-hour usage OR autoresearch v2 Sprint 2.1+) — at which point the 39% claim actually applies to our workload.

**Original 2026-05-11 deferral context** (3 blockers from `docs/research/anthropic-memory-tool-deferred-research-2026-05-11.md`):
1. **claude-cli engine collision** — Memory Tool requires direct `/v1/messages` HTTP with `betas: ["context-management-2025-06-27"]`. claude-cli bills against Max subscription via OAuth — using Memory Tool would re-introduce API-key cost line, reversing Sprint 2.4's cost pivot.
2. **Sprint 2.8 Memory Foundation schema gate** — adding Anthropic Memory Tool before deciding durable schema risks design drift.
3. **Value/ceremony ratio** — the 84% token / +39% perf wins come from Memory Tool + `clear_tool_uses_20250919` context-editing **combined**, not Memory Tool alone. Doing both at once (Sprint 3.X) gets full upside.

**Scope when prioritized**: `bin/steward/_lib/memory-tool.cjs` (~180 LoC, 6-command dispatcher, path-traversal hardened) + `bin/steward/_lib/memory-store-fs.cjs` (~120 LoC) + engine seam in OpenRouter engine (~80 LoC) + context-editing pairing (~40 LoC). Total ~420 LoC, ~19 tests, 1-2 working days. Memory Tool becomes "ephemeral within-action working memory" while `lessons.jsonl` remains "durable cross-action long-term memory." Coexistence pattern documented in research memo.

**Engine constraint**: Memory Tool enabled ONLY on OpenRouter / Anthropic-API engines, NEVER on claude-cli engine (would re-introduce API billing). Test enforces this.

---

### Sprint 2.19 — Phase 5 cortex-evolve cron wiring + "Dreaming" terminology alignment (S-M effort) — ✅ v0 + v1 SHIPPED 2026-05-13

**v1 shipped 2026-05-13** — weekly mining LLM phase (Phase B):
- `detectors/evolve-weekly.cjs` — pure-deterministic mining of repeated-mistake candidates from `journal/*.jsonl` across 14-day window. Applies B.2 evidence gates inline (min_events=3, min_projects=2, min_days_span=7).
- `bin/steward/_lib/evolve-weekly-action.cjs` — LLM validation (Phase B.3) via OpenRouter with Sonnet 4.6 default. Budget cap MAX_INSIGHTS_PER_RUN=3. Writes proposals to `insights/proposals/<date>-evolve-<slug>.md` with full citation traceability (3 journal refs per candidate). Skip_commit:true (advisory output).
- `bin/steward/_lib/action-kinds.cjs` — `evolve_weekly` registry entry with 2 acceptance criteria (writes-only-under-proposals invariant).
- `bin/steward/_lib/routing-table.cjs` — `evolve_weekly` entry with profile slots (cheap=deepseek-flash, balanced=sonnet, premium=opus).
- `.github/workflows/steward-evolve-weekly.yml` — cron `0 4 * * 0` (Sunday 04:00 UTC, matches config/evolve.yaml cadence.weekly.cron).
- 17 new tests covering: 3 evidence gates (events/projects/span), success-outcome skip, 14-day window, validator schema validation, integration (no_work, insight proposal write, noise rejection, MAX_INSIGHTS cap).
- Industry slovník alignment preserved — Dreaming/Auto Dream/NREM+REM consolidation terminology.
- R1 reused: brain-kit memo 2026-05-13 + Phase 5 design in `config/evolve.yaml` + prompts/cortex-evolve.md Phase B spec.

**v0 shipped 2026-05-13** — daily Dreaming cron (Phase A deterministic):

**Status**: 📋 Proposed 2026-05-13 from brain-kit research synthesis (`docs/research/brain-kit-landscape-2026-05-13.md`). Pull-forward from "Phase 5 self-improvement loop ⏳ designed, awaits Phase 7" — industry has shipped the same primitive (OpenClaw "Dreaming" cron, Anthropic "Auto Dream", ICLM 2026 "Language Models Need Sleep", arXiv SCM Sleep-Consolidated Memory), cortex-x is now behind on what was a designed-but-runtime-dormant capability.

**Scope**:
- 4 new GitHub Actions workflows wrapping existing prompts: `cortex-evolve-daily.yml` (ingest), `-weekly.yml` (mining), `-monthly.yml` (eval), `-quarterly.yml` (audit). Reuse Steward cron + skip-commit pattern shipped today (bash-e tolerance + JSON-validity gate).
- Terminology alignment: rename evolve-cycle outputs to "dream-cycle" / "consolidation" in user-facing docs (README, capabilities.md, prompts/cortex-evolve.md). Industry slovník is now `Auto Dream` (Anthropic), `Dreaming` (OpenClaw) — cortex-x sjednocuje, neimprovizuje terminology.
- Hard anti-hallucination gates (min_support=3, ≥2 projects, >7d spread, Bonferroni) already in `config/evolve.yaml` — wire them into the cron workflow as workflow-level gates.
- Outputs land in `$CORTEX_DATA_HOME/insights/proposals/` as PRs (already designed pattern), Steward never auto-merges.

**Effort**: S-M (1-2 days). Mostly workflow yaml + small dispatcher in `bin/cortex-evolve.cjs` + doc rewording. Real code already exists in `prompts/cortex-evolve.md` + `config/evolve.yaml`.

**Why now, not later**: Sprint LR.1 statistical disclaimer in README currently says "framework improves itself" is **designed but not yet measured**. Wiring the cron + capturing one weekly-mining cycle closes that disclaimer with empirical evidence. Also: closes the perception gap vs OpenClaw Dreaming / Anthropic Auto Dream which a reviewer comparing cortex-x will notice within 60 seconds.

**Stolen from**: OpenClaw Dreaming nightly cron, Anthropic Auto Dream natively-shipped primitive, ICLM 2026 NREM+REM consolidation model.

---

### Sprint LR.Z — OpenClaw architectural deep-dive memo (S effort, doc-only) — ✅ SHIPPED 2026-05-13 late evening

**Status**: ✅ Shipped 2026-05-13 late evening. Follow-up to Sprint LR.X positioning refresh — verifies the "OpenClaw is primary competitor" claim against OpenClaw's shipped reality with citation-grounded feature-gap matrix.

**Deliverable**: `docs/research/openclaw-architecture-2026-05-13.md` — 29 cited sources, 10 topic sections.

**Key findings**:
- OpenClaw is **breadth-first** (250K stars, MIT, ClawHub plugin ecosystem with 5.7K+ skills, OAuth-over-HTTP for paid Codex, TaskFlow SQLite checkpointing, Memory Wiki). **Safety-thin** — ships zero of cortex-x's 7-row safety-stack moat.
- **Security incidents shipped 2026-H1**: CVE-2026-25253 RCE (NVD record), Snyk ToxicSkills found prompt-injection payloads in 36% of 3,984 audited skills (≈1,434), ClawHavoc follow-up audit reports ≈800 malicious skills (~20% of registry), 7-hour service outage (Issue #34990), single-command backdoor supply-chain vector (VentureBeat).
- **Third-party safety harnesses emerging** because OpenClaw core lacks them: Jentic Mini, OpenClaw Firewall.
- **Documentation lags release notes** on HEARTBEAT.md schema, Memory Wiki 4-origin taxonomy, TaskFlow internals.

**4 action items for cortex-x positioning** (derived from memo):
1. Add hedged disclaimer to `docs/positioning.md` (Sprint LR.X already shipped this).
2. Lean into the published security-incident numbers in README "Why not OpenClaw?" section.
3. Sprint 4.0 capability marketplace must ship as **signed-and-audited** (cryptographic signing + audit before any open-pull) — OpenClaw lesson: unmoderated marketplace = CVE waiting to happen.
4. Don't compete on breadth. Compete on production-grade safety stack.

**Operating principles satisfied**:
- R1 (research-before-implement): single deep general-purpose agent dispatch with WebFetch verification on 2 high-stakes claims (HEARTBEAT.md format, blink.new pitch).
- R2 (review pipeline): 2-agent doc-review (acceptance-auditor + security-auditor) closed 5 findings before publication — hedged "0 CVEs" to "as of 2026-05-13", recomputed Snyk arithmetic (36% × 3,984 = 1,434 not 1,467), split Snyk vs ClawHavoc attribution, softened "SECURITY CRISIS IN PROGRESS" header to "Security incidents 2026-H1", added NVD primary citation for CVE-2026-25253.

---

### Sprint LR.X — Competitive landscape refresh after May 2026 deltas (S effort) — ✅ SHIPPED 2026-05-13 evening

**Status**: ✅ Shipped 2026-05-13 evening after 3 parallel general-purpose research dispatches surfaced three material deltas the morning's positioning doc (`docs/positioning.md`) missed:

1. **OpenClaw April 2026 pivot** — "horizontal personal-assistant cousin" reclassified to **primary direct competitor**. April 2026 update repositioned OpenClaw with explicit pitch *"Fix Bugs and Open PRs While You Sleep"*, HEARTBEAT.md cron, dep-update PRs, issue→PR pipeline, branch+commit+PR+issue GitHub integration, PR-only safety model. cortex-x's safety stack (multi-window USD caps + cross-session loop detector + STEWARD_HALT + spec verifier + 6-agent review pipeline + zero-deps CJS) is the surviving moat — 7 matrix rows where cortex-x ✅ and OpenClaw ❌.
2. **Block Codename Goose with cron** — `goose serve` background mode + Recipe cron Q1 2026. Apache-2.0, 29K stars, donated to Linux Foundation AAIF. Strongest license-overlap competitor. Different shape — CLI/desktop-first, task-runner-grade scheduling, not GHA-cron-PR.
3. **OpenHands RFC #13275 cron** — March 2026 added cron-trigger automations. License trap: MIT core but `enterprise/` directory paid-license-after-1-month, making "self-host commercially" non-trivial above scale threshold.

**Pricing refreshes** (all three quadrant-1 SaaS players reshuffled May 2026):
- **Devin**: Core/Team plans retired → new Free/Pro/Max/Teams/Enterprise ladder, ACU model swapped for USD-metered overage.
- **Replit**: Effort-Based Pricing replaces $0.25/checkpoint model (new users immediate, Core/Teams rollout July 1).
- **Cursor**: 5-tier ladder Hobby $0 / Pro $20 / Pro+ $60 / Ultra $200 / Teams $40, Composer 2 input pricing dropped 86% to $0.50/M tokens.

**Memory landscape additions** (refreshed second matrix in positioning.md):
- **Memori Labs** (2026-05-07 launch) — agent-native memory from agent traces (close to cortex-x `journal/*.jsonl` → `lessons.jsonl` pattern).
- **Cloudflare Agent Memory** (beta since 2026-04-17) — managed persistent memory on Workers + Durable Objects + Vectorize.
- **Pinecone Nexus + KnowQL** (May 2026 Launch Week) — Namespaces positioned for per-agent memory isolation at scale.
- **LangGraph Memory** — MongoDB Store backend added alongside existing PostgresSaver / AsyncSqliteSaver.

**Third lens added** — skill / capability marketplaces (Tessl + ClawHub + 8 registries grew from 1 in Q4 2025). **Snyk ToxicSkills audit found prompt injection in 36% of audited public skills.** This positions cortex-x's Sprint 4.0 capability marketplace deliberately as *signed-and-audited* rather than open-pull-and-run.

**Deliverables**:
- `docs/positioning.md` — comparison matrix expanded from 7 → 10 columns (added Goose + OpenHands + reclassified OpenClaw); 3 new per-competitor profiles (OpenClaw rewritten, Goose + OpenHands new); memory matrix added Memori Labs row; new "third lens" skill marketplace section.
- `README.md` "Why not..." comparison table expanded from 5 → 9 competitors with refreshed pricing.

**Operating principles satisfied**:
- R1 (research-before-implement): 3 parallel web research agents + 2 WebFetch verifications on OpenClaw before promoting it. ~85K total tokens across research.
- R2 (review pipeline): doc-only sprint, no code changes, no security review needed beyond markdown sanitization.

**Why now, not later**: launch positioning is operator-facing and gets cited in interviews + LinkedIn + hiring conversations. A doc that says "OpenClaw is a personal-assistant cousin" when OpenClaw is now in the exact same slot would be embarrassing in the first 60 seconds of any technical review.

---

### Sprint 2.20 — Memory-system competitor lens in positioning.md (XS effort) — ✅ SHIPPED 2026-05-13 (verified 2026-05-14)

**Status**: ✅ Shipped — `docs/positioning.md` §"Second lens — vs agent-memory systems (Sprint 2.20, 2026-05-13)" lines 188-216 ships the 8-column comparison matrix (Mem0 · Zep/Graphiti · Letta · MAF+Neo4j · OpenClaw Dreaming · Anthropic Auto Dream · Memori Labs · cortex-x Steward) + verdict paragraph + don't-pivot guidance + 6 cited sources. Status flipped from 📋 PROPOSED → ✅ SHIPPED during Sprint 2.26 verification sweep.

**Scope**:
- Second comparison matrix in `docs/positioning.md` (or new `docs/positioning-vs-memory-systems.md`) with rows for: persistent KV memory, structured KG / entity relationships, temporal graph (Zep/Graphiti), MCP-native, atomic-rollback safety, multi-window USD caps, draft-PR human approval, OSS license, typical operator cost.
- Verdict paragraph: cortex-x is *adjacent* to memory-SaaS category, not competing — Mem0 dominates with 47K★, Zep wins LongMemEval. cortex-x's lane is "maintenance autopilot WITH a memory layer," not "memory-SaaS for agents." Lean on safety primitives that no memory-SaaS ships.

**Effort**: XS (1-2 hours including R1 memo capture from today's brain-kit-landscape research). Pure docs work, no code.

**Why now**: closes a reviewer's first-90-seconds question post-launch. The brain-kit research is already in context — capture it as a reusable research memo + competitor matrix while the synthesis is fresh.

**Stolen from**: today's brain-kit research synthesis (Mem0 / Zep / Letta / Cognee / Supermemory benchmarks, MAF+Neo4j launch).

---

### Sprint 4.9 — Ambient morning-briefing PWA + email-draft surface (M-L effort, ⭐ DEFENSIBLE WHITESPACE) — 📋 PROPOSED 2026-05-13

**Status**: 📋 Proposed 2026-05-13 from brain-kit research synthesis. Lindy.ai (7 AM SMS briefing) is the recognized commercial leader; **no OSS template exists** for "Claude Code morning briefing" / "agentic PWA dashboard". Tier 3 productization defensible whitespace, not a launch-blocker.

**Scope**:
- PWA frontend (Next.js, installable on iOS/Android home screen, push notifications via Web Push API) — single screen: overnight Steward activity rollup + drafts requiring approval + flagged anomalies + next-action nudge.
- Steward `morning_briefing` action_kind that compiles journal-entries-since-yesterday + open draft PRs + spec_failures + budget-cap warnings into a single markdown doc + dispatches push notification at operator-configured local time.
- Email-draft surface (optional): Steward action_kind `email_draft` reading operator-tagged "drafts" inbox folder, drafting reply via OpenRouter, leaving draft in `Drafts/` for human review (never auto-send).

**Effort**: M-L (1-2 sprints). PWA + push infrastructure is the heavy chunk; the action_kinds reuse existing Steward primitives.

**Why this is the right shape**: every component the brain-kit poster described (KG memory, sleep cycles, 24/7 fleet) overlaps something we already have or have planned. The morning briefing PWA is the **one piece that's genuinely novel** in the OSS landscape and would distinguish cortex-x from "yet another maintenance autopilot". Defer to Tier 3 (post v1.0) — not launch-critical.

**Stolen from**: Lindy.ai 7 AM SMS, Cassidy, the brain-kit poster's PWA approach. Differentiator: ours is operator-self-hosted (Vercel/Cloudflare Workers), not vendor SaaS.

---

### Sprint LR (Launch Readiness) track — 📋 PROPOSED 2026-05-10

**Status**: 📋 Proposed 2026-05-10 from operator brief audit (`docs/research/cortex-x-housekeeping-audit-2026-05-10.md` §1). Distinct track from Tier 1 engineering — these are publish-readiness items that should never block engineering momentum.

| ID | Item | Effort | Operator-only? | Status |
|---|---|---|---|---|
| LR.1 | Real-run eval baseline (5 runs × 3 canonical tasks, ~$0.05) | XS | no — I can run | ✅ shipped 2026-05-13 ([`evals/results/2026-05-13-baseline-real-llm.json`](../evals/results/)). 3 tasks × 1 trial × deepseek-v4-flash via OpenRouter, $0.0016 total cost, 3/3 smoke-passed. Captures the cortex-evolve-ab harness end-to-end against the real LLM — Sprint 3.0 v1 closure. Sprint 3.0 v2 deferred: LLM-as-judge rubric scoring + multi-trial bootstrap CI (N=3 still well below N=400-600 threshold). |
| LR.2 | README "Built by" + "Why not Devin/Copilot/Replit" comparison | S | partial — operator fills personal bits | ✅ shipped 2026-05-13 (commit `acec014`). README rewrite 410→175 lines + 5-competitor matrix + "Built by David Rajnoha" attribution + docs/vision.md split for long-form trajectory. |
| LR.3 | Statistical disclaimer in README (Phase 5 evidence empty) | XS | no — 10 min, ship-able now | ✅ shipped (README §Phase 5 disclaimer, refreshed 2026-05-12 to cite both baselines) |
| LR.4 | launch checklist (now tracked under gitignored `docs/dogfood/`) | XS | partial | ✅ shipped (`docs/dogfood/launch-checklist.md`) |
| LR.5 | **Naming decision** (`cortex-x` rename — kolize w/ Cortex Labs et al.) | M | yes — strategic | ✅ resolved 2026-05-12 — operator decided to keep `cortex-x` (personal touch matching Rejnyx_x gamer nick); kolize acknowledged + documented as acceptable. |
| LR.6 | **License decision** (PolyForm NC → MIT/Apache/BSL/dual?) | M | yes — strategic | ✅ shipped 2026-05-12 — Apache License 2.0 (commit `1235f62`). Patent grant + permissive commercial use + corporate-legal-friendly default. |
| LR.7 | Demo asset (asciinema/MP4 scaffold + Steward dry-run) | S | yes — operator-recorded | ⏳ awaiting operator video recording (post-LR.5/LR.6 unblock confirmed) |

**Sequencing**: LR.1/LR.3/LR.4/LR.5/LR.6 all shipped 2026-05-10 → 2026-05-12. **LR.2 (README compare table) + LR.7 (demo asset) remain** — both operator-side. Public-launch blockers cleared.

### Sprint LR.8 — Launch venue strategy: Product Hunt + GitHub Trending + awesome-lists distribution (S-M effort) — 📋 PLANNED 2026-05-13

**Why**: Operator surfaced the distribution question: "could cortex go to one of those best-repo-of-the-day competitions?" Web research 2026-05-13 confirms a multi-venue playbook exists. Cortex's WOW pitch — "one-line install gives you everything: hooks + safety + skills + nightly autopilot + 26 standards" — matches the venue profile (self-hostable, Apache-2.0, dev-tool category). LR.1–LR.7 cleared the blockers; LR.8 is the **how-to-actually-launch** plan.

**Sources**:
- [Product Hunt Open Source topic](https://www.producthunt.com/topics/open-source) — dedicated discovery surface
- [Product Hunt Developer Tools topic](https://www.producthunt.com/topics/developer-tools)
- [How to launch a developer tool on Product Hunt 2026 (Flo Merian)](https://hackmamba.io/developer-marketing/how-to-launch-on-product-hunt/) — best-practices guide
- [Open Source Product Hunt launch guide (Papermark)](https://www.papermark.com/blog/product-hunt-launch)
- [awesome-product-hunt repo](https://github.com/fmerian/awesome-product-hunt) — dev tools that launched there
- [DevHunt](https://www.producthunt.com/products/devhunt-2) — alternative dev-tool launchpad
- [awesome-ai-agents-2026 (caramaschiHG)](https://github.com/caramaschiHG/awesome-ai-agents-2026) — 300+ entries, monthly updates
- [awesome-ai-agents-2026 (ARUNAGIRINATHAN-K)](https://github.com/ARUNAGIRINATHAN-K/awesome-ai-agents-2026) — alternative list, comparison guides
- [GitHub Trending Weekly recap 2026-04-22](https://www.shareuhack.com/en/posts/github-trending-weekly-2026-04-22) — what's actually trending (Goose, Dify, Langflow, Flowise — visual builders dominate)
- [Best of Product Hunt April 21 2026](https://www.producthunt.com/leaderboard/daily/2026/4/21) — recent dev-tool winners (Kimi K2.6, LiveDemo)
- [agentskills.io clients showcase](https://agentskills.io/clients) — 37+ adopters listed; cortex-x is candidate

**Scope** (5 venues, each independent, parallelizable):

**V1) Product Hunt launch** (M effort, gated by LR.7 demo asset)
   - Profile: **"Product of the Day"** = primary goal. Top-voted product in 24h window gets auto-promotion to weekly/monthly leaderboards.
   - Best-practice prep checklist (Flo Merian):
     - **Gallery carries the explanation** — first 3 images must convey "what is this" without text. Show: 1) terminal screencast of install one-liner → /cortex-init flow, 2) `cortex-doctor` output table (safety/health), 3) Steward draft PR opened overnight
     - **Tagline ≤60 chars** — pitch the WOW. Draft: *"One install. Hooks, safety, skills, nightly autopilot for Claude Code."*
     - **Description ≤260 chars + 1 image** — feature list. Draft: 8 slash commands · /cortex-doctor health check · Steward nightly autopilot · 28 standards · Apache 2.0 · 2955 tests
     - **First comment** (your own) — story behind, why you built it, what's next. Operator's voice: "I run X projects, was tired of pasting same prompts, built cortex over 6 months..."
     - **Hunter** — Product Hunt account with high karma is a strong signal. Either operator builds his own (longer ramp), or asks an existing high-karma hunter to launch it (network outreach).
   - Timing: **Tuesday 12:01 AM PST** is the canonical-best launch slot (max 24h window into US business day). Avoid Mondays (weekend backlog) + Fridays (engagement drop).
   - Prep work day-of: pre-recruit 10-20 "first 4 hours" upvoters from operator's network (LinkedIn, AI-engineer Discords, Twitter/X following). PH algorithm weighs early-window engagement heavily.
   - Budget: **$0 paid** (PH is free). Time: ~8h prep + launch-day-presence-in-thread.

**V2) GitHub Trending optimization** (S effort, ongoing)
   - Profile: trending page is **algorithm-based** (recent star velocity), not editorial. Can't directly apply but can game timing.
   - 2026 trending patterns: visual builders (Langflow 146k★, Dify 136k★) + local model runners + browser agents + skills ecosystem. cortex's "framework + Steward" pitch fits the "skills ecosystem" wave (transcript Sprint 2.8.1 noted skills explosion April 2026).
   - Tactics:
     - Push README polish + demo GIF in same week as PH launch — star burst from PH crosspoll-inates trending
     - Add `Topics`: `claude-code`, `agent-skills`, `autonomous-agents`, `ai-agents-2026`, `apache-2`, `developer-tools` (GitHub uses these for discovery)
     - Tag a `v0.4.0` release with release notes the day-of-launch — trending recognizes versioned activity
   - Result: not a single "win" event; sustained presence on `Trending This Week` for Apache-2.0 AI repos.

**V3) Show HN (Hacker News)** (S effort, one-shot)
   - Profile: text-only post on news.ycombinator.com. **Hit-or-miss** but huge if front-page.
   - Title format: `Show HN: cortex-x – persistent memory + nightly autopilot for Claude Code`
   - Body: 4-paragraph max. (1) what it is, (2) why I built it, (3) honest limitations (research preview, v0.3-pre), (4) link to repo + demo. NO marketing language. HN smells SaaS pitches and downvotes them.
   - Timing: **Tuesday-Thursday 8-11 AM PST** is HN's peak engagement window
   - Prep: have 2-3 friends ready to post genuine technical questions in the thread within first hour (algorithm boost). DO NOT ask for upvotes (vote rings are detected and shadow-banned).
   - Realistic expectation: 20% probability of front-page given dev-tool category. Even on second-page, sends quality traffic.

**V4) Awesome-list inclusion** (S effort each, sustained-visibility ROI)
   - High-priority lists:
     - [`awesome-ai-agents-2026` (caramaschiHG)](https://github.com/caramaschiHG/awesome-ai-agents-2026) — 300+ entries, monthly updates, category "Agent Frameworks"
     - [`awesome-ai-agents-2026` (ARUNAGIRINATHAN-K)](https://github.com/ARUNAGIRINATHAN-K/awesome-ai-agents-2026) — comparison guides + benchmarks
     - `awesome-claude-code` (search GitHub for current best one) — focused on Claude Code ecosystem
     - `awesome-agent-skills` (if exists by then; agentskills.io community is growing)
     - `awesome-cli` and `awesome-developer-tools` — broader category lists
   - Process: small PR adding one-line entry with link. Maintainers review weekly. Once accepted = permanent listing, sustained referral traffic for months.
   - Effort: ~30 min per list (write entry → fork → PR → wait).

**V5) agentskills.io client showcase** (XS effort, gated by agentskills.io spec compliance verified via Sprint 2.22 validator)
   - [agentskills.io/clients](https://agentskills.io/clients) lists 37+ adopters of the SKILL.md spec (Claude Code, Cursor, Goose, Codex, GitHub Copilot, Junie, ...)
   - cortex-x adopted the spec in Sprint 1.x. Once Sprint 2.22 ships `cortex-skill-validate` proving every cortex SKILL.md passes the validator, cortex qualifies as a client.
   - Process: open issue on [agentskills/agentskills](https://github.com/agentskills/agentskills) requesting client showcase listing with logo + tagline + link to docs.
   - Reward: cortex appears in the carousel on agentskills.io homepage alongside Claude Code, Cursor, Anthropic — heavyweight visual association.

**Cross-venue prep work** (do once, use everywhere):
- **OG image** (1200×630px) — README banner, also PH gallery + Show HN preview. cortex's voice charter constrains: counts not praise, no greetings. Bold typography, terminal-style background, "28 standards · 2955 tests · Apache 2.0" overlay.
- **Demo asset** (LR.7 — already tracked) — 60-second MP4 + 30-second GIF + asciinema cast. Same source serves PH gallery, GitHub README, awesome-list entries.
- **Tagline + 30-second pitch** — same line everywhere. Draft: *"Persistent memory and an overnight maintenance agent for Claude Code. One install gives every project safety hooks, slash commands, and 26 senior-engineer standards baked in."* (currently in README — ratify as cross-venue SSOT)

**Sequencing**:
1. **Pre-launch**: LR.7 demo asset + Sprint 2.22 validator green for V5
2. **Soft launch (week 1)**: V4 awesome-list PRs (sustained-visibility floor)
3. **Big day (week 2-3)**: V1 Product Hunt + V3 Show HN same week, V2 trending tactics
4. **Sustained (month 2+)**: V5 agentskills.io showcase + ongoing community engagement (Reddit r/programming/r/SideProject/r/OpenSource, dev.to write-up, Console.dev newsletter pitch)

**Acceptance criteria**:
- Product Hunt launch executed with prep playbook above
- ≥3 awesome-list inclusions accepted
- Show HN submitted (front-page outcome NOT acceptance gate — execution is)
- agentskills.io client showcase application submitted (post-Sprint 2.22)

**Out of scope** (deferred to post-launch):
- Paid acquisition (Twitter/X ads, Google Ads) — Tier 3 productization territory (Sprint 4.1+)
- YouTube launch video — operator's already-deferred mini-série (memory: `project_youtube_series_deferred.md`)
- Conference talks (NeurIPS / DevTools Hackathons) — much later

**Cross-references**:
- LR.7 (demo asset) blocks V1 + V3 + V4 entries
- Sprint 2.22 (skill-validate) blocks V5
- LR.5 + LR.6 already resolved (naming + license) — no further blockers

---

### Sprint LR.9 — Boris-Cherny validation packet + "wisdom over harness" positioning shift (S effort, content) — 📋 PLANNED 2026-05-13

**Why**: Operator surfaced [`docs/transcripts/boris-black-vibecoding.md`](transcripts/boris-black-vibecoding.md) — Boris Cherny (creator of Claude Code, currently leading Anthropic Labs round 2 under Mike Krieger) at Sequoia "Why Coding Is Solved" (~24 min). Transcript is **70% third-party validation** of cortex-x's existing direction, **20% strategic-positioning signal**, **10% concrete features already covered**. The strategic signal is the highest-value extractable: as Boris explicitly stated, "**the harness kind of gets less important** [as model improves]... all the safety mechanisms ... will just be less important cuz the model will just do the right thing." This forces a **positioning evolution** for cortex's launch pitch — current pitch leans heavily on harness/safety; future-proof pitch must lead with **institutional wisdom encoding** (the part models cannot grow on their own).

Why this matters NOW (not a Tier 3/4 deferral):
- LR.8 (launch venues) ships in 2-3 weeks. Landing-page hero copy + Show HN body + Product Hunt tagline are all locked in **this sprint** else they ship with stale framing.
- Boris quotes are high-leverage social proof — "Father of Claude Code says loops are the future" is the kind of line that converts on Product Hunt + Show HN.
- The "150 PRs in a day" claim is the **canonical cadence reference** for what's achievable; cortex's "Steward + /goal + parallel sub-agents" stack should be positioned as the path to that cadence for a solo operator.

**Sources**:
- [`docs/transcripts/boris-black-vibecoding.md`](transcripts/boris-black-vibecoding.md) — full 80-line Sequoia transcript (May 2026)
- [Boris Cherny on Threads](https://www.threads.net/@boris.cherny) — `--worktree` flag announcement (validated in Sprint 2.30 research)
- [Anthropic Labs](https://www.anthropic.com/news) — Labs team back together May 2026, Mike Krieger leading
- [Seven Powers (Hamilton Helmer)](https://7powers.com/) — Boris references for SaaS-apocalypse framing
- [Acquired Podcast](https://www.acquired.fm/) — Boris referenced as content source
- [Claude Design](https://claude.com/design) — Boris cited as example of "build for next model" pattern; cortex's own roadmap (Sprint 4.5 dashboard) is the parallel

**Three high-leverage quotes for launch packet**:

1. **"I sort of feel like loops are the future at this point. If you haven't experimented with it, highly highly recommend it."** — Boris, on `/loop`. **Direct validation of Steward + Cloud Routines + Sprint 2.24 `/cortex-goal`.** Launch copy: "Anthropic's Claude Code lead calls loops the future. cortex-x ships the loops you'd build by hand: nightly Steward + plan-first /cortex-goal + cron-templated GitHub Actions."

2. **"In a year, the model will be much better aligned. And so, all the safety mechanisms ... will just be less important cuz the model will just do the right thing."** — Boris, on safety harness depreciation. **Positioning pivot**: cortex's "7-row safety stack" pitch (current) → cortex's "institutional wisdom encoded in markdown" pitch (12-month-stable). Models will surpass harness; lessons-jsonl + projects library + 26 standards + cross-project memory **do not depreciate** because they encode operator-specific context the next model still won't have.

3. **"The best person to write accounting software is a really good accountant... knowing the domain is the hard part."** — Boris, on domain expert → builder shift. **Validation of cortex-x's "operator OS" framing**: cortex's clients (barbershop WaaS, e-commerce chatbot, booking platform per Sprint 4.1) are domain experts using cortex to ship their domain knowledge as software. cortex-skills (Sprint 4.0.1) is the distribution mechanism for that knowledge.

**Scope** (4 stories, S effort each, parallelizable):

**A) Landing-page / README hero refresh** (S effort) — rewrite README hero block + repo description with the "wisdom over harness" frame as primary, safety as secondary:
   - Old (current hero): leans on "28 standards · 2955 tests · Apache 2.0" feature-list
   - New: leads with operator-specific value — "cortex-x encodes 6 months of your decisions, lessons, and patterns as markdown your next agent can read. Plus an overnight Steward that closes the daylight gaps."
   - Embed Boris quote #1 as pull-quote with attribution + transcript link
   - Keep feature list, demote to second screen
   - Cross-check with Sprint 2.26 (CLAUDE.md template audit) — same "wisdom not bloat" principle

**B) Show HN body rewrite using Boris quotes** (S effort) — replace Sprint LR.8 V3 draft body with version anchored on Boris validation:
   - Paragraph 1: cortex-x is the loops + lessons stack a solo dev would build by hand (link Boris quote #1)
   - Paragraph 2: built over 6 months across 6 operator projects; explicit operator background as social proof
   - Paragraph 3: honest limitations (v0.3-pre, research preview, single-operator dogfooded)
   - Paragraph 4: link to repo + demo + transcript
   - DO NOT lead with safety/harness — Boris-quote-#2 logic — instead lead with persistent memory + nightly Steward

**C) Product Hunt tagline + first-comment refresh** (S effort) — update Sprint LR.8 V1 tagline draft:
   - Old tagline: "One install. Hooks, safety, skills, nightly autopilot for Claude Code."
   - New tagline (≤60 chars): **"Persistent memory + overnight autopilot for Claude Code."** (loses "safety" framing, gains durability framing — 51 chars)
   - First-comment draft: operator story with explicit Boris-quote-#3 framing ("I'm a full-stack + designer, not a researcher. I built cortex because I needed accounting software for my own work and the model doesn't know my projects.")

**D) `docs/positioning-evolution.md` strategic memo** (S effort) — internal-facing 1-pager documenting the harness→wisdom value migration:
   - Section: **Today (v0.3-pre)** — harness value = ~60% of pitch, wisdom value = ~40%
   - Section: **12 months out (model-aligned future)** — harness value = ~20%, wisdom value = ~80%
   - Section: **What cortex doubles down on** — lessons-jsonl (Sprint 2.8.1+), projects library, cross-project pattern detection (Sprint 3.4), wiki consolidate (Sprint 2.8.2), cortex-thinker insights, Steward as wisdom-applier not safety-net
   - Section: **What cortex deprioritizes** — additional safety hooks, rigid behavior enforcement, deny-list expansion (Sprint 2.28 stays but tier-1 rather than tier-0)
   - Operator + future contributors consult this when scoping Tier 3+ features

**Acceptance criteria**:
- README hero pull-quote ships with Boris attribution + transcript line ref
- Show HN body draft ≤500 words, lead-line uses Boris quote #1
- Product Hunt tagline locked at ≤60 chars with operator sign-off
- `docs/positioning-evolution.md` exists and is cross-linked from `docs/steward-roadmap.md` § preamble
- No new feature code shipped — pure content/positioning sprint

**Out of scope** (defer):
- Reaching out to Boris/Anthropic for explicit endorsement (deferred; cortex has zero relationship, public quotes are fair-use citation)
- Translating positioning shift into code changes (e.g. cortex-doctor reporting "wisdom score") — premature; Tier 3 territory
- A/B testing tagline variants on actual PH/HN traffic (would need analytics infra cortex deliberately doesn't ship — telemetry stance)
- YouTube launch video script using these quotes (operator's mini-série is gated separately per memory `project_youtube_series_deferred.md`)

**Risks**:
- Boris quote #2 ("safety mechanisms less important") could be read as cortex saying "safety doesn't matter". Counter: position as "safety as floor, wisdom as ceiling" — cortex still ships hooks + permissions + Steward atomic rollback. Boris quote is about the **delta** depreciating, not safety itself.
- Quoting Boris without explicit permission is fair-use citation (public Sequoia talk, transcript published), but launch packet should always link to transcript + Sequoia talk source for traceability.

**Cross-references**:
- Sprint LR.8 (launch venues) — directly affects V1/V3 content, downstream consumer of this sprint
- Sprint LR.7 (demo asset) — should also lean on wisdom framing (show projects library content, not just install one-liner)
- Sprint 4.0.1 (agentskills.io ecosystem) — "wisdom over harness" reinforces cortex's "framework + safety + discipline" positioning vs vendor content packs
- Sprint 2.26 (CLAUDE.md template audit) — same principle, micro-scale: wisdom-dense not feature-bloated
- Sprint 2.8.1 / 2.8.2 / 3.4 (lessons + wiki consolidate + cross-project patterns) — the assets that **appreciate** as models improve, per Boris quote #2

**Boris-validation table (for memory/reference)** — what the transcript confirms about cortex's existing direction (no new sprints needed, but worth tracking which roadmap items just got third-party validation):

| Boris said | Cortex sprint validated |
|---|---|
| "Loops are the future" | Steward (Sprint 1.6-1.9) + Cloud Routines positioning (Sprint 2.26 C) + `/cortex-goal` (Sprint 2.24) |
| "MCP is the answer" | Profile MCP recommendations (Sprint 2.29) |
| "Computer use for non-MCP tools" | browser-agent profile + Tirith hook (2026-04-20) |
| "Generalists across disciplines" | operator persona (engineer + designer + data scientist) — informs Sprint 4.1 WaaS angle |
| "Anthropic agents talk over Slack" | discord-bridge (Sprint 2.6, currently optional surface) — could elevate priority |
| "All SQL written by models" | ai-agent profile validates this; no net-new sprint, but `standards/correctness.md` § eval-driven dev applies |
| "Hill-climb anything (4.7)" | `/cortex-goal` (Sprint 2.24) Ralph-loop framing |

This table is the durable artifact — a memo "what cortex got right per Anthropic Labs' creator". Useful in launch deck + future positioning audits.

---

---

## 4. Tier 2 — Compound learners (weeks 7-12, Sprint 3.0 → 3.3)

**Goal**: turn cortex-x into a self-evolving system. After Tier 2, prompts/strategies/skills get measurably better every week without operator intervention.

### Sprint 3.0 — AlphaEvolve-style prompt evolution (L effort, ⭐ MOONSHOT) — ✅ v0 + v1 + v2 SHIPPED 2026-05-13

**v2 shipped 2026-05-13** — LLM-as-judge rubric scoring:
- `bin/steward/_lib/rubric-extractor.cjs` — pure-deterministic parser of eval task `## Expected properties` checklist into structured `{must_have, should_have, must_not_have}` arrays with stable positional ids. `scoreFromRubric()` recomputes final 0..1 score deterministically from judge-returned booleans (judge cannot fudge the math). Refusal short-circuit (refusal_detected:true → score 0).
- `bin/steward/_lib/eval-judge.cjs` — LLM-as-judge via OpenRouter. Default model `anthropic/claude-sonnet-4.6` (different family from candidates → kills self-preference bias). System prompt enforces CoT-before-booleans + per-item evidence quotes + explicit refusal flag. Deep structural validator (mirrors `llm-judge-schema.cjs` pattern). Soft-fall to v1 smoke on judge failure.
- `bin/cortex-evolve-ab.cjs` — `--judge` + `--judge-model` flags.
- 22 tests (`rubric-extractor.test.cjs` + `eval-judge.test.cjs`): extraction shape, score weights (must=1.0, should=0.5, must_not=−1.0), refusal short-circuit, partial-pass scaling, all 5 judge-bias defenses validated.
- R1 memo: `docs/research/sprint-3.0-v2-llm-as-judge-2026-05-13.md` — Anthropic Sonnet vs DeepSeek judge cost, 5 self-bias defenses, cost ceiling math ($0.68/eval-run, <3% of $25/week cap).

**v0 shipped 2026-05-13** — measurement harness, NOT full evolution engine:

**v0 shipped 2026-05-13** — measurement harness, NOT full evolution engine:
- `bin/steward/_lib/eval-scorer.cjs` (~210 LoC) — pure-math bootstrap CI (mulberry32-seeded for determinism), 3-rule champion-vs-challenger decision (point delta + lower-CI gate + validation spec_pass_rate non-regression).
- `bin/steward/_lib/eval-runner.cjs` (~170 LoC) — eval-task discovery via frontmatter parse, pluggable executor (mock + future real-LLM), train/validation split via `validation: true` frontmatter, results JSON writer.
- `bin/cortex-evolve-ab.cjs` — operator CLI with `run` (execute variant) + `compare` (apply decision rule) subcommands.
- 29 tests (`tests/unit/eval-scorer.test.cjs` + `tests/unit/eval-runner.test.cjs`).
- **Honest disclaimer baked into CLI output**: N=10 << N=400-600 published threshold for 5% delta at 95% confidence; v0 results are directional, not statistical verdict.

**Deferred to v1+** (operator decision): population search + island models (OpenEvolve pattern), real-LLM executor wiring (operator-paced cost ceiling), cross-action_kind generalization, DSPy MIPROv2 integration, eval-suite growth toward N=400.

**Deferred to v3 — multi-judge ensemble** (📋 ROADMAP-ADD 2026-05-13, [Karpathy transcript](./transcripts/andrej-karpathy-from-vibe-coding-to-agentic-engineering.md) alignment): v2 ships single Sonnet judge with cross-family bias defense. Karpathy explicitly: "for unverifiable domains, you can have a council of LLM judges and probably get something reasonable." v3 adds Sonnet + GPT-5 + DeepSeek + majority-vote aggregation. Disagreement signal surfaced when judges split (proxy for "task is in jagged-intelligence zone"). Cost: ~3× v2 per eval-run. Budget cap stays $25/week — implies eval-suite trimming or weekly cadence. Acceptance: 22 existing v2 tests pass + new disagreement-signal test + 3-judge agreement ≥80% on N=20 calibration set vs human gold.

**R1 memo**: `docs/research/sprint-3.0-prompt-evolution-2026-05-13.md` — AlphaEvolve May 2026 impact, Sakana DGM state, DSPy / Langfuse production patterns, eval-suite-size statistical thresholds, mode-collapse + metric-overfit defense.

**Why**: this is the only direction that compounds. After 50 generations, Steward prompts will beat your hand-tuned baselines by measurable margin — and you didn't write any of them.

**Scope**:
- New module `bin/steward/_lib/prompt-evolver.cjs`.
- For each kind: generate 3 candidate prompts → run on held-out fixture set (`tests/fixtures/`) → score via Sprint 1.9 spec criteria → keep top-1, archive rest.
- After N=50 generations, promote winning prompt to `prompts/<kind>.md`.
- Held-out fixtures rotated periodically to prevent overfitting (Sprint 1.9 + 2.1 community concern flagged).

**Pre-implementation research dispatch**:
- "OpenEvolve / CodeEvolve (arXiv 2510.14150) / AlphaEvolve (arXiv 2506.13131) implementation patterns 2026. Mutation operators for prompt evolution. Validation-set spoilage countermeasures."

**Stolen from**: AlphaEvolve + OpenEvolve + Karpathy autoresearch loop.

---

### Sprint 3.1 — Self-extending capabilities (`skill-experiments/`) (L effort, ⭐ MOONSHOT) — ✅ v0 SHIPPED 2026-05-13

**v0 shipped 2026-05-13** — proposal-only pipeline with human-flag gate:
- `detectors/skill-proposal-mining.cjs` — pure-deterministic mining of candidate patterns from journal. Stricter thresholds than Sprint 2.19 (events=5, span=14d, window=30d). No LLM.
- `bin/steward/_lib/skill-scaffolder.cjs` (~240 LoC) — LLM-driven scaffolder (Sonnet 4.6 default, cross-family vs DeepSeek per Sprint 3.0 v2 bias-defense pattern). Writes `skill-experiments/<slug>/SKILL.md` + `acceptance.md` + `PROPOSAL.md` bundle. Strict structural validator + belt-and-suspenders re-check before disk write.
- `bin/cortex-propose-skill.cjs` — operator CLI with `list` + `scaffold` subcommands. Hard rate limit ≤1 proposal/week enforced by reading journal. Journal events: `skill_proposal_emitted` (success) / `skill_proposal_attempt_failed` (LLM failure path with cost capture).
- 19 tests covering detector evidence gates + window + flag-priority sort + stable id generation + scaffolder validator (8 failure paths) + integration with mock LLM.
- R1 memo: `docs/research/sprint-3.1-self-extending-2026-05-13.md` — DGM cautionary pattern, Anthropic skill-creator operator-invoked shape, agentskills.io conventions, eval-gated promotion criteria, 4 documented failure modes.
- **Recursive self-improvement door explicitly closed**: scaffolder NEVER writes to `bin/steward/_lib/action-kinds.cjs`. Promotion to live action_kind requires explicit human commit (handler authoring, test authoring, registry entry, SKILL.md move from `skill-experiments/` to `shared/skills/`).
- `skill-experiments/` directory deliberately outside `.agents/skills/` and `shared/skills/` — no SKILL-aware client (including Steward) auto-discovers proposals.

**Deferred to Sprint 3.1 v1+**:
- Auto-dispatch scaffolder on detector hits (relax human-flag gate when precision warrants)
- `senior_tester_review` on every proposal (reward-hacking mitigation)
- Mode-collapse detector (track criterion-kind diversity over 30 proposals)
- Multi-judge ensemble for the scaffolder
- `cortex-promote-skill` CLI that scaffolds handler/test/registry-entry skeleton (still never auto-merges)



**Why**: from browser-use/browser-harness — agent writes its own missing helpers during execution. Most ambitious of the lot.

**Scope**:
- New dir `cortex/agent-workspace/skill-experiments/<slug>/<kind>.cjs`.
- When LLM identifies a missing capability mid-action, it generates a candidate helper, sandboxes execution, evaluates against test fixtures, commits to skill-experiments if useful.
- After N successful uses (≥ 5), helper graduates to `bin/steward/_lib/skills/<name>.cjs` via human-reviewed PR.
- Constraint: skills can only `require()` Node built-ins + already-shipped cortex-x modules. No new npm deps.

**Pre-implementation research dispatch**:
- "browser-use/browser-harness self-extending pattern detailed implementation 2026. Sandbox execution for agent-generated code. Promotion criteria from experimental to stable. Security implications of agent-authored helpers."

**Stolen from**: browser-use/browser-harness + Karpathy autoresearch + agent-zero plugin pattern.

---

### Sprint 3.2 — FTS5 skill index + cross-project lesson sharing + LLM Wiki layer (M effort) — ✅ v0 + v1 SHIPPED 2026-05-13 (first Tier 2 sprint)

**v1 shipped 2026-05-13** — action-engine FTS recall integration:
- `bin/steward/_lib/lessons.cjs:recallLessonsFTS()` — drop-in replacement for `recallLessons` with 3-tier priority ladder (action_key SQL equality → action_kind filter → free-text query) preserving the linear-scan score hierarchy (+100 / +30 / +10) without reproducing additive arithmetic. First non-empty tier wins.
- `bin/steward/_lib/lessons-search.cjs:searchByActionKey()` — new SQL exact-match helper on the UNINDEXED action_key column (NOT FTS MATCH — special chars like `#` over-tokenize).
- `bin/steward/_lib/action-engine.cjs:711` — swapped `recallLessons` → `recallLessonsFTS` for the pre-prompt recall step. Strict improvement (falls back to linear scan on any unavailability).
- R2 (correctness-auditor HIGH) — clock-skew defense applied (`ageMs >= 0 && ageMs <= maxIdxAgeMs`) matching Sprint 2.19 incident-class pattern. Regression test for negative ageMs (mtime in future).
- 6 new tests covering no-index fall-back, stale-index fall-back, clock-skew defense, FTS happy-path with action-key match, empty slug, FTS exact-key match correctness.
- v1.5+ deferred: cross-project federated `~/.cortex/lessons.federated.jsonl` + signed-entries poisoning defense, wikilink extractor, wiki-curator prompt.

**v0 shipped 2026-05-13** — FTS5 lessons index:

**v0 shipped 2026-05-13**:
- `bin/steward/_lib/lessons-search.cjs` (~220 LoC) — node:sqlite FTS5 index over `$CORTEX_DATA_HOME/journal/<slug>/lessons.jsonl`. Zero npm deps (built-in `node:sqlite`, Node ≥22.5). Feature-detected at module load; gracefully reports `SQLITE_UNAVAILABLE` on older Node patches.
- 3 search helpers: `searchByText` (bm25-ranked full-text), `searchByActionKind` (exact filter), `searchByErrorCode` (root_cause MATCH).
- `bin/cortex-lessons-search.cjs` — operator CLI with 4 subcommands (`build`, `text`, `kind`, `code`).
- 13 tests (`tests/unit/lessons-search.test.cjs`) — build idempotency, bm25 ranking, no-match path, INDEX_NOT_BUILT guard, FTS5 quote escaping, slug safety.
- v0 contract: per-project index only, full rebuild each call (safe for <10K-entry lessons.jsonl), opts.dataHome propagates through both read + write paths.

**Deferred to Sprint 3.2 v1+**:
- Cross-project federated index at `~/.cortex/lessons.federated.jsonl` + signed-entries poisoning defense
- Action-engine recall integration (Sprint 1.8.3 pre-prompt step) — replaces linear scan with FTS lookup
- `[[wikilink]]` regex extractor over `cortex/projects/*.md` + orphan-page surfacing
- `prompts/wiki-curator.md` — Karpathy-gist-style nightly curator

**Why**: lessons.jsonl is linear-scan, fine for one project. Cross-project federated learning needs indexed query. NousResearch's hermes-agent has FTS5 in production at 139k-star scale. **Sprint 3.6 R1 (2026-05-11)** folded the Karpathy LLM Wiki pattern into this sprint instead of creating a new one — cortex-x already does what Karpathy describes (institutional wisdom in markdown), it just doesn't enforce `[[wikilink]]` syntax or run a curation pass.

**Scope (FTS5 — original)**:
- SQLite FTS5 index over `cortex/hermes-lessons.jsonl` (per-project) + `~/.cortex/lessons.federated.jsonl` (cross-project).
- New helpers `lessons.searchByText()` + `lessons.searchByActionKind()` + `lessons.searchByErrorCode()`.
- Action-engine recall step (Sprint 1.8.3) uses FTS lookup instead of scoring full archive.
- Cross-project sync: opt-in via `cortex/cortex-source.yaml` flag, signed entries to prevent poisoning.

**Scope (LLM Wiki extension — Sprint 3.6 fold-in)**:
- `[[wikilink]]` regex extractor over `cortex/projects/*.md` + `lessons.jsonl` topic entries. Surfaces orphan pages (linked-to but not yet written) + dangling references (page exists but never linked).
- `prompts/wiki-curator.md` — Karpathy gist (`karpathy/442a6bf555914893e9891c11519de94f`) parameterized over `$CORTEX_DATA_HOME/projects/`. Invokable nightly via existing Steward cron lane. Output: per-run report flagging contradictions across `lessons.jsonl` + `cortex/projects/*.md`, missing entity pages, stale entries.
- Curator runs **on-read, not on-index** (LazyGraphRAG-style economics — see Sprint 3.3 deferral note). No DB beyond FTS5; corpus stays plain markdown.

**Pre-implementation research dispatch (R1 ✅ done)**:
- ✅ R1 memo: `docs/research/sprint-3.6-llm-wiki-research-2026-05-11.md` — Karpathy gist primary source, 2026 GraphRAG state of the art, Anthropic Memory Tool comparison, Letta / GitNexus / Obsidian-second-brain landscape.

**Why this is "one sprint extension, not a new sprint"** (per R1 §5 recommendation):
- Karpathy ships **no reference implementation** — gist is explicitly abstract, meant to be copy-pasted as a pattern prompt (F2).
- Anthropic Memory Tool (`memory_20250818`) is already file-based + markdown-based, shipped BEFORE Karpathy's post (F9) — confirms the file-based shape is the durable primitive.
- cortex-x's existing `lessons.jsonl` + `cortex/projects/<slug>.md` already implements the Karpathy 3-layer split (raw sources / wiki / schema). Adding wikilink-lint + curator prompt completes the pattern without architectural change (T2, T3).
- Graph DB (Neo4j / FalkorDB / Memgraph) **rejected** for Tier 1-2 — violates zero-deps invariant, indexing-cost premium 10-40x without LazyGraphRAG.

**Stolen from**: NousResearch/hermes-agent skill curation + ReasoningBank federated angle + Karpathy llm-wiki gist (2026-04-03) + `obsidian-second-brain` skill (eugeniughelbur) + Anthropic memory-tool file-based design.

---

### Sprint 3.3 — GraphRAG codebase context (M effort) — ⏸️ DEFERRED 2026-05-11 (pending LazyGraphRAG + buy-vs-build)

**Status**: ⏸️ Deferred 2026-05-11 per Sprint 3.6 R1 research (`docs/research/sprint-3.6-llm-wiki-research-2026-05-11.md`). Two reasons:

1. **LazyGraphRAG cost cliff** (R1 F6) — Microsoft's LazyGraphRAG (Q1-Q2 2026 release, currently in cleanup at [microsoft/graphrag](https://github.com/microsoft/graphrag)) cuts indexing cost to **0.1% of full GraphRAG** + **700× lower query cost** for global queries. Production deployments report 70-97% cost reduction ([graph-praxis cliff analysis](https://medium.com/graph-praxis/the-graphrag-cost-cliff-how-33-000-became-33-in-eighteen-months-be1b0fbe37e4)). Building on full-fat GraphRAG now = amortizing yesterday's economics.
2. **Buy-vs-build re-evaluation** (R1 F10) — **GitNexus** (10k+ stars, MCP-native, [github.com/CodeGraphContext/CodeGraphContext](https://github.com/CodeGraphContext/CodeGraphContext)) + **Nomik** ([nomik.co](https://nomik.co/)) already ship the wiki-shaped codebase pattern we planned to build. Both are MCP-native and already work with Claude Code / Cursor. Re-evaluate whether cortex-x writes its own Tree-sitter pipeline or wires the existing MCP server as an external adapter (Sprint 3.4).

**Original scope** (kept for reference, revisit at Q2 2026 when LazyGraphRAG ships):
- Tree-sitter parse on `npm install` + on-demand refresh.
- Local SQLite-backed graph (FalkorDB later if needed).
- New helper `codeGraph.findCallSites(symbol)` + `codeGraph.findImporters(file)`.
- Per-kind retrieval: `dep_update_patch` queries call sites of breaking symbol, `recommendation` queries importers of mentioned files.

**Re-eval gate**: when LazyGraphRAG hits stable release OR when an action_kind genuinely needs multi-hop code-graph traversal (Sprint 3.3 R1 §5 trade-off T1: graph DB violates zero-deps invariant for Tier 1-2; reconsider only post-Tier 3).

**2026-05-13 update from brain-kit research** (`docs/research/brain-kit-landscape-2026-05-13.md`): **Microsoft Agent Framework v1.0 ships Neo4j as a first-party memory + GraphRAG provider** ("Neo4j Aura Agent", "Create Context Graph" end-to-end deployment paths). GraphRAG-V benchmark: +11pp recall over vector baselines on MultiHopRAG, indexing cost 10–40× pgvector. Implications: (a) buy-vs-build option C added — adopt Neo4j as external service (violates zero-deps but is now the industry reference impl), (b) cortex-x's "roll-our-own SQLite graph" path remains defensible on zero-deps + cost grounds, (c) when LazyGraphRAG ships, we have a clear A/B to run.

**Interim**: if structural code awareness is needed before LazyGraphRAG ships, evaluate GitNexus MCP as a drop-in (matches Sprint 3.4 External Tool Capability Adapters pattern).

**Stolen from**: GitNexus + GraphRAG papers + LazyGraphRAG cost analysis.

---

## 5. Tier 3 — Productization + enterprise-adjacent (weeks 13-20)

**Goal**: cortex-x stops being "the operator's personal tool" and becomes "distributable senior-engineer-as-a-service." Each Tier 3 sprint is an independent revenue/positioning lever.

### Sprint 4.0 — Capability marketplace (S-M effort)

**Why**: agentskills.io spec is already shipped. cortex-x can be the npm-of-skills. Drag-drop new action_kind into a project, instant capability.

**Scope**:
- Public registry of community-contributed action_kinds.
- `cortex add-skill <name>` CLI command.
- Sandbox + signing + lint gates before a community skill can land.
- Initial seed: contribute 3-5 community skills cortex-x already has (e.g. publish `dep_update_patch` as standalone skill).

**Stolen from**: agentskills.io spec + npm registry model.

---

### Sprint 2.25 — Operator-file memory consolidation (the missing AutoDream slice) + `/cortex-insights` usage report (M effort) — 📋 PLANNED 2026-05-13

**Honest precondition check 2026-05-13**: operator asked "haven't we done something AutoDream-like already?" — yes, cortex has MULTIPLE consolidation primitives already shipped/designed. This sprint targets the ONE slice they don't cover. Existing assets:

| Existing | Status | Operates on | Why it doesn't cover the AutoDream slice |
|---|---|---|---|
| `bin/cortex-wiki-consolidate.cjs` + action_kind `wiki_consolidate` | ✅ Shipped Sprint 2.8.2 v0 | `$CORTEX_DATA_HOME/lessons.jsonl` (machine-written) | Groups lessons by action_kind into wiki articles. NEVER touches operator-edited files. |
| `evolve_weekly` action_kind | ✅ Shipped Sprint 2.19 | Steward cost ledger + research cache | Weekly autoresearch with D/W/M cap integration. Not a memory pruner. |
| `prompts/cortex-evolve.md` | ✅ Designed v1 · ⏳ Cron not wired | Multi-source via 4-cadence | Manual paste; specifies architecture but not the operator-file 4-op consolidation. |
| `prompts/cortex-reflect.md` | ✅ Shipped | Cross-project mining | Writes new files in `insights/`, doesn't mutate operator memory files. |
| `prompts/cortex-sync.md` | ✅ Shipped | Per-session capture | Append-only into `projects/<slug>.md`. The opposite of consolidation. |
| Phase 6 memory upgrades (`CLAUDE.md:167-170`) | ⏳ Designed only, awaits Phase 7 | 6-signal autoDream promotion + 2-hop graph + `DREAMS.md` | Higher-level pattern promotion; doesn't address the day-to-day duplicates/contradictions/stale-dates in operator-edited files. |

**The actual gap = operator-edited files accumulate cruft over months:**
- `~/.claude/projects/<project>/memory/MEMORY.md` + per-file frontmatter memos
- `$CORTEX_DATA_HOME/projects/<slug>.md` (cross-project library entry — written by cortex-sync via operator action)
- Per-project `<repo>/MEMORY.md`

These have duplicate entries, contradicted facts, relative dates ("yesterday", "last week" — meaningless 3 months later), and growth past their 200-line ergonomic limit. None of the 6 existing assets above prune them.

**Why this matters now**: Operator's own MEMORY.md index just crossed 56 entries in this session. Cross-project library `~/.cortex/projects/cortex-x.md` accumulates from every `/sync`. Without pruning, signal-to-noise degrades. This is exactly the file class AutoDream targets — and cortex's 6 existing primitives leave it untouched.

**Why** (original framing): Operator surfaced [`docs/transcripts/levels-of-claude-code.md`](transcripts/levels-of-claude-code.md) — "Every Level of Claude Code Explained" YouTube walkthrough (87 lines, 5 proficiency levels). Two Claude Code features in Levels 4-5 directly augment cortex's existing memory infrastructure without overlap:

**1. AutoDream — automatic memory consolidation** ([Anthropic Code with Claude 2026](https://letsdatascience.com/blog/anthropic-dreaming-claude-managed-agents-self-improving-may-6), [zenvanriel.com guide](https://zenvanriel.com/ai-engineer-blog/claude-code-autodream-memory-consolidation-guide/), [claudefa.st guide](https://claudefa.st/blog/guide/mechanics/auto-dream), [Geeky Gadgets](https://www.geeky-gadgets.com/claude-autodream-memory-files/), community impl: [grandamenium/dream-skill](https://github.com/grandamenium/dream-skill)):
   - Background sub-agent that consolidates Claude memory between sessions, mimicking REM-sleep memory consolidation
   - 4 operations: **merge duplicates** (3 sessions noting same deployment quirk → one clean entry) · **remove contradicted facts** · **convert relative→absolute dates** ("yesterday we decided X" → "2026-03-15 we decided X") · **aggressive prune** to keep index ≤200 lines
   - Triggers: automatic after 24h + ≥5 new sessions, OR manual `/dream`
   - **Status: research preview, server-side feature flag, NOT every user has access yet**
   - Observed: consolidated 913 sessions of memory in ~8-9 minutes
   - **Cortex equivalent gap**: `prompts/cortex-sync.md` is manual *capture*. Cortex has NO consolidation/pruning step. After months, `$CORTEX_DATA_HOME/projects/<slug>.md` entries accumulate contradictions + duplicates + relative dates that need consolidation.

**2. `/insights` monthly usage report** (transcript §4.5):
   - Reads past month of Claude usage, generates report on patterns
   - Surfaces: what you do repetitively (→ skill candidates), where you waste tokens, prompts to turn into skills, what to add to CLAUDE.md
   - "Most people have no data on how they actually use the tool. Run this once a month, it'll tell you exactly which habits to start building."
   - **Cortex equivalent gap**: cortex HAS the data (`$CORTEX_DATA_HOME/journal/*.jsonl` + `research/*.md` + `insights/*.md`) but no report-generator. Operator's habits, recurring patterns, expensive sessions are all sitting in disk waiting to be mined.

**Scope** (6 stories, parallelizable):

**A) `bin/cortex-dream.cjs`** (M effort) — AutoDream-equivalent consolidator. Zero-dep Node CJS. Reads `$CORTEX_DATA_HOME/projects/<slug>.md` entries + per-project `MEMORY.md` + `$CORTEX_DATA_HOME/journal/*.jsonl`. Applies 4 operations from AutoDream:
   - **Merge duplicates** via fuzzy text + frontmatter key match (e.g., `key_decisions:` lines that paraphrase same fact)
   - **Remove contradictions** via LLM judge (haiku-equivalent for cost) — feed pairs of conflicting entries, ask which to keep
   - **Relative-date normalization** — regex `\b(yesterday|tomorrow|last week|N days ago)\b` → absolute via entry's `last_synced` timestamp
   - **Aggressive prune** — drop entries older than 90 days with frequency==1 and no `pin: true` frontmatter field
   - CLI flags: `--dry-run` (print plan, no mutation), `--slug <project>` (single-project mode), `--max-lines 200` (per-file cap), `--yes`, `--json`
   - Safety: timestamped backup of every mutated file (`<file>.backup-<iso-ts>`); only operates on files under `$CORTEX_DATA_HOME/` and matching cortex frontmatter signature (`name:` + `type:` keys)

**B) `prompts/cortex-dream.md`** + `shared/skills/cortex-dream/SKILL.md` (S effort) — slash skill wrapper. Triggers: "consolidate my memory", "dream", "clean up my projects library", "my memory is bloated", "/cortex-dream". Calls bin/cortex-dream.cjs --dry-run first, shows diff, asks confirm, then `--yes`.

**C) `bin/cortex-insights.cjs`** (M effort) — usage report generator. Reads:
   - `$CORTEX_DATA_HOME/journal/*.jsonl` last N days (default 30) for tool-call patterns, costs, token velocity
   - `$CORTEX_DATA_HOME/research/*.md` to find topics researched repeatedly (skill candidates)
   - `$CORTEX_DATA_HOME/insights/*.md` for prior reflection outputs
   - `cortex/recommendations.md` of recent projects for incomplete items
   - Project-level `MEMORY.md` + cortex-sync entries
   - Computes:
     - **Top 5 manual patterns** (recurring prompt phrases / tool sequences)
     - **Top 3 skill candidates** (research topics queried ≥3 times)
     - **Wasted-token candidates** (sessions where >50% tokens spent on retries / context-compactions)
     - **CLAUDE.md add-suggestions** (corrections operator made manually in sync entries)
     - **Stale memory candidates** (entries not touched in >60 days, no `pin: true`)
   - Output: `$CORTEX_DATA_HOME/insights/usage-report-<YYYY-MM-DD>.md` (markdown report) + `--json` for programmatic consumption

**D) `shared/skills/cortex-insights/SKILL.md`** (S effort) — slash skill wrapper. Triggers: "what should I turn into a skill?", "/cortex-insights", "show me my usage patterns", "kde plýtvám tokeny", "co dělám opakovaně". Calls bin/cortex-insights.cjs, formats output for chat display.

**E) Optional: `cortex-dream` as a Steward action_kind** (S effort) — register `dream` as an action_kind so Steward cron can run consolidation nightly/weekly via existing infra. Reuses `bin/steward/_lib/spec-verifier.cjs` for `read_set` criterion to verify which files were touched. Composition with existing 17 action_kinds.

**F) Tests + docs + memory entry** (S effort) — 15+ tests across cortex-dream + cortex-insights suites. Smoke verifier check for new shims. Update `standards/web-research.md` or new `standards/memory-system.md` documenting cortex's 4-tier memory architecture (PROGRESS / CLAUDE / MEMORY / library) + how cortex-dream + cortex-insights compose with cortex-sync.

**Acceptance criteria**:
- `cortex-dream --dry-run` on operator's real `$CORTEX_DATA_HOME` reports merge/contradiction/date-normalization/prune candidates without mutating
- `cortex-insights` produces a useful monthly report from journal+research+insights+library data
- Both CLIs honor backup-before-mutate + idempotent re-run patterns from Sprint 2.21.2
- cortex-doctor `--json` includes new health-checks for both CLIs

**Out of scope (defer)**:
- Real-time memory pruning during sessions (AutoDream is between-session by design)
- LLM-judge contradictions via OpenRouter (cost concern — defer to v1; v0 uses regex+heuristics)
- Cross-project pattern detection beyond skill candidates (separate Sprint 3.4-territory work)

---

### Sprint 2.26 — CLAUDE.md template audit + `/output-style` ergonomics + Level 4/5 ecosystem documentation (S effort) — 📋 PLANNED 2026-05-13

**Why**: Same transcript (`docs/transcripts/levels-of-claude-code.md`) surfaced four lighter-touch improvements that don't fit Sprint 2.25's memory theme but cleanly polish operator UX:

**Sources**:
- [Claude Code Cloud Routines docs](https://code.claude.com/docs/en/routines) — Anthropic's own scheduled-task system, complementary to cortex Steward
- [Claude Code overnight automation (The New Stack)](https://thenewstack.io/claude-code-can-now-do-your-job-overnight/)
- [Routines practical guide (Nimbalyst)](https://nimbalyst.com/blog/claude-code-routines-practical-guide/)
- [Routines pricing analysis (Verdent)](https://www.verdent.ai/guides/claude-code-pricing-2026)

**Scope** (4 stories, S effort each):

**A) `templates/CLAUDE.md.hbs` audit against transcript Level 4 rules** — verify the scaffolded project CLAUDE.md follows Anthropic-team best practices:
   - **≤200 lines** (transcript: "Claude reads this file on every single conversation. So if it blows up, you're going to be paying more tokens for that consistently.")
   - **Use `@file-name` references** for on-demand loading instead of inline content
   - **"Every mistake → update CLAUDE.md"** discipline — explicit section "## Corrections log" template seeded with example
   - Currently `templates/CLAUDE.md.hbs` is ~134 lines; verify after operator scaffold renders it doesn't balloon past 200 with project-specific content. If it does, refactor sections like "Architecture" to live in `@architecture.md` reference file.

**B) `/output-style` cortex parity** — Claude Code ships `/output-style new` to swap personalities (default, explanatory, learning + custom). Useful for cortex's contexts: "QA mode" (no fluff, dense table), "Designer mode" (visual-first), "Steward review mode" (no greetings, terse fact-only). Implementation options:
   - **v0** — document the pattern in `standards/voice.md`: cortex's voice charter IS its output-style; operators can extend via `~/.claude/output-styles/<name>.md`
   - **v1** — ship 3 cortex-flavored output styles as `shared/output-styles/cortex-{default,qa,designer}.md` copied to `~/.claude/output-styles/` during install

**C) Cloud Routines positioning doc** (`docs/steward-vs-routines.md`) — operator already uses Steward (GitHub Actions cron + OpenRouter). Anthropic launched [Cloud Routines](https://code.claude.com/docs/en/routines) Apr 2026 (Pro $20/mo: 5 runs/day · Max $200/mo: 15 runs/day · Team: 25 runs/day) with 3 trigger types (schedule + API + GitHub event). Cortex needs a clear positioning doc:
   - Routines = native Anthropic, subscription-billed, no DevOps
   - Steward = operator-owned, OpenRouter-billed, full safety mechanika (D/W/M USD caps, STEWARD_HALT, atomic rollback, 17 typed action_kinds, spec-verifier)
   - **Composition pattern**: a Cloud Routine can invoke cortex skills (e.g., `/audit`) inside its prompt — cortex skills are auto-discovered in `~/.claude/skills/` regardless of routine vs interactive
   - **When to pick what**: Routines for "I want it simple, paying $20/mo OK" · Steward for "I want full control, my repos, USD caps, audit trail, $0 infra"

**D) Level 4/5 ecosystem reference card** (`docs/claude-code-ecosystem.md`) — index of Claude Code-native features cortex composes with vs reimplements vs ignores:
   - **Compose with (cortex enhances)**: SessionStart hooks, skills, sub-agents, `/goal`, MCP, plan mode, work trees, Cloud Routines
   - **Cortex equivalent exists (use cortex's version)**: review pipeline (cortex's 6-agent parallel > sub-agent serial chain), memory layers (cortex's 4-tier > built-in single-file), discipline enforcement (cortex's R1/R2 > none)
   - **Explicit NOT-do (already documented elsewhere)**: reimplement `/goal` loop (Sprint 2.24), reimplement haiku verifier, cron-schedule `/goal`
   - **Worth installing alongside**: Claude Design (separate Anthropic Labs product), Ralph Loop plugin, anthropics/skills examples

**Acceptance criteria**:
- `templates/CLAUDE.md.hbs` measurably under 200 lines after typical scaffold
- New `docs/steward-vs-routines.md` resolves the "do I need cortex if Anthropic ships routines?" question
- New `docs/claude-code-ecosystem.md` is the canonical reference when operator asks "should cortex add feature X?"

**Out of scope**:
- Implementing `/output-style` as a slash skill (Claude Code's own `/output-style new` covers it)
- Replicating Cloud Routines as a cortex feature (different value prop; Steward serves operator-owned use case)

---

### Sprint 2.27 — Verification discipline: self-checking todos + screenshot-loop pattern + 95% confidence prompt (S-M effort) — ✅ SHIPPED 2026-05-14 (co-shipped with 2.30)

**Why**: Operator surfaced `docs/transcripts/32-tricks-claude-code.md` (16-min "32 tricks" walkthrough). Three hacks codify a discipline cortex already endorses informally but doesn't enforce or template:

- **Hack #10 — verification baked into TodoWrite**: every implementation todo gets a follow-up verification todo on the next line. Pattern: build X → next todo is "open the rendered page, screenshot, verify X looks right" or "run the assertion, confirm pass". Quote: "you'd rather have it one-shot 90% of the way there rather than one-shot 60 or 65%".
- **Hack #20+21 — screenshot self-check + Chrome DevTools loop**: for UI work, build → screenshot → analyze visually → fix → screenshot → repeat. For functional work, Chrome DevTools MCP for click/fill/assert without API contract. Transcript reports "V1 that it gives me is so much better than V1 it used to give me" after 3 build+screenshot passes.
- **Hack #9 — 95%-confidence prompt baseline**: "continuously ask me questions until you're 95% confident". Reduces 3-4 rounds of corrections to 1.

Cortex's [`standards/voice.md`](../standards/voice.md) covers terse output + citation discipline, and Sprint 2.21 augment v2 covers TodoWrite-for-3+-steps. Neither encodes verification-todos or the 95%-confidence baseline. The CLAUDE.md augment block (`bin/cortex-claude-md-augment.cjs`) is the natural carrier — bump BLOCK_VERSION 2 → 3.

**Sources**:
- [`docs/transcripts/32-tricks-claude-code.md`](transcripts/32-tricks-claude-code.md) §hacks 9, 10, 20, 21
- [Claude Code Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) — official Anthropic Labs collab
- [Anthropic agent-design best practices](https://www.anthropic.com/research/building-effective-agents) — pattern: verifier loop

**Scope** (4 stories, parallelizable):

**A) `cortex-claude-md-augment.cjs` BLOCK_VERSION 2 → 3** (S effort) — extend `DISCIPLINE_BLOCK` with new "Verification discipline" section:
   - "Pair every implementation todo with a verification todo on the next line. Implementation = build/edit. Verification = run the test, open the URL, screenshot, read the log."
   - "Before commit, the verification todo must be checked off — not just the implementation one."
   - "If a todo is UI-shaped, the verification is `Chrome DevTools MCP → screenshot → assert` not `npm run build → green`."
   - Reuse Sprint 2.21.2 orphan-marker + non-UTF8 guards. R2-clean.

**B) `standards/verification-loop.md`** (S effort) — new standard codifying the pattern:
   - Three failure modes covered: visual drift (UI), functional regression (handlers), data-shape drift (API/DB)
   - Pattern table: failure mode → which verification primitive (screenshot / DevTools / Zod runtime / spec-verifier kind)
   - Cross-reference [`standards/correctness.md`](../standards/correctness.md) (eval-driven dev) and [`standards/testing.md`](../standards/testing.md) (5 pillars per test)

**C) `prompts/95-confidence.md`** (S effort) — reusable prompt fragment with the literal "continuously ask me questions until you're 95% confident" phrasing + 3 worked examples (project bootstrap, ambiguous bug report, large refactor scope). Includes citation to transcript hack #9 as origin. Available for `/cortex-init`, `/start`, and operator inline use.

**D) Update `templates/CLAUDE.md.hbs` Conventions section** (S effort) — add 3-line verification-loop reminder under existing Coding Behavior § (don't bloat past Sprint 2.26's 200-line ceiling). Reference `standards/verification-loop.md` for detail.

**Acceptance criteria**:
- `cortex-claude-md-augment --apply` writes v3 block; `--remove` on v2 still works (backward-compat removal)
- v2→v3 upgrade path tested (operator with v2 block runs `--apply`, gets v3 with their non-cortex content preserved)
- New standard cross-linked from `standards/README.md` index
- Existing tests still pass (2697 baseline + new tests for v3 marker detection)

**Out of scope** (defer):
- Auto-generating verification todos via skill (Claude already does this when prompted by the augment block; no need for explicit tooling)
- Chrome DevTools MCP install automation (`shared/skills/cortex-init/SKILL.md` Step 5 can suggest it; install path is `claude mcp add chrome-devtools`)
- "Screenshot before commit" git hook — too invasive; let augment block + skills suggest

---

### Sprint 2.31 — Context-budget discipline: smart-zone / dumb-zone standard (S effort) — 📋 PLANNED 2026-05-28

**Why**: Operator surfaced `docs/transcripts/workflow-for-ai-coding.md` (Matt Pocock / AI Hero, 2h workshop, citing Dex Horthy / HumanLayer). 4-agent web research validated but **sharpened** the "smart zone / dumb zone" model: degradation is **continuous and starts well below 100K** (not a clean cliff), and **reasoning degrades far faster than retrieval** (NoLiMa @32K: literal 98.5% / one-hop 56% / two-hop 26%) — the real argument for a small working set on multi-step coding. HumanLayer's operational number is **40–60% utilization**. The transcript's "always clear, never compact — compaction leaves sediment" is **PARTIALLY REFUTED**: no primary source uses "sediment"; Anthropic + HumanLayer favor **intentional compaction into structured artifacts** + aggressive **tool-result** clearing. cortex's `pre-compact.cjs` hook already IS "intentional compaction into artifacts" → **validate it, don't adopt the anti-compaction stance**.

**Sources**:
- [`docs/transcripts/workflow-for-ai-coding.md`](transcripts/workflow-for-ai-coding.md) — smart/dumb zone, clear-vs-compact
- [Chroma — context rot](https://www.trychroma.com/research/context-rot) · [NoLiMa (ICML 2025)](https://arxiv.org/html/2502.05167v1)
- [HumanLayer — advanced context engineering](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md) · [12-factor-agents](https://github.com/humanlayer/12-factor-agents)
- [Anthropic — effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**Scope** (3 stories):
- **A)** `standards/context-engineering.md` (new) — smart-zone model, 40–60% budget, reasoning-vs-retrieval asymmetry, a decision table (clear tool-noise aggressively / compact into artifacts deliberately / never blind-clear a long horizon), "minimal ≠ short" for CLAUDE.md (right altitude, not shortest).
- **B)** Cross-link from `standards/README.md` + `standards/correctness.md` + `standards/verification-loop.md`.
- **C)** One line in pre-compact hook doc confirming it implements "intentional compaction into artifacts" (the recommended practice).

**Acceptance criteria**: new standard cross-linked from README index; framing uses continuous degradation (NO 100K-cliff claim); pre-compact hook positioned as recommended, not anti-pattern; `npm test` green.

**Out of scope**: runtime context-budget enforcement (Claude Code `/context` already surfaces it); auto-clearing logic.

---

### Sprint 2.32 — Deep modules as AI-codeability lever: modular.md enrichment + improve-codebase-architecture skill (S-M effort) — 📋 PLANNED 2026-05-28

**Why**: Ousterhout's deep/shallow modules (confirmed canonical) reframed for AI: a clean test boundary around a **deep** module → better feedback loops → higher agent quality ceiling. **Empirically grounded** — SWE-bench Verified shows repo testability gates agent success (reliable fail→pass harness + pinned Docker). Net-new framing the transcript under-weights: **information hiding = token economy** (a shallow, leaky interface = more tokens the agent must load to use it). "Design the interface yourself, delegate the implementation (gray boxes)" preserves the operator's mental model while moving fast. Matt's single highest-impact takeaway = the `improve-codebase-architecture` skill that scans for shallow modules to deepen + surfaces test gaps.

**Sources**:
- [softengbook — deep modules](https://softengbook.org/articles/deep-modules) · [aihero — codebases AI agents love](https://www.aihero.dev/how-to-make-codebases-ai-agents-love)
- [SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) · [Pragmatic Engineer — Philosophy of Software Design](https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design)

**Scope** (3 stories):
- **A)** `standards/modular.md` § "Module depth for AI codeability" — deep vs shallow; info-hiding = token economy; deep module = clean test boundary = feedback-loop quality; "feedback loops are the floor, not a nice-to-have" with SWE-bench citation; interface-first / delegate-implementation. Note: "deep = more testable" is a defensible synthesis, NOT Ousterhout canon — cite as inference.
- **B)** `shared/skills/improve-codebase-architecture/SKILL.md` (new) — read-only audit: scans for shallow-module clusters + zero-test modules, proposes deepening candidates with coupling rationale + dependency category. **Audit output only, no auto-refactor.** Target cortex-skill-validate ≥80/ok.
- **C)** Cross-link from `modular.md` + add to `/cortex-help` menu.

**Acceptance criteria**: modular.md section added + cross-linked; skill validates ≥80/ok; skill output is audit-only (no destructive refactor path); `npm test` + structure tests green.

**Out of scope**: auto-applying refactors (audit only — human picks); GraphRAG dependency mapping (Sprint 3.3 deferred).

---

### Sprint 2.33 — Tracer-bullet vertical slicing + HITL/AFK task taxonomy (S effort) — 📋 PLANNED 2026-05-28

**Why**: AI defaults to **horizontal** (layer-by-layer) coding → integration feedback delayed to the final phase. Tracer bullets / vertical slices (Pragmatic Programmer) force **end-to-end feedback in slice 1**. cortex's [`modular.md:12`](../standards/modular.md#L12) mentions vertical slices as a code-org rule only — it's missing the AFK-loop feedback rationale (the part specific to agents). HITL-vs-AFK now has a **formal taxonomy** — Swarmia's 5-level agent autonomy (L1 assistive → L5 human-out-of-loop, "higher ≠ better"). "Day shift = human plans/QA, night shift = AI implements" is a named 2026 pattern.

**Sources**:
- [aihero — tracer bullets](https://www.aihero.dev/tracer-bullets) · [InfoQ — walking skeleton / skeleton architecture](https://www.infoq.com/articles/skeleton-architecture/)
- [Swarmia — 5 levels of AI agent autonomy](https://www.swarmia.com/blog/five-levels-ai-agent-autonomy/) · [TracerKit (reference)](https://github.com/helderberto/tracerkit)

**Scope** (2-3 stories):
- **A)** `standards/modular.md` — extend the vertical-slice line with the AI-feedback rationale: AI biases horizontal → force thin vertical slices, each demoable (schema → service → API → UI → test), so the loop gets feedback on the critical path in phase 1.
- **B)** `shared/skills/cortex-goal/SKILL.md` — add a **HITL vs AFK task-type tag** to plan output (planning / alignment / QA = HITL; implementation = AFK), referencing Swarmia autonomy levels. Plan stays plan-only (cortex authors, native `/goal` runs).
- **C)** Optional: note TracerKit + `AGENTS.md` coordination-contract as references in the relevant standard.

**Acceptance criteria**: vertical-slice AI rationale added to modular.md; cortex-goal emits HITL/AFK tags; cortex-skill-validate still ≥80 for cortex-goal; `npm test` green.

**Out of scope**: automated DAG/Kanban issue generation (defer to worktree-supervisor v1, Sprint 2.2.1); TracerKit integration.

---

### Sprint 2.34 — `tdd_red_green` action_kind with targeted test context (M effort) — 📋 PLANNED 2026-05-28

**Why**: TDAD (arXiv 2603.17973) — test-first cut regressions **70%** (6.08% → 1.82%) on SWE-bench Verified. **CRITICAL nuance**: generic "do TDD" **without telling the agent which tests to check made it WORSE (9.94%)**. So a Steward TDD action_kind must inject **targeted test context, not generic TDD prose** — this is the single highest-leverage research finding. Reward-hacking is a real co-threat (agents hardcode `test_cases.json`, edit test files, `sys.exit(0)` to fake green) — see Sprint 2.35.

**Sources**:
- [TDAD — arXiv 2603.17973](https://arxiv.org/abs/2603.17973) · [Endor Labs — test-first prompting](https://www.endorlabs.com/learn/test-first-prompting-using-tdd-for-secure-ai-generated-code)

**Scope** (3 stories):
- **A)** New action_kind `tdd_red_green` — **registry-only first, executor deferred** (per the Sprint 2.2 `recommendation_harvest_parallel` pattern). Spec: name the target tests, write failing test, confirm red, implement, confirm green. `topology_safe: 'serial'`.
- **B)** `standards/testing.md` § "TDD for agents" — the "which tests, not how to TDD" rule (TDAD-grounded) + anti-cheat note (flag test-file edits during impl).
- **C)** Document the flow against the existing spec-verifier gate (no new criterion kind needed — `shell` + `read_set` cover it).

**Acceptance criteria**: action_kind registered; `validateTopologySafe` returns serial; registry test added; testing.md section cross-linked; `npm test` green.

**Out of scope**: executor/runtime (registry + standard first); `mutation_score` criterion kind (Sprint 2.3.1).

**⚠️ Risk note**: touches the Steward action-kind registry (runtime-adjacent) — ship with tests + R2, do it LAST in any same-day batch.

---

### Sprint 2.35 — Reward-hacking defenses: inoculation prompting + eval benchmarks (S effort, doc) — 📋 PLANNED 2026-05-28

**Why**: Agents game tests (hardcode expected values, edit test files, `sys.exit(0)` fakes). Anthropic's **inoculation prompting** cut misalignment **75–90%**; benchmarks now exist (RHB, EvilGenie arXiv 2511.21654). cortex's `correctness.md` + `security.md` don't yet cover reward-hacking as a named failure class. The cheapest, lowest-risk entry of this cluster — pure doc.

**Sources**:
- [Anthropic — emergent misalignment / reward hacking](https://www.anthropic.com/research/emergent-misalignment-reward-hacking) · [EvilGenie — arXiv 2511.21654](https://arxiv.org/pdf/2511.21654)

**Scope** (2 stories):
- **A)** `standards/correctness.md` § "Reward hacking" — failure patterns (hardcoded expected values, test-file edits, exit-0 fakes), inoculation-prompting mitigation, and `read_set` spec-verifier criterion as a defense (proves which files the action actually touched → catches a test-file edit).
- **B)** Cross-link from `security.md` (§ Agentic Security) + `testing.md`.

**Acceptance criteria**: correctness.md section added; cross-links from security.md + testing.md; `npm test` green.

**Out of scope**: automated reward-hack detection tooling; running the benchmarks in CI.

---

### Sprint 2.40 — selective vendor of `taste-skill` into `standards/visual-taste.md` (S effort, doc) — ✅ SHIPPED 2026-05-28

**Why**: The operator surfaced [`leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill) (MIT, by Leon Lin / tasteskill.dev) — an anti-slop frontend Agent Skill with structured **VARIANCE / MOTION / DENSITY dials**, an unconditional **em-dash ban**, a **pre-flight mechanical checklist**, and canonical **GSAP skeletons** (sticky-stack, horizontal-pan, scroll-reveal). cortex's existing `designer` skill is the **process layer** (5-phase orchestration: discover → research → architect → scaffold → adapt + Stitch DESIGN.md handoff); taste-skill complements it with the **rules layer** designer didn't have. Two paths considered: install-as-is (npx skills add — creates two parallel design skills with drift risk + external maintenance dep) vs. selective vendor. Operator chose vendor.

**What shipped**: `standards/visual-taste.md` — selectively adapts the 4 high-leverage parts of the source (dials + design-read inference table + em-dash ban + condensed pre-flight checklist + canonical GSAP code skeletons + forbidden animation patterns). NOT vendored: the source's palette bans (premium-consumer warm-beige+brass family, "Lila Rule" purple bans, serif discipline deep-dive), the v1 SKILL.md fallback, the gpt-tasteskill / soft / minimalist / brutalist variants, the three image-gen skills — those stay upstream for operators who need them. MIT attribution preserved per the license (`## Attribution` block at the end with copyright notice + license reference + scope of adaptation). `shared/skills/designer/SKILL.md` now references the standard as the rules layer Phase 2-3 enforces. `standards/README.md` count 29→30, new Rule 3 row, "Why N" section refreshed.

**Tradeoff (named, not hidden)**: cortex now carries a copy of the rules. If taste-skill ships v2.0 with new dials/heuristics the vendored copy stays at v2-experimental until refreshed. Acceptable — the underlying anti-slop principles are stable (em-dash ban is binary, GSAP `start: "top top"` is a fact about ScrollTrigger, the dial taxonomy is a structural abstraction). Re-sync trigger: an upstream changelog entry that materially changes the dials or adds a new mandatory pre-flight item.

**Sources**: [github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT © 2026 Leon Lin) · [tasteskill.dev](https://tasteskill.dev) · skill content fetched via `gh api repos/Leonxlnx/taste-skill/contents/skills/taste-skill/SKILL.md`.

---

### Sprint 2.38 — `cortex-usage` artifact-usage telemetry (S effort) — ✅ SHIPPED 2026-05-28

**Why**: The institutional-wisdom library grows every week (standards, prompts, agents, skills) and the operator stated the real pain directly — *"začínám přestávat mít přehled kompletně"* (losing the overview). The fix for comprehension is NOT more content or more tests (both make it worse); it is knowing which ~20% is actually load-bearing so only that has to be held in your head. The raw signal already existed — `shared/hooks/post-tool-use.cjs` logs every `Read` (with file path) to `{root}/journal/YYYY-MM-DD-<slug>.jsonl` — but nothing rolled it up. This sprint turns that stream into an answer: hot (earns its context cost) vs cold (prune candidate).

**What shipped**: `bin/cortex-usage.cjs` — read-only, zero-dep, fail-open rollup CLI (mirrors `cortex-gap-report.cjs` shape). Scans journal dirs at both the repo and `$CORTEX_DATA_HOME` (the hook's resolver writes to the repo root; the convention uses data-home — the CLI reads both and dedupes). Classifies `Read` events into root-independent artifact keys (`standards/x.md`, `prompts/x.md`, `agents/x.md`, `skills/<name>`) so a read of the repo copy and the installed `~/.claude/shared` copy fold into one count. Cross-references the on-disk universe to surface **cold** artifacts (exist but 0 reads in window = prune candidates feeding the 2026-07-17 usage-driven audit). Flags: `--since`, `--kind`, `--cold`, `--json`. 16 unit tests incl. a regression test for the `used + cold === universe` invariant (orphan reads must not inflate `used`). Wired into install.{sh,ps1} delegate shims + `cortex-help` menu + `bin/README.md` roster.

**Out of scope (deferred follow-up — Sprint 2.38.1)**: a Steward action that *acts* on cold artifacts (auto-prune). Auto-deleting wisdom is irreversible and high-blast-radius — it must stay behind a human gate. Measure first (this sprint); the surfacing/recommendation layer (session-start nudge, prune-candidate report in the audit) and any automated pruning are separate, gated work. Also deferred: citation-level signal (which artifact the model actually *cited*, not just opened) — `Read` is the cheap high-value proxy for v0.

**Sources**: internal codebase archaeology only (no external/current-state claims → no R1 web research triggered). Memory: `standards/context-engineering.md` (smart-zone / load-bearing-fraction rationale).

---

### Sprint 2.36 — Opus 4.8 routing bump (XS effort) — ✅ SHIPPED 2026-05-28

**Why**: Opus 4.8 launched 2026-05-28. 4-agent web research confirmed: OpenRouter slug `anthropic/claude-opus-4.8` live, same $5/$25 rate card as 4.6/4.7, and — critically — the ~35% 4.7 tokenizer inflation that kept routing pinned to 4.6 is **neutralized at default "high" effort** (4.8-high ≈ 4.7-default token spend, better output). Plus ~4× fewer unremarked self-authored code flaws (honesty), which directly serves Steward's verifier gate.

**What shipped**: `routing-table.cjs` premium + ensemble-worker slots `anthropic/claude-opus-4.6` → `anthropic/claude-opus-4.8` (8 occurrences) + updated rationale comment. Pinned the standard slug, NOT `-fast` (2× price, no quality gain). Effort defaults unchanged (per-kind tuning from Sprint 2.4.1 already correct).

**Sources**: [openrouter.ai/anthropic/claude-opus-4.8](https://openrouter.ai/anthropic/claude-opus-4.8) · [anthropic.com/news/claude-opus-4-8](https://www.anthropic.com/news/claude-opus-4-8). Memory: `project_anthropic_landscape_2026_05_28`.

---

### Sprint 2.2.2 — Align worktree-supervisor with native dynamic workflows (S effort) — 📋 PLANNED 2026-05-28

**Why**: On 2026-05-28 Anthropic shipped **dynamic workflows** in Claude Code — Claude writes orchestration scripts that fan out tens-to-hundreds of parallel subagents in-session, run an adversarial-convergence loop (agents refute each other), gate on the test suite, and plan-confirm on first trigger (`ultracode` setting = xhigh effort). This is *the same breadth-first-fan-out-then-converge pattern* Sprint 2.2's worktree-supervisor was building toward — now a first-party CLI/SDK/API primitive. Re-implementing an in-house spawner would rebuild a vendor primitive.

**Decision**: **DEFER the worktree-*spawner* (Sprint 2.2.1)** indefinitely — Anthropic owns in-session fan-out now. **KEEP** the `multi-agent-supervisor.md` standard + `topology.cjs` — they serve a *different substrate*: dynamic workflows are in-session + script-driven with **NO git-worktree isolation**, whereas Steward needs headless/cron/cross-session true filesystem isolation + cortex spec-verifier as the convergence bar.

**Scope**: (A) Amend `multi-agent-supervisor.md` to position cortex's supervisor as the *headless/cron* complement to native dynamic workflows (not a competitor). (B) Thin adapter: when running interactively, prefer `ultracode` + dynamic workflows with cortex spec-verifier criteria as the test-suite bar, rather than the cortex spawner. (C) Validate the `ultracode` flag name before relying on it.

**Sources**: [claude.com/blog/introducing-dynamic-workflows-in-claude-code](https://claude.com/blog/introducing-dynamic-workflows-in-claude-code).

---

### Sprint 2.37 — `mid_conv_system` Steward reinjection (S effort) — 📋 PLANNED 2026-05-28 · ⛔ BLOCKED on engine-passthrough verification

**Why**: The Messages API now accepts a `MidConversationSystemBlockParam` (`{"type":"mid_conv_system", content, cache_control}`) — update an agent's instructions mid-run (permissions, token budgets, environment/halt state) WITHOUT breaking the prompt cache or routing through a fake user turn. Steward's `execute.cjs` currently reinjects rule/budget context as prose; migrating to `mid_conv_system` would make per-phase updates cache-cheap.

**⛔ BLOCKER (research-before-assert)**: `mid_conv_system` is an Anthropic-API beta feature. cortex's default Steward engine routes via **OpenRouter**, and it is UNVERIFIED whether OpenRouter passes the block through. Wiring this blind would ship a feature that may silently no-op on the primary engine. **Gate: verify OpenRouter passthrough (or scope the migration to the `claude-cli` / direct-Anthropic engine seam) BEFORE any execute.cjs change.**

**Sources**: [platform.claude.com/docs/en/api/messages](https://platform.claude.com/docs/en/api/messages) · [anthropic.com/news/claude-opus-4-8](https://www.anthropic.com/news/claude-opus-4-8).

---

### Sprint LR.CMA — Claude Managed Agents positioning memo (S effort, doc) — ✅ SHIPPED 2026-05-28

**Why**: Anthropic's Claude Managed Agents (CMA, beta) is a managed clone of cortex's evolve/spec-verifier/Steward stack (Dreaming = autoDream, Outcomes = spec-verifier). It validates the design but erodes the "only cortex does this" pitch, and raises a build-vs-buy question. Documented in `docs/claude-managed-agents-positioning.md` (LR.Z-style landscape memo): CMA is a **competitor-to-monitor**, a poor 4th Steward engine seam (agent loop is Anthropic-cloud-owned, $0.08/session-hour meter, not ZDR; self-hosting relocates only tool execution). cortex's moat shifts further toward operator-owned markdown SSOT + safety stack — confirming the Boris-Cherny "harness commoditizes → value migrates to wisdom" thesis.

**Sources**: [platform.claude.com/docs/en/managed-agents/overview](https://platform.claude.com/docs/en/managed-agents/overview) · [anthropic.com/engineering/managed-agents](https://www.anthropic.com/engineering/managed-agents). Memory: `project_anthropic_landscape_2026_05_28`.

---

### Sprint 2.28.3 — Final R2 hardening follow-up: parity drift + Rule-of-Three + polish (S-M effort) — ✅ SHIPPED 2026-05-14

**Why**: Sprint 2.28 chain (initial → 2.28.1 → 2.28.2) ran 3 R2 rounds and closed 17 ship-blockers. Operator refined cadence rule 2026-05-14: *"R2 stačí dát celou review pipeline jednou, nemusíš několikrát. to žere tokeny"*. Remaining round-3 findings backlogged here as a single deferred sprint per the refined rule.

**Convergence note**: Sprint 2.28 chain hit no-new-HIGH at round 2 → 2.28.2 fixes. Round 3 R2 surfaced one HIGH parity gap + several MED polish items + LOW nitpicks. None are ship-blockers; all are defer-eligible. Operator can pick any subset of 2.28.3 when ready.

**Sources**: Sprint 2.28.2 R2 round 3 reports (acceptance + blind + correctness + edge + security + ssot, all 2026-05-14).

**Scope (10 items, S each, fully independent):**

1. **HIGH correctness parity drift — sister CLI hardening backport** (S, ~30 min). The Sprint 2.28.1 + 2.28.2 fixes (tmp file mode `0o600` + `parseConfirmReply` empty-stdin = abort) shipped only into `bin/cortex-permissions-register.cjs`. Sister CLIs `bin/cortex-hooks-register.cjs` (line 152 tmp + line 213/222 confirmInteractive) and `bin/cortex-claude-md-augment.cjs` (line 191 tmp + line 231/244 confirmInteractive) carry the OLD behavior — same threat model (writes user `settings.json` / `CLAUDE.md`), different verdict. Either copy fixes verbatim into both files OR extract `bin/_lib/confirm.cjs` (`parseConfirmReply` + `confirmInteractive`) + `bin/_lib/atomic-write.cjs` (`backupFile` + `writeFile` with mode 0o600) and import from all three. Add parity tests asserting empty-stdin = abort + tmp mode 0o600 for hooks-register + augment.
   [src: Sprint 2.28.2 correctness-auditor round 3 finding HIGH, parity matrix]

2. **HIGH SSOT Rule-of-Three: extract `normalize_consent_var()` helper in install.sh** (S, ~15 min). The `tr '[:upper:]' '[:lower:]' | tr -d '[:space:]'` pipeline now triplicates across 3 consent gates (hooks line 635, augment line 685, permissions line 737). Rule of Three fires. Declare helper near install.sh top, call from all 3 sites.
   [src: Sprint 2.28.2 ssot-enforcer round 3 H1]

3. **HIGH SSOT Rule-of-Three: extract `Get-NormalizedConsent` helper in install.ps1** (S, ~15 min). Same pattern: `.Trim()` + null-guard ternary triplicated across 3 consent gates (hooks line 743, augment line 780, permissions line 818). PowerShell function with `param([string]$EnvVarName)`.
   [src: Sprint 2.28.2 ssot-enforcer round 3 H2]

4. **MED SSOT prompt-literal duplication**: prompt text `[y/N]` / `[Y/n]` triplicated across each installer (6 sites + cortex-permissions-register CLI). Hoist per-script consent-prompt helper that takes `(message, default-yes-bool)`.
   [src: Sprint 2.28.2 ssot-enforcer round 3 M1]

5. **MED SSOT install.sh + install.ps1 default-confirm asymmetry**: install.sh `[Y/n]` (line 648, default y) vs CLI `[y/N]` (default abort). Operator running `./install.sh` in half-broken TTY (closed stdin mid-prompt) silently gets `y` and a settings.json mutation. The CLI's Sprint 2.28.1 edge HIGH #11 fix explicitly hardened against this. Align install scripts to abort-on-empty for settings-mutating prompts.
   [src: Sprint 2.28.2 blind-hunter round 3 minor #1]

6. **MED docs drift: `CLAUDE.md:41` test count stale** (2697 → 2733 actual). Refresh during next docs-sync commit. Also `docs/steward-roadmap.md § Sprint 2.28*` still shows `📋 PLANNED` for Sprint 2.28; mark as `✅ SHIPPED 2026-05-14` once chain converges.
   [src: Sprint 2.28.2 ssot-enforcer round 3 M2 + M3]

7. **MED security: deny-list completeness gaps** (deferred from Sprint 2.28.1 round 2 + verified in round 3 not regressed): add `Bash(sudo*)`, `Bash(chmod -R*)`, `Bash(chown -R*)`, `Bash(find *-delete*)`, `Bash(find *-exec rm*)`, `Bash(dd *of=/dev*)`, `Bash(xargs rm*)`, `Bash(pip uninstall -y*)`, `Bash(cargo clean*)`, `Bash(git push *--mirror*)`, `Bash(git branch -D*)`, `Bash(git tag -d*)`. `sudo` is highest-priority (negates every other floor entry).
   [src: Sprint 2.28 security-auditor MED-2, persisted across rounds]

8. **MED edge: `tr '[:upper:]'` locale dependence in install.sh** — Turkish locale `LC_ALL=tr_TR.UTF-8` could produce dotless-i for any future consent token containing `I`. Defense-in-depth: prefix with `LC_ALL=C tr '[:upper:]' '[:lower:]'` for determinism.
   [src: Sprint 2.28.2 edge-case-hunter round 3 MED]

9. **MED correctness: 5 fast-check property tests on pure reducers** (deferred from round 2): `parseConfirmReply`, `computePlan`, `normalizePermissionsField`, `normalizeKindList`, allow-list invariant. `fast-check@4` already in devDeps. Estimated 3-4 hours for full property suite across hooks + augment + permissions CLIs.
   [src: Sprint 2.28.1 + 2.28.2 correctness-auditor across rounds]

10. **LOW: pre-existing `// 10.` comment numbering bug in bin/cortex-doctor.cjs** (lines 281 + 313 both labeled `// 10.`). Pre-existing, surfaced by blind-hunter round 3. Renumber to `// 10.` and `// 11.`.
    [src: Sprint 2.28.2 blind-hunter round 3 minor #2]

**Acceptance criteria**:
- All 3 settings-mutating CLIs have parity on tmp mode 0o600 + parseConfirmReply empty-stdin = abort (Item 1 critical)
- install.sh + install.ps1 use the extracted consent helper (Items 2 + 3)
- 2697-test baseline preserved (currently at 2733); new tests added for parity assertions

**Out of scope** (kept in further-deferred backlog):
- Pattern matcher integration test (requires Claude Code matcher reverse-engineering)
- stderr preview length-cap on `normalizeKindList` warning (purely cosmetic)
- Buffer-input rejection in `parseConfirmReply` (internal callers always string-decode)

**Convergence**: this is the FINAL Sprint 2.28 chain entry per operator's "R2 once per sprint" rule (memory `feedback_r2_review_pipeline_cadence.md` 2026-05-14). After 2.28.3 ships, do NOT dispatch another R2 round — backlog any new findings to Sprint 2.28.4 if they arise organically.

---

### Sprint 2.28.4 — Backlog from 2.28.3 R2 hardening (S effort, defer) — 📋 PROPOSED 2026-05-14

**Why**: Sprint 2.28.3 R2 (6-agent review) surfaced 2 HIGH findings deemed real but defer-eligible (operator scenario rare + non-trivial fix scope). Captured here so they don't disappear.

1. **HIGH (edge-case-hunter H-9) — `writeFileAtomic` symlink follow** (S, ~30 min): if `~/.claude/settings.json` is a symlink (operator dotfile-managed setup), `fs.renameSync(tmp, target)` destroys the symlink and stows orphan source. Fix: `fs.lstatSync(targetPath)` → if symlink, `fs.realpathSync` pre-resolve → write to real target. Add regression test with symlink fixture. Threat model: low (operator self-inflicted), but easy fix.
   [src: Sprint 2.28.3 R2 edge-case-hunter H-3]

2. **HIGH (edge-case-hunter H-10 + security M-2) — TOCTOU race between read+backup+write across concurrent CLIs** (S, ~45 min): two `cortex-*-register --apply` runs in parallel both read snapshot, both backup, both write — second clobbers first. Fix: file-lock via existing `bin/steward/_lib/lock.cjs` primitive around read→compute→write in all 3 CLIs. Likely add `bin/_lib/settings-lock.cjs` SSOT.
   [src: Sprint 2.28.3 R2 edge-case-hunter H-4 + security-auditor M-2]

3. **LOW backlog absorbed from 2.28.3**:
   - Item 9 deferred property tests on pure reducers (`parseConfirmReply`, `normalizePermissionsField`, `normalizeKindList`, allow-list invariant) — overlap with Sprint 2.21.3 #7 was partial; extend 2.21.3 #7 scope OR add here.
   - L-1 stderr warning on orphan-tmp cleanup failure (advisory only).
   - Test cleanup: `tests/unit/cortex-permissions-register.test.cjs:459-478` parseConfirmReply contract duplicated with `_lib-confirm.test.cjs` — keep helper as canonical, drop duplicate at CLI test layer (ssot-enforcer M1).

**Out of scope** (per convergence rule): no new R2 dispatch on 2.28.4 itself unless operator overrides.

---

### Sprint 2.28 — Safety-floor permissions: `cortex-permissions-register` CLI (S effort) — ✅ SHIPPED 2026-05-14 (chain 2.28 → 2.28.1 → 2.28.2 → 2.28.3)

**Why**: Operator surfaced `docs/transcripts/32-tricks-claude-code.md` hack #30 — "edit permissions for safe autonomy" replaces `--dangerously-skip-permissions` with explicit `allow` + `deny` lists in `~/.claude/settings.json`. Web research confirmed:
- Schema is `{ "permissions": { "allow": [...], "deny": [...], "ask": [...] } }` with `Tool(pattern)` syntax e.g. `Bash(npm test:*)`
- **Precedence is `deny > ask > allow > defaultMode`** — documented at [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings)
- Settings hierarchy: managed > CLI flags > local > project > user — so a `deny` at user level holds even if project settings widen `allow`

Cortex already ships [`shared/hooks/block-destructive.cjs`](../shared/hooks/block-destructive.cjs) as a runtime kill-switch but that fires AFTER the operator types `y`. A `deny`-list in `~/.claude/settings.json` short-circuits the prompt — user never gets to approve a `git push --force` because Claude Code never asks. This is the **same Principle 1 / opt-in pattern** Sprint 2.21 used for hooks: cortex never auto-writes; CLI asks consent, writes timestamped backup, idempotent merge.

**Sources**:
- [`docs/transcripts/32-tricks-claude-code.md`](transcripts/32-tricks-claude-code.md) §hack 30
- [Claude Code settings reference](https://code.claude.com/docs/en/settings) — official schema + precedence
- Sprint 2.21 (`bin/cortex-hooks-register.cjs`) — established opt-in consent pattern with backup

**Scope** (4 stories):

**A) `bin/cortex-permissions-register.cjs`** (M effort) — new CLI mirroring `cortex-hooks-register` shape:
   - Reads `~/.claude/settings.json` (creates `{}` if missing)
   - Merges curated `permissions.deny` floor + `permissions.allow` baseline (operator can extend `allow` per-project; cortex `deny` stays as the floor)
   - **Curated `deny` floor** (cortex-owned, the safety contract):
     - `Bash(rm -rf*)`, `Bash(git push --force*)`, `Bash(git push -f*)`, `Bash(git reset --hard*)`, `Bash(git clean -f*)`, `Bash(git checkout .*)`
     - `Bash(supabase db reset*)`, `Bash(psql*DROP TABLE*)`, `Bash(psql*TRUNCATE*)`
     - `Bash(npm publish*)` (catches accidental publishes; operator overrides per-package if intentional)
     - `Bash(*-i*)` (interactive flags — rebase -i, add -i, etc., which hang headless)
   - **Curated `allow` baseline** (common-safe ops cortex is confident don't need approval):
     - `Bash(npm test*)`, `Bash(npm run test:*)`, `Bash(npm run build)`, `Bash(npm run lint*)`, `Bash(npm run typecheck)`
     - `Bash(git status)`, `Bash(git diff*)`, `Bash(git log*)`, `Bash(git branch*)`, `Bash(git show*)`
     - `Bash(ls*)`, `Bash(pwd)`, `Bash(node --version)`, `Bash(node -v)`
     - Cortex own CLIs: `Bash(cortex-*)`
   - **Identity rule** for distinguishing cortex-owned vs user-added entries: cortex entries listed in `CORTEX_PERMISSIONS_MANIFEST` in the CJS file. On `--remove`, cortex prunes only those listed; user-added entries on same Tool() pattern preserved.
   - Flags: `--apply` (default), `--remove`, `--status`, `--dry-run`, `--yes`, `--json`. Backup before mutate (`settings.json.backup-<ts>`).
   - Refuses on orphan markers / non-UTF8 (Sprint 2.21.2 R2 hardening reuse).

**B) `install.sh` + `install.ps1`** (S effort) — third opt-in interactive prompt alongside existing `CORTEX_REGISTER_HOOKS` and `CORTEX_AUGMENT_CLAUDE_MD`. New env: `CORTEX_REGISTER_PERMISSIONS=0|1`. Default OFF in CI/non-TTY, prompt in TTY. INSTALL_NOTES.md updated with the resulting `permissions` block.

**C) `bin/cortex-doctor.cjs`** (S effort) — extend health checks:
   - "Permissions registered" check — true if `~/.claude/settings.json` `permissions.deny` contains cortex floor entries (signature match)
   - "Dangerous override detected" check — true if `--dangerously-skip-permissions` recently used (look in `~/.claude/logs/` if accessible) or if `permissions.allow` contains `Bash(*)` (wildcard catch-all overrides the floor)
   - `--fix-suggestions` prints exact `cortex-permissions-register --apply` invocation

**D) `prompts/onboarding-first-10min.md`** (S effort) — add Step "permissions ready" with the rationale: "instead of `--dangerously-skip-permissions`, cortex ships a safety floor — same speed, deny-precedence means you can't accidentally `rm -rf` even if you typo." Reference [Claude Code settings doc](https://code.claude.com/docs/en/settings).

**Acceptance criteria**:
- Fresh install with `CORTEX_REGISTER_PERMISSIONS=1` writes safety floor + baseline allow to `~/.claude/settings.json` idempotently (re-run = no diff)
- `cortex-permissions-register --remove` strips only cortex-owned entries; user-added Tool patterns survive
- `cortex-doctor` flags missing floor as a recommendation (not error — opt-in stays opt-in)
- `permissions.deny.Bash(rm -rf*)` actually blocks Claude Code from running `rm -rf node_modules` without approval, verified in fresh-VM smoke test
- 2697-test baseline preserved; new tests added (`tests/unit/cortex-permissions-register.test.cjs` ~15 tests)

**Out of scope** (defer):
- Project-level `<project>/.claude/settings.json` permissions templating — operator can copy floor manually; cortex `init`/`audit` skills could suggest later (Sprint 3.x)
- Web-tool / fetch permissions (cortex's WebSearch+WebFetch autoresearch needs `WebFetch(*)` allow — but Claude Code's default already permits this for the agent)
- Compliance-style audit log of permission grants/denies (Tier 4 territory)

**Risks**:
- A `Bash(*-i*)` catch-all could false-positive on legitimate single-letter `-i` flags (e.g. `grep -i`). Counter: pattern is `Bash(*-i*)` matching standalone `-i` arg; refine via `\s-i\s` regex if false positives surface. Test pre-ship.
- `Bash(npm publish*)` blocks cortex's own publish flow if cortex ever ships to npm (Sprint 4.0.1 territory). Counter: cortex's own publish path is `npx skills add` infra-side, not `npm publish` from operator machine.

---

### Sprint 2.29 — Profile-level MCP recommendations + Context7 default for ai-agent / chatbot-platform (S effort) — ✅ SHIPPED 2026-05-14

**Why**: Operator surfaced `docs/transcripts/32-tricks-claude-code.md` hack #32 — Context7 MCP solves the docs-cutoff staleness problem (Claude trained on snapshot N, framework now at N+M with breaking changes; Claude suggests deprecated APIs). Web research verified [upstash/context7](https://github.com/upstash/context7) is active: 55.2k stars, MIT, latest release `ctx7@0.4.2` 2026-05-11. Fetches version-specific docs into the prompt before Claude writes code.

Cortex profiles currently declare `ai_sdk:` (Sprint 2.x) but no `recommended_mcp_servers:` field. For `ai-agent` and `chatbot-platform` profiles where the operator builds against a fast-moving SDK surface (Vercel AI SDK v6, Claude Agent SDK, OpenAI Agents SDK), Context7 is a clear default.

This is **not a runtime dependency** — cortex never invokes Context7. It's a profile recommendation surfaced during `/cortex-init` Step 5 and at `/cortex-doctor` info-severity output. Operator chooses whether to `claude mcp add context7`.

**Sources**:
- [`docs/transcripts/32-tricks-claude-code.md`](transcripts/32-tricks-claude-code.md) §hack 32
- [upstash/context7](https://github.com/upstash/context7) — verified active 2026-05-13 (55.2k ★, MIT)
- [Claude Code MCP install docs](https://code.claude.com/docs/en/mcp) — `claude mcp add` command

**Scope** (3 stories):

**A) Profile YAML schema extension** (S effort) — add optional `recommended_mcp_servers:` array to profile spec. Touched profiles:
   - `profiles/ai-agent.yaml` → `[{ name: context7, source: '@upstash/context7', purpose: 'live docs for Vercel AI SDK + Claude Agent SDK + OpenAI Agents SDK to dodge training-cutoff drift' }]`
   - `profiles/chatbot-platform.yaml` → same Context7 entry + (eventual) `supabase-mcp` once cortex validates it
   - `profiles/nextjs-saas.yaml` → Context7 (Next.js evolves fast)
   - `profiles/browser-agent.yaml` → Context7 + Playwright MCP (already implied)
   - `profiles/qa-engineer.yaml` → Context7 (test-framework docs evolve)
   - `profiles/minimal.yaml`, `profiles/astro-static.yaml` → no recommendations (KISS profiles)
   - Schema: each entry has `name` (string), `source` (npm package or git URL), `purpose` (one-line rationale), `install_command` (default: `claude mcp add <name>`)

**B) `shared/skills/cortex-init/SKILL.md` Step 5 extension** (S effort) — after current hooks + CLAUDE.md status reminders, add MCP recommendations section. Reads the resolved profile's `recommended_mcp_servers:` and emits per-entry suggestion: "Operator: `claude mcp add context7` would dodge the docs-cutoff issue for [Vercel AI SDK / Claude Agent SDK]. Want me to walk you through it?" Asks Y/n once per session via `~/.cortex/.first-run-mcp-suggested` marker (don't nag every session).

**C) `bin/cortex-doctor.cjs` info-severity MCP check** (S effort) — extend health checks:
   - "Recommended MCPs detected" — true if resolved profile's recommended servers all appear in `~/.claude.json` (single config file at home — corrected per Sprint 2.29 R1 memo, NOT the older `~/.claude/mcp.json` form)
   - INFO severity (never warning) — operator preference, not a cortex requirement
   - `--fix-suggestions` lists the `claude mcp add <name>` invocations

**Acceptance criteria**:
- Profile YAML schema documented in `standards/profiles.md` (or extend existing `profiles/README.md` if no schema doc)
- `/cortex-init` mentions Context7 for ai-agent / chatbot-platform / nextjs-saas / browser-agent / qa-engineer profiles only (not minimal/astro-static)
- `cortex-doctor --json` reports MCP recommendation status without erroring
- Operator can disable via `CORTEX_SUGGEST_MCP=0` (mirrors existing opt-out patterns)

**Out of scope** (defer):
- Auto-installing MCP servers (Principle 1: cortex never auto-modifies user globals)
- Vendoring Context7 as a cortex dependency
- Building a cortex-owned MCP server (Sprint 4.x territory)
- Replacing cortex's WebSearch+WebFetch autoresearch with Context7 — they solve different problems (autoresearch = one-shot deep research with citations; Context7 = on-demand docs lookup during coding)

---

### Sprint 2.30 — Worktree-aware Steward + CLAUDE.md augment v3 final polish (plan mode + ultrathink + worktree safety) (S effort) — ✅ SHIPPED 2026-05-14 (co-shipped with 2.27)

**Why**: Operator surfaced `docs/transcripts/32-tricks-claude-code.md` hacks #7 (always start in plan mode), #23 (parallel sessions via `claude --worktree`), #29 (`ultrathink` keyword). Web research verified all three are Anthropic-native CLI features as of May 2026:
- `--worktree <name>` (shorthand `-w`) creates `.claude/worktrees/<name>/` on branch `worktree-<name>`. Announced by Boris Cherny on Threads. Doc: [code.claude.com/docs/en/worktrees](https://code.claude.com/docs/en/worktrees).
- `ultrathink` triggers ~31,999-token thinking budget (`MAX_THINKING_TOKENS` env). Tiers: `think` 4K → `think hard`/`megathink` 10K → `ultrathink` 32K. CLI-only.
- Plan mode (`shift+tab` cycle) restricts to read+research without mutation.

Two cortex implications:

1. **Augment v3 should mention these** — operator working in cortex skill auto-gets the discipline. The Sprint 2.27 v3 bump is the natural carrier (consolidate verification-discipline edits + this polish into one BLOCK_VERSION 3 push).

2. **Steward must refuse non-main worktree** — if Steward cron triggers in a worktree directory by accident (e.g. operator forgot to `cd` back to main worktree before sleep), atomic-commit + push could land on `worktree-feat-X` instead of `main`. Single-line pre-flight: `git rev-parse --show-toplevel` vs the source-of-truth worktree; bail if mismatch.

**Sources**:
- [`docs/transcripts/32-tricks-claude-code.md`](transcripts/32-tricks-claude-code.md) §hacks 7, 23, 29
- [Claude Code worktrees doc](https://code.claude.com/docs/en/worktrees) — official
- [ClaudeLog ultrathink FAQ](https://claudelog.com/faqs/what-is-ultrathink/) — token budget reference
- Sprint 2.21.1 BLOCK_VERSION 2 → Sprint 2.27 v3 carrier

**Scope** (4 stories, parallelizable):

**A) Augment v3 §Operator-mode reminders** (S effort) — extend the Sprint 2.27 v3 block with a short "Claude Code mode hints" subsection:
   - "For tasks with ≥3 unknowns or cross-system impact: start in plan mode (`shift+tab`). Plan, get operator sign-off, then exit plan and execute."
   - "For architecture decisions / non-trivial refactors / ambiguous bug reports: prefix the prompt with `ultrathink` (32K thinking-budget tier)."
   - "Parallel features → `claude --worktree <name>` or `claude -w <name>`. Each gets isolated `.claude/worktrees/<name>/` on branch `worktree-<name>`."
   - Order matters: keep this AFTER Sprint 2.27 verification block — augment grows additively, no reorder.

**B) `bin/steward/_lib/worktree-guard.cjs`** (S effort) — pre-flight check for `dry-run.cjs` + `execute.cjs`. Reads `git rev-parse --show-toplevel` and `git worktree list --porcelain`; bails with `STEWARD_WORKTREE_DENIED` error code if cwd is in any worktree other than the primary. New env override `STEWARD_ALLOW_WORKTREE=1` for advanced operators who explicitly want to dogfood Steward on a feature branch. Default refuses (safety floor).

**C) `tests/unit/steward-worktree-guard.test.cjs`** (S effort) — 5+ tests: primary worktree allowed, secondary worktree denied, missing git repo gives clean error (not crash), `STEWARD_ALLOW_WORKTREE=1` overrides, denial includes path of detected worktree in error message.

**D) `prompts/onboarding-first-10min.md` worktree section** (S effort) — 5-line addition: "running 2+ features in parallel? Use `claude --worktree <feat>` per terminal. cortex Steward auto-refuses to run in a non-primary worktree (run it from main, or set `STEWARD_ALLOW_WORKTREE=1` if you know what you're doing)."

**Acceptance criteria**:
- Augment v3 block visibly contains all three mode-hint lines after `cortex-claude-md-augment --apply`
- Steward dry-run from inside `.claude/worktrees/feat-x/` exits non-zero with `STEWARD_WORKTREE_DENIED`
- `STEWARD_ALLOW_WORKTREE=1` bypass works as documented
- 2697-test baseline preserved
- No new false-positives on the existing 15 Steward GitHub Actions cron workflows (they run from clone-root, not worktree)

**Out of scope** (defer):
- Worktree-aware `bin/cortex-doctor` health check (worktrees are short-lived; doctor doesn't need to inventory them)
- Automatic `claude --worktree` launching from cortex skills (operator preference; skills don't need to fork sessions)
- Reimplementing worktrees (Claude Code is canonical)
- `ultrathink` triggering automatically when cortex detects "architecture" / "refactor" / "design" intents (too invasive; let operator opt in)

**Cross-references**:
- Sprint 2.27 — same BLOCK_VERSION 3 bump (consolidate the two augment edits into a single Sprint-2.27+2.30 commit when both ship)
- Sprint 1.6.20+ Steward hardening backlog — add `STEWARD_WORKTREE_DENIED` to the existing 17-error-code registry

---

### Sprint 2.24 — `/cortex-goal` wrapper + Ralph-loop plan template + Steward bridge (M effort) — 📋 PLANNED 2026-05-13

**Why**: Operator surfaced [`docs/transcripts/goals-for-claude-code.md`](transcripts/goals-for-claude-code.md) — YouTube walkthrough of the new `/goal` slash command that just shipped in Claude Code + Codex harnesses. Verified live at [`code.claude.com/docs/en/goal`](https://code.claude.com/docs/en/goal): `/goal` is an officially-documented Claude Code feature, NOT third-party. Mechanic: user sets a condition (≤4000 chars), Claude runs each turn, **haiku** (small fast model) evaluates condition vs. conversation transcript after every turn, returns yes/no + reason. "No" continues with reason injected as guidance; "yes" clears the goal. Goal carries across `--resume` / `--continue`. Works headless via `claude -p "/goal ..."`. Officially a wrapper around session-scoped prompt-based Stop hook.

**Reported field use** (transcript): 14h overnight sessions, 45h sessions, 5-day continuous runs. Originally introduced by Codex ~2 weeks before Anthropic copied. Both harnesses now native. Related: [Ralph Loop plugin](https://claude.com/plugins/ralph-loop) is Anthropic's official ralph-loop implementation; [goalkeeper](https://github.com/itsuzef/goalkeeper) is community contract-driven variant with subagent judge.

**Why this matters for cortex-x specifically**:

1. **Steward and `/goal` are complementary, not overlapping**:
   - Steward = nightly cron, GitHub Actions runner, reads `cortex/recommendations.md`, opens draft PRs (Sprint 1.6-1.9)
   - `/goal` = session-scoped, interactive launch, runs locally, returns on DoD
   - Same operator might use both: Steward overnight + `/goal` during weekday batches before weekly rate-limit reset (operator's Claude Max x20 use case)

2. **cortex already has the verification primitives** that make a great `/goal` condition: `bin/steward/_lib/spec-verifier.cjs` (Sprint 1.9) ships 6 acceptance-criterion kinds — `shell`, `file_predicate`, `regex`, `ears_text`, `llm_judge`, `read_set`. The `llm_judge` kind is the same idea as `/goal`'s haiku evaluator at a different scope (per-action vs. per-turn). Reusing the language gives cortex users criterion-level verifiability inside their `/goal` plans.

3. **Operator's R1+R2 discipline only auto-applies inside cortex skills** (Sprint 2.21.1 discipline block patches this for ad-hoc work). For a 14-hour autonomous `/goal` session, the operator wants research-first + review pipeline embedded INTO the goal condition, otherwise the long-running loop drifts off-discipline.

4. **Plan-first pattern** — transcript best practice: ask Claude to produce a structured plan markdown BEFORE invoking `/goal`. Plan structure: brief · stack · in-scope · out-of-scope · DoD · acceptance criteria (verifiable) · turn budget · risks · open questions · key references. cortex-x's `/start` Phase 1-3 produces something similar but not in `/goal`-ready format.

**Scope** (6 stories, parallelizable):

**A) `templates/cortex-goal-plan.md.hbs`** (S effort) — Handlebars template matching transcript's plan structure. Hydrated from operator answers + project state (detected stack, recent commits, recommendations.md backlog). SSOT for what a cortex `/goal` plan looks like.

**B) `prompts/cortex-goal.md`** (M effort) — interactive plan-first wrapper:
   - Phase 1: ask 3 questions (goal · scope · budget)
   - Phase 2: render plan via template A; embed cortex R1+R2 discipline as acceptance-criteria items by default (R1: "research artifacts cached in $CORTEX_DATA_HOME/research/", R2: "review pipeline run on every non-trivial diff before commit")
   - Phase 3: reference cortex spec-verifier criterion kinds so DoD items are verifiable, not aspirational
   - Phase 4: write plan to `cortex/goal-<slug>.md`, suggest operator invoke `/goal "execute plan at cortex/goal-<slug>.md until acceptance criteria all pass"`
   - DOES NOT fire `/goal` itself — that's Claude Code's native command; we just produce the plan

**C) `shared/skills/cortex-goal/SKILL.md`** (S effort) — auto-discovered slash skill wrapping prompt B. Natural-language triggers: "run long task", "autonomous session", "use my unused tokens before reset", "execute this overnight", "vyřeš to autonomně", "dělej dokud nehotovo".

**D) `templates/cortex-goal-plan-frontload.md.hbs`** (S effort) — variant of template A specifically for the transcript's token-frontloading use case: reads `cortex/recommendations.md` P0/P1/P2 backlog, picks N items, generates "execute all P0 items + as many P1 as fit in token budget" as a single goal. Useful pre-weekly-rate-limit-reset.

**E) Update `standards/coding-behavior.md` Rule 1.5 §Goal-Driven Execution** (S effort) — currently mentions "goal-driven execution" generally. Add explicit reference to `/goal` as Claude Code's native mechanic + cortex's plan-template pattern as the wrapper. Link to https://code.claude.com/docs/en/goal.

**F) Steward + goal-plan bridge** (M effort, optional, deferrable) — let `bin/steward/dry-run.cjs` accept `cortex/goal-<slug>.md` as alternative input format alongside `cortex/recommendations.md`. Same plan can then run via either `/goal` session OR Steward cron, depending on operator's situation. New `--input goal` flag on cortex-steward. R2 review pipeline auto-runs on Steward's PR before merge regardless.

**Sources**:
- [`docs/transcripts/goals-for-claude-code.md`](transcripts/goals-for-claude-code.md) — full 45-line transcript
- [Claude Code /goal docs](https://code.claude.com/docs/en/goal) — official spec
- [Ralph Loop plugin](https://claude.com/plugins/ralph-loop) — Anthropic's prior implementation
- [Ralph Wiggum technique](https://awesomeclaude.ai/ralph-wiggum) — pattern origin
- [Running Claude Code in a Loop (Fernando de la Rosa)](https://www.jfdelarosa.dev/blog/running-claude-code-in-a-loop/) — community write-up
- [goalkeeper (itsuzef)](https://github.com/itsuzef/goalkeeper) — alternative contract-driven variant
- [continuous-claude (AnandChowdhary)](https://github.com/AnandChowdhary/continuous-claude) — Ralph loop with PR automation
- [Claude Code Ralph Loop overnight builds](https://newsletter.claudecodemasterclass.com/p/claude-code-ralph-loop-from-basic) — long-running session guide

**Acceptance criteria**:
- Operator can type `/cortex-goal "build the X feature with Y acceptance criteria"` and get a structured plan file produced
- Plan includes R1 + R2 + cortex standards as default acceptance-criteria items
- standards/coding-behavior.md explicitly cites `/goal` as the native mechanic
- (Optional, story F) Same plan markdown works for both `/goal` session AND Steward cron input

**Out of scope** (defer to later sprints):
- Reimplementing the haiku-evaluator loop ourselves — Claude Code already provides it
- Cron-scheduling /goal sessions (operator uses Steward for cron, /goal for live sessions)
- Cost-cap integration with cortex's D/W/M USD caps — `/goal` runs against operator's Claude subscription, not OpenRouter; cap logic is different surface

**Cross-references**:
- Sprint 2.22 (skill quality tooling) — `/cortex-goal` SKILL.md from story C should pass `cortex-skill-validate` (Sprint 2.22 story A)
- Sprint 4.0.1 (agentskills.io ecosystem) — `/cortex-goal` is a candidate for the `Rejnyx/cortex-skills` npx-installable bundle

---

### Sprint 2.22 — Skill quality tooling: validator + eval-driven description optimization (M effort) — 📋 PLANNED 2026-05-13

**Why**: Operator surfaced Anthropic transcript "[Claude Code E25] Creating Custom Skills" (`docs/transcripts/skill-auto-write.md`) which exposed three gaps in cortex-x's current skill discipline (`standards/skills.md` covers spec + progressive disclosure + portability but NOT these):

1. **No skill validator** — 8 cortex SKILL.md files in `shared/skills/`, but no automated check they follow the agentskills.io spec (frontmatter validity, name↔directory match, name char rules 1-64 / lowercase / no leading-trailing/consecutive hyphens, description ≤1024 chars, description + when_to_use combined ≤1536 chars before truncation).
2. **No description-quality scoring** — we ship 7 user-discoverable skills (cortex-init, cortex-help, audit, designer, start, test-audit, cortex-doctor). Are their descriptions triggering reliably on natural-language phrases the operator's friends would type? We've never measured. Anthropic's **Skill Creator** ([anthropics/skills/blob/main/skills/skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)) automates this with a 20-query eval set, 60/40 train/test split, 3 runs per query for non-determinism, iterative Claude-driven description rewrite (up to 5 iterations), select-best-by-test-score.
3. **No script-design checklist for cortex `bin/cortex-*.cjs` CLIs** — transcript codifies rules (NO interactive prompts in agent-spawned scripts, structured output JSON/CSV not aligned text, stdout=data + stderr=diagnostics separation, exit codes per failure type, --dry-run / --confirm safe defaults, helpful error messages). Our 10 CLI scripts mostly follow this organically but no standard enforces it.

**Sources**:
- [Claude Code E25 transcript](docs/transcripts/skill-auto-write.md) — full 65-line skill-authoring lecture (Junhyeong Lee, "New Book")
- [Skill Creator skill](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) — meta-skill that automates eval loop
- [Skill Creator Claude Plugin](https://claude.com/plugins/skill-creator)
- [Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) — official Anthropic PDF
- [agentskills.io specification](https://agentskills.io/specification)
- [SKILL.md DeepWiki spec](https://deepwiki.com/agentskills/agentskills/2.2-skill.md-specification)

**Scope** (6 stories, parallelizable):

**A) `bin/cortex-skill-validate.cjs`** (S effort) — minimal validator (zero-dep CJS, doesn't pull `skills-lib` as runtime dep). Per-skill checks:
- Frontmatter parseable as YAML; required `name` + `description` present
- `name` matches parent dir; matches `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$` (no leading/trailing/consecutive hyphens)
- `description` length 1-1024
- `description` + `when_to_use` combined ≤ 1536 chars (warns at 1400 — buffer)
- Body length ≤ 500 lines OR 5,000 tokens (warns above)
- `disable-model-invocation: true` required for skills with side-effects (deploy/commit/external API) — heuristic: SKILL.md body contains regex `(deploy|commit|push|delete|drop|truncate)` outside code blocks
- CLI flags: `--json`, `--dir <path>`, `--strict` (warn → error). Exit 0 if clean, 1 if violations.

**B) `bin/cortex-skill-eval.cjs`** (M effort, deferrable to v1) — Skill Creator-inspired evaluator. For each cortex skill, operator (or a cortex prompt) authors 20 eval queries (8-10 should-trigger, rest shouldn't). Run each via Claude SDK 3x, score trigger accuracy (true positive rate on should-trigger set, false positive rate on shouldn't set). Output: `cortex/skill-eval/<skill-name>-<date>.json` with per-query results + per-skill scorecard. **v0**: just the eval runner, queries authored manually. **v1**: queries auto-generated by Claude from SKILL.md description.

**C) `prompts/cortex-skill-optimize.md`** (S effort) — slash-prompt that wraps eval-driven description rewrite. Reads `cortex/skill-eval/<skill>.json`, identifies failing queries, asks Claude to propose 3 alternative descriptions, re-evaluates each, picks winner by test-set score. Mirrors `Skill Creator` `scripts/run_loop` workflow.

**D) Audit cortex's 7 user-discoverable skills against transcript rules** (S effort) — apply 7-principle checklist to:
   - cortex-init, cortex-help, audit, designer, start, test-audit, cortex-doctor
   - cortex-init.SKILL.md is now ~230 lines — verify under 500-line / 5K-token limit
   - Descriptions: count chars (most are well under 1024, but verify combined-with-when_to_use after we ever add when_to_use)
   - Imperative form check: "Use this skill when..." pattern (transcript best practice)
   - Side-effect skills: should `audit` / `start` / `designer` have `disable-model-invocation: true`? Probably not (they're user-invoked workflows) but document the decision.

**E) Extend `standards/skills.md`** (S effort) — add 3 new sections distilled from transcript:
   - **Body patterns** (5 patterns from transcript §11): Precautions, Output template, Multi-step checklist, Iterative verification, Plan-verify-execute
   - **Script design rules** (transcript §15-17): no interactive prompts, structured output, stdout-data / stderr-diagnostics, exit codes per failure, --dry-run safe defaults, self-contained dependencies (PEP 723 inline / Deno npm import / Bundler inline)
   - **Description optimization** (transcript §18-20): imperative form, user intent focus, list contexts, keep concise, key example at start within 1536 chars, eval-driven (link to story B+C)

**F) Add `references/` directory example** (S effort) — pick the longest cortex skill (cortex-init SKILL.md @ ~230 lines is largest), refactor edge-cases section + Step 3+4+5 details into `shared/skills/cortex-init/references/edge-cases.md` and `references/post-completion-checklist.md`. Update SKILL.md body to say "When user lands in cortex-x source repo, read `references/edge-cases.md`." Demonstrate progressive disclosure pattern for future operator-written skills.

**Out of scope (deferred to Sprint 2.23+)**: integrating Anthropic's `skill-creator` plugin as a vendored dependency, publishing cortex skills to anthropics/skills registry (Sprint 4.0.1 territory).

**Dependencies**: none — pure local tooling. The eval story (B) optionally calls Claude SDK (cost: ~$0.10 per skill eval at gpt-5.4-mini equivalent; one-shot per skill version).

**Acceptance criteria**:
- `cortex-skill-validate` runs in CI on every push (`.github/workflows/test.yml` adds step)
- All 8 cortex SKILL.md files pass validation cleanly
- standards/skills.md mentions Skill Creator + skills-lib as Anthropic reference impl
- At least one cortex skill has working `references/` subdirectory (story F)
- Existing 2697 tests still pass

---

### Sprint 2.21.3 — R2 hardening follow-up: MEDs from 6-agent review (S effort) — ✅ SHIPPED 2026-05-14

**Why**: Sprint 2.21 R2 review (6-agent parallel pipeline) surfaced 6 HIGH findings (closed in Sprint 2.21.2 commit) + 8 MED findings (deferred — non-ship-blocking but want the polish before launch).

**MED scope** (each ~S effort, independent):

1. **TOCTOU symlink safety on backup + tmp paths** — `cortex-hooks-register.cjs:138,150` + `cortex-claude-md-augment.cjs:139,153`. Open tmp + backup with `'wx'` flag so symlink/pre-existing file aborts. Defense-in-depth; target dir is user-owned so practical risk is low.

2. **Backup file permissions `0o600` (mode-secret-leak)** — settings.json may contain stashed API keys/OAuth tokens; backups inherit `0644` default. Set `{ mode: 0o600 }` on backup writes for both CLIs. Add retention cap (keep N most recent, prune older).

3. **CRLF preservation** — `cortex-claude-md-augment.cjs:165-167` injects `\n` separators unconditionally. On Windows CRLF files, this produces mixed-EOL output → noisy git diffs. Sniff input EOL, preserve on write.

4. **Markers inside fenced code blocks** — `CORTEX_BLOCK_RE` matches anywhere. A user documenting cortex itself in `~/.claude/CLAUDE.md` (e.g. inside ` ``` ` fence) would have the example stripped on `--remove` or re-`--apply`. Require markers at line-start AND not preceded by an unclosed code fence.

5. **Concurrent-mutate lockfile** — both CLIs lack mutex. `~/.cortex/.cortex-mutate.lock` with PID + acquire-or-fail. Prevents the race where two `--apply` invocations interleave reads and only the last write survives.

6. **`replace(/\n{3,}/g, ...)` on --remove mutates user whitespace** — `cortex-claude-md-augment.cjs:202`. Outside the markers should be byte-identical except for the block region. Apply the collapse only to the stripped-block region, not the whole file.

7. **Property tests on pure reducers** — `computePlan` (hooks-register) + `computeNext` (claude-md-augment) are reducers with strong invariants (idempotency, user-content preservation, roundtrip). Add `fast-check` property tests per `standards/correctness.md` Practice 2.

8. **Install partial-failure rollback hint** — `install.sh:649-706`: if hook step succeeds but augment fails, no compensating action documented. Print explicit "partial-install state — rollback with `cortex-hooks-register --remove`" on inter-step error.

**Source**: 6-agent review on Sprint 2.21 diff (2026-05-13 evening). Findings from `correctness-auditor`, `security-auditor`, `blind-hunter`, `edge-case-hunter`, `ssot-enforcer`. `acceptance-auditor` reported APPROVED no findings to defer.

---

### Sprint 4.0.1 — agentskills.io ecosystem participation (S effort, deferred polish) — 📋 PLANNED 2026-05-13

**Why now**: Operator landscape check 2026-05-13 surfaced **`google/skills`** (7,662 ★ in 6 weeks, Apache-2.0, created 2026-03-31) — Google's vendor content packs (Gemini API · BigQuery · Cloud Run · GKE · AlloyDB · Firebase · Cloud SQL · WAF: Security/Reliability/Cost) distributed via `npx skills add google/skills`. They use the **identical** [agentskills.io](https://agentskills.io) SKILL.md spec cortex-x adopted in Sprint 1.x (`standards/skills.md`). 37+ agent products now interop on this spec including Claude Code, Cursor, GitHub Copilot, Gemini CLI, Goose, OpenHands, OpenAI Codex, Mistral Vibe.

This is **validation, not competition**:
- google/skills = vendor-specific **content packs** (GCP only)
- cortex-x = **framework + safety + discipline + Steward**
- Same `~/.claude/skills/` install path, zero name collision (cortex uses `cortex-*`, google uses `gemini-api/alloydb-basics/...`)
- User can `curl install.sh | bash` (cortex-x) AND `npx skills add google/skills` (GCP packs) on the same machine — complementary coverage

**Scope** (3 actions, S effort each, parallel):

1. **README ecosystem section** (5 min): one paragraph positioning cortex-x as framework + safety, third-party content packs (google/skills, laravel/boost, ...) as complementary. Links to agentskills.io showcase. **Hodnota**: free credibility — "we play with others".

2. **`cortex-doctor` third-party-skill awareness** (30 min): when scanning `~/.claude/skills/`, distinguish cortex-owned (skill names in `bin/cortex-doctor.cjs` REQUIRED_SKILLS + RECOMMENDED_SKILLS) from third-party. Report third-party as info-severity ("3 third-party skills detected: google/skills/gemini-api, …"). Never warn or remove. Tests added to existing `tests/unit/cortex-doctor.test.cjs`.

3. **`Rejnyx/cortex-skills` registry publish** (2-3h): new public repo containing copies of cortex-x's 7 user-discoverable skills (cortex-init, cortex-help, audit, designer, start, test-audit, cortex-doctor) in `npx skills`-compatible structure. Auto-generated from `~/cortex-x/shared/skills/` via a `tools/publish-skills.cjs` script run on tag. Distribution flag: lightweight on-ramp for users who want slash commands without the full framework install.

**Out of scope**: dependency between cortex-x install and `npx skills` runtime (we never call `npx skills` from install.sh — they're independent install paths).

**Dependencies**: `npx skills` CLI must remain stable (it's `skills.sh` infrastructure, externally maintained). Track [agentskills/agentskills](https://github.com/agentskills/agentskills) for spec changes.

**Source signals**:
- [google/skills](https://github.com/google/skills) — 7,662 ★, Apache-2.0
- [agentskills.io standard](https://agentskills.io) — Anthropic-originated spec, now multi-vendor
- [agentskills.io clients showcase](https://agentskills.io/clients) — 37+ adopters

**Hackathon-immediate value**: if next hackathon runs on GCP, `cortex-update && npx skills add google/skills` before kickoff = cortex framework + Google Cloud expertise instantly available. Worth testing in the field before deciding whether to invest in action 3 (registry publish).

---

### Sprint 4.1 — WaaS angle for clients (M-L effort, $$$ lever)

**Why**: a barbershop WaaS client, an e-commerce chatbot client, a booking-platform client — the operator's existing clients. Each gets own Steward instance. $50/month per client = recurring revenue + tangible AI value-add.

**Scope**:
- Per-client cortex-x deployment template.
- Client-facing dashboard (Langfuse-derived) showing weekly autonomous improvements.
- Service tier model: starter (deps + lint only), pro (full palette), enterprise (custom kinds).

**Stolen from**: agency / SaaS service-tier conventions.

---

### Sprint 4.2 — Recommendation auto-sourcing (M effort)

**Why**: humans are the bottleneck on recommendations.md curation. Slack message → auto-recommendation. GitHub issue mentioned in Discord → auto-recommendation.

**Scope**:
- Slack/Discord webhook listeners.
- LLM filter: "is this an actionable recommendation, or noise?"
- Auto-append to `cortex/recommendations.md` if filter passes.
- Operator daily digest of new auto-sourced items.

**Stolen from**: Linear / Notion auto-capture patterns.

---

### Sprint 4.3 — Voice → recommendation (S effort, fun)

**Why**: the operator dictates while driving / walking. Telegram bot → voice → Whisper → recommendations.md.

**Scope**:
- Telegram bot endpoint, voice-message receiver, Whisper transcription.
- Same LLM filter as 4.2.
- Operator confirmation step before commit.

---

### Sprint 4.4 — Coding identity transfer / LoRA (XL effort, ambitious)

**Why**: extract the operator's style from his git history (a Next.js SaaS project + Chatbot Platform + WaaS + cortex-x), train lightweight LoRA, Steward adopts. Other the operator projects inherit your voice.

**Scope**:
- Git history → diff samples → instruction-tuning dataset.
- LoRA training (small model, fine-tune on the operator-PR pairs).
- Inference seam in action-engine (LoRA-adapted model as routing option).

**Stolen from**: standard LoRA + RLHF-from-PRs research.

---

### Sprint 4.5 — Cross-repo federated lesson bank (S-M effort)

**Why**: complement to Sprint 3.2. a Next.js SaaS project Steward learns from Kiosek Steward failures.

**Scope**:
- Shared `~/.cortex/lessons.federated.jsonl` synced via private Supabase row or signed Gist.
- Each entry signed with source-repo SHA to prevent poisoning.
- Opt-in per-project.

---

### Sprint 4.6 — Playwright-MCP UI verification (M effort, client-project unlock)

**Why**: relevant for a Next.js SaaS project/Kiosek/portfolio runs where Steward touches React components.

**Scope**:
- Playwright MCP server in CI.
- Per-project `cortex/ui-checks.yaml` defines acceptance flows.
- Post-edit Steward runs flows + screenshot-diffs against baseline.

**Stolen from**: Playwright MCP + Agent Wars spec-driven verification.

---

### Sprint 4.7 — Rebrand Hermes → **Steward** ✅ SHIPPED 2026-05-08 (commit `8064b34` + v0.2.0 hardening `6477eab`)

**Status**: ✅ Shipped 2026-05-08. Initial rename in `8064b34` kept 1-week backward-compat shims; same-day operator-pivot to clean break shipped in `6477eab` (v0.2.0 platform hardening — deleted 10 hermes-prefix shim files + stripped runtime backward-compat). 953→973 tests after migration. All 3 CI lanes green.

**(Original sprint memo retained below for historical context — promotion rationale.)** 🔴 PROMOTED 2026-05-09 from "deferred decision" to **PRE-PUBLIC-TAG MUST**. Web research confirmed NousResearch/hermes-agent: **139k stars, MIT, Feb 2026, active domains `hermes-agent.nousresearch.com/.org/.ai`, $5 VPS deploy, 5 backends, DSPy + GEPA self-evolution loop**. The collision is unrecoverable — top-tier dominant production project + dedicated `.com/.org/.ai` namespace = cortex-x cannot win SEO, community awareness, or any tag-search query for "hermes agent." Operator approved 2026-05-09: rebrand to **Steward**.

**Why "Steward"**: matches "senior engineer compressed" + "persistent agent that curates the operator's code/knowledge/life" framing. Translates cleanly to Czech as "správce." Passes the "could you say it on a podcast without explanation" test. Available as GitHub org/repo handle, npm package name, domain TLDs.

**Scope**:
- `bin/steward/` → `bin/steward/`
- `bin/steward/_lib/` → `bin/steward/_lib/`
- `bin/cortex-steward.cjs` → `bin/cortex-steward.cjs` (keep `cortex-steward` as deprecation shim until v0.2.0)
- `prompts/steward-setup.md` → `prompts/steward-setup.md` (ditto shim)
- `standards/steward-policy.md` → `standards/steward-policy.md` (ditto shim)
- `docs/steward-runtime.md` → `docs/steward-runtime.md` (ditto shim)
- `docs/steward-usage.md` → `docs/steward-usage.md` (ditto shim)
- `docs/steward-roadmap.md` → `docs/steward-roadmap.md` (THIS file; ditto shim)
- `.github/workflows/hermes*.yml` → `.github/workflows/steward*.yml`
- Env vars: `HERMES_*` → `STEWARD_*` (with backward-compat alias for one minor release: read both; emit deprecation log when `HERMES_*` is set)
- Memory entries: keep historical names ("Steward v0.5b", "Steward' first PR #5") — they're snapshots, not live identifiers.
- README.md / CLAUDE.md / project_cortex_*.md: search-and-replace `Steward` → `Steward` for PRESENT-TENSE descriptions; keep past-tense incident references intact.
- Test files: `tests/unit/steward/` → `tests/unit/steward/`; rename test descriptions.
- Action_kind names: keep verbatim (`recommendation`, `dep_update_patch`, etc.) — they're not Steward-branded.

**Backward compat (v0.1.0 → v0.2.0)**:
- Old `bin/cortex-steward.cjs` + `prompts/steward-setup.md` etc. exist as 1-line shim files: `require('./cortex-steward.cjs')` + emit deprecation warning to stderr.
- Old `HERMES_*` env vars read with deprecation log; documented to be removed in v0.2.0.
- Old `.github/workflows/hermes*.yml` kept for one minor release as redirects.

**Effort**: S-M (1-2 days focused). Most is mechanical search-and-replace + git mv. Risk: missing references in templates/.cjs that get baked into freshly-scaffolded projects.

**Acceptance criteria for the rebrand sprint itself**:
- [ ] All NEW project scaffolds (via `prompts/new-project.md` flow) emit `Steward`, not `Steward`.
- [ ] Existing user installations (operator + future a Next.js SaaS project) continue to work with `HERMES_*` env vars + `bin/cortex-steward` shim, with deprecation warning.
- [ ] Full suite green at ≥900 tests.
- [ ] No `bin/steward/` / `bin/cortex-steward.cjs` paths in any active runtime code path; only deprecation shim points back.
- [ ] CHANGELOG.md `## [Unreleased]` documents the rename + v0.2.0 removal target.

**Why before public launch**: 139k-star NousResearch with active `.com/.org/.ai` means our v0.1.0 GitHub release would compete in search + tag-discovery against a project that's already the established meaning of "hermes agent." Anyone seeing cortex-x v0.1.0 with a `bin/steward/` directory will assume fork-or-derivative. The rebrand cost is multi-day mechanical refactor today; cost in 6 months is the same refactor PLUS undoing brand confusion in user docs/blog posts/community.

**Stolen from**: NousResearch hermes-agent's existence convinced us to move. Steward as a name is operator-original.

---

### Sprint 4.8 — BIOS-style health dashboard + Chase-OS one-click skill triggers (M-L effort, ergonomic upgrade)

**Status**: idea logged 2026-05-09. Pitched by operator: "udělat něco jako health dashboard s UI ... něco jako když existuje BIOS a je k němu grafický přístup ovládání, tak něco takového pro Cortex." **Scope expanded 2026-05-13** after [Chase Agentic OS transcript](./transcripts/claude-code-agentic-os.md) — observability dashboard with one-click skill/automation buttons via headless `claude -p`. Convergent design across two independent sources (operator pitch + Chase production pattern).

**Why now (in Tier 3, not earlier)**: Steward has 9-kind palette + journal + lessons + cost ledger + halt + (1.9) spec_failures + (2.1) autoresearch signals + (2.2) judge verdicts + (2.3) mutation scores. CLI `cortex-steward status` is server-grade access. Dashboard is the ergonomic-grade surface — like UEFI is over a motherboard. **Building before Tier 1+2 schemas stabilize = rework.** Wait until 1.9 / 2.1 / 2.2 / 2.3 ship.

**Scope (v1)**:
- **Local-first.** Next.js dev server `localhost:3737`, reads filesystem only, no backend.
- **Sibling repo** `cortex-dashboard` — not a folder in cortex-x. Scaffolded by cortex-x's own profile system (new profile `cortex-dashboard`).
- **Read-only first.** Live journal viewer rolled by date / kind / outcome; spec_failures drill-down (per criterion id, expected vs actual, file affected); lessons.jsonl explorer; cost ledger vs `STEWARD_DAILY_USD_CAP` / `STEWARD_TREE_USD_CAP` (post-2.2); halt status; recommendations.md preview with detector-match overlay; cron run timeline (`gh run list --json`).
- **Anthill view (post-2.2 / 2.3 — operator-pitched 2026-05-08).** When Sprint 2.2 ships supervisor + worker spawning, dashboard wraps the OTLP traces from Sprint 2.0 (Phoenix/Langfuse) and renders the live tree: supervisor at root, N workers as children, per-node cost + token + status, fan-out/fan-in animation. **Don't reinvent the trace store** — Phoenix already has the OTLP HTTP API; dashboard is just the Steward-flavored UI. See `docs/research/swarm-self-spawning-agents-2026-05-08.md` §9 for visualization options surveyed.
- **v2 control**: halt button (writes `.cortex/STEWARD_HALT` with reason; legacy `STEWARD_HALT` filename also honored through v0.2.0), lesson edit/dismiss.
- **v2 Chase-OS skill triggers (2026-05-13 transcript)**: one-click buttons for every action_kind + cron workflow that map to a headless `claude -p <skill-prompt>` invocation. Skills tab lists 16 action_kinds + 9 review-pipeline agents; click runs the skill in a headless Claude Code instance and streams output back to the dashboard panel. Same `cortex-source.yaml` shim resolution as the CLI delegation shims (Sprint 2.8.1+/3.0/3.1/3.2). Unlocks **team/client distribution** — non-CLI-fluent operators can run cortex-x by clicking buttons. See [Chase transcript §dashboard](./transcripts/claude-code-agentic-os.md) for shape reference.

**Architecture**:
- Reads documented contracts: journal entry shape, lessons.jsonl shape, `cortex-steward status --json`, `gh run list --json`.
- Zero database. Filesystem IS the database. Defends "cortex-x stays zero-deps" — dashboard is sibling project with its own deps.
- **Tier 4 evolution**: when Sprint 5.0 awakens cortex-x on home NAS, dashboard becomes always-on UI. Add WebSocket for live cron progress, voice-issue widget (post-Sprint 4.3), federated multi-project view (post-Sprint 4.5).

**Acceptance criteria**:
- [ ] `cortex-dashboard` repo scaffolded via cortex-x init flow.
- [ ] Reads `cortex/journal/*.jsonl` from a configured cortex-x repo path.
- [ ] Renders 5 panels: journal timeline, spec failures, cost ledger, lessons, halt status.
- [ ] CLI parity check: every field shown in `cortex-steward status --json` is reachable via dashboard.
- [ ] No reverse coupling — cortex-x runtime has zero awareness of dashboard's existence.

**Why sibling, not nested**: UI/UX is operator's domain expertise (17 years graphics). Belongs in its own session, own repo, own iteration cadence. cortex-x stays zero-deps; dashboard is free to use shadcn/Tailwind/whatever fits.

---

## 5b. Tier 4 — Personal AI entity / Living cortex-x (weeks 21+, ⭐ VISION)

**Status**: vision tier, not commitment. Surfaced 2026-05-09 by the operator (operator) after seeing a "Personal AI Wiki System" diagram (UGREEN NAS + Obsidian Vault + Steward + multi-agent worker stack). The diagram resonated because cortex-x already has 80% of the components — just running in GHA cron context, not on a home always-on host.

**Goal**: cortex-x stops being "code maintenance tool" and becomes "personal AI entity that lives on the operator's home NAS, curates knowledge across all life domains (code + meetings + notes + health + LinkedIn), responds to ambient events, persists identity across years."

**This is post-v1.0 territory.** Tier 1+2+3 must ship before this is even proposed. But tracking it here so it's on the radar.

### Sprint 5.0 — Self-hosted always-on Steward + adopt Khoj as knowledge layer (M-L effort)

**Why first in this tier**: GHA cron is "1 run per scheduled tick." Home NAS is "24/7 responsive listener." Voice memo at 3pm → recommendation harvested by 3:01pm. GitHub issue commented at 11am → cortex-x considers + drafts response by 11:05.

**Hardware**: UGREEN NAS / Beelink SER9 / Mac Mini M4 (~$500-1200 one-time).

**Software architecture (decided 2026-05-09 via web research)**: cortex-x is the *agentic* layer; **Khoj** is the adopted *knowledge* layer. Sprint 5.2 Obsidian sync becomes a Khoj plugin (it has Obsidian native integration), saving 2-3 sprints of from-scratch wiki + Obsidian bridge work. cortex-x packaged as systemd / launchd service alongside Khoj's Docker compose. Local LLM via Ollama (Qwen 3 32B or Llama 3.3 70B quantized) shared between Steward + Khoj. Hybrid routing — local for sensitive, OpenRouter for premium.

**Why Khoj over alternatives** (2026-05-09 web research):
- **Mature** in 2026-Q2: Obsidian/Emacs/desktop/phone/WhatsApp clients, self-hostable, supports any LLM.
- **Karpathy llm-wiki gist (2026-04-04)** white-hot momentum; Khoj's wiki-curation pattern matches the Personal AI Wiki diagram operator showed 2026-05-09.
- AnythingLLM = broader/less Obsidian-tight; Reor = less mature; Open WebUI + Ollama = generic chat, not wiki-curating.

**Steward's role vs Khoj's role**:
- **Khoj**: knowledge curator (notes, PDFs, meetings, LinkedIn, health) → topic pages + summaries + index. Continuous ingestion.
- **Steward**: action executor (recommendations.md → edits → PR / draft response). Reads Khoj's curated knowledge as additional context.

**Deployment templates** (no formal packaging spec exists in 2026; de facto = systemd + Ollama-style one-liner):
- Hetzner $5 VPS recipe (community standard for $5 VPS deploy, NousResearch hermes-agent's installer is the canonical Python+uv+systemd analog for our zero-deps Node).
- Local Mac Mini M4 launchd plist.
- UGREEN NAS Docker compose alongside Khoj's compose.

**Pre-implementation research dispatch (R1)**:
- "Khoj plugin model + extension API in 2026-Q3 (we'll be building cortex-x as a Khoj sibling agent). systemd unit hardening for self-hosted personal AI 2026 SOTA. Network-isolated agent security patterns. Mac Mini M4 vs UGREEN NAS vs Beelink SER9 thermal/inference benchmarks for 32B-70B local LLM."

**Documentation**: dedicated migration guide for "from cortex-x cron to home Steward" — 30-min setup recipe.

---

### Sprint 5.1 — Soul abstraction (S-M effort, ⭐ NOVEL)

**Why**: insight from the 2026-05-09 diagram inspection — `souls.md` per agent. Today cortex-x has framework-level identity (`standards/`) but no agent-level identity. Each agent has values, voice, constraints, memory priorities encoded as a "soul" that the agent reads before each action.

**Scope**:
- New dir `cortex/souls/<agent>.md` (frontmatter + structured fields).
- Action engine prepends soul to system prompt.
- Soul mutations are human-only edits (like `standards/`).
- Initial souls: `hermes.md`, `harvester.md`, `judge.md`.

**Why not Tier 1**: cortex-x with single hardcoded `HERMES_SYSTEM_PROMPT` still works. Soul abstraction is real value-add only when multiple agents (worktree workers, judge, harvester, supervisor) coexist with distinct roles. Sprint 2.2 (worktree supervisor) is the prerequisite that makes this matter.

---

### Sprint 5.2 — Obsidian Vault as second SSOT via Khoj (M → S effort, PIVOT 2026-05-09)

**PIVOT (2026-05-09 web research)**: Khoj has native Obsidian plugin + Obsidian sync. Sprint 5.0 adopts Khoj as the knowledge layer; Sprint 5.2 becomes "configure Khoj to bridge Obsidian ↔ cortex/recommendations.md ↔ Steward harvester." Effort dropped from M to S — most of the integration work is Khoj configuration, not custom code.

**Why**: the operator's life knowledge isn't in `cortex/recommendations.md` — it's in Obsidian (notes, meetings, ideas). Khoj indexes Obsidian content; Steward's recommendation_harvest detector reads Khoj's curated topic pages as additional signal alongside gh PR/issue/CI signals.

**Scope**:
- Configure Khoj's Obsidian plugin for the operator's vault (read-only access by default).
- Steward's `detectors/recommendation-harvest.cjs` extends to read Khoj's "actionable" topic pages alongside gh signals (Khoj exposes a local API).
- Two-way: Steward's merged PRs become "shipped this week" entries that Khoj surfaces back into Obsidian daily-note rollup.
- Privacy: Khoj indexes locally; Obsidian content never leaves the home server (Khoj uses Ollama by default for ingestion).

**Stolen from**: Khoj's Obsidian integration. We're not building, we're configuring + writing one detector adapter.

---

### Sprint 5.3 — Multi-source life ingest (L effort)

**Why**: voice memos + email + Slack + calendar + health data → all flow into cortex-x as recommendation signals. The diagram's "Data Sources" arrows.

**Scope**: webhook listeners for each source, LLM filter (actionable vs noise), routing into `cortex/recommendations.md` or domain-specific markdown.

**Privacy critical**: all sensitive data routes through local LLM only. No leak to OpenRouter for personal/health domains.

---

### Sprint 5.4 — "Live entity" UX (XL effort, vision)

**Why**: cortex-x as something the operator can talk to, not just CLI invocation. Voice interface, ambient memory, conversational recall.

**Scope**: Telegram + Whisper + local Steward inference. "Hej cortex, co jsme řešili minulý týden o a Next.js SaaS project?" → Steward recall + response in operator's voice/style (post Sprint 4.4 LoRA).

**Deferred until**: Tier 1+2+3 fully shipped, Sprint 5.0+5.1+5.2+5.3 stable. This is the moonshot of moonshots.

---

## 6. What we are NOT doing (explicit non-goals)

| Direction | Why not |
|---|---|
| Multi-platform messaging gateway (NousResearch pattern) | Sprint 2.6 narrows to **Discord-only**. No SMS/Slack/Email/Telegram parallel surface unless Discord proves painful in 90+ days of use. |
| Real-time visual workspace (agent-zero Universal Canvas) | Steward is headless cron, no human in the loop during execution. Demo value, zero operational value for our usecase. |
| Full Linux container in Docker (agent-zero) | GitHub Actions ephemeral runners are already our Linux. Adding Docker = ops complexity for no capability gain. |
| Browser-specific abstractions (browser-harness CDP) | cortex-x is code-first, not UI-first. Tier 3 Sprint 4.6 covers UI verification narrowly via Playwright-MCP — that's enough. |
| Auto-merge Steward PRs | MUST-H6 hardcoded forever. Humans always merge. |
| Self-modification of `bin/steward/` core | EDIT_DENYLISTED catches this. Self-extending capabilities (Sprint 3.1) live in `cortex/agent-workspace/skill-experiments/`, not in `bin/steward/_lib/`. Brain ≠ scratch pad. |
| **"City of agents" metaphor** | Considered 2026-05-08; **rejected**. Empirical evidence (25k-task experiment, [Multi-Agent Trap](https://towardsdatascience.com/the-multi-agent-trap/)) shows hierarchical society metaphors *amplify errors up to 17.2×* once the underlying model is strong enough to use freedom. Supervisor / review-pipeline framing is tighter for cortex-x's shape. |
| **Per-agent personal memory + cross-agent random exchange** | R1+R4 research dispatch 2026-05-08 converged: at ≤6 specialist agents the fragmentation tax > benefit. Agents overlap heavily in reasoning; shared `lessons.jsonl` with `agent_id` tag wins. Re-evaluate at ≥12 specialist agents (post-Sprint 3.1 self-extension territory). |
| **Random / async memory broadcast between agents** | [GitHub multi-agent-failures blog](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/): async broadcast is *the* failure mode. Use typed schemas at handoff boundaries (cortex-x review pipeline already does this), not pubsub. |
| **OpenSwarm by VRSEN as inspiration** | Inspected 2026-05-08: hub-and-spoke around Agency Swarm, no inter-agent peer messaging or shared memory. cortex-x's review pipeline is architecturally tighter. Borrowing would be a downgrade. |
| **NAS / VPS / "AI second brain" rebrand of cortex-x** | The metaphor lands for Tier 4 vision, but premature for Tier 0–2 surface positioning. Keep "developer OS for the AI era" framing until Sprint 5.0 self-hosted entity actually ships. |
| **Letta / Mem0 / MemGPT runtime adoption** | All require Docker + Postgres + (often) Neo4j + (often) Qdrant. Violates cortex-x's zero-runtime-dep CJS posture. Architectural inspiration only — concrete primitives via Anthropic Memory Tool (Sprint 2.8). |
| **Vector DB / pgvector / Weaviate at current scale** | <100 memory files; BM25 / grep + tag filter is sufficient. Trigger for `sqlite-vec` adoption: MEMORY.md index reaches ~100 files OR grep returns >10 candidates for typical queries. Until then = premature optimization. |
| **Knowledge graph DB (kuzu / neo4j-embedded)** | Kuzu archived 2025-10-10. Embedded KG ecosystem isn't mature. Tier 4 (Sprint 5.x Obsidian SSOT + life ingest) re-evaluates. |
| **Second Anthropic Max subscription "for cortex"** | Single Max x20 (~900 messages / 5h) has trivial headroom for current Steward cadence (~1 LLM call/night). Buying second sub is premature spend; April 2026 OpenClaw crackdown puts "agent-as-second-beneficiary" in grey zone. Re-evaluate only if Sprint 2.1 autoresearch fan-out × multiple worktrees genuinely starves the cap. |
| **Local LLM hardware purchase before Sprint 2.4 + 2.7 ship** | Sprint 2.4 (`claude-cli` engine via Max sub) reduces marginal Anthropic spend to $0 for most action_kinds. Hardware decision waits until 60-day data shows residual OpenRouter spend > 800 CZK/month. Otherwise the 30k CZK box solves a non-problem. |
| **Random / "weekly meeting" agent reflection cron** | "Sleep-time compute" / agent dreaming is currently hype-leaning per R4 research. Validated wins (5x compute reduction, Letta paper) only on pre-computing predictable queries. Steward's existing nightly cron + Sprint 2.8 ReasoningBank distillation already does the pragmatic version. |

## 7. Per-sprint workflow (the ritual)

For every sprint above, the path from "planned" → "shipped on main" follows this ritual:

```
1. Pick sprint from roadmap (operator-initiated or harvester-suggested).
2. Dispatch focused web-research agent (R1) for SOTA-as-of-today.
3. Save research output to docs/research/<sprint>-<topic>-<date>.md (R1 evidence).
4. Operator + Claude-Code review research, decide go/no-go.
5. If go: Claude implements scope per spec.
6. Tests written WITH each module (no shipped code without test gate).
7. Full suite green locally.
8. Commit to feature branch.
9. Run 6-agent review pipeline (R2): acceptance + blind + correctness + security + ssot + edge-case.
10. All blocker findings closed.
11. Squash-merge to main with sprint commit message + MIGRATIONS.md entry.
12. Auto-memory entry capturing strategic state shift.
13. Roadmap updated: sprint marked ✅ shipped, downstream sprints unblocked.
```

This ritual is the **single most important rule of this roadmap**. Skipping any step turns the roadmap from "trustworthy plan" into "wish-list."

## 7b. 90-day implementation plan — hardware-independent first, then awaken

**Constraint check (2026-05-09):** operator is saving toward $500-1500 home server hardware (UGREEN NAS / Beelink SER9 / Mac Mini M4). Hardware likely arrives ~week 8-12. Until then, all software work happens on existing GHA cron infrastructure + operator's current dev machine.

**Fortunate reality**: of the 26 sprints in this roadmap (after 2026-05-08 expansion: 2.0.1 + 2.4-2.8), **22 are hardware-independent** and ship fine on GHA + local dev machine. Only Sprint 5.0 (self-hosted always-on Steward) and Sprint 5.4 (live-entity voice UX) genuinely need the home box. Everything else can be developed and validated in current infra.

This means: **no waiting period**. Velocity continues 6-12 weeks before "awakening" the entity on home hardware. Hardware purchase decision deferred to **post-Sprint 2.7** — by then we'll have 60+ days of `claude-cli`-via-Max-sub data to know whether residual OpenRouter spend justifies the 30k CZK box.

### Week-by-week sequencing (recommended, post-2026-05-08 update)

| Week | Sprint | Hardware needed? | Why this order |
|---|---|---|---|
| 1 | **1.9 — Spec-driven verification** ⭐ ✅ | No | Shipped 2026-05-09. Unblocked 2.1 + 2.2 + 3.0 (richer fitness signal). |
| 1 | 1.9.1 — Multi-window cost safety + loop detector ✅ | No | Shipped 2026-05-09. Pre-2.x pojistka. |
| 1 | 2.0 — Phoenix observability ✅ | No | Shipped 2026-05-08. |
| 1 | 2.0.1 — OTLP protobuf encoder ✅ | No | Shipped 2026-05-08. Manual-dogfood-driven fix. |
| 1 | 2.0b — Action-kind model routing ✅ | No | Shipped 2026-05-08. |
| 1 | 2.1 — Autoresearch overnight burst ✅ | No | Shipped 2026-05-08. |
| 1 | 4.7 — Steward rebrand ✅ | No | Shipped 2026-05-08. NousResearch hermes-agent collision. |
| **2-3** | 2.2 — Worktree supervisor + judge ensemble | No (GHA worktrees natively) | Multi-agent MVP. Each worker verifies against spec from 1.9. |
| **3** | 2.3 — Mutation testing as fitness signal | No (Stryker on GHA) | Closes verification gap further. After 2.2 because workers benefit too. |
| **4** | **2.4 — `claude-cli` engine via Max sub** ⭐ COST PIVOT | No | Shifts most LLM cost to $0. Decisive input for hardware decision. Should land *before* 2.7 so pattern_transfer is free. |
| **4-5** | 2.5 — `tech_debt_audit` action_kind | No | Pure deterministic, low risk, compounds with autoresearch. |
| **5** | 2.6 — Discord remote control | No | Mobile UX for halt/status/recommendations. Operator confirmed Discord 2026-05-08. |
| **6** | 2.7 — Cross-project `pattern_transfer` | No | Allowlisted sibling-project read access. Free under 2.4 Max sub. |
| **6-7** | 2.8 — Memory Foundation (Memory Tool + ReasoningBank failures + decay) | No | **Memory gate before Tier 2.** +29-39% Anthropic native + +34% failure-distillation + +10% decay. |
| **7** | **HARDWARE DECISION POINT** (60-day data on residual OpenRouter spend) | — | If spend > 800 CZK/mo → buy 3090 box; else defer to GLM-4.7-Air-class fitting 24GB (Q3-Q4 2026). |
| **8** | **5.1 — "Soul" abstraction** (early Tier 4 prep) | No | Multi-agent Steward (post-2.2) needs distinct identities. Souls.md cheap + impactful + ready for hardware moment. |
| **9-10** | 3.0 — AlphaEvolve prompt evolution | No | The compound moonshot. Needs 1.9 spec criteria + 2.1 autoresearch budget + 2.8 memory + 5.1 souls. |
| **11** | 3.1 — Self-extending capabilities (`skill-experiments/`) | No | Browser-harness pattern. Steward writes own micro-helpers. |
| **12** | **HARDWARE LIKELY ARRIVES + retro week** | — | Decompress. Order Beelink/NAS. Retro on weeks 1-11. |
| **13-14** | **5.0 — Awaken the entity** | YES (NAS / Beelink) | Migrate cortex-x from GHA-only to home-server always-on. Steward daemon, not cron. |

### Logical sequencing rationale

- **1.9 first because** it produces the richer fitness signal that 2.1, 2.2, 3.0 all depend on. Without spec criteria, "did this run improve anything?" is just `npm test boolean`.
- **2.0 + 2.0b parallel because** they're both small (S), independent, and feed observability into every later sprint.
- **2.1 before 2.2 because** Karpathy autoresearch (multi-strategy serial within one run) is the conceptual prerequisite for worktree parallel — supervisor needs to know how multi-strategy works in single context first.
- **5.1 (souls.md) deliberately moved up to week 8** because by then Steward has ≥4 distinct agents (supervisor, worker, judge, harvester), each needs identity. Cheap to implement (markdown + a load step in action-engine) and lets us "have it ready" for hardware activation.
- **2.4 (claude-cli engine) intentionally before 2.5/2.6/2.7** because it's the cost-economy pivot. Once `claude -p` Max-sub billing is validated with $0 marginal cost guard, all subsequent LLM-touching sprints (2.7 pattern_transfer, 3.0 AlphaEvolve) ride free. Anything before 2.4 keeps paying OpenRouter; anything after rides Max sub.
- **2.8 (memory foundation) before 3.0 (AlphaEvolve)** because evolving prompts against rotting memory = noise. Decay + failure-distillation + native memory-tool make the substrate stable enough for evolutionary signal to be meaningful.
- **3.0 (prompt evolution) before 3.1 (self-extending capabilities)** because evolution refines what we have; self-extension creates new things — refining first makes generation more reliable.
- **3.2 (FTS5 + federated lessons) and 3.3 (GraphRAG) deferred to weeks 13-16** because they're high-effort and only become critical when (a) cross-project deployments happen and (b) codebase context is the bottleneck. Today neither is true.

### What awakening looks like (week 13+)

Once home hardware arrives, Sprint 5.0 is a **migration sprint**, not a build sprint:
1. Install Beelink/NAS, set up Linux environment.
2. Install Ollama + pick local model (Qwen 3 32B as default starting point).
3. Package cortex-x as `systemd` service (Linux) or `launchd` agent (Mac).
4. Migrate `~/.cortex/` data dir to NAS, sync from operator's dev machines.
5. Switch one project (cortex-x dogfood first, then a Next.js SaaS project) from GHA-cron to home-daemon.
6. **Hybrid routing**: sensitive paths → local Ollama. Premium paths → OpenRouter. Configured per action_kind in `cortex/souls/<agent>.md`.
7. Verify: 1 week of home-daemon Steward runs, no regressions vs GHA-cron equivalent week.

After that single sprint, the entity is "alive" — and every Tier 2/3 sprint already shipped becomes immediately more powerful because it now lives on always-on infra.

### What NOT to do during weeks 1-12

- **Don't** start Sprint 5.0+ before hardware. Pre-staging Linux config in a VM works for dry-runs but isn't real validation.
- **Don't** skip the R1 research dispatch on each sprint just because the roadmap "already covers it." The 2026-05 cached research expires; SOTA shifts in weeks.
- **Don't** ship more than 1-2 sprints in parallel. Each sprint has its own review pipeline (R2). Concurrent review pipelines = cognitive overload + missed findings.
- **Don't** add new sprints to the roadmap mid-tier without operator explicit approval. The roadmap is SSOT; conversations propose, roadmap commits.



- **Week 4** (after Sprint 1.9 + 2.0 + 2.0b): observability dashboards live, spec-driven verification operational. Question: is the verification gap measurably closed?
- **Week 8** (after Sprint 2.1 + 2.2 + 2.3): multi-agent overnight burst running. Question: are we shipping ≥3 PRs/night reliably?
- **Week 12** (after Sprint 3.0 + 3.1 + 3.2 + 3.3): self-evolution operational. Question: are agent-authored prompts/skills measurably better than hand-tuned?
- **Week 20** (after Tier 3): client revenue + capability marketplace live. Question: is this distributable beyond the operator?

Miss a milestone? **Pause new sprints, do a retro, fix the ritual** before continuing.

## 9. References

- 2026-05-08 SOTA brainstorm research dispatch (in conversation context, archive recommended)
- 2026-05-08 4-source inspection research dispatch (in conversation context)
- **2026-05-08 5-agent research dispatch** (Tier 1 expansion driver, in conversation context — should land in docs/research/ as a synthesis memo when Sprint 2.4 R1 work begins). Five parallel topics: (a) multi-agent memory + city metaphor + OpenSwarm, (b) local LLM hardware + Qwen3-Coder for 24GB VRAM, (c) Anthropic Max sub via `claude -p`, (d) infinite memory + compact windows, (e) Discord/email + tech-debt + cross-project + multi-session.
- VentureBeat Karpathy autoresearch (March 9, 2026): https://venturebeat.com/programming-development/andrej-karpathys-new-open-source-autoresearch
- GitHub Spec Kit: https://github.com/github/spec-kit
- AWS Kiro: https://kiro.dev/docs/specs/
- EvalAgent paper: https://arxiv.org/html/2510.24358v1
- Composio Agent Orchestrator: https://github.com/ComposioHQ/agent-orchestrator
- AlphaEvolve paper: https://arxiv.org/abs/2506.13131
- OpenEvolve: https://github.com/algorithmicsuperintelligence/openevolve
- ReasoningBank: https://research.google/blog/reasoningbank-enabling-agents-to-learn-from-experience/ + paper https://arxiv.org/abs/2509.25140
- A-MEM (NeurIPS 2025): https://arxiv.org/abs/2502.12110
- Anthropic Memory Tool docs (Sept 2025): https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- Anthropic context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Anthropic context-editing tool docs: https://platform.claude.com/docs/en/build-with-claude/context-editing
- Claude Code headless docs: https://code.claude.com/docs/en/headless
- Claude Code routines docs: https://code.claude.com/docs/en/routines
- Claude Agent SDK ≠ Max billing (issue #559): https://github.com/anthropics/claude-agent-sdk-python/issues/559
- claudefa.st safe-use guide: https://claudefa.st/blog/guide/development/claude-code-subscription
- claude-ollama-dual smart-orchestrator: https://github.com/krishnenduk95/claude-ollama-dual
- OpenClaw ban (VentureBeat April 2026): https://venturebeat.com/technology/anthropic-cuts-off-the-ability-to-use-claude-subscriptions-with-openclaw-and
- Multi-Agent Trap (Towards Data Science): https://towardsdatascience.com/the-multi-agent-trap/
- GitHub blog: multi-agent workflows often fail: https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/
- HF Qwen3-Coder-30B-A3B model card: https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct
- Red Hat: vLLM vs llama.cpp: https://developers.redhat.com/articles/2025/09/30/vllm-or-llamacpp-choosing-right-llm-inference-engine-your-use-case
- LocalAIMaster SWE-bench leaderboard: https://localaimaster.com/models/swe-bench-explained-ai-benchmarks
- qlty CLI: https://github.com/qltysh/qlty
- discord.js v14 docs: https://discord.js.org/
- repowise multi-repo MCP: https://github.com/repowise-dev/repowise
- Node.js permission model: https://nodejs.org/api/permissions.html
- CVE-2025-55130 Node fs symlink bypass: https://research.jfrog.com/vulnerabilities/nodejs-fs-permissions-bypass-cve-2025-55130/
- Claude Code worktrees v2.1.50: https://code.claude.com/docs/en/worktrees
- Mem0 State of AI Agent Memory 2026: https://mem0.ai/blog/state-of-ai-agent-memory-2026
- sqlite-vec: https://github.com/asg017/sqlite-vec
- Kuzu archived (cautionary tale): https://ai.plainenglish.io/the-disappearance-of-kuzu-a-cautionary-tale-for-ai-and-knowledge-graph-development-5daffcaebcd8
- NousResearch/hermes-agent: https://github.com/nousresearch/hermes-agent
- agent0ai/agent-zero: https://github.com/agent0ai/agent-zero
- browser-use/browser-harness: https://github.com/browser-use/browser-harness

---

**This document is a living artifact. Update it on every sprint transition. Older versions live in git history.**
