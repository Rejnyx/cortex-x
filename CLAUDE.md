# cortex-x — Persistent agent, not just a tool

> **AI-agentic-first** personal Claude Code framework by Rejnyx. Today: bootstraps new projects with agentic-ready architecture + senior-level orchestration + safety + standards in under 3 minutes, plus an autonomous maintenance agent (**Steward**, codenamed Hermes through Sprint 1.9.1) that runs nightly. Future: persistent autonomous entity living on operator's home infrastructure, curating knowledge + code + life across years. **See [docs/steward-roadmap.md](./docs/steward-roadmap.md) for the four-tier trajectory.**

## Core trajectory

cortex-x is moving in 4 tiers from "excellent dev tool" to "operator's second brain in markdown form":

| Tier | Status | Theme |
|---|---|---|
| 0 — Foundation | ✅ shipped (v0.8 + Sprint 1.8.13 + 1.9.0 + 2.18) | Scaffold + 16-kind capability palette + safety mechanics + 7-kind spec-driven verification (incl. Sprint 2.18 read_set + Sprint 2.3.1 mutation_score) |
| 1 — Verification + multi-agent | ✅ Sprint 1.9 + 2.0 + 2.0b + 2.1 + 2.2.5 v0/v1 + 2.3a + 2.5b + 2.6b + 2.11 + 2.18 shipped (2026-05-08 → 2026-05-12) · ⏳ 2.3b runner+Stryker (operator OK pending) | Spec-driven verification (✅), Phoenix OTLP observability (✅), autoresearch overnight burst (✅), `edit_ops[]` primitive (✅), mutation-testing fitness foundation (✅), `senior_tester_review` 12th capability (✅, ⭐ DIFFERENTIATOR), `workflow_hardener` 13th + `secret_history_sweep` 14th capabilities (✅ devops hygiene), `read_set` 6th criterion kind (✅ read-coverage proof — Sprint 2.18), runner+Stryker integration (deferred) |
| 2 — Compound learners | ⏳ Sprint 3.0–3.3 | AlphaEvolve prompt evolution, self-extending capabilities, FTS5 skills, GraphRAG |
| 3 — Productization | ⏳ Sprint 4.0–4.7 | Capability marketplace, WaaS for clients, voice → recommendation, identity LoRA |
| 4 — Persistent entity | 🔮 Sprint 5.0+ | Self-hosted home server, soul abstraction, Obsidian SSOT, multi-source life ingest |

Operating principles (R1–R6) are non-negotiable per sprint: research-before-implement, review pipeline mandatory, one incident class = one defense layer + one regression test, cost ceiling preserved, human-only paths inviolate, backward-compatible by default. See [`docs/steward-roadmap.md`](./docs/steward-roadmap.md) §1.

## Core positioning (2026)

**Agentic-ready by default.** Every new SaaS/tool/platform gets safe-tool wrapper, three-layer memory scaffold, `/api/chat` reserved, cost guards ready — even if MVP has no AI.

**Agentic-heavy by intent.** Use `ai-agent` or `chatbot-platform` profiles for projects where AI IS the product.

**Opt-out explicitly.** Static blog, portfolio, landing page → `astro-static` or `minimal` profiles. Don't force AI where it's not needed.

See [standards/ai-patterns.md](./standards/ai-patterns.md) for the 10 agentic patterns every project should respect, and [standards/ai-sdks.md](./standards/ai-sdks.md) for the decision tree across Vercel AI SDK, Claude Agent SDK, and OpenAI Agents SDK (every profile declares `ai_sdk:` explicitly).

## Core Mental Model (SSOT)

cortex-x holds **institutional wisdom that doesn't change** (Lessons Learned, Key Decisions, Cross-Project Dependencies, Glossary, Identity).

Project `CLAUDE.md` holds **current state that does change** (Tech Stack, Architecture, Commands, Env Vars, Stats, Directory Structure).

**Zero overlap.** If info rots in weeks, it's CLAUDE.md's job. Cortex stays valid for years.

See [prompts/cortex-load.md](./prompts/cortex-load.md) for the authoritative mental model.

## Status

**v0.3-pre, public-ready** (Apache 2.0 relicense 2026-05-12). Tier 0 (Foundation) ✅ shipped. Tier 1 (Verification + multi-agent) ✅ shipped (Sprint 1.9 + 2.0–2.1 + 2.2.5 + 2.3a + 2.5b + 2.6b + 2.11 + 2.18 + 2.2 foundation + 2.3 mutation baseline all landed). **2026-05-14 autonomous session shipped 11 sprints + 4 R2 hardening rounds**: 2.29 (MCP recs) · 2.26 (template + steward-vs-routines + ecosystem card) · 2.20 (status flip) · 2.24 (/cortex-goal wrapper) · 2.8.2 (status flip) · 2.8.3 (agent-first audit snapshot) · 2.22 + 2.22.1 (cortex-skill-validate CLI + 7-HIGH R2) · 2.25 + 2.25.1 (cortex-dream + cortex-insights + 7-HIGH R2) · 2.3 (Stryker measure-only baseline + standards/mutation-testing.md + GHA workflow) · 2.2 + 2.2.1 (worktree-supervisor foundation: topology.cjs + standards/multi-agent-supervisor.md + recommendation_harvest_parallel action_kind + 7-HIGH R2; spawner deferred to Sprint 2.2.1) · 3.X verified-deferral (3 of 4 blockers active including NEW OpenRouter beta-header). **Sprint 2.28 → 2.28.3 chain shipped 2026-05-14** — safety-floor permissions: cortex-permissions-register CLI + install opt-in + cortex-doctor checks + 17 ship-blockers closed across 3 R2 rounds + SSOT helpers. **Recent (2026-05-30 → 06-03) shipped 2.44 (dynamic Workflows) · 2.45 (/cortex-sprint skill + cortex-doc-regen living docs), then Arc 1: 2.46 + 2.46.1 (signed r2-verdict.json pre-commit gate, HMAC-SHA256/Ed25519 + commit_sha binding + nonce journal) · 2.46.2 (cortex-doc-currency stale-prose lint) · 2.3.1 (mutation_score 7th criterion kind + ratchet).** **3435 tests, 0 failing, 2 pre-existing skips.** 21 action_kinds in Steward registry. 7 acceptance-criterion kinds in spec-verifier (mutation_score kind shipped Sprint 2.3.1). 20 user-facing CLI shims in `~/.claude/shared/bin/`. 15 user-discoverable slash skills (added cortex-sprint · cortex-goal). Tier 2 essentially closed; Sprint 2.2.1 (multi-agent spawner) + 3.X (Anthropic Memory Tool unblock) are next.

## Tech Stack

- **Framework:** Node.js / TypeScript (future CLI)
- **Distribution:** Git repo + install.sh / install.ps1
- **Templates:** Handlebars (.hbs)
- **Profiles:** YAML
- **Target platform:** Claude Code 2.x

## Repo Structure

```
cortex-x/
├── bin/              CLI entrypoint (Phase 2)
├── profiles/         Project-type profiles (nextjs-saas, minimal, ...)
├── templates/        Handlebars templates (CLAUDE.md, PROGRESS.md, ...)
├── standards/        Principle docs (SSOT, Modular, Scalable, Security)
├── shared/
│   ├── hooks/        Universal safety + context hooks
│   ├── skills/       Reusable skills (Phase 2)
│   └── agents/       Reusable subagents (Phase 3)
├── detectors/        Auto-detect project type from package.json (Phase 2)
├── research/         Cached 2026 best-practices per profile (Phase 4)
├── docs/             Design docs, RFCs
└── install.sh/.ps1   One-command install to ~/.claude/shared/
```

## Principles — tiered rule system

cortex-x doesn't flatten all standards into one list. It uses a **tier hierarchy** (see [standards/RULE-1.md](./standards/RULE-1.md)):

### Rule 0 — Distribution gate
**[Ship-Ready](./standards/ship-ready.md)** — no personal data in generic code, clear licensing, stranger-reproducible install. Precedes everything else.

### Rule 1 — Inviolable architectural invariants
The **3 pillars** every scaffolded project respects from day 1:

1. **SSOT** — [standards/ssot.md](./standards/ssot.md) — one authoritative source per knowledge piece
2. **Modular** — [standards/modular.md](./standards/modular.md) — clean interfaces, swappable subsystems
3. **Scalable** — [standards/scalable.md](./standards/scalable.md) — 10x-safe patterns from day 1

**Rule 1 violations = automatic PR block.** Enforced by `ssot-enforcer` + `blind-hunter` agents.

### Rule 1.5 — Coding behavior contract
**[Coding Behavior](./standards/coding-behavior.md)** — Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution.

### Rule 2 — Critical (must-have)
**Security + Testing + Observability + Correctness**. Review pipeline flag = blocker.

1. **[Security](./standards/security.md)** — 8-layer defense + § Agentic Security 2026 (lethal trifecta, 7 MUST patterns for LLM/agent)
2. **[Testing](./standards/testing.md)** — layered pyramid, 5 pillars per test, AI-specific tests
3. **[Observability](./standards/observability.md)** — logs/metrics/traces + Runtime SLOs (burn-rate) + circuit breakers + LLM obs stack
4. **[Correctness](./standards/correctness.md)** — Zod at boundaries, property-based tests, eval-driven dev, mutation testing, stateful simulation

### Rule 3 — Process (should-have)
Accessibility, Performance, Error handling, Git workflow, Docs, [AI patterns](./standards/ai-patterns.md), [Skills](./standards/skills.md), [Voice](./standards/voice.md) (cross-skill identity + citation discipline + 5 failure-mode templates), [Web research](./standards/web-research.md). Review pipeline flag = warning.

**Mental model:** Rule 1 guarantees structure. Rule 2 guarantees the code works correctly, securely, observably. Rule 3 is polish. Rule 0 is "can you distribute it at all." Don't flatten — the tier priority matters when budgets are constrained.

**Voice charter applies session-wide.** When working in cortex-x, follow [`standards/voice.md`](./standards/voice.md): no greetings, no emoji, no emotion words, `[cortex/recall]` + `[^cN]` footnote citations when recalling past decisions from memory/journal/insights. See `standards/voice.md` § Failure-mode disclosure templates for the 5 canonical phrasings.

## Development Workflow

1. Edit files in cortex-x repo
2. Run `npm test` to confirm nothing regressed (~16 sec, unit + contract + integration)
3. Run `./install.ps1` (Windows) or `./install.sh` (Unix) to sync to `~/.claude/shared/`
4. Changes propagate to all projects using cortex-x hooks/skills/agents

## Testing

cortex-x has its own QA infrastructure landed in 4 commits (Tier 0-3, 2026-05-07). See [tests/README.md](./tests/README.md) for the full layout + 8-tier roadmap, and [CONTRIBUTING.md](./CONTRIBUTING.md) § Code contributors for the pre-PR gate.

```bash
npm test                  # full suite — unit + contract + integration, ~16 sec
npm run test:fast         # unit + contract only, dot reporter, ~5 sec
npm run test:smoke        # post-install verification (also called from install.{sh,ps1})
npm run test:detectors    # 11 profile fixtures + 3 stage fixtures + schema invariants
npm run test:audit        # tools/verify-audit-output.cjs against 5 audit fixtures
npm run test:coverage     # c8 → coverage/ HTML + lcov
```

CI lanes (every PR + push to main):

- **`.github/workflows/test.yml`** — Linux fast lane (full suite + coverage)
- **`.github/workflows/install-smoke.yml`** — 5-lane matrix: ubuntu-bash, macos-bash, windows-gitbash, windows-pwsh7, windows-ps5.1
- **`.github/workflows/no-pii.yml`** — PII scanner (pre-existing)

The 8-tier QA architecture (Tier 4 hook contract + Tier 5 prompt regression are HARD gates before Steward runtime; Tier 6-8 gate public launch) is documented in [tests/README.md](./tests/README.md) § Tier mapping.

## Roadmap

**Phase 1 — Foundation** ✅ shipped (foundation + Tier 0-8 QA infrastructure: started at 207 tests 2026-05-07, now 3435 tests, 5-lane CI matrix, hook contract + prompt regression as hard gates) + **QA Retrofit lens shipped 2026-05-09 Sprint 2.10** (`prompts/qa-retrofit.md` + `profiles/qa-engineer.yaml` + `shared/skills/test-audit/SKILL.md` + 2 hbs templates with 3-hop citation traceability; ISO 25010:2023 + OWASP ASVS 5.0 + Bach HTSM + tsDetect FSE'20 grounded; AI-augmented-tester positioning, not replacement)
- Shared hooks (block-destructive, session-start [+ detector integration 2026-04-20], pre-compact, auto-orchestrate, post-tool-use, **tirith-scan** — context-file injection scanner wrapper, optional MIT Rust binary)
- Templates (CLAUDE.md, PROGRESS.md, MEMORY.md, settings.json, README.md, **SKILL.md** — agentskills.io spec scaffold)
- Rule 1 standards (SSOT, Modular, Scalable) + Rule 1.5 (Coding Behavior + **Auto-Optimization** wizard philosophy) + Rule 2 Critical (Security, Testing, Observability, **Correctness**, **Self-Correction**) — all added or extended 2026-04-20
- Rule 2 Security extensions: § Agentic Security (lethal trifecta, 7 MUST patterns) + § **Browser Automation Security** (3 browser-specific MUSTs) — added 2026-04-20
- Rule 2 Observability extension: § Runtime SLOs + circuit breakers + LLM obs — added 2026-04-20
- Rule 3 **Skills** standard — agentskills.io SKILL.md open spec (portable Claude Code ↔ Steward ↔ Codex ↔ Cursor) — added 2026-04-20
- **`detectors/`** (NEW 2026-04-20) — deterministic profile + stage classifiers, <100ms, fail-open, feed session-start hook + cortex-doctor drift flow
- **ai-patterns safe-tool v2** — adds loop detector + circuit breaker + per-tool retry budget (OWASP LLM10 defense) — 2026-04-20
- Profiles: nextjs-saas + minimal fallback + `ai-agent` (7 MUST agentic-security + skills + tirith hook) + **`browser-agent`** (extends ai-agent with 3 browser MUSTs)

**Phase 2 — Bootstrap skill**
- `/init-project` skill with Clack-based CLI
- Auto-detection via `detectors/`
- Profile resolution + template rendering
- `doctor` healthcheck command

**Phase 3 — Multi-agent**
- Shared reviewer agents (code, security, architecture, design, test, db)
- Orchestrator agent (coordinates pipeline)
- Agent Teams integration

**Phase 4 — Web research during init**
- `--research` flag uses WebSearch+WebFetch
- Cached per-profile, versioned
- Inject 2026 best practices into scaffolded CLAUDE.md

**Phase 5 — Self-improvement loop** ✅ designed + specs (v1 — 2026-04-17) · ⏳ automated runtime in Phase 7
- 4-cadence (daily/weekly/monthly/quarterly) via `prompts/cortex-evolve.md` — **specified, not yet cron-wired**
- Hard evidence gates via `config/evolve.yaml` — enforced when prompt is manually invoked
- Aider-style eval suite in `evals/` — 10 task rubrics shipped, `evals/results/` empty pending first automated run
- PR-only mutations, never auto-edits source of truth — discipline encoded, no automated PR pipeline yet
- See `docs/self-improvement-rfc.md`

**Phase 6 — Memory upgrades** ⏳ designed (awaits Phase 7)
- 6-signal scoring for autoDream promotion
- Graph expansion (2-hop) over memories
- `DREAMS.md` human-readable consolidation output
- **Operator-edited memory consolidation slice** — Sprint 2.25 planned (the 4-op consolidator: merge duplicates / remove contradicted / relative→absolute dates / aggressive 200-line prune targeting `MEMORY.md` + `~/.cortex/projects/<slug>.md`; existing `wiki_consolidate` only handles machine-written `lessons.jsonl`)

**Phase 7 — Steward runtime (originally codenamed Hermes)** ✅ v0.5b shipped (2026-05-07) · ⏳ v1 cron triggers pending
- ✅ All 5 pre-launch RFC gates closed
- ✅ 6 zero-dep CJS primitives in `bin/steward/_lib/` — halt-check, lock, journal, recommendations parser, git-trailer builder, policy denylist
- ✅ `bin/steward/dry-run.cjs` orchestrator — wires every primitive end-to-end with structured plan output (branch name, commit message with trailers, journal entry)
- ✅ `bin/steward/status.cjs` observability CLI — halt + lock + recommendations + journal rollup with per-action cost ledger
- ✅ **`bin/steward/execute.cjs` (v0.5a Sprint 1.6.11)** — async runtime taking dry-run plan to atomic commit, with verifier gate + rollback + per-phase journaling + lock mutex
- ✅ **OpenRouter engine (v0.5b Sprint 1.6.13)** — real LLM via built-in `fetch()` (Node ≥18), zero-deps preserved. 8 distinct error codes, configurable timeout via AbortController, JSON-mode `response_format`, default model `deepseek/deepseek-v4-flash` (~$0.0008/run). Pluggable engine seam: `mock` / `openrouter` / `claude-sdk` (stub kept reachable via explicit flag).
- ✅ **First real OpenRouter call validated end-to-end (Sprint 1.6.13 dogfood)** — LLM → JSON → edits → npm test gate → atomic rollback on failure → journal cost capture. Safety mechanika ověřena reálným testem.
- ✅ **Sprint 1.6.14–1.6.17 hardening from real-world signal**: `STEWARD_MAX_TOKENS` env (4096 default truncated multi-file plans), cost capture on all failure paths (`addCostFields` SSOT helper), JSON-fence stripping for Anthropic-via-OpenRouter quirk (`stripJsonFences`), cost forwarding pre-parse via `extractUsage`.
- ✅ **Sprint 1.6.18 review-pipeline-driven hardening** — 6-agent parallel review (acceptance + blind + correctness + security + ssot + edge-case) on the v0.5b stack surfaced 8 fixes shipped same-day: tightened path-traversal (NUL byte + flag-injection + realpath containment), editPlan shape gate (`OPENROUTER_PLAN_SHAPE_INVALID`), `data === null` guard, default model SSOT alignment, CLI help text corrections, MIGRATIONS.md backfill.
- ✅ **Sprint 1.6.19 v0.5b finalization shipped** — `gh pr create --draft` integration in execute.cjs (push + PR open Phase 11), `STEWARD_DAILY_USD_CAP` + consecutive-failure circuit breaker (`STEWARD_FAILURE_BREAKER`).
- ✅ **Sprint 1.9.0 spec-driven verification shipped 2026-05-09** — generalizes Sprint 1.8.13 hardcoded `EDIT_DESTRUCTIVE_REWRITE` into per-kind `acceptance_criteria[]` (5 criterion kinds: shell / file_predicate / regex / ears_text / llm_judge), new `bin/steward/_lib/spec-verifier.cjs` runner gates between `applyAction` and `runNpmTest`. 8 new error codes (SPEC_VIOLATION through SPEC_LLM_JUDGE_NOT_IMPLEMENTED). Inline shrink check removed from action-engine.cjs (single source of truth = registry criterion). 871 tests, all 3 CI lanes green. R1 memo: `docs/research/sprint-1.9-spec-driven-verification-2026-05-09.md`.
- ✅ **Sprint 1.9.1 multi-window cost safety + loop detector shipped 2026-05-09** — `bin/steward/_lib/cost-safety.cjs` adds `STEWARD_WEEKLY_USD_CAP` ($25 default), `STEWARD_MONTHLY_USD_CAP` ($80), `STEWARD_TOKEN_VELOCITY_CAP` (50K/5min), cross-session loop detector (5x same criterion id in 7 days → write `STEWARD_HALT`), `cortex-steward status --forecast` flag. 4 new error codes. Operator-suggested gap analysis after 2026-05-09 audit ("daily $5 × 30 = $150/month would have passed without alarm"). Pre-2.x pojistka before Sprint 2.1 autoresearch.
- ✅ **3435 unit + contract + integration tests** across 8 tier gates (Tier 0-7 + 8). All 3 CI workflows green (test / install-smoke / no-pii).
- ✅ **v1 cron triggers shipped**: 17 active `.github/workflows/steward-*.yml` workflows (daily harvest, weekly dep-patch / flaky-test / coverage / lint / tech-debt / workflow-hardener / secret-sweep, monthly senior-tester / doc-drift / todo-triage, every-4-hours pr-review-responder). Real nightly cron PRs producing commits since 2026-05-09. Next: expand from cortex-x dogfood → a Next.js SaaS project + Kiosek.
- ⏳ **v1.5+ hardening backlog (Sprint 1.6.20+ + 1.9.1+)**: hardcode endpoint, extractUsage string coercion + multi-call ensemble shape (RouteLLM blocker), detached HEAD pre-flight, timeoutMs/maxTokens upper-bound clamps, `<untrusted>` delimiters around prompt-injected content, eval suite + property tests + stateful simulation per `standards/correctness.md`. Sprint 1.9.1: `kind: ears_text` runtime semantics, render `spec_failures` block in PR body, EISDIR + symlink hardening in applyEditsToFilesystem.
- See [docs/steward-rfc.md](./docs/steward-rfc.md), [docs/steward-runtime.md](./docs/steward-runtime.md), [docs/steward-usage.md](./docs/steward-usage.md), [standards/steward-policy.md](./standards/steward-policy.md)

## License

Apache License 2.0. See [LICENSE](./LICENSE) + [NOTICE](./NOTICE).
