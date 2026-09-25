# Changelog

All notable changes to cortex-x. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [SemVer](https://semver.org/).

## [Unreleased]

### Added

- **Memory health at session start** — new [`shared/hooks/_lib/memory-health.cjs`](./shared/hooks/_lib/memory-health.cjs), called from `session-start.cjs`. It reports:
  - the Claude Code auto-memory index nearing the loader cut-off (25 KB / 200 lines);
  - index links that point to missing files;
  - memory files not linked from the index;
  - project memories untouched for 120+ days;
  - a cortex library entry that is 30+ days old with 10+ commits since, with a pointer to `prompts/cortex-sync.md`.

  It only measures and reports, never rewrites, and prints nothing when memory is healthy. The memory folder is resolved the way Claude Code keys it: from the git repository, so worktrees and subdirectories share one folder. It honours `autoMemoryDirectory` and `CLAUDE_CONFIG_DIR`. Git runs through `execFile` and is called at most twice. Only the frontmatter head of each file is read, and file names are sanitised before they reach model context.
- **`pinned: true`** — an operator-marked, never-degrade fact.
  - `recordLesson` persists the flag.
  - `memory-decay` `decayPass` never archives a pinned item on either path. Blockers are now also protected on the threshold path, and the archive fraction applies only to the unprotected pool.
  - `lessons-exporter` always exports pinned lessons, first and regardless of score.
  - Memory-health does not count pinned project memories as stale.

### Changed

- **Augment block v7** — Claude Code v2.1.233+ no longer offers `TaskCreate` / `TodoWrite` on Opus 4.8, Sonnet 5, Fable 5 and newer models. The global discipline block and `standards/verification-loop.md` now say to keep the list in the reply or in PROGRESS.md, or to set `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`.
- **GitHub Actions pinned to node24 releases** — Node 20 was removed from runners on 2026-09-23. 19 `upload-artifact` v4 pins moved to v7.0.1. The last `checkout` / `setup-node` v4 pins (capabilities-refresh, stryker) and `cache@v4` moved to node24 SHAs.

### Fixed

- `memory-decay-properties.test.cjs` passed `archiveFraction`, an option that doesn't exist, so two property tests ran at the default 5% instead of the intended fraction.

## [0.3.0] — 2026-05-14 — First public stable preview

> **Chapter close: Tier 0 (Foundation) + Tier 1 (Verification + multi-agent) shipped, Tier 2 (Compound learners) essentially complete.** First version intended for stranger consumption — `0.3.0-pre` suffix dropped. `experimental: true` flag preserved in the Claude Code plugin manifest because three named sub-sprints remain deferred (2.2.1 multi-agent spawner, 2.3.1 mutation_score criterion kind, 3.X Anthropic Memory Tool). Plugin stability flag moved `closed-beta` → `public-preview`.
>
> Headline numbers for the 2026-05-14 autonomous session: **15 commits**, **11 sprints landed** (2.29 · 2.26 · 2.20 status flip · 2.24 · 2.8.2 · 2.8.3 · 2.22 + 2.22.1 R2 · 2.25 + 2.25.1 R2 · 2.3 + 2.3.1 R2 · 2.2 + 2.2.1 R2 · 3.X verified-deferral), **4 R2 hardening rounds** closing **25 HIGH findings** in-commit, **5 fresh R1 web-research dispatches**, **2697 → 2955 tests (+258)**, 0 failing, 2 pre-existing skips.

### Added (2026-05-14 — Sprint 2.29 + 2.26 + 2.20 + 2.24 + 2.8.2 + 2.8.3 + 2.22 + 2.25 + 2.3 + 2.2 + 3.X-defer)

**Sprint 2.3** — StrykerJS mutation-testing measure-only baseline (commit `68feef9`). New [`standards/mutation-testing.md`](./standards/mutation-testing.md) (Rule 2 Critical) + [`stryker.conf.json`](./stryker.conf.json) (incremental, concurrency 50%, timeout 60s, `break: null` measure-only posture) + [`.github/workflows/stryker.yml`](./.github/workflows/stryker.yml) (push + Sun 03:00 UTC cron + workflow_dispatch). Mutate-scope locked to auth-tier `bin/steward/_lib/` modules (splice · spec-verifier · halt-check · cost-safety · recommendations · policy-check). Fitness signal beyond "tests pass": Stryker mutates one operator per run, re-runs `npm test`, scores % killed. Threshold ratchets activate after 2-week baseline. R1: [`docs/research/sprint-2.3-mutation-testing-fitness-2026-05-14.md`](./docs/research/sprint-2.3-mutation-testing-fitness-2026-05-14.md) (1670 words, 26 URLs). Fresh memo complements the original Sprint 2.3 R1 (2026-05-10) + R1 refresh (2026-05-10).

**Sprint 2.2** — worktree-supervisor foundation v0 (commit `93d7b8d`). 4 pure utility functions in [`bin/steward/_lib/topology.cjs`](./bin/steward/_lib/topology.cjs): `parseTreeBudgetCap` (USD cap, clamped [0.10, 10.0], default $1.50) · `canonicalize` (tag-encodes Date/Buffer/RegExp/Map/Set/TypedArray/BigInt + SHA-256 fingerprint defense against position bias + cross-tree loop detection) · `randomizeJudgeOrder` (Fisher-Yates with defensive rng clamping) · `validateTopologySafe` (Object.prototype.hasOwnProperty defense vs prototype pollution). New action_kind `recommendation_harvest_parallel` (LLM-required, `topology_safe: 'parallel'`, ensemble shape: 2 Sonnet workers + same-tier Sonnet judge) — registry-only, spawner deferred. New [`standards/multi-agent-supervisor.md`](./standards/multi-agent-supervisor.md) (Rule 2 Critical): 6 safety contracts (S1 budget · S2 depth · S3 audit randomization · S4 fingerprint dedup · S5 worker-judge same-tier · S6 fail-safe rollback). R1: [`docs/research/sprint-2.2-worktree-supervisor-2026-05-14.md`](./docs/research/sprint-2.2-worktree-supervisor-2026-05-14.md) (1530 words, 13 URLs; DeepMind 17.2× amplification, $47K LangChain runaway).

**Sprint 2.22 + 2.22.1 R2** — `cortex-skill-validate` CLI + 3-tier model + ToxicSkills regex (commits `e9c01d7`, `c014f43`). 3-tier validator (spec compliance / Claude Code runtime / cortex opinion). ToxicSkills security regex (system-prompt injection, prompt-leak, role-confusion). 7 HIGH closed by 4-agent parallel review.

**Sprint 2.25 + 2.25.1 R2** — `cortex-dream` + `cortex-insights` operator-edited memory consolidator (commits `d45b517`, `b24af86`). 4-op consolidator (merge duplicates · remove contradicted · relative→absolute dates · aggressive 200-line prune) targeting `MEMORY.md` + `~/.cortex/projects/<slug>.md`. 7 HIGH closed by 3-agent review (security + correctness + edge-case).

**Sprint 2.29** — MCP server recommendations per profile (Context7 etc.).

**Sprint 2.26** — template/standards/sample card surfacing.

**Sprint 2.24** — `/cortex-goal` plan-first wrapper for Claude Code native `/goal` (commit `46aafa0`). Steward (cron) + `/goal` (session) are complementary, not overlapping — `/cortex-goal` produces a cortex-disciplined plan; Claude's native `/goal` runs the haiku verifier loop unchanged.

**Sprint 2.8.2** — `bin/cortex-wiki-consolidate.cjs` status flip (commit `60c09d7`). Already-live deterministic Phase A consolidator surfaced; ~20 tests R2-hardened.

**Sprint 2.8.3** — Agent-first audit snapshot deliverable + roadmap entry (commit `b91968b`).

**Sprint 2.20** — `cortex-update` CLI status flip after positioning.md §Second-lens landing (commit `e104252`). Roadmap drift only.

**Sprint 3.X (Anthropic Memory Tool)** — verified-deferral. 4 blockers documented in [`docs/research/sprint-3.x-anthropic-memory-tool-2026-05-14.md`](./docs/research/sprint-3.x-anthropic-memory-tool-2026-05-14.md) (1700 words, 15 URLs): claude-cli engine collision (active), Sprint 2.8 Memory Foundation (resolved), value/ceremony ratio (active), **NEW OpenRouter beta-header pass-through** (active — surfaced by R1 reading). 3 of 4 blockers active = stays deferred.

### Fixed (2026-05-14 — R2 hardening rounds: 25 HIGH closed across 4 reviews)

**Sprint 2.3.1 R2** (commit `4b2611b`, 4 HIGH closed): supply-chain CWE-1357 — `@stryker-mutator/core` pinned exact `9.6.1` (no caret) + `npm ci --ignore-scripts` defeats transitive `preinstall`/`postinstall` RCE class (event-stream / ua-parser-js). Cache poisoning CWE-349 — `restore-keys` locked to main-prefixed only; tj-actions March 2025 cache-poisoning class. Binary integrity CWE-829 — `npx --no-install stryker` refuses on-the-fly fetch; lockfile-presence guard pre-`npm ci`. Inline JS injection CWE-78 — extracted summarizer from inline `node -e "..."` in YAML to [`tools/summarize-mutation.cjs`](./tools/summarize-mutation.cjs) with fixed input path, no shell interpolation.

**Sprint 2.2.1 R2** (commit `e2b7e7b`, 7 HIGH closed by 3-agent parallel review): `canonicalize` tag-encoding (Date/Buffer/RegExp/Map/Set/TypedArray/BigInt) + circular-reference WeakSet guard + DANGEROUS_KEYS strip (`__proto__` · `constructor` · `prototype`). `randomizeJudgeOrder` Fisher-Yates defensive clamp for rng OOB values (`rng=NaN`, `rng=1.0`, `rng<0`). Frozen `VALID_TOPOLOGIES`. `validateTopologySafe` `Object.prototype.hasOwnProperty.call` defense vs prototype pollution. Unicode NFKC + HTML-entity-encoded variants in canary regex (`&lt;` + `&#60;` + `&#x3C;`). 12 R2 regression tests + 5 fast-check property tests (Fisher-Yates uniformity chi-squared n=4 bound `chi2 < 100`).

**Sprint 2.25.1 R2** (commit `b24af86`, 7 HIGH closed): see Sprint 2.25 entry above for full breakdown.

**Sprint 2.22.1 R2** (commit `c014f43`, 7 HIGH closed): see Sprint 2.22 entry above for full breakdown.

### Test growth (2026-05-14)

2697 → 2950 → **2955** tests landed today (+258). All 5 R1 fresh memos cite from `docs/research/sprint-*-2026-05-14.md`. Zero failures. Two pre-existing skips (sandbox-only paths).

## [Unreleased]

### Added (2026-05-13 afternoon — Sprint 3.0 v2 + 3.2 v1 + 2.19 v1 + 3.4 v0 + 3.1 v0)

**Second 5-sprint chain shipped same day** (commits `89e8780` → `5f971b0`). cortex-x is now **Tier 2 essentially complete** — only Sprint 3.3 GraphRAG remains deferred pending external LazyGraphRAG release. Phase 5 self-improvement fully cron-wired (daily + weekly), action-engine FTS recall live, LLM-as-judge eval scoring live, external tool adapter protocol established, self-extending capabilities possible with hard human gate.

**Sprint 3.0 v2** — LLM-as-judge rubric scoring + R2 hardening (commit `89e8780`). Eval scoring upgraded from binary pass/fail to per-property rubric checklist (`## Expected properties` → `{must_have, should_have, must_not_have}`). Sonnet 4.6 judge produces per-item booleans + evidence quotes; `scoreFromRubric()` recomputes weighted score deterministically (judge cannot fudge math — `must_have 1.0 / should_have 0.5 / must_not_have 1.0` penalty). Cross-family bias defense: judge = Sonnet, candidate = DeepSeek. R2 closed 2 HIGH (untrusted_* XML delimiters for prompt-injection defense, validator subset+duplicate+coverage checks) + 2 MED (`Math.max(0, cost_usd)`, judge `max_tokens: 2048`) + 1 LOW (Bearer token scrub). New files: `bin/steward/_lib/rubric-extractor.cjs` + `eval-judge.cjs` + `docs/research/sprint-3.0-v2-llm-as-judge-2026-05-13.md`. Tests: +38.

**Sprint 3.2 v1** — action-engine FTS recall integration + R2 clock-skew defense (commit `4c51202`). `bin/steward/_lib/lessons.cjs:recallLessonsFTS()` drop-in for `recallLessons` wired at `action-engine.cjs:711`. 3-tier priority ladder: action_key SQL exact-match (UNINDEXED column, avoids FTS5 `#` over-tokenization) → action_kind filter → free-text bm25. Fail-safe fallback to linear scan when sqlite unavailable / index missing / index stale. **R2 HIGH closed**: clock-skew bypass (negative ageMs from future-dated mtime) — same incident class as Sprint 2.19 session-start; fix gates on `ageMs >= 0 && ageMs <= maxIdxAgeMs`. New helper `searchByActionKey()` in `lessons-search.cjs`. Tests: +13 incl. clock-skew regression.

**Sprint 2.19 v1** — weekly Dreaming Phase B (mining + LLM validation) + R2 hardening (commit `9b539c1`). Phase B complement to v0's daily deterministic consolidation: detector `detectors/evolve-weekly.cjs` (thresholds `min_events=3 / min_projects=2 / min_days_span=7 / window_days=14`) groups by `(root_cause × action_kind)` → Sonnet 4.6 validator surfaces transferable rules → writes `insights/proposals/<date>-evolve-weekly.md`. Cron `0 4 * * 0` Sunday 04:00 UTC. Budget cap `MAX_INSIGHTS_PER_RUN=3`. R2 closed HIGH Finding 0 (`touchedFiles: proposalsWritten` — was `[]`, defeated the spec-verifier criterion) + 4 length-cap caps + `sanitizeForMarkdown` line-anchored escapes (`^---$`, `^## `). New routing-table entry for `evolve_weekly` (cheap=deepseek-flash / balanced=sonnet / premium=opus). Tests: +22.

**Sprint 3.4 v0** — external tool capability adapter contract + R2 hardening (commit `9100987`). Declarative SKILL.md frontmatter parser (`bin/steward/_lib/external-adapter.cjs`, ~230 LoC) + 4-tier license gate (`oss-permissive` / `license_required` / `seat_metered` / `per_invocation_metered`). Opens protocol for external repos / MCP servers / Hyperframes to register as Steward capabilities. R2 closed 2 HIGH: slug spoofing (CWE-345) via directory-name-authoritative slug rule (`EXTERNAL_DEP_SLUG_MISMATCH` rejection); install_cmd shell injection (CWE-78) via `INSTALL_CMD_RE` allowlist rejecting `; & | $ \` ( ) { }`. First scaffolded adapter: `shared/skills/external-adapter-hyperframes/`. Tests: +28.

**Sprint 3.1 v0** — self-extending capabilities (proposal-only) + R2 hardening (commit `5f971b0`). **Most sensitive sprint of the chain.** Pure-deterministic miner `detectors/skill-proposal-mining.cjs` (thresholds `min_events=5 / min_projects=1 / min_days_span=14 / window_days=30`) surfaces NEW action_kind candidates from journal failure patterns. Operator manually flags via `bin/cortex-propose-skill list/scaffold`; LLM scaffolder writes `skill-experiments/<slug>/{SKILL.md, acceptance.md, PROPOSAL.md}` bundle. **Recursive-self-improvement door closed via filesystem write-scope architecture, not prompt restraint** — scaffolder physically cannot write to `bin/steward/_lib/action-kinds.cjs`. Hard rate limit ≤1 proposal/week (overridable via `STEWARD_SKILL_PROPOSAL_RATE`, clamped to [0,10]). R2 closed 2 HIGH (markdown injection regression — `safety.sanitizeForMarkdown` SSOT + line-anchored `^---$` / `^## ` escapes + `<untrusted_candidate>` neutralization) + belt-and-suspenders re-validation before disk write. New files: `bin/cortex-propose-skill.cjs` + `bin/steward/_lib/skill-scaffolder.cjs` + `docs/research/sprint-3.1-self-extending-2026-05-13.md`. Tests: +26 incl. 7 R2 hardening regressions.

**Test growth**: 2447 → 2539 (+92 across 5 sprints). **R1 discipline**: 2 fresh web research dispatches (LLM-as-judge, self-modifying agents) + 3 reused R1 memos (Sprint 3.6 for 3.2 v1, brain-kit for 2.19 v1, Sprint 3.4 for 3.4 v0). **R2 discipline**: 8 HIGH + 9 MED findings all fixed in-commit before push.

### Fixed (2026-05-13 afternoon — post-chain docs verification)

- `bin/cortex-lessons-search.cjs` showHelp() syntax bug — unescaped backticks inside template literal at lines 37-39 closed the literal prematurely (`SyntaxError: missing ) after argument list`). Fixed via `\`` escape. Surfaced during manual smoke verification — not caught by test suite because no test invoked the CLI's help path on stdout.

### Added (2026-05-13 — Sprint 2.19 + 2.20 + 2.8.1 + 3.2 + 3.0 v0/v1 + LR.1 closure)

**5-sprint chain shipped 2026-05-13** (commits `461e9ed` → `ec5457c`). cortex-x crossed into **Tier 2 (Compound learners)** with two first-Tier-2 sprints shipped same day; Phase 5 self-improvement pulled from "designed" → "running"; full memory pipeline (lessons.jsonl → FTS5 + Claude Code auto-memory exporter); first real-LLM eval baseline captured.

**Sprint 2.20** — memory-system competitor lens in `docs/positioning.md` (commit `461e9ed`). Second comparison matrix vs Mem0 / Zep / Letta / MAF+Neo4j / OpenClaw Dreaming / Anthropic Auto Dream; verdict: cortex-x is adjacent to memory-SaaS, not competing — atomic-rollback + multi-window USD caps + draft-PR approval differentiator absent across all named competitors.

**Sprint 2.19** — daily Dreaming consolidation cron (commit `b147ed2`). New `evolve_daily` action_kind + GHA workflow `steward-evolve-daily.yml` (cron `0 3 * * *`). Pure-deterministic Phase A from `prompts/cortex-evolve.md`: journal schema validation + insights/cortex/projects stale-flagging + advisory rollup to `insights/proposals/<date>-evolve-daily.md`. Industry slovník alignment ("Dreaming"/"Auto Dream"/"NREM+REM consolidation") in README + `docs/vision.md`.

**Sprint 2.8.1** — lessons.jsonl → Claude Code auto-memory exporter (commits `fa27d86` → `7b501a2` + `c7e1a11` cross-platform fix). New `bin/cortex-export-lessons.cjs` CLI + library: pure-deterministic export of scored lessons to `~/.claude/projects/<slug>/memory/lessons-<kind>.md` topic files + MEMORY.md index, with frontmatter matching Claude Code auto-memory contract. Per-topic split (one file per `action_kind`), decay-aware top-K (default 10), uni-directional write. Path-traversal hardening per security-auditor R2 findings.

**Sprint 3.2** — FTS5 lessons index (commits `575d16b` → `a05ffab`). **First Tier 2 sprint shipped.** SQLite FTS5 virtual table via Node 22.5+ built-in `node:sqlite`. Zero npm deps. Three search helpers: `searchByText` (bm25-ranked), `searchByActionKind`, `searchByErrorCode`. Operator CLI `bin/cortex-lessons-search.cjs` with build/text/kind/code subcommands. Feature-detected gracefully on Node < 22.5.

**Sprint 3.0 v0 + v1** — AlphaEvolve-style A/B harness (commits `7610cf2` → `ed3d853` + `29015d7`). **Tier 2 moonshot foundation.** Champion-vs-challenger measurement harness: bootstrap CI (mulberry32-seeded for reproducibility), 3-rule promotion decision (point delta + lower-CI gate + validation spec_pass_rate non-regression), pluggable executor with both `mockExecutor` (v0) and real-LLM `openrouterExecutor` (v1) + cost guard. CLI `bin/cortex-evolve-ab.cjs` (`run` + `compare` subcommands). Honest "N=10 << N=400-600" directional-only disclaimer surfaced in CLI output. v2 deferred: LLM-as-judge rubric scoring, population search, real-LLM eval-suite growth.

**Sprint LR.1 closure** — real-LLM eval baseline captured (commit `3014f02` → `ec5457c`). `evals/results/2026-05-13-baseline-real-llm.json`: 3 tasks × 1 trial × deepseek-v4-flash via OpenRouter; $0.0016 total cost; 3/3 smoke-passed; 714–1272 ms per trial. End-to-end proof that OpenRouter auth + model selection + cost capture + harness scoring contract all work against operator's new inference key (rotated 2026-05-13 after prior provisioning key returned AUTH_REJECTED). Full 10-task LLM-as-judge baseline deferred to Sprint 3.0 v2.

**Test growth**: 2349 → 2420 tests (+71 across 5 sprints). **Workflow growth**: 19 → 22 (+3: evolve-daily, key-probe, eval-baseline).

**3 new roadmap sprints added**: 2.19, 2.20, 4.9 (Ambient PWA briefing — defensible whitespace per brain-kit research memo 2026-05-13).

### Added (2026-05-12 — Sprint LR.1: real-state baseline + Phase 5 disclaimer refresh)

**Commit `b65c19c`**. Closes Sprint LR.1 partially:

- `evals/results/2026-05-12-2802a90-real-baseline.json` — pipeline-component state snapshot (2339 tests, 16 action_kinds, 26 standards, 11 profiles, 7 hooks, 18 workflows, 5-lane install-smoke green, capability registry auto-refresh shipped, cost-safety multi-window caps active).
- Real-LLM smoke test attempted via OpenRouter — current `OPENROUTER_API_KEY` returned 200 on `/models` but `AUTH_REJECTED` on `/chat/completions` (likely provisioning vs inference key). Recovery path documented in baseline JSON; pipeline architecture is verified end-to-end by 2339 tests.
- README.md § Phase 5 disclaimer refreshed: now cites both the paper baseline (2026-05-01-01d9013) AND the new pipeline-component baseline, with explicit "self-improvement designed but not yet measured by a real Claude-session execution score" framing.
- LR.5 + LR.6 status flags updated in `docs/steward-roadmap.md` table — LR.5 resolved (`cortex-x` kept), LR.6 shipped (Apache 2.0). Only LR.2 (README compare table) + LR.7 (demo asset) remain — both operator-side.

Verdict from baseline: **READY for install demo + first-sprint walk-through video.** Sprint 2.2 worktree supervisor pitch deferred until shipped.

### Fixed (2026-05-12 — final docs consistency audit: 1 BLOCK + 3 HIGH + 3 MED closed)

Post-commit `b65c19c` consistency audit found residual drift across user-facing docs. All BLOCK + HIGH findings fixed:

- **Roadmap LR.5/LR.6 BLOCK** (`docs/steward-roadmap.md:1024-1026`): table still said "⏳ awaiting operator" though both decisions shipped today. Updated to ✅ with commit/decision references. Sequencing footnote corrected to reflect 5-of-7 LR items shipped.
- **README + install-walkthrough HIGH** (5 occurrences): "25 standards" → 26 (matches capability registry count after RULE-README filter). "17 workflows" → 18.
- **`docs/steward-runtime.md` HIGH** (9 occurrences): residual `hermes/` branch + `hermes.yml` workflow references after Sprint 4.7 rebrand. Replaced with `steward/` / `steward.yml`. Block listing the "reference workflow template" pointed at deleted `steward.example.yml` → rewrote to point at the 15 active workflow files.
- **`docs/steward-autoresearch.md` MED** (3 occurrences): same `.example.yml` → real file name fix.
- **`cortex/capabilities.md` MED**: test-count footnote added explaining ~4% diff between regex-based registry count (2243) and node:test gate count (2339). Header-table TL;DR now sets expectation: registry is discovery-surface estimate, `npm test` is the gate.

### Fixed (2026-05-12 — Sprint LR.B+ R2: 6-agent review pipeline hardening — 6 HIGH + 4 MED closed)

After commit `73e7a07` shipped capability discovery + install pipeline + web-research teaching fixes, a 6-agent parallel review pipeline (acceptance + blind + correctness + security + ssot + edge-case) found additional gaps. All HIGH + impactful MED findings fixed in this round.

HIGH closed:
- **inventoryTests regex** (correctness + edge HIGH): regex `/^[ \t]*(?:test|it)\s*\(/gm` undercounted `.each / .skip / .only / .todo / .concurrent` variants. Extended alternation: `(?:test|it)(?:\.(?:each|skip|only|todo|concurrent))?\s*\(`. Capability inventory now counts 2243 (vs node:test 2339 = 4% diff, was 95% off before).
- **session-start yaml CRLF survival** (correctness HIGH): regex capture left trailing `\r` from Windows-edited `cortex-source.yaml`. Added explicit `.replace(/\r$/, '')` before quote-strip.
- **session-start clock-skew silent-disable** (correctness HIGH): future-dated marker mtime made `Date.now() - mtimeMs < interval` true (negative < positive), suppressing nudge for years. Now gates on `ageMs >= 0 && ageMs < NUDGE_INTERVAL_MS`.
- **session-start hardcoded counts** (SSOT Orange): nudge text "25 standards, 17 workflows" already drifted vs auto-registry (26, 18) in same commit. Counts now read dynamically from `cortex/capabilities.json`.
- **install.sh CAPSHIM write-fail invisible** (blind IMPORTANT): heredoc cat had no failure check; mid-stream write fault silently continued. Wrapped in `if ! cat > ...; then exit 1; fi`.
- **install.sh CAPSHIM tab + CRLF** (edge MED): sed used `[ ]*` (space only); didn't strip `\r`. Switched to `[[:space:]]*` + added `tr -d '\r'`. Cross-platform yaml editing no longer breaks the shim.

MED closed:
- **session-start marker race + fresh-install spam** (correctness + edge MED): atomic `fs.openSync(path, 'wx')` for exclusive-create + `mkdirSync({recursive:true})` on parent dir before write.
- **session-start marker containment** (correctness MED): `path.relative(dataRoot, markerPath)` escape check.
- **capabilities-refresh.yml phantom commits** (correctness + edge MED): `git diff -I '"generated_at"'` ignores timestamp-only hunks; falls back to plain diff for older git.
- **inventoryTests silent-skip large files** (edge MED): tracks `skippedLarge` count + stderr warning.

Doc honesty:
- **standards/web-research.md budget caps softened**: caps marked "operator discipline (Sprint 3.X will harness)" with explicit honesty note that no runtime loader consumes `config/research.yaml` yet.

Deferred (Orange SSOT — acceptable for now):
- Shim emitter Rule-of-Three extraction (4 shims duplicate cortex-source.yaml resolver). Will land before 5th shim.
- Skill-promote list duplicated across install.{sh,ps1} + verify-install.cjs. Same rationale.
- retrofit + designer skill research-phase wiring claimed in web-research.md but not yet shipped — softened to "planned" in next round.

Tests: 2339, 0 failures. Capability registry inventoryTests count: 2243 (was 110 yesterday).

### Changed (2026-05-12 — License: PolyForm Noncommercial 1.0.0 → Apache License 2.0)

**Sprint LR.6 closed.** Relicensed from PolyForm Noncommercial 1.0.0 to Apache License 2.0 pre-public-launch. Why Apache 2.0:
- Patent grant (§3) protects users from patent trolls — important in 2026 AI framework landscape
- Permits commercial use without separate grant — removes friction for hiring-side use case ("a real company wants to use cortex-x")
- Default OSS license for serious frameworks (TensorFlow, Kubernetes, Airflow, LangChain) — signals seriousness to corporate legal review
- `NOTICE` file (§4(d)) preserves attribution; modifications must declare changes (§4(b))

Files touched: `LICENSE` (full Apache 2.0 text), new `NOTICE`, `package.json` + `bin/discord-bridge/package.json` + `.claude-plugin/plugin.json` + `module.yaml` (SPDX field), `README.md` + `CLAUDE.md` + `CONTRIBUTING.md` (license references), `standards/ship-ready.md` (relicense flag in artifact table).

### Fixed (2026-05-12 — Sprint LR.B+: launch-readiness hygiene pass — 3-agent audit findings)

**Commit `0bec7a9`** — three parallel audit agents surveyed cortex-x for closed-beta → public-launch hygiene. P0 + P1 + targeted P2 findings shipped.

- Hermes → Steward residual sweep: ~40 user-visible mentions (tmpfile prefixes, gh issue label, stdout strings, error messages, PR title fallback, file headers in 6 files) replaced. Backward-compat aliases preserved (HERMES_HALT env, Hermes-* git trailers, HERMES-FLAKY marker).
- `cortex/recommendations.md` + `cortex/qa/{AUDIT,testing-gaps,testing-strategy}.md` moved to `docs/dogfood-examples/` so fresh-install users get a clean cortex/ scaffold.
- `prompts/steward-setup.md` instructions fixed (workflow `hermes.yml` → `steward.yml`, branch `hermes/<...>` → `steward/<...>`).
- `prompts/new-project.md`: `hermes-agent` profile reference → `ai-agent`.
- `install.{sh,ps1}`: Node ≥22 numeric version check (previously only `command -v node`).
- 9 new READMEs: `bin/`, `bin/steward/`, `agents/`, `profiles/`, `prompts/`, `shared/hooks/`, `.github/workflows/`, `cortex/qa/`, `docs/dogfood-examples/`.
- `.github/ISSUE_TEMPLATE/{config,bug-report,beta-feedback}.yml` + `PULL_REQUEST_TEMPLATE.md`.
- `templates/PROGRESS.md.hbs` Czech states → English.

**Tests**: 2338 → 2339, 0 failures.

### Fixed (2026-05-12 — Sprint LR.C: gh-ops require path drift — nightly cron P0)

**Sprint LR.C** (commit `a0b4039`) — `bin/steward/execute.cjs` had 6 inline `require('./gh-ops.cjs')` calls (correct path: `./_lib/gh-ops.cjs`). Top-level require at line 43 was already correct, masking the inline copy-paste drift. Production failures observed in `steward nightly` (2026-05-12 05:08 UTC) and `steward flaky-test-repair` (07:59 UTC), both with "Cannot find module './gh-ops.cjs'". Why CI didn't catch: gh-push code path runs only in non-dry-run mode; existing tests mock gh-ops or skip the gh-push phase.

- 6 require paths corrected via Edit replace_all.
- New regression test `tests/contract/steward-require-paths.test.cjs` (~80 LoC): parses every `require('./...')` in execute.cjs / dry-run.cjs / status.cjs, asserts resolved path exists on disk. Pins the 2026-05-12 incident as a hard-coded negative assertion.

**Tests**: 2266 → **2270** (+4 contract tests in regression suite).

**R3 discipline closed**: one incident class = one defense layer (correct paths) + one regression test (contract path-resolution gate).

### Fixed (2026-05-12 — Sprint LR.B: workflow_hardener — least-privilege permissions across 15 workflows)

**Sprint LR.B** (commit `f6d0ad0`) — workflow_hardener action_kind detected 16 HIGH findings: 14 workflows lacked top-level `permissions:` block; `no-pii.yml` additionally lacked `concurrency:` + `timeout-minutes:`. Wiz/StepSecurity P1 finding — workflows inheriting broad repo-write defaults via GITHUB_TOKEN.

- 14 steward-*.yml workflows + steward.yml — added top-level `permissions: contents: read` baseline.
- no-pii.yml — added `concurrency:` group + `timeout-minutes: 10`.
- workflow_hardener analyzer: 16 findings → 0.
- Per-job permissions already correctly elevated; no functional changes to any workflow.

### Added (2026-05-12 — Sprint 2.18: read-coverage proof `read_set` acceptance-criterion — 📋 PROPOSED + R1 done)

**Sprint 2.18** (commit `4387b07`, doc-only) — operator-flagged after FB discussion of doc-gen agent reading 64/278 methods and confabulating 214. Class of failure invisible to current Steward gates because edit-side artifact is internally consistent — wrong only about coverage of input set.

R1 dispatch ([`docs/research/sprint-2.18-read-coverage-proof-research-2026-05-12.md`](docs/research/sprint-2.18-read-coverage-proof-research-2026-05-12.md)) confirmed:
- No 2026 framework ships first-class read-coverage primitive (Letta / AutoGen / LangGraph / CrewAI / OpenAI Agents SDK / Cursor / Devin / Replit Agent — all silent).
- CloudAPIBench (arxiv 2407.09726) quantifies the doc-gen hallucination class as persistent.
- Claude Agent SDK `PostToolUse` hook receives `tool_input.file_path` for every Read — host harness can build authoritative manifest agent cannot lie about.
- GitNexus `PostToolUse` stale-index hook is structurally identical pattern.

**Scope** (narrow per R1): 6th `kind: read_set` in `spec-verifier.cjs` (~150 LoC) + PostToolUse hook handler (~80 LoC) + 1 error code (`SPEC_READ_SET_INCOMPLETE`) + ~12 tests. Half-day to one day when promoted. 3 immediate beneficiary action_kinds: `pattern_transfer`, `release_notes_drafter`, `senior_tester_review`.

### Changed (2026-05-11 → 2026-05-12 — roadmap status flag sync + Sprint 3.6→3.2 LLM Wiki fold)

- **Sprint 3.6 R1** (commit `6aaf808`) — Karpathy LLM Wiki pattern research dispatch. Decisive recommendation: fold into existing Sprint 3.2 (FTS5 + `[[wikilink]]` extractor + `prompts/wiki-curator.md` from Karpathy gist), defer Sprint 3.3 GraphRAG codebase by 1 sprint to land on Microsoft LazyGraphRAG (Q1-Q2 2026, 0.1% indexing cost, 700× cheaper query). Zero new sprints, one scope extension, one defer.
- Roadmap status flags corrected: Sprint 2.5b workflow_hardener, Sprint 2.6b secret_history_sweep, Sprint 2.11 senior_tester_review → ✅ SHIPPED (all already in production via commit `213ea72` / `e3829a3`, status flags lagged).

### Added (2026-05-11 — Sprint 2.16 + 2.17: `/designer` + `/cortex-help` skills)

**Sprint 2.16** (commit `6c5c57e`) — `shared/skills/designer/SKILL.md` (~280 LoC markdown). Reproduces the public Claude Design recipe inside Claude Code: intake questioning flow + library palette (shadcn / Aceternity / Hero UI + GSAP / Lenis / Framer Motion) + parallel worktree exploration (3-4 variations, operator picks winner) + iteration loop + handoff to `cortex/STYLE.md`. Source-recipe analysis from public Claude Design post-mortem transcript. Zero runtime code added.

**Sprint 2.17** (commit `0e82192` + rename `de256e6`) — `shared/skills/cortex-help/SKILL.md`. Lightweight user-facing menu of 10 invokable slash commands with project-state-aware "default next" nudge (5 filesystem peeks: `.cortex-bootstrap-pending`, `cortex/AUDIT.md`, `cortex/discovery.md`, `package.json` family, empty folder). Complements machine-readable `cortex/capabilities.md` from Sprint 2.15 — registry stays SSOT. Initial ship as `/help` collided with Claude Code built-in; same-day rename to `/cortex-help` matching `cortex-*` prefix convention (cortex-init, cortex-doctor, cortex-reflect, cortex-sync). `install.{sh,ps1}` updated to sync skill to `~/.claude/skills/cortex-help/` user-level slash registry.

Plus Sprint 3.4 (External tool capability adapters — Hyperframes-first / Remotion-second, R1 ✅ done) + Sprint 3.5 (SaaS-unit positioning) roadmap entries — both proposed pending operator promotion.

### Fixed (2026-05-11 — Sprint LR.A: public-readiness scrub — PII strip + README narrative + Dave→maintainer sweep)

**Sprint LR.A** (commit `2fa9a18`) — 2-agent audit (install-stranger-eyes + ship-ready leak hunt) after operator confirmed repo stays public. Auto-mode autonomous mandate. 60 files changed, +524 / −1285.

P0 PII + identity leaks stripped:
- `REDACTED@redacted.invalid` from CODE_OF_CONDUCT.md (→ GitHub Issues + Private Vulnerability Reporting), docs/user-identity.md, detectors/detect-user-identity.cjs JSDoc example (→ jane@example.com), CHANGELOG.md.
- ship-ready denylist expanded: case-insensitive grep (`-iEf`), generic email pattern catches gmail / outlook / protonmail / icloud / yahoo / live / fastmail leaks.
- `scripts/regression-all-detectors.cjs` no longer hardcodes maintainer client repos — reads from `$CORTEX_REGRESSION_TARGETS` env var → gitignored `regression-targets.local.json` → committed `.example.json` fallback.

P0 internal docs hidden:
- `OPERATOR_HANDOVER.md`, `docs/launch-checklist.md`, `docs/public-launch-plan.md`, `docs/research/cortex-x-sprint-brief-10-5.md` moved to gitignored `docs/dogfood/`.

P0 README narrative drift fixed:
- "Closed-beta install (current — repo is private)" section removed (repo is public).
- Steward pitch honest about v1 cron status (manual dogfood ✅, per-fork enablement ⏳).
- Broken README links removed (`docs/SSOT-architecture.md`, `.github/workflows/steward.example.yml`).
- Profile table now includes `browser-agent` + `qa-engineer` (had been missing).

P0+P1 Dave→maintainer/operator sweep — 74 replacements across 30+ files (standards/, tools/verify-*.cjs error strings, prompts/, docs/steward-*, evals/, insights/, journal/, research/ READMEs). Client project names genericized (RELO → "a Next.js SaaS project", Champions Barber → "a barbershop WaaS client", Amici → "an e-commerce chatbot client", Objedname → "a booking-platform client", OrderMage → "an admin-platform client"). Authorship attribution preserved per ship-ready.md exception (LICENSE, README author line, module.yaml kept).

P1 Czech-in-public: `docs/qa-tester-onboarding.md` (162 lines Czech) → renamed to `.cs.md`; English stub at canonical path. `insights/proposals/{README,rejected/README}.md` fully translated.

### Added (2026-05-11 — Sprint 2.15 + 2.15.1 + 2.4.1 + 2.4.2: capability registry + effort tuning + R2 hardening)

**Sprint 2.15** (commit `59a91a8`) — `bin/cortex-capabilities.cjs` auto-generated capability registry. Walks repo filesystem, produces SSOT `cortex/capabilities.md` + `cortex/capabilities.json` listing every action_kind, Steward primitive, universal hook, standard, profile, prompt, review-pipeline agent, GitHub workflow, and test count. Zero-deps, fail-open, side-effect-free without `--write`. npm script `npm run capabilities`. Contract tests cover shape, idempotency, markdown validity. Operator-facing answer to *"I do not even know what we have anymore."*

**Sprint 2.4.1** (commit `2a4dd72`) — per-action_kind effort tuning. `bin/steward/_lib/action-engine.cjs resolveEffortLevel(plan, opts, env)` with 4-tier precedence (env > opts > action_kind > 'medium' default). 5 valid levels via `VALID_EFFORT_LEVELS` allowlist. `--effort <level>` injected into claudeCliEngine argv. R1 memo: `docs/research/sprint-2.4.1-extended-thinking-research-2026-05-11.md` (25+ citations, novaknown.com Apr 2026 regression analysis, resolve.ai production benchmarks). Anti-overthinking discipline: no action_kind defaults to `xhigh` or `max`.

**Sprint 2.15.1 + 2.4.2** (commit `6c34f81`) — R2 review pipeline hardening. 6 agents in parallel (acceptance + blind + correctness + security + ssot + edge-case) on combined diff. 4 HIGH + 3 MEDIUM closed pre-commit:
- HIGH#1: `inventoryActionKinds` rewrite via `require()` not regex (fixes description truncation at apostrophe in `pattern_transfer`).
- HIGH#2: symlink + cycle protection in `countLines` + `inventoryTests` (`realpathSync` + visited Set + symlink skip).
- HIGH#3: `resolveEffortLevel` env=null TypeError defense + opts case-insensitive symmetry + prototype-pollution defense via `hasOwnProperty.call()`.
- HIGH#4: `readCoverageSummary` DI contract tightening (rejects arrays/primitives as ambiguous).
- MED: `mdCell()` helper escaping control chars + pipes; `--write` try/catch + dir-stat guard; removed hardcoded counts from roadmap prose.

**Tests**: 2226 → 2265 (+39 across Sprint 2.4.1 + 2.15 + hardening).

### Fixed (2026-05-11 — test-coverage-gap first Monday cron P0)

Commit `d4f8e2f` — first Monday `steward-test-coverage-gap` cron failed 2026-05-11 07:12 UTC. Root cause: `package.json` `test:coverage` script lacked `--reporter=json-summary`. c8 only generated text / lcov / html, leaving no JSON for detector. Cascade bug: detector DI sentinel `!= null` ambiguous when local coverage file existed. Fix: added `json-summary` reporter + DI sentinel changed to `!== undefined` for type clarity. First Monday autonomous-runtime dogfood validated the rollback discipline — failure surfaced + diagnosed within hours, not weeks.

### Added (2026-05-10 evening — Sprint 2.11: senior_tester_review action_kind, ⭐ DIFFERENTIATOR)

**Sprint 2.11** (commit `e3829a3`) — 13th action_kind, 2-stage hybrid test-quality auditor. Deterministic detector (~16 smells with regex: tsDetect 21 + Sandoval ESE 2025 13 + cortex-original 5 in registry) + optional LLM judge for strategic synthesis. Writes journal entry + opens ONE gh issue per run. Never edits source / test files in v1. Monthly cron cadence. Differentiator vs Devin / Replit / Cursor — no hosted competitor ships a "senior tester" review pass at the action-engine level.

### Added (2026-05-10 — Sprint LR.1.1 + Sprint LR.7: launch-readiness track items)

- **Sprint LR.1.1** (commit `5db1750`) — Aider-Polyglot lift discipline encoded as Phase 2 runner spec (`evals/runner.md`). `MIN_STEPS=30` + `test_executed:true` required before score write. Verified Steward action_kinds enforce test-execution-before-scoring via spec-verifier + runNpmTest + atomic rollback. Step-limit equivalent via cost-safety multi-window caps + intra-run StuckLoopDetection + cross-session loop detector.
- **Sprint LR.7** (commit `f196cdf`) — cross-model transfer protocol shipped as `docs/eval-cross-model-protocol.md`. Defines `transfer_ratio ≥ 1.0` formula, model set (deepseek-v4-flash baseline + claude-sonnet-4-6 OR gpt-5-mini secondary), GATE-MANDATORY / OPTIONAL / WAIVED path classification, fail-closed on missing runs. Integrated as Phase C.5 in `prompts/cortex-evolve.md` + SSOT config under `eval_suite.cross_model_transfer` in `config/evolve.yaml`. Grounded in DGM cross-model transfer test (o3-mini 23% → 33%, Claude 3.7 Sonnet 19% → 59.5%).

### Added (2026-05-10 mid-morning — Sprint 2.10.5 self-audit + tutorial + README + Sprint 2.10.6 Phase 1b existing-tests modernization)

**Sprint 2.10.5 — eat-our-own-dogfood self-audit** (operator: "klidně to celé dokonči, ještě máme čas. já ani nevím co řeká teď"):

1. **`cortex/qa/AUDIT.md`** — 12-section ISO 25010:2023 self-audit on cortex-x itself. Quality scorecard 1-5 per char + Phase 5a-bis catalog selection (17 of 117 catalog entries selected). **Load-bearing finding**: defense-by-design / defense-by-regression-test gap — cortex-x has 4 defense layers (spec-verifier + halt-check + redact + path-safety) all unit-tested as libraries but ZERO end-to-end "adversarial input → defense fires" regression.
2. **`cortex/qa/testing-strategy.md`** — 12-month pyramid plan, tool decisions, CI gates, ISO 25010 coverage targets, 3-month execution plan, anti-patterns specific to cortex-x.
3. **`cortex/qa/testing-gaps.md`** — 24 gaps prioritized: 4 P0 (adversarial regression suite, StrykerJS mutation, evals/ runner, tool-call validation) + 14 P1 (testing + DevOps) + 5 P2 + 4 SKIP + 3 OPEN. Single highest-leverage finding: GAP-001 + GAP-002 ≤12h each, both produce regression artifact protecting Sprint 2.x burn-in.

This validates the Sprint 2.10 prompt on a real (non-tmpdir) repo — non-application framework with autonomous-agent surfaces. Audit's selection oracle correctly filtered out a11y / e-commerce / regulated-industry categories; correctly escalated AI-eval + security to P0 given Q1 risk model.

**Sprint 2.10.5 — colleague-onboarding tutorial:**

`docs/qa-tester-onboarding.md` — day-1 walkthrough for the new junior tester: setup (5 min), first audit (30 min run + 30 min review), Phase 3 question discipline, week-1 cadence, philosophy (audit-then-research-first, mutation > coverage %, determinism is dead, defense-by-design ≠ defense-by-test). References pre-cached <colleague-company> dogfood as worked example.

**Sprint 2.10.5 — README.md profile section** — visible at top install instructions; profile selection table (dev / qa-tester / ai-engineer / minimal); 3 ways to set (interactive / env / CLI flag); link to qa-tester-onboarding.md.

**Sprint 2.10.6 — Phase 1b existing-tests modernization analysis** (operator: "do profilu přidat, že pokud už tam existují nějaké testy, tak se analyzují, udělá se na ně research na webu, a tak dále analyzuje, vyhodnotí"):

When `profile: qa-tester` AND repo has > 0 existing test files (skip greenfield):
1. **Detect existing test frameworks/tools** — Vitest/Jest/node:test/Playwright/Cypress/@testing-library/axe-core/Stryker/fast-check/Pact/MSW/Storybook/Nx (12 tool categories)
2. **Parallel WebSearch dispatch (cap 5 tools per audit)** — each agent: 200-word memo with 3 modern patterns + 3 anti-patterns (with detection regex if possible) + 1 migration recipe + 5+ cited URLs
3. **Apply findings to existing test files** — match anti-patterns / deprecated patterns / upgrade opportunities per file
4. **Output**: extend `cortex/qa/test-inventory.md` with "Modernization opportunities (Phase 1b)" section + per-file findings table + research cache pointers
5. **Feed into testing-gaps.md** as P1 (high-severity) or P2 (medium/low) `[type: smell-modernization]` — NEVER P0 (existing tests still pass; modernization is improvement, not block-release)

**Why Phase 1b matters**: junior tester inheriting a repo defaults to "tests work, don't touch" — preserves bit-rot. Phase 1b surfaces 2024-best-practice patterns deprecated in 2025-2026 + green-test-but-defective anti-patterns + upgrade paths the original author didn't track. Calibrates tester's "what's a good pattern?" judgment via citation chains week by week.

**Cost guard**: 5 tools × ~60K tokens ≈ ~300K total per audit (Max x20 covers; metered API gets warning). `--no-existing-tests-analysis` flag skips entirely.

**Profile + tests synchronized**:
- `profiles/qa-engineer.yaml`: `analyze_existing_tests: { enabled: true, trigger_threshold: 1, max_tools_per_run: 5, backlog_type_tag: smell-modernization, cost_guard: {...} }`
- `tests/unit/qa-retrofit-structure.test.cjs`: 12 new test groups (6 self-audit + 5 Phase 1b + 1 README/tutorial cross-ref)

**Tests**: 1765 → **1777** (+12).

### Added (2026-05-10 morning — Sprint 2.10.4 follow-up: inline-merge research corrections + 5 new entries (112→117) + live install end-to-end smoke)

**Operator:** "pokračuj merge research findings do test-types-catalog" + "otestuj to sám na nějakém novém složce, zda vše funguje jak má".

**Inline-merge of 5-agent research corrections (148 cited URLs)** into individual catalog entries — previously only an apendix at bottom; now each affected entry has 2026 sources + corrections inline at point of use:

- `security-sast-static`: Semgrep wins (46% vs SonarQube 19%); CodeQL deepest dataflow (free for OSS via GHAS); SonarQube positioned as different category (quality + security combined)
- `security-sca-deps`: **`npm audit` flagged deprecated as sole gate** → osv-scanner v2.3.5+ canonical
- `security-secret-scanning`: **Run BOTH** gitleaks pre-commit + trufflehog CI (different layers)
- `security-iast-instrumented`: **standalone IAST consolidating into ADR** in 2026; Contrast still leader
- `security-fuzz-binary`: **libFuzzer maintenance-only since late 2022** → AFL++ for greenfield
- `ai-eval-suite-rubric`: **two-tool 2026 consensus** = Promptfoo/DeepEval (CI) + Braintrust (prod)
- `ai-prompt-injection-regression`: **three-tool quorum** = garak + PyRIT + Promptfoo
- `ai-hallucination-detection`: **Patronus Lynx is current SOTA** (open Llama-3 fine-tune, beats GPT-4o by 8.3%)
- `ai-determinism-guard`: **DETERMINISM IS DEAD in 2026** — `seed=0` best-effort on OpenAI; Anthropic exposes none. Use property-based + LLM-judge tests, not snapshots
- `devops-iac-lint`: **dead tools called out** (kubeval, Datree, copper, config-lint, Terrascan, standalone tfsec) → live stack kube-linter + Polaris (k8s); TFLint + Trivy config + Checkov (Terraform)
- `devops-action-pinning`: **March 19 2026 trivy-action compromise** → SHA-pin alone insufficient; stack = pinact + StepSecurity Harden Runner
- `devops-sbom-generation`: **EU CRA mandates CycloneDX 1.6+ or SPDX 3.0.1+** for products sold in EU after 2027-12-11
- `reliability-chaos-injection`: Chaos Mesh edges Litmus for K8s-first 2026
- `perf-load-k6`: k6 wins JS/TS, Gatling wins JVM (210K RPS), JMeter retired
- `perf-budget-lighthouse`: **INP unmeasurable in lab** → use TBT <200ms as Lighthouse-CI proxy; 43% of sites still fail INP
- `compliance-wcag-22-aa`: EAA enforcement live since 2025-06-28; existing services 2030-06-28 transition; penalties €100K/4% revenue
- `compliance-pci-dss-l4`: **v4.0.1 only active version**; 51 future-dated requirements enforceable since 2025-03-31
- `compliance-eu-ai-act`: **2026-08-02 hard deadline** (Annex III) unless Digital Omnibus defers to 2027-12-02
- `compliance-soc2-evidence`: Vanta (best SMB) / Drata (strongest implementation) / Sprinto (budget tier)

**5 new entries added (112 → 117 total)**:
1. `regression-confirmation-istqb` (functional, NEW) — explicit ISTQB CTFL v4.0.1 change-related testing distinction (regression vs confirmation)
2. `reliability-cache-poisoning` (reliability, NEW) — Socket.dev pattern post axios hijack March 2026 + SANDWORM_MODE incidents
3. `ai-mcp-protocol-test` (ai-eval, NEW) — MCP Inspector + stdio/HTTP transport tests; 97M monthly SDK downloads Feb 2026
4. `ai-a2a-protocol-test` (ai-eval, NEW) — Agent-to-Agent v1.0 protocol surfaces; tooling early stage
5. `ai-agent-multi-turn-simulation` (ai-eval, NEW) — distinct from `ai-multiturn-conversation`; asserts multi-step plan + tool-use convergence to goal (relevant for cortex-x Steward)

**Profile + tests synchronized**:
- `profiles/qa-engineer.yaml`: `total_entries: 112` → `117`; category counts updated (functional 18, reliability 10, ai-eval 15); `research_validated` field added
- `tests/unit/qa-retrofit-structure.test.cjs`: 6 new test groups verifying inline-merge happened + 5 new entries present + count is 117

**Live install end-to-end smoke test (operator-requested)**:
- Tested `bash install.sh CORTEX_PROFILE=qa-tester CORTEX_LANGUAGE=cs` in fresh `mktemp -d` isolated home
- ✅ `/test-audit` user-skill installed at `~/.claude/skills/test-audit/SKILL.md`
- ✅ `/cortex-init` also installed (qa-tester gets BOTH)
- ✅ `~/.claude/cortex/user.yaml` has `profile: qa-tester` + `language: cs`
- ✅ Banner shows QA-tailored "Next step" with `/test-audit` first + qa-engineer profile reference + standards read-first list
- ✅ `test-types-catalog.md` (55KB) + `qa-engineer.yaml` (12KB) + `qa-retrofit.md` (40KB) all present in `~/.claude/shared/`
- ✅ Install verification: 40 pass, 2 warn, 0 skip (warns are pre-existing cortex-steward bash shim path issue, unrelated to qa-tester)
- ✅ Default `dev` profile in second isolated home: only `cortex-init` skill installed, NO `test-audit` at user level, `profile: dev` in user.yaml — confirms profile selection actually differentiates

**Tests**: 1759 → **1765** (+6 new structure tests).

### Added (2026-05-10 morning — Sprint 2.10.4 exhaustive test-types catalog SSOT + 5-agent web research validation)

**Operator request 5:** "ať náš QA tester profil obsahuje všechny možné druh testování úplně všechny, ale použije je jen podle scanu retrofitu co zjistí" + follow-up "udělej na to i research na webu".

**Shipped Sprint 2.10.4:**

1. **`standards/test-types-catalog.md`** — exhaustive 112-entry catalog across 12 categories (functional 17 + perf 8 + security 19 + reliability 9 + correctness 6 + contract 6 + a11y 6 + ai-eval 12 + devops 14 + data 4 + compliance 8 + docs 3). Each entry: Category / What / Tools 2026 / When to use / Skip when / Effort (S/M/L) / Tester skill floor (junior/mid/senior).

2. **Profile owns SUPERSET, audit picks SUBSET.** `profiles/qa-engineer.yaml` references the catalog via `test_types_catalog: { source, total_entries: 112, categories: 12, selection_principle: "Apply the LEAST testing necessary to verify the most critical risks" }`. Typical audit picks 12-25 of 112.

3. **Phase 5a-bis catalog-selection oracle** in `prompts/qa-retrofit.md` — maps audit findings × catalog `when_to_use` triggers, filters by stack (drop AI category if no LLM SDK), tiers by Q5 capacity (junior solo skips senior-only types), escalates by Q3 compliance + Q1 risk-tier. Outputs `cortex/qa/AUDIT.md § "Catalog selection (Phase 5a-bis)"` with selected types + skipped-with-rationale.

4. **5 parallel web-research agents (148 cited URLs total)** validated catalog entries:
   - Research 1 (taxonomy, 22 URLs): ISO/IEC 25010:2023 9 chars confirmed; **Bach HTSM has 4 axes, not 2** (Project Environment + Product Elements/SFDPOT + Quality Criteria/CRUCSPIC STMP + Test Techniques/FDSFSCURA-9); ISTQB CTFL v4.0.1 current; 5 post-2024 additions to track for next refresh.
   - Research 2 (security, 32 URLs): **`npm audit` deprecated as sole gate → osv-scanner v2.3.5+**; **libFuzzer maintenance-only since late 2022 → AFL++**; **IAST consolidating into ADR**; Schemathesis 4.5x next-best confirmed; ASVS 5.0 released 2025-05-30; OWASP API Top 10 2023 still current (BOLA #1, ~40%); OWASP LLM Top 10 2025 (PDF v4.2.0a) — LLM01 Prompt Injection still #1.
   - Research 3 (AI/LLM, 35 URLs): two-tool eval consensus = **Promptfoo/DeepEval (CI gate) + Braintrust (prod observability)**; three-tool prompt-injection quorum = **garak + PyRIT + Promptfoo**; Patronus Lynx is hallucination SOTA; **determinism is dead** (seed=0 best-effort, use property-based + LLM-judge); cost-threshold pattern = `cost < $0.005/call` fail-PR; **EU AI Act high-risk 2026-08-02 hard deadline** (Annex III); MCP+A2A testing is new category cortex-x has zero coverage for (97M monthly SDK downloads Feb 2026).
   - Research 4 (DevOps, 25 URLs): **dead tools** (kubeval, Datree, copper, config-lint, Terrascan, standalone tfsec); **live stack** (kube-linter + Polaris; TFLint + Trivy config + Checkov); SHA-pin alone insufficient (32% top actions unpinnable); March 19 2026 trivy-action compromise reshaped consensus → pinact + StepSecurity Harden Runner; EU CRA mandates CycloneDX 1.6+ or SPDX 3.0.1+; Chaos Mesh edges Litmus K8s-first.
   - Research 5 (perf+a11y+compliance, 34 URLs): k6 wins JS/TS, Gatling wins JVM (210K RPS), JMeter retired; **INP unmeasurable in lab → use TBT <200ms as Lighthouse-CI proxy**; 43% of sites still fail INP; WCAG 2.2 AA is 2026 target (AAA NOT mandated); **EAA enforcement live since 2025-06-28** (existing services 2030-06-28 transition, penalties €100K/4% revenue); PCI-DSS v4.0.1 only active version; **EU AI Act high-risk 2026-08-02** confirmed.

5. **Catalog now flags missing entries for Sprint 2.10.5 refresh:** `ai-mcp-protocol-test`, `ai-a2a-protocol-test`, `reliability-cache-poisoning` (Socket.dev pattern post-axios hijack), `change-related-regression-confirmation` as explicit ISTQB CTFL v4.0.1 type, `ai-agent-multi-turn-simulation` distinct from `ai-multiturn-conversation`.

6. **Raw research caches archived** at `c:\tmp\catalog-research-{1..5}-*.md` (148 cited URLs total grounding the catalog).

**Tests**: 1749 → **1759** (+10) — 10 new structure tests covering catalog SSOT existence, 12-category enumeration, selection rules + Phase 5a-bis cross-reference, 148-cited-URL section, research corrections (HTSM 4-axis, npm-audit deprecated, libFuzzer maintenance-only, IAST→ADR), 2026 compliance dates (ASVS 5.0, EAA, EU AI Act, PCI-DSS), and missing-for-next-refresh flags (MCP, A2A, cache-poisoning).

### Added (2026-05-10 early morning — Sprint 2.10.2 installer profile + 2.10.3 auto-research-per-gap)

**Sprint 2.10.2 (operator request 3):** "když uživatel nainstaluje cortex, ať si může vybrat profil — testerka the junior tester si vybere QA tester a hned dostane vše potřebné". Installer extended:

- `install.sh` + `install.ps1` accept `--profile=<name>` CLI arg, `$CORTEX_PROFILE` env, OR interactive prompt (TTY-gated). Profiles: `dev` | `qa-tester` | `ai-engineer` | `minimal`.
- For `qa-tester`: installs `/test-audit` user-skill at `~/.claude/skills/test-audit/SKILL.md` (sibling of `/cortex-init`), writes `profile: qa-tester` to `~/.claude/cortex/user.yaml`, banner shows QA-tailored "Next step" with `/test-audit` first + qa-engineer profile reference + standards-to-read-first list.
- Default `dev` install unchanged — `/test-audit` stays at `shared/skills/test-audit/` only (canonical), no user-level promotion.
- Integration tests (`tests/integration/install-roundtrip.test.cjs`) exercise both paths: qa-tester install creates user-skill + writes profile field + banner mentions `/test-audit`; default install does NOT install user-level `/test-audit` (keeps default lean).

**Sprint 2.10.3 (operator request 4, junior-tester focused):** "do toho QA tester profilu implementuj, že všechny nálezy budou automaticky proscanovány research na webu... ona je mladá holka bez zkušeností". Auto-research-PER-GAP:

- New Phase 5f in `prompts/qa-retrofit.md` — when `profile: qa-tester` is active (auto-detected from `~/.claude/cortex/user.yaml`), every P0 + top-P1 gap (cap 15) gets a parallel WebSearch agent dispatch. Each agent writes a 200-word memo: 3 implementation patterns + 2 anti-patterns + 1 minimal-working-example code/config snippet + 5+ cited URLs.
- **Inline append to `cortex/qa/testing-gaps.md`** — synthesizer attaches `**Research findings (auto-fetched <date>)**:` block under each gap entry. Junior tester opens the deliverable + sees implementation know-how next to the gap, no separate research step required.
- 3-wave parallel dispatch (5 agents per wave) — 15 gaps ≈ ~5 min added to audit; ~900K tokens total (Max x20 covers easily; metered API gets warning).
- Privacy guardrail: research queries derived from generic gap titles, NOT from audit's repo-internal findings text. Repo internals stay off the public web.
- `profiles/qa-engineer.yaml` declares `auto_research_per_gap: { enabled: true, max_gaps: 15, parallel_waves: 5, apply_to: [P0, P1], cost_guard: {...} }`. Override via `--auto-research-gaps` / `--no-auto-research-gaps`.

**Why this matters for junior testers** (Shekhar 2026 cited): removes cold-start tax (gap entry already populated with patterns + sources), calibrates "what's a good source?" judgment via citation-chain examples, reduces hallucination class of bug, builds confidence reviewing AI-suggested fixes alongside senior teammates.

**Tests**: 1737 → **1747** (+10 from 2.10.2 — 8 structure + 2 integration); 1747 → **1751** (+4 from 2.10.3 structure tests covering Phase 5f + auto_research_per_gap profile config). Final: 1349 → **1751** (+402 today).

### Added (2026-05-09 late night — Sprint 2.10.1 DevOps/CI + auto-research-nudge + <colleague-company> dogfood)

**Operator-driven same-day extension after Sprint 2.10 + manual dogfood pass on `<colleague-storefront-repo>` + `<colleague-admin-repo>`** (private repos cloned to `c:/tmp/qa-dogfood/`, deliverables mirrored to `docs/dogfood/<colleague-company>-2026-05-09/`).

**Sprint 2.10.1 expansion (operator request 1):** "doplň do toho testing profilu i devops a podobné CI věci" — `qa_concerns` taxonomy expanded from **10 → 15** (testing-only + DevOps/CI quality):
- `ci-pipeline-testing` — `actionlint`, `pinact`, gate consistency (PR runs what main runs?), secret hygiene
- `iac-testing` — `kubeval`, `kube-linter`, `tflint`, OPA/Conftest, drift detection
- `container-security` — `hadolint`, `Trivy`/`grype`, `syft` SBOM, SLSA provenance
- `deploy-safety` — canary/blue-green, post-deploy smoke, observability assertion, DORA metrics
- `secret-supply-chain` — `gitleaks`, `osv-scanner`, `npm-audit` policy, action pinning

**Auto-research-nudge pattern (operator request 2):** "ať cortex sám doporučuje researche na webu, ať to lidi konečně pochopí jak je OP dělat researche". Every gap in `cortex/qa/testing-gaps.md` ships with inline `**Research nudge:**` line proposing a WebSearch query. Trains junior testers in the audit-then-research-first discipline. New `prompts/qa-retrofit.md` Phase 5e generator behavior + `profiles/qa-engineer.yaml auto_research_nudge: { enabled: true, apply_to: [P0, P1, P2], skip_for_trivial: true }`.

**Dogfood deliverables (`docs/dogfood/<colleague-company>-2026-05-09/`):**
- `README.md` — preview-flow brief for the colleague + top-line findings + caveats
- `eshop/` — AUDIT.md (12-section ISO 25010:2023) + testing-strategy.md + testing-gaps.md (20 gaps: 5 P0 / 10 P1 / 5 P2 / 4 SKIP / 2 OPEN / 1 FYI)
- `admin/` — same shape; 28 gaps (5 P0 / 11 P1 testing / 7 P1 DevOps/CI / 5 P2 / 4 SKIP / 3 OPEN / 1 FYI)

**Top-line findings, joint pattern across both repos:** "Tests written, gate missing." 200+ test files exist + Playwright + Docker e2e infra staged + payment gateway specs + 97-spec backend-integration suite — but PR gates run `vitest` only (eshop) or `nx affected:build` only (admin, NO tests). One-line CI fix per repo closes ~70% of the runtime risk class.

**Top eshop findings:** Money-path E2E gap (no full guest-checkout-to-paid coverage); zero a11y/mutation/property/visual; payment-gateway tests are unit-only. Strong unit foundation in critical-path utilities.

**Top admin findings:** PR gate runs ZERO tests (single biggest fix-multiplier); auth + RBAC + tenant-isolation tests = 0 (Security score 1/5); `libs/emails` 0 tests on money + auth path templates. `apps/backend-integration` 97-spec suite is gold standard — preserve.

**Tests**: 1647 → **1737** (+90 from Sprint 2.10 → 2.10.1) — 49 structure tests now cover Sprint 2.10.1 expansion (DevOps concerns + auto-research-nudge + Phase 5e prompt section).

### Added (2026-05-09 late evening — Sprint 2.10 QA Retrofit)

**Sprint 2.10 (QA Retrofit infrastructure)** — depth-first testing-lens audit pipeline. Operator request: "udělej cortex master of testing guru pro novou kolegyni testerku — projet jak červ celý projekt, najít všechny slabiny, ale opravdu hluboké a dávající smysl, ne flat testing." Field-test target: `<colleague-storefront-repo>` + `<colleague-admin-repo>`. R1 memo: `docs/research/sprint-2.10-qa-retrofit-2026-05-09.md` (web-research-dispatch-backed, 38 cited sources across 4 parallel research agents).

**What shipped**:
- `prompts/qa-retrofit.md` — 7-phase testing-focused audit (P0 detect → P1 inventory + tsDetect 5-detector smell scan → P2 4-agent ISO 25010:2023 9-char + 3 cortex extras with Bach HTSM SFDPOT depth traversal → P3 5-Q human gate → P4 QA-specific 10-concern research → P5 testing-strategy.md + testing-gaps.md synthesis → P6 sample-test seeding opt-in)
- `profiles/qa-engineer.yaml` — framework-agnostic lens; risk-tiered quality gates (high-risk: 80% line + 70% branch + 75% mutation, mid: 70/60/60, low: advisory); CI gating philosophy (block-on-red / soft-block / inform-only / nightly-only); ASVS L1/L2/L3 compliance mappings
- `templates/testing-strategy.md.hbs` + `templates/testing-gaps.md.hbs` — Handlebars templates with full 3-hop citation traceability slots (claim → finding ID → source URL); 9 ISO 25010:2023 char target rows; pyramid plan (now / 3mo / 12mo); P0/P1/P2/SKIP/OPEN/off-limits backlog format
- `shared/skills/test-audit/SKILL.md` — `/test-audit` slash command, auto-distributed via existing `install.{sh,ps1}` `shared/*` recursive copy
- `agents/planner.md` — extended with QA-engineer profile override (10 QA-specific concerns: e2e-strategy, unit-fitness, contract-testing, security-testing, perf-testing, a11y-testing, ai-eval, test-observability, mutation-fitness, risk-based-prioritization); topic naming `{stack-or-profile}-qa-{concern}-{year}`

**Positioning** (research-grounded): "AI-augmented tester" not "tester replacement". 75% of orgs target AI testing, only 16% successfully adopt — differentiator is starting with audit baseline before automating (testdevlab 2026). cortex-x test-audit closes that gap with senior-consultant-grade deliverable on day 1.

**Grounded in**: ISO/IEC 25010:2023 (9 chars including new Safety), OWASP ASVS 5.0 (May 2025), Bach HTSM SFDPOT, Feathers characterization tests + seams, Gregory/Crispin Agile Testing Quadrants, Peruma et al. tsDetect FSE'20 (5-detector starter at 85-100% precision), Trail of Bits 2026 mutation-testing-for-the-agentic-era, Anthropic Claude Code best-practices doc.

**Tests**: 1601 → 1647 (+46) — `tests/unit/qa-retrofit-structure.test.cjs` validates artifacts exist + structure + cross-references + 30+ cited sources in R1 memo + 3-hop traceability tags in templates.

### Added (2026-05-09 evening — Sprint 2.9.7 + 2.9.7a + 2.9.7b property tests + bug fix)

**Sprint 2.9.7 (commit `dec9acf`)** — three coordinated tracks for "all-green cron":
- **Track 1**: 3 fresh LLM-able items in `cortex/recommendations.md` (TROUBLESHOOTING section append, JSDoc on `loadAllowedUserIds`, `CORTEX_TOOL_SPEC_VERSION` constant) — append-only edits well under spec-verifier shrink threshold.
- **Track 2**: Surgical exitCode=0 fix — `SPEC_VIOLATION` block-criterion failures (defense layer working as designed) + `STEWARD_AUTORESEARCH_ALL_CANDIDATES_FAILED` (ensemble defense) now return `exitCode:0` so cron dashboards don't false-fail. Result shape stays `ok:false + code:SPEC_VIOLATION` (existing test contract intact). Other SPEC_* codes (MALFORMED, PREDICATE_THREW, etc.) stay exit 1 — those indicate internal bugs, not defense doing its job.
- **Track 3**: 6 new cron workflow YAMLs for action_kinds without cron coverage (`steward-doc-drift`, `steward-test-coverage-gap`, `steward-pr-review-responder`, `steward-flaky-test-repair`, `steward-lint-fix`, `steward-tech-debt-audit`). Cron schedules staggered to avoid concurrent runs.

**Sprint 2.9.7a (commit `47cc2a7`)** — R2 hardening pass (3 reviewers in parallel: blind-hunter + security-auditor + edge-case-hunter):
- **R2 edge-case HIGH (NaN/Infinity exitCode)**: `typeof NaN === 'number'` passed naive guard; `process.exit(NaN)` coerces to 1, `process.exit(256)` wraps to 0. New helper `validExitCodeOrDefault(value, fallback)` enforces `Number.isInteger(x) && x >= 0 && x <= 255`. Both CLI exit + orchestrator propagation now route through it.
- **R2 security HIGH (qlty pipe-to-shell)**: `curl … | bash` from `qlty.sh` removed from `steward-tech-debt-audit.yml`. With `contents: write` + `pull-requests: write` permissions, a compromised qlty.sh could execute arbitrary code with full PR-write. Detector already fail-opens cleanly when qlty is missing (`status:'qlty-missing'` → `code:TECH_DEBT_QLTY_MISSING` → journal records skip). Operators install qlty manually if they want full audit.
- **R2 security MEDIUM (flaky_test_repair path allow-list)**: detector now restricts edits to `*.test.* / *.spec.* / __tests__/ / tests/ / test/` paths via `isTestFilePath()` predicate. Production source files with misplaced `HERMES-FLAKY` markers are simply skipped (operator error gets ignored, not amplified into a `.skip` on real test suites).
- Plus minor cleanups: cost-cap env on deterministic skip_commit workflows (shared-ledger gate against prior LLM spend), recommendations Item 7 wording clarification, unused import drop, `idx > 0` → `idx >= 0`.

**Sprint 2.9.7b (commit `2c8a290`)** — property-based test pass + bug fix:
- 78 new hand-rolled property tests (zero-deps, same pattern as Sprint 1.6.21):
  - annotation-routing 16-permutation exhaustive sweep
  - bash forbidden-pattern: 32 known-bad commands all detected; 24 known-safe commands (legitimate cleanup, mentions of dangerous patterns in strings) all NOT false-positive; idempotency
  - glob.globToRegex: literal match, single-star path-separator boundary, double-star recursive crossing, brace alternation recursive translate, question-mark single-char, 50 random patterns no-throw, malformed char-class surfaces typed `TOOL_GLOB_PATTERN_INVALID` at handler boundary
  - memory-decay: importance score non-negative + finite for 100 random items, decay floor prevents underflow on extremely old items (1970-era ts), impact ordering at equal age+freq, monotonicity in frequency, monotonicity in age, decayPass partition completeness
- **Real bug surfaced + fixed**: `bin/steward/_lib/memory-decay.cjs decayPass()` now actually enforces Sprint 2.8 R1 acceptance criterion "zero blocker lessons archived". Old behavior took bottom N% scored items irrespective of impact (could archive blockers if their score was low — e.g. very old + low frequency). New behavior: filter scored into nonBlockers + blockers; archive ONLY from nonBlockers pool capped at nonBlockers.length; blockers always kept.

**Sprint 2.7.1 R1 memo (autonomous evening session)** — `docs/research/sprint-2.7.1-pattern-transfer-llm-dispatch-2026-05-09.md`. Design for closing `pattern_transfer` `ACTION_KIND_NOT_DISPATCHABLE` gap (sibling-reader + LLM dispatch + assertEditWithinCwd hook + 3 acceptance criteria). Awaiting operator approval before implementation.

**Sprint 2.3 R1 memo (autonomous evening session)** — `docs/research/sprint-2.3-mutation-testing-fitness-2026-05-09.md`. Web-research-dispatch-backed (10 sources). Recommendation: StrykerJS 9.6 incremental mode + risk-tiered thresholds (80% `bin/steward/_lib`, 70% orchestrators, 75% `bin/cortex/tools`, 60% advisory `detectors/`). Companion fast-check property tests (already established pattern via Sprint 2.9.7b). Defer Meta ACH LLM mutation generation to Sprint 3.x. GHA quota burn flagged HIGH; mitigation = weekly nightly only OR self-hosted runner.

**OPERATOR_HANDOVER.md** — tomorrow-morning checklist for billing/quota fix + workflow re-trigger sequence.

**Tests**: 1349 → 1601 (+252 today total — 2026-05-09 marathon session: Sprint 2.9 + 2.9.0a + 2.9.6{a-e} + 2.9.7 + 2.9.7a + 2.9.7b + 4.7 rebrand + property tests + bug fix).

### Fixed (2026-05-09 — Sprint 2.9.6 dry-run dispatcher gap)

Pre-existing v0.7-era bug surfaced during the "turn on all crons" session
manual triggers: `bin/steward/dry-run.cjs` only handled `recommendation` and
`recommendation_harvest` kinds. Cron workflows for `todo_triage` (Sprint 1.8.7)
and `dep_update_patch` (Sprint 1.8.4) had been registered for months but never
ran successfully end-to-end — both fell through to the default LLM path and
failed with `OpenRouter response did not contain message content` or wasted
the daily cap by picking unrelated recommendations.

Fix: added `buildDeterministicPlan` helper + dispatch branches for all 9
deterministic kinds (`todo_triage`, `dep_update_patch`, `flaky_test_repair`,
`doc_drift`, `lint_fix_shipper`, `test_coverage_gap`, `pr_review_responder`,
`tech_debt_audit`, `pattern_transfer`). Each kind builds a synthetic plan
that the executor (`execute.cjs`) picks up + dispatches to its dedicated
runner; the runner re-detects against the live tree at execute-time for
atomic rollback semantics.

`pattern_transfer` is registered but its executor is `ACTION_KIND_NOT_DISPATCHABLE`
per Sprint 2.7.1; the new dispatcher mirrors that as `no_actionable_step` so
operators see the gap explicitly rather than getting surprise LLM costs.

Also: `recommendations.md` existence + parse + slug-check is now gated to
kinds that actually read it (only `recommendation` + `recommendation_harvest`).
Deterministic kinds run cleanly on bare repos without `cortex/recommendations.md`.

10 new unit tests in `tests/unit/steward/dry-run-dispatcher.test.cjs` lock
the fix in place. Tests: 1502 → 1512 (+10).

### Added (2026-05-09 — Sprint 2.9 Tools Foundation v0 ⭐ STRATEGIC)

Sprint 2.9 ships a portable, MCP-shaped tool descriptor format + 6 reference tools + 4 runtime adapters + annotation routing. Strategic interoperability moat: same descriptor runs in Steward, Claude Agent SDK, Vercel AI SDK, OpenAI Agents, and any MCP client (Cursor, Codex, Aider, Windsurf). Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) auto-wire into Sprint 1.9.0 spec-verifier + 1.9.1 cost windows + halt-check.

R1 memo: [`docs/research/sprint-2.9-tools-foundation-2026-05-09.md`](docs/research/sprint-2.9-tools-foundation-2026-05-09.md) — 14 sources cited, recommendation Option (b) neutral spec + adapters, MCP as the spec format (donated to Linux Foundation Dec 2025; Anthropic's own Claude Agent SDK already speaks MCP via `createSdkMcpServer`).

**Files added (`bin/cortex/tools/`)**:
- `_spec.md` — descriptor format + JSON Schema example + cross-runtime mapping table.
- `_lib/validate-descriptor.cjs` (~280 LoC) — strict validator with cross-checks: name regex, additionalProperties:false, $ref walker (no false-positives on enum values), AsyncFunction.constructor.name strict check, annotation consistency cross-check.
- `_lib/path-safety.cjs` (~150 LoC) — `isWithinCwd` (target + parent modes), `assertPathSafe`, NUL byte + UNC + Windows device-prefix rejection. SSOT for filesystem containment.
- `_lib/limits.cjs` — single source for MAX_FILE_BYTES, MAX_RESULTS, MAX_DEPTH, BASH_*, MCP_MAX_LINE_BYTES, GREP_PER_LINE_REGEX_DEADLINE_MS.
- `_lib/annotation-routing.cjs` (~120 LoC) — maps annotations to required safety gates (spec_verifier, halt_check, cost_windows, retry_safety).
- `read.cjs` / `write.cjs` / `edit.cjs` / `glob.cjs` / `grep.cjs` / `bash.cjs` — 6 reference tools borrowing Claude Code taxonomy in MCP-shaped descriptors.
- `_adapters/toMcpServer.cjs` (primary, stdio JSON-RPC) — protocolVersion 2025-11-25, full `tools/list` + `tools/call` + `initialize`, proto-pollution defense, 10 MiB buffer cap, JSON-RPC -32700 parse-error response, notifications get no response.
- `_adapters/toClaudeAgentSdk.cjs` — array for `createSdkMcpServer` + optional Claude Code capitalization (Read/Write/Edit/...).
- `_adapters/toOpenAiAgents.cjs` — `FunctionTool` POJOs with `strict_json_schema` default true.
- `_adapters/toVercelAiSdk.cjs` — JS stub (TS adapter with Zod re-wrap deferred to 2.9.5).
- `index.cjs` — palette + null-prototype `TOOL_BY_NAME` lookup + eager filename-match validation at module load.
- `templates/skills/example-using-cortex-tools.md` — operator-facing SKILL.md template.

**Tests added (`tests/unit/cortex-tools/`)**: 153 tests across 6 files (validator + tool handlers + adapter roundtrip + annotation routing + path-safety + Tier 5 catalog hash drift detector).

**Defense-in-depth surface (R2 hardening pass)**:
- TOCTOU symlink-swap defense in `write` + `edit` via POSIX `O_NOFOLLOW`.
- Bash forbidden-pattern REGEX list: rm -rf for `/{home,etc,usr,var,opt,root,boot,lib,sbin,bin,sys,proc}` + `/$` + `/*` + `$HOME` + `~`; disk-device writes to `> /dev/{sd*,nvme*,hd*,xvd*,vd*}`; pipe-to-shell across curl/wget/fetch → sh/bash/zsh/ksh/fish/python/ruby/perl/node; process substitution `bash <(curl)`; eval/source curl; halt with full trailing context; Windows `del /F /S /Q`, `format X: /Y`, `Remove-Item -Recurse -Force`.
- Bash env scrub switched from denylist (5 keys) to ALLOWLIST (PATH, HOME, USER, USERPROFILE, LANG, TZ, SHELL, TEMP, TMP, SystemRoot, COMSPEC + STEWARD_BASH_ENV_PASSTHROUGH).
- Bash output buffer = Buffer arrays sliced by bytes (UTF-8 multibyte truncation defense).
- Bash empty `STEWARD_BASH_ALLOWLIST` (after trim) FAIL-CLOSED instead of silent-disable.
- Bash spawn null-check stdout/stderr + sync-error handler.
- Bash `\s` Unicode whitespace + `/u` flag for NBSP/NNBSP/MMSP/IDEOGRAPHIC bypass defense.
- `read.cjs` magic-byte sniff for binary files (NUL byte in first 8 KiB → `TOOL_READ_BINARY`).
- `read.cjs` EOL detection (lf/crlf/mixed) for round-trip fidelity.
- `edit.cjs` non-overlapping count fix (`aa` in `aaaa` counts 2, not 3).
- `edit.cjs` shrink defense applied unconditionally (was inverted boolean — replace_all=true is MORE destructive, not less).
- `edit.cjs` directory-target rejection + `not-a-file` rejection.
- `write.cjs` directory-target rejection + parent-not-directory rejection.
- `glob.cjs` recursive alternative translation (`{*.cjs,*.js}` no longer crashes).
- `glob.cjs` Windows-friendly `dev:ino==0:0` path-key fallback.
- `grep.cjs` per-line regex deadline (50ms → ReDoS defense).
- `grep.cjs` count-mode `total_matches` accurate (was hardcoded 0).
- `grep.cjs` default-exclude `node_modules / .git / dist / build / .next / target / .venv / __pycache__ / ...` (opt-in via `include_noise=true`).
- `validate-descriptor.cjs` strict `AsyncFunction.constructor.name` check.
- `validate-descriptor.cjs` `$ref` walker (no JSON.stringify false-positive).
- `validate-descriptor.cjs` filename-match enforced via `index.cjs` `FILENAME_BY_TOOL` map.
- `toMcpServer.cjs` proto-pollution defense (`__proto__` / `constructor` / `prototype` keys rejected recursively + `Object.create(null)` for lookup).
- `toMcpServer.cjs` 10 MiB buffer cap → JSON-RPC `-32700` on overflow.
- `toMcpServer.cjs` JSON parse-error response (was stderr-only).
- `toMcpServer.cjs` notifications get no response per JSON-RPC spec.
- `toMcpServer.cjs` `additionalProperties: false` enforced when `properties` is empty.

**Out-of-v0-scope findings deferred** (acknowledged in roadmap entry):
- Pattern 2 architectural split (reader-only + writer-only MCP servers) — Sprint 4.0 marketplace.
- Pattern 5 HITL gate on raw MCP for destructive tools — Sprint 2.9.5.
- Pattern 1 `<untrusted>` markers around tool output — Sprint 2.9.5.
- Property-based tests (fast-check) — Sprint 2.3 / 2.9.5 territory.
- Stryker mutation testing config — Sprint 2.3 territory.
- Vercel AI SDK actual TS adapter with Zod re-wrap — Sprint 2.9.5.
- WebFetch + WebSearch tools — Sprint 2.9.5.
- Annotation-routing → action-engine integration — Sprint 2.9.5 (currently a contract module + tests verify it holds; Steward POV is dead code until 2.9.5 wires it).

**Tests**: 1349 → 1502 (+153). All 3 CI lanes green expected.

**R2 review pipeline (6 agents in parallel)** found 6 BLOCKER + 18 HIGH + 9 MEDIUM. All BLOCKERs and key HIGHs fixed in same-commit hardening pass; out-of-scope items documented above.

### Fixed (2026-05-09 — Hardening pass after retrospective R2 review of Sprints 2.6 / 2.7 / 2.8 + Opus 4.7 research)
Operator-requested hardening pass after the 5-sprint Tier-1-expansion run. Three retrospective R2 reviews + Opus 4.7 research dispatch surfaced findings that warranted same-day fixes rather than deferred 2.x.1 commits.

**Sprint 2.6.1 Discord bridge hardening** (R2 retro: 2 BLOCKER + 5 HIGH + 5 MAJOR; addressed BLOCKERs + HIGH-2/3/5 + MAJOR-1):
- **BLOCKER B1: HMAC token reuse defense.** `auth.cjs` now maintains a process-local `Map<actionId+token, expiresAt>` set with 6-minute TTL (4× HMAC window). Replay of an already-consumed `(actionId, token)` pair returns `false` even within the 90s+90s verify window. Test-only `_resetConsumedActionTokens` exposed for test isolation; `markConsumed: false` opt-out for read-only verification flows.
- **BLOCKER B2: `appendRecommendation` no-mkdir + symlink TOCTOU.** `commands.cjs defaultCtx` now `mkdirSync(cortexDir, { recursive: true })` before append (prevents ENOENT on first-ever `/recommend`) and `lstatSync` checks for symlinks (refuses with `DISCORD_RECOMMEND_SYMLINK_REFUSED` rather than following outside repoRoot).
- **HIGH H2: `crypto.randomBytes(8)` actionId** replaces `Math.random().toString(36)` (~30 bits → 128 bits entropy). Combined with B1 consumed-tokens Set, blocks actionId guessing attacks even if confirmation embeds leak.
- **HIGH H3: ephemeral mutation embeds.** All `/halt` / `/resume` / `/recommend` reply objects now `ephemeral: true` so token + reason text are operator-only — no leak to other guild members.
- **HIGH H5: SECRET ≥32 chars.** `HMAC_MIN_SECRET_LENGTH = 32` (was 16). Matches R1 spec ("32+ bytes recommended"). README's `openssl rand -hex 32` produces 64 chars so no operator setup breaks.
- **MAJOR M1: `!` prefix removed from Discord-side names.** Discord API spec rejects slash command names matching `!halt` (regex `[a-z0-9_-]{1,32}`). Renamed Discord-visible names to `halt` / `resume` / `recommend`; mutation flag now lives in `COMMAND_SPECS[].mutation` and `MUTATION_NAMES` Set rather than name-prefix inspection. Existing `isMutationCommand('!halt')` → `isMutationCommandName('halt')`.

**Sprint 2.7.1 pattern_transfer hardening** (R2 retro: 2 BLOCKER + 4 HIGH + 3 MAJOR; addressed BLOCKERs + HIGH-4):
- **BLOCKER B1: `pattern_transfer_no_cross_repo_edit` predicate UNC bypass.** Old predicate `!p.match(/^[A-Za-z]:/) && !p.startsWith("/")` accepted `\\server\share\file` (UNC paths — no leading `/`, no drive letter). New predicate splits on both `/` and `\\` separators, rejects `..` segments per-segment (not substring), rejects bare backslash (`\\`), and rejects UNC prefix (`\\\\`).
- **BLOCKER B2 + HIGH H4: dispatcher loud-fail.** `execute.cjs` now has `else if (plan.action_kind === 'pattern_transfer')` branch that returns `{ ok: false, code: 'ACTION_KIND_NOT_DISPATCHABLE' }` until Sprint 2.7.1 wires the LLM dispatch path. Without this, an operator dropping `cortex/sibling-projects.json` today would fall through to the default LLM branch with no sibling-reader gate. `assertEditWithinCwd` remains exposed as wired-but-dormant pending the dispatcher commit.

**Sprint 2.8.1 Memory Foundation hardening** (R2 retro: 0 BLOCKER + 5 HIGH + 4 MAJOR; addressed HIGH-1/3/5 + M4):
- **HIGH H1: Decay floor at 1e-12.** `memory-decay.cjs computeImportanceScore` previously had `Math.exp(-lambda * days)` underflow to 0 at age ≈ 14,300 days, losing relative ordering between blocker and advisory tiers (everything dropped to score 0 simultaneously, defeating `decayPass({thresholdScore: X})` retention logic). Floor at `Math.max(Math.exp(...), 1e-12)` keeps tier ordering visible across centuries while still ranking aged items below fresh ones. Test exercises ranking stability at 50,000-day age.
- **HIGH H3: Small-list archive policy.** `decayPass` previously archived `floor(items.length * 0.05)` = 0 items for any list under 20 entries (including the typical first-90-days ≤200/slug case). Now archives `Math.max(1, floor(...))` once `items.length >= minArchiveFloor` (default 10) — avoids "decay shock" where weeks 1-19 archive nothing then week 20 abruptly archives 1.
- **HIGH H5: SSOT impact classifier.** Two scattered regexes in `lessonFromExecuteResult` were missing every `CLAUDE_CLI_*`, `TECH_DEBT_*`, and `SIBLING_*` error code shipped in Sprints 2.4/2.5/2.7 — `TECH_DEBT_SNAPSHOT_CORRUPT` was classified as `advisory` instead of `blocker`. New `IMPACT_CLASSIFIER` frozen array (regex → impact) + `classifyImpact(code)` SSOT function covers 22 explicit code patterns. Adding a new code class is one freeze-list entry, no scattered regex drift.
- **M4: NaN-ts handling.** `ageDays` previously returned 0 for malformed `ts: 'garbage'` (silently treating corrupt journal entries as fresh). Now returns `Infinity` → score → 0 → archived. Distinguishes "missing field" (Sprint 1.8.3 backward compat, treat as fresh) from "corrupted journal".

**Anthropic Opus 4.7 hardening** (research dispatch 2026-05-09):
- New `bin/steward/_lib/action-engine.cjs buildOpenRouterRequestBody` strips `temperature`, `top_p`, `top_k`, and `thinking.budget_tokens` from the request body when the model matches `/opus-4-?7/i`. Per Anthropic platform docs (2026-04-16 release): Opus 4.7 returns 400 errors on these parameters. Defense-in-depth — Sprint 2.1 autoresearch sets temperature for diversity, but autoresearch is gated to `recommendation` kind which currently routes to Opus 4.6 in premium tier. The strip helper makes 4.7 routing safe for any future kind.
- Routing-table flip to Opus 4.7 in `recommendation.premium` / `pattern_transfer.premium` / `architecture_review.premium` deferred to Sprint 2.0c — operator-cost-validated canary first (Opus 4.7 has +10.9pp on SWE-bench Pro but +12-27% effective token cost via 35% tokenizer inflation).

**Roadmap markers updated**: ✅ SHIPPED tags on Sprints 2.4 / 2.5 / 2.6 / 2.7 / 2.8 with hardening-status callouts; original sprint memos retained below each marker for design-context preservation.

**Tests: 1337 → 1349 (+12 hardening tests).** All 3 CI lanes pending push.

### Added (2026-05-09 — Sprint 2.8: Memory Foundation v0 — decay primitive + lessons schema extension, ⭐ MEMORY GATE)
- **`bin/steward/_lib/memory-decay.cjs`** (zero-deps, ~150 LoC) — importance-weighted memory decay primitive replacing the Sprint 1.8.3 time-only "3-month unused → delete" rule:
  - Score formula per R1 §6: `U(item, t) = (w_freq × frequency + w_impact × impact) × e^(−λ × age_days)`
  - Default weights: `w_freq=1.0`, `w_impact=2.0` (impact dominates)
  - Half-lives: 30d advisory / 60d warning / 120d blocker (R1 §6 defensible defaults)
  - `computeImportanceScore(item, opts)` — pure function over `{ ts, impact, frequency }`
  - `decayPass(items, opts)` — sorts by score, archives bottom N (default 5%, configurable via `archiveBottomFraction` or absolute `thresholdScore`)
  - `archiveBucket(now)` → `YYYY-WNN` weekly key for archive grouping
  - `isBucketExpired(key, now, retentionWeeks=12)` — 12-week archive retention then hard-delete (R1 §7)
  - Pure logic; fs binding stays in lessons.cjs / journal.cjs callers.
- **`bin/steward/_lib/lessons.cjs` schema extension** (R1 §10):
  - `agent_id` field (default `'default'`) — forward-compat for per-agent memory split (Tier 2 Sprint 3.1 may revisit; for now everything is "default" agent).
  - `failure_origin` field — distinct provenance: `SPEC_VIOLATION:no_destructive_rewrite` for spec violations, `error_code:OPENROUTER_KEY_MISSING` for execute errors. Feeds retrieval-at-decision-time filtering.
  - `impact` field — `advisory` / `warning` / `blocker`, drives `memory-decay.cjs` half-life selection. Auto-derived in `lessonFromExecuteResult`:
    - `SPEC_VIOLATION` / `BILLING_LEAK` / `EDIT_DESTRUCTIVE` / `EDIT_DENYLISTED` / `FORBIDDEN_FLAG` → `blocker`
    - `AUTH_REJECTED` / `KEY_MISSING` / `KEY_MALFORMED` / `NOT_CONFIGURED` / `QUOTA_EXHAUSTED` → `warning`
    - All other transient/protocol-drift codes → `advisory`
  - `frequency` field (default `0`) — retrieval count for importance scoring (Sprint 2.8.1 will increment on every recall).
- **What's deferred to Sprint 2.8.1 (per R1 §13 + extracted from R2 implementation reality):**
  - Anthropic Memory Tool (`memory_20250818`) integration — required dedicated API surface work, defers until claude-cli engine (Sprint 2.4) Max-sub dogfood validates the auth model in production.
  - Retrieval-at-decision-time MaTTS pattern (R1 §5) — currently lessons load at boot; per-action pre-LLM retrieval with K=3 default + K=5 hard cap requires action-engine.cjs integration.
  - Weekly archive sweep cron — `decayPass` is the primitive but the scheduled invocation (operator's nightly cron + 12-week retention enforcement) wires in 2.8.1.
  - ReasoningBank failure-distillation LLM call — schema fields `impact` + `failure_origin` are in place; the actual LLM call (~$0.0002/op via cheap tier) that distills raw `spec_failures` into preventative principles is operator-cost-validated in 2.8.1.
- **Tests**: 30 unit tests covering halfLifeToLambda (NaN/zero/negative guards), impactValue, halfLifeForImpact, ageDays (negative + missing ts clamps), computeImportanceScore (blocker > advisory invariant, frequency boost, half-life decay validation at exact thresholds), scoreItems (no-mutation), decayPass (bottom-5% default + threshold variant + fraction clamping), archiveBucket, isBucketExpired (12-week default + custom retention), lessons schema extension end-to-end (agent_id default, lessonFromExecuteResult impact derivation by code class).
- **Manual verification**: blocker scoring at age=0 ≈ 2.0; advisory at age=30d ≈ 0.05 (1/2 of fresh advisory 0.1, confirms 30-day half-life); blocker at age=120d ≈ 1.0 (1/2 of fresh blocker 2.0, confirms 120-day half-life). `archiveBucket(2026-05-09)` → `2026-W19` (correct ISO-week-style numbering).

### Added (2026-05-09 — Sprint 2.7: pattern_transfer cross-project kind v0, ⭐ FEDERATION SEED)
- **New action_kind `pattern_transfer`** registered as 11th capability (LLM-driven, journal-only). Reads allowlisted sibling projects read-only via `cortex/sibling-projects.json`, distills cross-project patterns into the **current** project's `lessons-learned.jsonl`. **Never** edits sibling repos; spec-verifier guarantees touched files are within `cwd` only.
- **`bin/steward/_lib/sibling-manifest.cjs`** (zero-deps validator):
  - JSON schema (R1 §2 rejects YAML to preserve zero-deps invariant): `version: 1`, `siblings[]: { id (kebab-case), root, read_only: true, purpose, paths_allowed[], paths_denied[] }`.
  - Env expansion: `${HOME}` and `${USERPROFILE}` only — both resolve via `os.homedir()`. Other `${VAR}` references rejected (prevents `${PATH}` traversal).
  - Path normalization: forward-slash + lowercased drive letter on win32.
  - Duplicate-id detection at manifest level.
  - `read_only !== true` rejected (v1 enforces — write-capable siblings deferred forever).
- **`bin/steward/_lib/sibling-reader.cjs`** (zero-deps read facade):
  - `readSiblingFile(sib, relPath)` — allow-list prefix match → deny-list glob match (deny wins) → realpath containment → size cap (1 MB default) → returns content or distinct error code (`SIBLING_NOT_ALLOWLISTED`, `SIBLING_DENIED_PATH`, `SIBLING_REALPATH_OUTSIDE_ROOT`, `SIBLING_SYMLINK_LOOP`, `SIBLING_FILE_TOO_LARGE`, etc.).
  - `listSiblingFiles(sib)` — recursive walk capped at 5K files / depth 12; visited-inode set breaks symlink loops; `e.isSymbolicLink()` skip.
  - `assertEditWithinCwd(path, cwd)` — exposed for execute.cjs spec-verifier hook to enforce the "never edits sibling" invariant.
  - `matchesAnyGlob(relPath, patterns)` — hand-rolled glob matcher supporting `*`, `**`, trailing-slash subtree match, and bare-name match for patterns like `.env*` at any depth.
- **`pattern_transfer` action_kind acceptance criteria**:
  - `lessons_jsonl_grew_with_source_repo` (file_predicate): touched files include `cortex/lessons-learned.jsonl` and the file size ≥ prev size.
  - `pattern_transfer_no_cross_repo_edit` (file_predicate): touched files contain no `..` traversal, no absolute paths.
  - `pattern_transfer_journal_only_ears` (ears_text): WHEN pattern_transfer runs THE SYSTEM SHALL only append to current project lessons-learned.jsonl AND never edit any sibling project.
- **What's deferred to Sprint 2.7.1** (per R1 §13 backlog):
  - `detectors/pattern-transfer.cjs` (currently referenced in registry but not yet implemented; v1 detector is a no-op skip when manifest absent).
  - LLM dispatch in execute.cjs — operator must populate `cortex/sibling-projects.json` + sibling repos before this is dogfood-able. Hook will follow the existing routing-table model selection (Sprint 2.0b) + claude-cli engine (Sprint 2.4) for $0 marginal cost.
  - BM25 retrieval over filenames + first-line + sibling lessons (R1 §4 design); replaced in v0 by simple `listSiblingFiles` + per-file `readSiblingFile`.
  - `<untrusted_source>` delimiter rollout to all LLM action_kinds (Sprint 1.6.20 backlog item promoted by R1 §13).
  - Engine-version pin `>=22.16.1` in package.json (CVE-2025-55130 remediation).
  - TOCTOU `O_NOFOLLOW` last-segment hardening.
  - MCP transport seam research (defer to Sprint 3.x).
- **Tests**: 45 unit tests covering manifest validator (env expansion, kebab-case id, read_only enforcement, duplicate detection, JSON parse errors, schema rejection, env var allowlist) + sibling-reader (allow-list, deny-list precedence, realpath escape, traversal rejection, size cap, symlink loop, glob patterns) + registry presence.
- **Manual verification**: synthetic sibling fixture in `/tmp` exercised; readSiblingFile correctly rejects `secrets/api.key` via deny-list, `.env.local` via glob, traversal `src/../../../etc/passwd` via path validator, and a symlink to outside the sibling root via realpath containment.

### Added (2026-05-09 — Sprint 2.6: Discord remote-control bridge v0 alpha, sibling-folder pattern)
- **`bin/discord-bridge/` sibling folder** — Sprint 2.6 v0 alpha. Zero-deps Steward core (`bin/steward/_lib/*.cjs`) preserved; bridge has its own `package.json` with `discord.js` 14.x as the only top-level dep. Mirrors Sprint 4.8 dashboard sibling-repo pattern.
- **`auth.cjs`** (zero-deps, 100% testable) — 4-layer security per R1 §2:
  1. **Whitelist**: `STEWARD_DISCORD_ALLOWED_USER_IDS` snowflake-shape regex (`^\d{10,32}$`) — fail-closed (empty list = nobody allowed).
  2. **HMAC**: `crypto.createHmac` + `timingSafeEqual` against current + previous 90s window (replay protected). 8-hex-char display token; 32+ byte server secret.
  3. **Token rotation**: 90-day operator runbook in README.
  4. **Read-only by default**: `/!` prefix marks mutations explicitly via `isMutationCommand`.
- **`commands.cjs`** (zero-deps, fully testable) — 6 slash command handlers + dispatcher + `defaultCtx` factory:
  - `/status` — JSON summary of halt + last journal entry + cost ledger
  - `/forecast` — Sprint 1.9.1 cap forecast block
  - `/why <sha>` — render commit's journal entry as embed (validates SHA shape)
  - `/!halt <reason>` — write `STEWARD_HALT` (HMAC-confirmed two-step flow)
  - `/!resume` — clear `STEWARD_HALT` (HMAC-confirmed)
  - `/!recommend <text>` — append to `cortex/recommendations.md` (HMAC-confirmed)
  - All mutation handlers return `requiresHmac: true` on first call with displayable token; bridge dispatches second confirmation call.
- **`journal-tail.cjs`** (zero-deps, fully testable) — channel routing rules + NDJSON parser + tail-follower factory:
  - `routeJournalEvent(entry)` → 4-channel routing (`#steward-cost` / `#steward-research` / `#steward-failures` / `#steward-alerts`) per first-match-wins regex matching against `event` + `code` fields.
  - `parseNDJSON(content)` → resilient NDJSON parser (skips malformed lines silently).
  - `makeTailFollower(filePath, onEvent, opts)` → factory that wraps fs.statSync + readSync at offset for incremental tail; tests use injected `fs` for determinism.
- **`README.md`** — full operator setup guide (Discord bot creation, env config, NSSM Windows / systemd Linux supervision, slash command registration runbook).
- **What's deferred to Sprint 2.6.1** (per README "Sprint 2.6.1 roadmap" §):
  - `bridge.cjs` Gateway WebSocket wiring via discord.js (operator setup gated — needs bot token + guild ID).
  - E2E test against fixture Discord guild (manual).
  - Voice attachment dispatch → Whisper → recommendations (Sprint 4.3 link).
  - PATH-walk well-known-paths preference for `node` resolution.
  - Operator-tier opt-out signing (HMAC over `repoRoot + operator-secret`).
- **Tests**: 63 unit tests (auth + commands + journal-tail) — all zero-deps via `node:test`. discord.js itself NOT installed in this commit; operator runs `cd bin/discord-bridge && npm install` separately.
- **Manual verification**: `auth.generateActionToken('halt-test', { secret: 'a'.repeat(64) })` → 8-hex display token; `verifyActionToken` confirms in same + previous window. `routeJournalEvent` correctly maps cost / research / auth events to the right channels.
- **Why discord.js (not zero-deps WebSocket)**: R1 §1 evaluated zero-deps Gateway implementation — heartbeat + identify + zombie detection + resume + reconnect = ~400 LoC of fragile protocol code for a single-operator bridge. discord.js encapsulates all of that; sibling-folder isolation preserves the zero-deps invariant for **Steward core**, which is what the invariant actually covers.

### Added (2026-05-09 — Sprint 2.5: tech_debt_audit action_kind, deterministic 10th capability)
- **New action_kind `tech_debt_audit`** registered in `bin/steward/_lib/action-kinds.cjs` — deterministic, requires_llm=false, cost_envelope=free, blast_radius=minimal, shipped_in='0.3.0'. Runs nightly, snapshots code-health metrics to `cortex/debt-snapshot.json` (committed audit trail), computes drift triggers vs prior snapshot. v1 = snapshot-only (no PR opening); R1 §9 explicitly defers PR generation to v2 once operator action-rate is measured.
- **3-stage pipeline**: detector probe (`detectors/tech-debt-audit.cjs`) → snapshot capture (`bin/steward/_lib/tech-debt-audit.cjs`) → drift comparison (`bin/steward/_lib/snapshot-diff.cjs`).
- **Toolchain**: qlty (cognitive complexity, duplication, smells) + knip (unused exports/files/deps). Both shell-out via spawn; both fail-open on missing binary.
- **Fail-open semantics**: missing qlty → `{ ok: true, skipped: true, skipReason: 'QLTY_NOT_INSTALLED', code: 'TECH_DEBT_QLTY_MISSING' }`. Skipped runs do NOT count toward `STEWARD_FAILURE_BREAKER` consecutive-failure circuit or any cost cap.
- **Drift triggers (DEFAULT_TRIGGERS)**: `duplication_pct +2pp w/w`, `max_function_complexity > 15 absolute`, `knip_unused_exports +3 w/w`, `test_source_ratio -20% w/w`. Custom triggers supported via `computeSnapshotDrift(prev, curr, triggers)`.
- **Snapshot schema** (`snapshot_version: 1`): captured_at + qlty_path/version + knip_path/version + flat metrics object + top-10 offenders. Aggregate-only (not per-file) to keep git diffs readable. Per Sprint 3.0 forward-compat: schema versioned for AlphaEvolve fitness signal consumption.
- **`thresholdExceeded` advisory event**: when drift triggers fire, execute.cjs emits `tech_debt_threshold_exceeded` journal event with `code: TECH_DEBT_THRESHOLD_EXCEEDED` (advisory, never failure). Snapshot also surfaces `priorCorrupt: true` flag → `tech_debt_snapshot_corrupt` journal event when prior snapshot is malformed JSON or wrong version.
- **R2 hardening** (6-agent review pipeline → 2 BLOCKER + 3 HIGH + 11 MAJOR + many MINOR; 14 must-fix items applied):
  - **Acceptance BLOCKER**: dispatcher wire in `execute.cjs` (kind was registered but not callable).
  - **Acceptance BLOCKER + SSOT BLOCKER**: error codes reconciled per roadmap (`TECH_DEBT_QLTY_MISSING`, `TECH_DEBT_SNAPSHOT_CORRUPT`, `TECH_DEBT_THRESHOLD_EXCEEDED`).
  - **SSOT BLOCKER**: snapshot path drift in roadmap fixed (`.cortex/` → `cortex/` per R1 §2.4 commit-it decision).
  - **Security HIGH (CWE-200/526)**: `runCommand` now uses scrubbed env (`PATH`, `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `TEMP`, `TMP`, `SystemRoot`, `LANG`, `LC_*`, `NODE_PATH/OPTIONS`) — prevents `OPENROUTER_API_KEY`, `ANTHROPIC_*`, `GITHUB_TOKEN` from leaking to qlty/knip subprocesses (knip in particular runs `knip.config.ts` with full `process.env` access).
  - **Security HIGH (CWE-770)**: 16 MB UTF-8 byte-length cap on subprocess stdout/stderr (mirror Sprint 2.4 pattern; multibyte-safe via `Buffer.byteLength`).
  - **Security HIGH (CWE-1325/674)**: `fallbackTestSourceRatio` hardened — `realpathSync`-tracked visited inodes break symlink loops; `isSymbolicLink()` skip; depth cap 20; file-count cap 20K; per-file 2 MB size cap; extended skip-list (`dist`, `build`, `coverage`, `out`, `.next`, `.cache`, `.turbo`, `target`).
  - **Correctness MAJOR**: `parseQltyMetrics` / `parseQltySmells` / `parseKnipReport` null-guard parsed root + `safeNonNegFinite` clamp (rejects NaN, Infinity, negative, non-number). Skips non-object rows in array.
  - **Correctness MINOR**: `runTechDebtAudit` validates `opts.now instanceof Date` before `.toISOString()`; prior-snapshot version check; `priorCorrupt` flag exposed to caller.
  - **Edge fix**: `probeBinary` rejects empty/non-string name; uses `statSync().isFile()` to prevent dir-as-binary match; on POSIX skips `.cmd`/`.exe` candidates.
  - **Edge fix**: `runCommand` clamps `timeoutMs` to `[1s, 10min]`, guards empty/NUL-byte cmd.
  - **Edge fix**: `isOptedOut` requires regular file (not directory or dangling symlink).
  - **Acceptance MAJOR**: 3 fixture-based integration tests added (drift end-to-end, priorCorrupt malformed, priorCorrupt wrong version).
  - **Edge fix**: `fallbackTestSourceRatio` regex broadened to `__tests__`, `spec`, `*.test.<ext>`, `*.spec.<ext>`.
- **Defer to Sprint 2.5.1 backlog**: PATH-hijack hardening (`STEWARD_QLTY_PATH` override), sentinel HMAC, `max_function_complexity` vs `max_file_complexity` decoupling (when qlty exposes per-function rows), `file_loc > 500` advisory trigger, knip CJS pre-flight scan, `repoRoot` path-traversal containment, journal `audit_opt_out_detected` event, semantic for negative `pct_drop` prev.
- **Tests**: 1187 → ~1199 (+12 R2 hardening + integration tests on top of original 23 = 35 total Sprint 2.5 tests). All 3 CI lanes pending push.
- **Manual verification**: `detectors/tech-debt-audit.cjs detect()` returns `qlty-missing` on operator's machine (qlty not installed) → executor's fail-open path triggers correctly with `code: TECH_DEBT_QLTY_MISSING`. `computeSnapshotDrift` exercised with prior+current pair: triggers fire as expected for duplication +2.2pp and max_function_complexity 18 vs threshold 15.

### Added (2026-05-09 — Sprint 2.4: Anthropic claude-cli engine via Max subscription, ⭐ COST PIVOT)
- **`claudeCliEngine` in `bin/steward/_lib/action-engine.cjs`** (~470 LoC including helpers + comments) — 4th LLM engine that spawns the local `claude -p` binary under the operator's Anthropic Max subscription OAuth token, driving marginal LLM cost to **$0** for all `recommendation`-class actions.
- **Three-layer billing-leak defense** to mitigate the GH `anthropics/claude-code#43333` / `#37686` ($1,800 incident) class:
  1. **Env scrub**: `scrubClaudeCliEnv` deletes `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` from spawned env. Win32 case-insensitive (catches lowercase `anthropic_api_key` from user dotfiles).
  2. **Strict billing assertion**: `total_cost_usd === 0` after JSON parse; rejects NaN/Infinity at parser via `Number.isFinite` (defense-in-depth).
  3. **Fleet halt on leak**: nonzero cost writes `STEWARD_HALT` (fleet sentinel) — refuses subsequent runs until operator clears the file.
- **CLI integration**: new `STEWARD_ENGINE=claude-cli` env / `--engine claude-cli` flag; default stays `openrouter` (R6 backward-compat). Help text derives engine list from `Object.keys(ENGINES)` (SSOT — no drift).
- **OAuth-only auth**: requires `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`); `--bare` flag is **explicitly forbidden** (would skip OAuth and force API billing). `CLAUDE_CLI_FORBIDDEN_FLAGS` freeze-list extracted as SSOT.
- **Hardened argv validation**: `extraArgs` rejects `--bare` variants (case-insensitive, with leading/trailing whitespace, `--bare=value`, `--BARE`) AND any arg containing shell metacharacters `& | ; < > " \` $ ( ) ^ \n \r \0` (CWE-77 defense for Windows `.cmd` `shell:true` invocation).
- **Subprocess hardening**: `child_process.spawn` (not exec), AbortController-based 120s timeout (clamped `[1s, 10min]`), explicit `stdin.end()`, `windowsHide: true`, scrubbed env, 8 MB stdout/stderr UTF-8 byte-length caps (multibyte-safe via `Buffer.byteLength`), no-op `'error'` handler post-resolve to prevent unhandled-error crashes.
- **Path resolution**: `STEWARD_CLAUDE_CLI_PATH` env override (verified via `fs.statSync().isFile()`) → PATH walk (`claude.cmd` → `.exe` → bare on win32; reversed POSIX). Rejects directory paths + paths with shell metacharacters when forced into `shell:true` (`.cmd`/`.bat`).
- **Concurrency semaphore**: in-process cap `STEWARD_CLAUDE_CLI_MAX_CONCURRENCY=1` for v0; Sprint 2.2 worktree supervisor revisits global vs per-worktree.
- **Span lifecycle**: tracer/parentSpan span tagging mirrors `openrouterEngine` — `gen_ai.usage.input_tokens` / `output_tokens` / `llm.cost_usd` / `llm.error_code` always tagged; idempotent end on every exit path.
- **Secret redaction**: `redactSecrets` masks Anthropic OAuth tokens (`sk-ant-oat##-…`) + `Bearer …` headers in all stderr surfaces flowing into journal/PR/halt-file content (CWE-532 defense).
- **11 new error codes**: `CLAUDE_CLI_AUTH_NOT_CONFIGURED`, `CLAUDE_CLI_AUTH_REJECTED`, `CLAUDE_CLI_BILLING_LEAK`, `CLAUDE_CLI_FORBIDDEN_FLAG`, `CLAUDE_CLI_NOT_FOUND`, `CLAUDE_CLI_OUTPUT_TOO_LARGE`, `CLAUDE_CLI_PLAN_NOT_JSON`, `CLAUDE_CLI_PLAN_SHAPE_INVALID`, `CLAUDE_CLI_PROTOCOL_DRIFT`, `CLAUDE_CLI_QUOTA_EXHAUSTED`, `CLAUDE_CLI_RATE_LIMITED`, `CLAUDE_CLI_SERVER_ERROR`, `CLAUDE_CLI_SPAWN_FAILED`, `CLAUDE_CLI_TIMEOUT`.
- **R1 memo**: `docs/research/sprint-2.4-anthropic-claude-cli-engine-2026-05-08.md` — full research + decision rationale + 25 GH issue / docs citations.
- **R2 review pipeline (6 agents in parallel)**: acceptance + blind + correctness + security + ssot + edge-case → consolidated **1 BLOCKER + 3 HIGH + 11 MAJOR + 14 MINOR** findings; 13 must-fix items applied pre-commit. Defer list (`Sprint 2.4.1`): E2E integration test under real `CLAUDE_CODE_OAUTH_TOKEN`, Windows SIGTERM grandchild via `taskkill /T /F`, PATH walk well-known-paths preference, semaphore concurrency stateful test, `parseClaudeCliResponse` adversarial fuzz table, transient-network stderr regex, parent-exit signal forwarding, spec-criteria registration in `action-kinds.cjs`.
- **Tests**: 1158 → 1187 (+29 unit tests covering all 14 R2 review-fix paths). All 3 CI lanes pending push.
- **Manual verification (operator-machine)**: `claude --version` (v2.1.119) + `resolveClaudeCliPath` finds the npm-global `claude.cmd` shim under `%APPDATA%\npm\` on Windows / `~/.npm-global/bin/claude` on Unix (useShell:true) + helpers (scrubEnv / parse / categorize / matchForbiddenFlag / containsShellMetacharacters / redactSecrets) all return expected values. Real end-to-end against operator's Max sub deferred to operator dogfood gate (per Sprint 2.0.1 lesson §13: "Spec-permissive ≠ receiver-permissive").
- **New helper file**: `tests/helpers/fake-spawn.cjs` (~85 LoC) — reusable `EventEmitter`-based `spawn` fake for deterministic subprocess tests without requiring a real binary. Pattern reusable for future engines.

### Fixed (2026-05-08 — Sprint 2.0.1: OTLP protobuf encoder for Phoenix compatibility) — commit `2981ea7`
- **Zero-deps OTLP protobuf encoder** (`bin/steward/_lib/otel-protobuf.cjs`, ~370 LoC) — replaces Sprint 2.0's OTLP/JSON encoding that Phoenix 15.5.1 rejected with HTTP 415 Unsupported Media Type.
- Switched emitter `Content-Type: application/json` → `application/x-protobuf`. Wire format now spec-compliant binary OTLP per [`opentelemetry-proto`](https://github.com/open-telemetry/opentelemetry-proto).
- Encoder primitives: varint (BigInt-safe up to 2^64), tag, length-delimited, fixed64, double + AnyValue type dispatch (string/bool/int/double/array/kvlist/bytes/Uint8Array) + Span/ScopeSpans/Resource/ResourceSpans/ExportTraceServiceRequest.
- **Manual verification**: trace `aa105a439194024f65a0531befd82c53` lands in live Phoenix container with complete AGENT→TOOL span tree (`steward.run` + `spec_verifier.runChecks` + `verifier.npm_test` + `gh.push_and_pr`) and Sprint 2.0b routing tags (`steward.routing.{profile,source,model}`).
- R2 review pipeline (2 agents) surfaced 2 BLOCKER + 8 MAJOR findings, all fixed before commit:
  - Negative BigInt silently zero-coerced → `encodeSignedVarintInt64` does proto3 two's-complement
  - Hex traceId/spanId/parentSpanId unvalidated → regex gate before `Buffer.from`
  - Negative Number routed to doubleValue (type-tag corruption) → routes to int_value via BigInt promotion
  - Unused `encodeBoolField` (semantic conflict with AnyValue bool emission) → removed
  - `encodeString` silent "[object Object]" on objects → throws TypeError
  - `encodeFixed64Field` Number precision loss above 2^53 → throws TypeError; BigInt/digit-string only
  - `parent_span_id` absence not byte-level asserted → added `Buffer.indexOf` check
  - `Uint8Array` fell through to kvlist → routes to bytes_value
- 39 new unit tests on protobuf primitives + 7 R2 review-fix tests; integration tests migrated to `tracer._lastPayload` reads.
- **Tests: 1095 → 1134 / 0 fail / 1 skipped**.

### Added (2026-05-08 — Sprint 2.1: autoresearch / overnight burst, ⭐ TRANSFORMATIVE) — commit `b3e6656`
- **N-strategy serial autoresearch loop** as opt-in mode (`--mode=autoresearch` CLI flag, `STEWARD_MODE=autoresearch` env). Single-process serial; Sprint 2.2 will fan out to worktrees.
- **Default N=3 candidates** (clamped [1, 10]): minimize_edits (T=0.2) / balanced (interpolated) / exploratory (T=1.0). Each candidate applied + spec-verified + npm-tested + rolled back via `git checkout -- . && git clean -fd`. Judge picks among passing candidates with both-orderings (consensus or spec-margin fallback).
- **Cross-family judge** by default: DeepSeek V4 Flash candidates judged by `anthropic/claude-sonnet-4.6` (configurable via `STEWARD_AUTORESEARCH_JUDGE_MODEL`, validated against routing-table allowlist).
- **6 new env knobs**: `STEWARD_AUTORESEARCH_N`, `STEWARD_AUTORESEARCH_RUN_USD_CAP` ($1 default), `STEWARD_AUTORESEARCH_MAX_TIME_MIN` (60min default, max 300), `STEWARD_AUTORESEARCH_JUDGE_MODEL`, `STEWARD_AUTORESEARCH_SIMILARITY_THRESHOLD` (0.85), `STEWARD_AUTORESEARCH_DELTA_ANOMALY_MULTIPLIER` (3.0).
- **6 new error codes**: `STEWARD_AUTORESEARCH_VERIFIER_TAMPERED` / `_STRATEGY_COLLAPSE` (soft) / `_JUDGE_DISAGREEMENT` (soft) / `_RUN_USD_EXCEEDED` / `_TIME_EXCEEDED` / `_ALL_CANDIDATES_FAILED`. Plus `AUTORESEARCH_REPO_ROOT_MISSING` / `AUTORESEARCH_NO_WINNER` / `AUTORESEARCH_WINNER_REAPPLY_FAILED` / `AUTORESEARCH_JUDGE_MODEL_REJECTED`.
- **Validation hacking defense (Tennis-XGBoost class)**: SHA-256 hash check on `action-kinds.cjs` + `spec-verifier.cjs` + `policy-check.cjs` at run start + end. Mismatch halts with `STEWARD_AUTORESEARCH_VERIFIER_TAMPERED`.
- **Strategy collapse detection**: Jaccard similarity ≥ 0.85 across passing candidate diffs flags `collapse_detected: true`. First passing candidate becomes winner without judge call (no qualitative diversity to judge between).
- **Delta anomaly detector**: today's spec_margin > rolling 7-day mean × 3.0 flags `delta_anomaly: true` (soft signal, requires bootstrap of ≥ 3 prior winners to avoid noise on first runs).
- **PR labels** auto-applied based on autoresearch flags: `judge-disagreement` (Q2 operator decision), `autoresearch-delta-anomaly`, `autoresearch-collapse`. Operator-visible signal without blocking.
- **All-N lessons.jsonl writes** (Q1 operator decision): both winners + rejected candidates write to lessons.jsonl with distinct codes (`AUTORESEARCH_WINNER_CANDIDATE:<label>` vs `AUTORESEARCH_REJECTED:<reason_id>`). Seed corpus for Sprint 3.0 AlphaEvolve prompt evolution.
- **Per-candidate journal entries** (`event: 'autoresearch_candidate'`) with cost + tokens + spec_pass + npm_pass. Winner entry written AFTER re-apply confirms ok.
- **Cross-session loop detector** (Sprint 1.9.1) ticks at run-level via journal events. Honors action_kind + criterion_id to surface "5× same criterion in 7 days" → STEWARD_HALT.
- New module **`bin/steward/_lib/autoresearch.cjs`** (~570 LoC): pure primitives (jaccard, diversity prompts, hash check, judge prompt builder, run budget, reconcile) + orchestrator (`runAutoresearch`).
- New helper **`bin/steward/_lib/action-engine.cjs buildOpenRouterRequestBody`**: composes request body with optional `temperature` + `personaOverlay` (capped 2 KB, second system message). Powers per-candidate fan-out.
- New helpers in **`bin/steward/_lib/routing-table.cjs`**: `isAutoresearchEligible(actionKind)` + `isAllowedJudgeModel(slug)` SSOT. `AUTORESEARCH_ELIGIBLE_KINDS` set + `ALLOWED_JUDGE_VENDOR_PREFIXES` array exported.
- New helper in **`bin/steward/_lib/gh-ops.cjs createDraftPR`**: `opts.labels[]` filtered by safe-label regex.
- **`spec-verifier.cjs runChecks`** now always emits `criteria_passed` + `criteria_total` on success path (pre-fix: success returned `{ok:true, spec_failures:[]}` only — autoresearch's spec_margin was always 0, delta-anomaly was dead-on-arrival).
- **`.github/workflows/steward-autoresearch.example.yml`** — Sunday 02:00 UTC weekly cron (lowest-traffic GHA window). Coexists with nightly `steward.yml`.
- **`docs/steward-autoresearch.md`** — operator guide.
- R2 review pipeline (6 agents) surfaced 2 BLOCKER + 17 MAJOR findings, all fixed before commit.
- **Tests: 1041 → 1095** (+54 autoresearch tests covering primitives + orchestrator + R2 review fixes).

### Added (2026-05-08 — Sprint 2.0b: action-kind based model routing) — commit `79c101a`
- **4-profile routing knob**: `cheap` / `balanced` (default) / `premium` / `ensemble` via `STEWARD_ROUTING_PROFILE` env or `--routing-profile` CLI flag.
- **Per-action_kind override**: `STEWARD_ROUTING_<KIND>=<slug>` (e.g. `STEWARD_ROUTING_RECOMMENDATION=anthropic/claude-sonnet-4.6`).
- **CLI `--model <slug>`** flag for one-shot model override (highest precedence; bypasses profile-allowlist as documented escape hatch).
- **Override hierarchy**: CLI `--model` > `STEWARD_ROUTING_<KIND>` env > legacy `STEWARD_MODEL` env (backward compat) > profile-table[kind][profile] > balanced default.
- **Premium tier avoids Opus 4.7** per R1 memo §1.3 caveat (tokenizer overhead). Uses Opus 4.6 instead. Enforced by contract test.
- **Ensemble cross-family**: DeepSeek V4 Flash + Qwen3 Coder Flash + Mistral Small 4 → Claude Haiku 4.5 judge.
- **Profile-allowlist gate**: `release_notes_drafter` blocked from ensemble (commodity kind).
- **Per-action USD cap** layered above 1.9.1 daily/weekly/monthly: `STEWARD_PER_ACTION_USD_CAP` ($1 default), per-kind `STEWARD_PER_ACTION_USD_CAP_<KIND>` override. 24-h sliding window across UTC midnight (reads today + yesterday journal files). Future-timestamp clock-skew defense.
- **Trace tags** on AGENT span: `steward.routing.profile`, `steward.routing.source`, `steward.routing.model`. Enables Phoenix filtering by profile.
- New modules: `bin/steward/_lib/routing-table.cjs` (~340 LoC) + `bin/steward/_lib/routing-policy.cjs` (~135 LoC).
- New docs: `docs/steward-routing.md` + `standards/steward-policy.md` § 6.5 Routing profile policy with 3 MUST patterns.
- R2 review pipeline (6 agents) surfaced 10 MAJOR findings, all fixed: 24-h window read today only, hardcoded `llmKinds` Set duplicated SSOT, future-ts clock skew, CLI flag-eats-flag, whitespace env values, prototype pollution, legacy STEWARD_MODEL applies to deterministic kinds, fallback shape inconsistency, lenient parseFloat, stringly-typed routing.source enum.
- Tests: 972 → 1041 (+69 routing-table + routing-policy + SSOT contract tests).

### Removed (2026-05-08 — v0.2.0 platform hardening: drop Sprint 4.7 backward-compat shims)
- **Deleted 10 hermes-prefixed shim files** (1-line redirect stubs from Sprint 4.7 rename):
  - `bin/cortex-hermes`, `bin/cortex-hermes.cjs`, `bin/cortex-hermes.ps1`
  - `prompts/hermes-setup.md`, `standards/hermes-policy.md`
  - `docs/hermes-roadmap.md`, `docs/hermes-runtime.md`, `docs/hermes-usage.md`, `docs/hermes-rfc.md`, `docs/hermes-research-synthesis.md`
- **Stripped runtime backward-compat layer**:
  - `bin/steward/_lib/env.cjs` — `readEnv(NAME)` now reads only `STEWARD_<NAME>`. The `HERMES_<NAME>` fallback + deprecation-warning latch is gone. **Operators must rename `HERMES_*` env vars to `STEWARD_*` before upgrading.**
  - `bin/steward/_lib/halt-check.cjs` — sentinel filename is `STEWARD_HALT` only. Legacy `HERMES_HALT` files no longer halt the runtime; operators must `mv ~/.cortex/HERMES_HALT ~/.cortex/STEWARD_HALT`.
  - `bin/steward/_lib/git-trailers.cjs` — builder + validator emit and require `Steward-*` only. `normalizeTrailerPrefixes()` removed. `parseTrailers` stays prefix-agnostic and `getTrailer(parsed, suffix)` still reads either prefix from a parsed map for walking pre-rebrand commit history.
  - `bin/steward/_lib/journal.cjs` — `'hermes'` removed from `VALID_ACTORS`. Existing journal entries with `actor: 'hermes'` remain readable (validation is on write only).
  - `bin/steward/_lib/action-engine.cjs` — `STEWARD_HARD_DENYLIST` no longer carries `bin/hermes/`, `bin/cortex-hermes`, `standards/hermes-` patterns. Module-level `HERMES_SYSTEM_PROMPT` alias removed.
  - `bin/steward/_lib/policy-check.cjs` — `HERMES_HALT_PRESERVE` rule removed; `HERMES_DENY` module-export alias removed.
  - `bin/steward/execute.cjs` — `isHermesArtifact` module-export alias removed.
  - `detectors/pr-review-responder.cjs` — legacy `Hermes (cortex-x)` PR-author detection removed; `getHermesOpenPRs` and `isHermesAuthor` aliases removed. `externalComments` filter excludes `steward-cortex-x` self-comments only.
  - `shared/hooks/session-start.cjs` — Steward activation nudge checks only `steward.yml` workflow + `STEWARD_HALT` sentinel.
  - `bin/steward/dry-run.cjs` — emits `Steward-*` trailer keys only.
- **Tests updated**: 953 → 973 tests after migration. All assertions, fixtures, and env vars use `STEWARD_*` / `STEWARD_HALT` / `Steward-*` / `actor: 'steward'` / `service.namespace=cortex-x`. Halt-check test gains a regression assertion that legacy `HERMES_HALT` is **not** honored. All 3 CI lanes green.
- **Cross-ref hardening**: every active doc's markdown link points at `docs/steward-*.md` (no broken `./hermes-*.md` URLs); `docs/steward-usage.md`, `docs/why-openrouter-not-claude-oauth.md`, `standards/steward-policy.md`, `prompts/steward-setup.md`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `tests/README.md` all reference `STEWARD_*` env vars consistently.

**Migration for operators upgrading from Sprint 4.7:**
```bash
# 1. Rename env vars (STEWARD_DAILY_USD_CAP, STEWARD_FAILURE_BREAKER, etc.)
sed -i 's/HERMES_/STEWARD_/g' .env.local your-cron-script.sh

# 2. Replace cortex-hermes invocations:
sed -i 's/cortex-hermes/cortex-steward/g' your-cron-script.sh

# 3. Move halt sentinel if you have one in flight:
[ -f ~/.cortex/HERMES_HALT ] && mv ~/.cortex/HERMES_HALT ~/.cortex/STEWARD_HALT
[ -f ./.cortex/HERMES_HALT ]  && mv ./.cortex/HERMES_HALT ./.cortex/STEWARD_HALT

# 4. Rename project workflow file if you forked one:
[ -f .github/workflows/hermes.yml ] && git mv .github/workflows/hermes.yml .github/workflows/steward.yml
```

Pre-rebrand commit history (`Hermes-*` trailers, `actor: 'hermes'` journal entries, branches under `hermes/<date>-<slug>-<id>`) remains untouched and walk-able — those records are immutable. Only the *write-side* legacy honors are gone.

### Added (2026-05-08 — Sprint 2.0 self-hosted observability via Phoenix)
- **`bin/steward/_lib/otel-emitter.cjs`** — zero-deps OTLP HTTP emitter (Tracer + Span classes, OpenInference + OTel `gen_ai.*` dual-attribute set, fail-open everywhere). Activated by `STEWARD_OTEL_ENDPOINT` (legacy `HERMES_OTEL_ENDPOINT` alias honored through v0.2.0). Endpoint allow-list: loopback hosts only by default, `/v1/traces` or `/v1/logs` path required, `STEWARD_OTEL_ALLOW_REMOTE=1` opt-in for non-loopback. Validation rejects scheme/host/path violations and disables tracer with one stderr warning per process — never fails the run.
- **`templates/observability/docker-compose.phoenix.yml`** + **`templates/observability/README.md`** — single-container Phoenix sidecar (SQLite persistence, 127.0.0.1 bind, `PHOENIX_ENABLE_AUTH=false` only for local dev).
- **AGENT root span** in `execute.cjs` wraps every `runExecute` call (including pre-flight rejections — halt-check, budget caps, lock conflicts). Plumbing: `tracer + agentSpan` created at top of `runExecute` outer wrapper, refined with plan attributes once plan is loaded; flushed in outer `finally` regardless of exit path. Children: `spec_verifier.runChecks`, `verifier.npm_test`, `gh.push_and_pr`, all wrapped in try/finally so spans end even when the wrapped call throws.
- **LLM child span** in `action-engine.cjs` openrouter path — wraps `_openrouterEngineInner` via try/catch/finally; emits `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.{input,output}_tokens`, `llm.token_count.{prompt,completion,total}`, `llm.cost_usd`, `llm.error_code`. Defaults to `0` on missing usage so cost dashboards differentiate "no LLM call" from "LLM call, no usage".
- **Span hardening (review-driven)**: `toAnyValue` handles NaN/Infinity (→ stringValue), Symbol/Function/Date/Buffer/BigInt explicitly. Per-attribute string truncation (8 KB), per-payload size cap (1 MB → reason `payload-too-large`). `setStatus` redacts absolute filesystem paths (POSIX + Windows + UNC) and truncates to 200 bytes (CWE-117/209). `withSpan` no longer overwrites a status the inner function already set. NoopSpan as parent is treated as no parent (avoids all-zero spanId on the wire).
- **Resource attributes**: `service.name=steward`, `service.namespace=cortex-x`, `service.version` reads `package.json` (semver-shaped per OTel semconv).
- **Operator docs**: `docs/steward-usage.md § Observability — live trace view (Sprint 2.0)` with bring-up + fail-open contract.
- **Tests**: 49 unit tests at `tests/unit/steward/otel-emitter.test.cjs` + 5 integration tests at `tests/integration/steward-observability.test.cjs` (AGENT span structure, parent-child propagation, OTLP wire format, attribute coercion edge cases, allow-list validation, path redaction, NoopSpan parent skip, payload-too-large, fail-open under unset/unreachable/non-loopback). 924 → 978 tests (+54).

### Changed (2026-05-08 — Sprint 4.7 rebrand: Hermes → **Steward**)
- **All present-tense `Hermes` references renamed to `Steward`** across runtime, docs, tests, CI workflows, and standards. Motivated by the 139k-star [NousResearch/hermes-agent](https://github.com/nousresearch/hermes-agent) collision (Feb 2026, MIT, dedicated `.com/.org/.ai`) — public launch under the same name was unrecoverable.
- **Directory renames** (history-preserving via `git mv`):
  - `bin/hermes/` → `bin/steward/`
  - `tests/unit/hermes/` → `tests/unit/steward/`
  - `tests/fixtures/hermes-dryrun/` → `tests/fixtures/steward-dryrun/`
  - `evals/hermes/` → `evals/steward/`
- **File renames**:
  - `bin/cortex-hermes{.cjs,.ps1,}` → `bin/cortex-steward{.cjs,.ps1,}` (one-line shims at the old paths emit a deprecation warning and forward; removed in v0.2.0)
  - `prompts/hermes-setup.md` → `prompts/steward-setup.md` (shim redirects)
  - `standards/hermes-policy.md` → `standards/steward-policy.md` (shim redirects)
  - `docs/hermes-{roadmap,runtime,usage,rfc,research-synthesis}.md` → `docs/steward-*.md` (each shim redirects)
  - `.github/workflows/hermes{,-todo-triage,-dep-patch,-harvest}.yml` → `.github/workflows/steward*.yml`
  - `tests/integration/hermes-*.test.cjs` → `tests/integration/steward-*.test.cjs`
- **Env vars** `HERMES_*` → `STEWARD_*` with backward-compat layer in `bin/steward/_lib/env.cjs`. `readEnv(name)` reads `STEWARD_<name>` first, falls back to `HERMES_<name>` with a one-time stderr deprecation warning. Set `STEWARD_SUPPRESS_DEPRECATION=1` to silence. Removed in v0.2.0.
- **Halt sentinel** `.cortex/HERMES_HALT` → `.cortex/STEWARD_HALT`. `halt-check.cjs` reads both filenames; new halts are written under the new name. Pre-rebrand halts in operator state continue to halt through v0.2.0.
- **Git trailers** `Hermes-Action-Id` / `Hermes-Trigger` / `Hermes-Journal-Entry` / `Hermes-Recommendation-Source` → `Steward-*`. `buildCommitMessage` auto-normalizes legacy `Hermes-*` keys; `parseTrailers` is prefix-agnostic so pre-rebrand commits still walk-able. `Co-Authored-By: Hermes <hermes@cortex-x.local>` → `Co-Authored-By: Steward <steward@cortex-x.local>`.
- **Branch prefix** `hermes/<date>-<slug>-<id>` → `steward/<date>-<slug>-<id>`.
- **Engine HARD_DENYLIST** keeps both old (`bin/hermes/`, `bin/cortex-hermes`, `standards/hermes-`) and new (`bin/steward/`, `bin/cortex-steward`, `standards/steward-`) patterns so projects forked from pre-rebrand cortex-x stay protected through v0.2.0.
- **PR-review-responder detector** recognizes both `Steward (cortex-x)` and legacy `Hermes (cortex-x)` PR authors so cross-rename PR follow-up still works.
- **External `Hermes Agent` references preserved** verbatim — `docs/public-launch-plan.md`, `docs/sprint-1.5-design.md`, `standards/skills.md`, `shared/hooks/tirith-scan.cjs` all refer to the NousResearch product, NOT to our internal runtime.
- **Tests**: 924 pass / 0 fail / 1 skipped after rebrand. `tests/unit/steward/halt-check.test.cjs` extended with backward-compat tests for the legacy sentinel filename; `tests/unit/steward/git-trailers.test.cjs` extended with prefix-normalization + dual-prefix `getTrailer` tests.

**v0.2.0 removal target** (next minor): all backward-compat shims + aliases + legacy env-var + legacy sentinel reads. Operators who still set `HERMES_*` env vars or `cortex-hermes` invocations after v0.2.0 ships will see hard failures.

### Added (2026-05-06 — Sprint 1.5 onboarding + audit + auto-research engine)
- **Install UX (`bin/cortex-bootstrap{,.ps1}`)** — per-project mode selector. Asks `[N]ew` / `[E]xisting` / `[F]ramework`. Writes `$PWD/.cortex-bootstrap-pending` with mode + ISO timestamp (1h TTL). One-shot semantics; the skill that runs deletes the marker on completion.
- **`shared/skills/start/SKILL.md` + `shared/skills/audit/SKILL.md`** — auto-discovered slash skills mapped to `prompts/new-project.md` and `prompts/existing-project-audit.md`. Auto-primed by `SessionStart` when the bootstrap marker is fresh.
- **`shared/hooks/session-start.cjs`** — extended to detect `.cortex-bootstrap-pending` (auto-prime `/start` or `/audit`) and `cortex/.adapt-pending` (recovery surface if Phase 5 was interrupted).
- **`prompts/existing-project-audit.md`** — NEW deep 12-dimension audit prompt. Six phases: P0 detect → P1 repo-map (with degraded grep+find fallback) → P2 four parallel agents owning three dimensions each → P3 five irreducible human questions → P4 planner-driven auto-research → P5 synthesis to `cortex/AUDIT.md` + `cortex/recommendations.md` + CLAUDE.md patches → P6 ADR backfill (opt-in via `--backfill-adrs`).
- **`agents/planner.md` + `agents/synthesizer.md`** — auto-research engine. Planner picks 3-5 topics from `{profile} × {concern}` matrix; synthesizer merges parallel research into `cortex/recommendations.md` and a `## Stack reality check` section in CLAUDE.md. Three-hop citation traceability mandatory (claim → finding ID → source URL).
- **`config/research.yaml`** — two new triggers: `post_install_adaptation` (Phase 5 Adapt for greenfield) and `existing_project_audit` (Phase 4 of `/audit`). Both `mode: dynamic` (planner-driven). Skip-for-profiles list includes `astro-static` + `minimal`.
- **`prompts/cortex-doctor.md` §14 + §15** — three-hop citation drift check (verifies every CLAUDE.md "Stack reality check" claim traces through finding ID to source URL via HEAD request); canonical-references freshness check (SHA-256 compares local `~/.claude/shared/standards/*` against GitHub raw URL hash, flags drift > 30 days).

### Changed (2026-05-06 — Sprint 1.5)
- **`prompts/new-project.md`** — restructured into FIVE explicit phases each saving an artifact: `cortex/discovery.md` (P1) → `$CORTEX_DATA_HOME/research/<slug>-<date>.md` (P2) → `cortex/proposal.md` (P3) → scaffolded filesystem (P4) → `cortex/recommendations.md` + CLAUDE.md `## Stack reality check` (P5 Adapt — NEW). Phase 3 architect approval gate is structured `[a/e/r/q]` not free-form. Phase 4 §4.1a adds dual-link standards (local path + canonical GitHub URL) in scaffolded CLAUDE.md. Phase 4 §4.5 step 12 writes `cortex/.adapt-pending` recovery marker; P5 §5.5 deletes it on completion.
- **`prompts/retrofit.md`** — added prerequisite gate: defer to `/audit` if `cortex/AUDIT.md` not present. Existing 5-phase retrofit-application flow preserved.
- **`install.sh` + `install.ps1`** — copy `bin/cortex-bootstrap{,.ps1}` to `~/.claude/shared/bin/`, print "next step" hint pointing the user at the per-project bootstrap command.

### Deferred (Sprint 1.5b)
- `detectors/repo-map.cjs` (tree-sitter + PageRank). Audit prompt P1 ships with degraded grep+find fallback; ranking quality is lower until repo-map detector lands.
- `detectors/hotspots.cjs` (git churn × cyclomatic complexity).
- Note: there is no `PostScaffold` event in Claude Code — Phase 5 dispatch happens in-prompt; recovery if the session is interrupted is handled by the existing `SessionStart` hook reading `cortex/.adapt-pending`.

### Added (2026-05-06 — Sprint 1 install-readiness checkpoint)
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 (canonical text; CoC contact via GitHub Issues / Private Vulnerability Reporting per Sprint LR.A 2026-05-11 PII strip)
- `.github/workflows/no-pii.yml` — CI gate that runs `scripts/sync-to-public.mjs` + `validate-no-pii.mjs` + ship-ready denylist scan on every PR/push to `main`
- `scripts/fix-d4-paths.mjs` — one-shot rewriter that resolved D-4 (path convention `~/.claude/shared/` for installed assets, `$CORTEX_HOME` for live source)
- `scripts/sync-to-public.mjs` + `scripts/validate-no-pii.mjs` — public-snapshot tooling (sanitize-rules-driven find/replace + blacklist scan; rules data itself stays gitignored per `scripts/sanitize-rules.json`)
- `module.yaml` — separated `cortex_root` (live source, default `~/cortex-x`) from `cortex_assets_root` (installed, default `~/.claude/shared`); removed maintainer-local `~/Desktop/APPs/` default

### Changed (2026-05-06)
- D-4 RESOLVED — 14 source files (README, prompts/*, evals/*, projects/README.md, config/evolve.yaml) rewritten from `~/cortex-x/<subdir>/` to either `~/.claude/shared/<subdir>/` (installed) or `$CORTEX_HOME/<subdir>/` (live); see MIGRATIONS.md §D-4
- `scripts/sync-to-public.mjs` — replacement engine now honors `scope: all-but-authorship`, preserving maintainer contact in `SECURITY.md` and `CODE_OF_CONDUCT.md`
- `.gitignore` — added `/docs/pohovor-*.md` (maintainer interview-prep pattern; mirrors sanitize-rules `fileExclusions`)

### Added
- **Auto-orchestration layer (MVP).** Claude is now prompted automatically to parallelize research + review and single-thread implementation on new-feature prompts. Evidence-grounded in Anthropic's multi-agent research paper, Cognition's counter-position, and 2025–2026 benchmarks (SWE-bench, PlanCraft, ICSE 2025 deprecated-API study). Soft-gate only; never spawns agents silently.
  - `shared/hooks/auto-orchestrate.cjs` — UserPromptSubmit hook with new-implementation detection (cs + en patterns), research cache freshness lookup with topic-aware TTL, session budget warning injection
  - `shared/hooks/_lib/budget.cjs` — token cost estimation (2026 pricing table), session total tracking, `$CORTEX_DATA_HOME/journal/.budget.jsonl` writer
  - `shared/hooks/post-tool-use.cjs` — extended to record Agent/Task/WebSearch/WebFetch token usage when exposed by Claude Code
  - `shared/hooks/session-start.cjs` — surfaces last 3 session budgets at session start
  - `standards/auto-orchestration.md` — 3-fronta rule (research parallel / implementation serial / review parallel), 2-minute rule, task-type taxonomy, anti-patterns, evidence trail with citations
  - `prompts/auto-review.md` — scope-classified parallel review pipeline (trivial/small/medium/large → 1–5 agents), anti-slop merge
  - `docs/archive/auto-orchestration-rfc.md` — full design rationale + research transcript (archived 2026-05-09 during pre-Sprint-2.0 audit; the MVP shipped 2026-04-19 and the file is now historical-only)
- `CORTEX_SESSION_BUDGET_USD` env var (default `$5.00`)
- `standards/ship-ready.md` — governance invariants for beta/stable distribution
- `research/beta-distribution-2026-04-17.md` — research-grounded staging/prod decision matrix
- `CONTRIBUTING.md`, `SECURITY.md`, `MIGRATIONS.md`, `CHANGELOG.md` — ship-ready artifacts
- PolyForm Noncommercial 1.0.0 license (replaces `Proprietary` stub)

### Changed
- `prompts/cortex-doctor.md` §9 — research hygiene now checks per-topic TTL (hot frameworks 30d, regulations 180d, architecture 365d) instead of blanket 180 days

### Added (continued)
- `prompts/retrofit.md` — apply cortex-x structure to an existing (messy) project without touching runtime code. Four phases: parallel audit → retrofit plan → additive application (user-gated) → post-retrofit report. Strict non-destruction contract: no runtime edits, no overwrites without diff, no auto-fix of Rule 1 violations (those become sprints). Closes the gap between `new-project.md` (greenfield) and `project-scan.md` (library capture) for legacy/client projects
- **Eval suite expanded from 1 → 10 canonical tasks.** Aider-style benchmark (Paul Gauthier 2024-2026) now covers all major prompt + standard surfaces:
  - `eval-002` BAIL-flow scaffold respect (canary for scope creep in `new-project.md`)
  - `eval-003` project-scan slim 5-section schema (canary for SSOT-drift in `project-scan.md`)
  - `eval-004` cortex-sync architectural decision capture
  - `eval-005` code-review SSOT violation BLOCK (Rule 1 enforcement canary)
  - `eval-006` security-auditor SQL injection + RLS bypass (Rule 2 Critical canary)
  - `eval-007` cortex-doctor missing-hook drift detection
  - `eval-008` sprint-status PROGRESS.md parser correctness
  - `eval-009` retrospective [TRANSFERABLE] tagging discipline
  - `eval-010` evolve hard-gate enforcement (framework-honesty canary, prevents pattern hallucination)
- `evals/runner.md` — manual + future-automated execution instructions, result schema, cadence policy (monthly full suite, per-PR for touched prompts, pre-tag full + weakest-3 manual)
- `evals/results/2026-05-01-01d9013-paper-baseline.json` — first baseline established. Paper-baseline mode (per-task scores predicted from prompt review, NOT from real Claude session execution). Total: 8.25 / 10 (82.5%). Weakest: eval-002 (0.65). Strongest: eval-008, eval-010 (0.90). ADVISORY status until 3+ real-execution runs accumulate

### Changed
- LICENSE from "Proprietary" to **PolyForm Noncommercial 1.0.0**. Backwards-incompatible license change; prior collaborators with any access receive the new terms on any subsequent pull.
- Personal data (private project entries, dated insights, journal, dated research caches) moved out of the shipped distribution via `.gitignore` patterns. Files remain on maintainer's local install.

### Fixed
- `prompts/new-project.md`, `prompts/cortex-doctor.md` — replaced hardcoded `~/Desktop/APPs/cortex-x/` with `{cortex_root}` placeholder / `~/cortex-x/` default.
- Personal email removed from public `README.md`.

## [0.0.0] — Pre-beta (pre-2026-04-17)

Internal development. Phases 1–5 foundations: hooks, standards, agents, profiles, self-improvement loop, auto-research primitive. Not distributed.
