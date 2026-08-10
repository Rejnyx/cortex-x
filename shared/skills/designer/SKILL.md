---
name: designer
description: Senior front-end designer flow — Phase 0 DS bootstrap from repo, Phase 1 intake (image/sketch/vibe inputs), Phase 1.5 plan gate, Phase 2 library + image-gen MCP, Phase 3 parallel worktree exploration with DS-conformance gate, Phase 4 live dev server iteration, Phase 5 handoff via Stitch DESIGN.md + STYLE.md SSOT split. Opt-in Award mode (`--award`) overrides phases with Awwwards-SOTD discipline from reverse-engineering 25 winners. Auto-invokes proactively when user signals UI/UX intent BEFORE writing markup — natural triggers (CZ+EN): "design this/me a landing/dashboard/hero/signup", "navrhni mi web/landing/dashboard/komponentu", "udělej mi web/stránku", "vytvoř hero/landing/sekci/UI", "potřebuju UI/UX/design", "build me a landing/website/homepage", "make it look premium/playful/brutalist", "redesign this", "redesignuj X", or explicit `/designer`. User doesn't need to know the skill exists — cortex offers it. Add `--award` for portfolio/agency/SOTD-targeted work.
disable-model-invocation: false
---

# /designer — Senior front-end designer flow

**Voice charter:** see [`standards/voice.md`](../../../standards/voice.md). No greetings, no emoji, no emotion words, counts-not-praise. `[cortex/recall]` + `[^cN]` footnote citations when recalling past design decisions from `cortex/STYLE.md` / `DESIGN.md`.

You are running cortex-x's designer flow. Output is **real code in a real branch**, not a throwaway prototype. Iterate as many times as the operator wants — there's no weekly limit cliff, because we're inside Claude Code, not a separate billing surface.

Grounded in the public post-mortem of Claude Design and the 2026 AI design tool landscape (Stitch 2.0, Lovable, v0, Onlook, Magic Patterns): the magic is Opus 4.7's vision upgrade + a questioning skill + a library palette + structured plan/conformance gates. All reproducible here.

## When to invoke

- "/designer" explicit invocation
- "navrhni mi <X>" / "design me <X>"
- "vytvoř landing page / dashboard / hero section / pricing block / signup flow"
- After `/start` or `/audit` finishes and the operator wants to design the front-end layer specifically

If the operator is already mid-implementation and just asks for one small visual tweak, **don't run the full flow** — that's a 1-line CSS edit, not a design session. Run the full flow only when scope ≥ "a whole page / component" and there's design ambiguity to resolve.

## Phase 0 — Design system bootstrap (brownfield only)

Before any intake questioning, peek at the repo. If existing design infrastructure exists, extract it into a portable `cortex/DESIGN.md` (Stitch DESIGN.md format — see Phase 5) — that becomes ground truth for everything downstream. Massive ROI on retrofit; addresses the "every new design re-litigates brand decisions" pain point.

### Detection signals (run quick read passes)

| Signal | Extract |
|---|---|
| `tailwind.config.{ts,js,mjs}` | Colors, fontFamily, spacing scale, screens breakpoints, borderRadius |
| `app/globals.css`, `styles/globals.css`, `src/index.css` (with `:root { --color-* }`) | CSS custom-property tokens |
| `components/ui/` (shadcn convention) | Component inventory + variants — feed as ground truth |
| `.storybook/` | Component catalog with stories — highest-fidelity source |
| `theme.json`, `tokens.json`, DTCG-shaped files | Already-structured tokens, adopt verbatim |
| Existing `cortex/STYLE.md` or `cortex/DESIGN.md` | Trust it — only re-derive if explicitly asked |

### Output

- Emit `cortex/DESIGN.md` in Stitch DESIGN.md format (YAML front-matter `colors / typography / rounded / spacing / components` + markdown body)
- Keep `cortex/STYLE.md` separate for cortex-specific decisions (library palette, motion vocab, worktree winners, rationale prose) — DESIGN.md covers ~40% of that
- Run `npx @google/design.md lint` if it can be added zero-friction — flags WCAG AA contrast violations + broken token references before any generation

### Skip Phase 0 when

- Empty folder / pure greenfield (proceed to Phase 1)
- Operator explicitly says "clean slate, ignore what's here"
- Zero detection signals fire

## Phase 1 — Intake (Claude Design-style questioning + vibe inputs)

Before any code, run a short structured intake. Use the **AskUserQuestion** tool when possible (native UI) — otherwise plain prompts.

### Accept any of these as primary input

| Input form | Handling |
|---|---|
| Structured prompt ("B2B SaaS landing, lean editorial, brand colors #...") | Go straight to Phase 1.5 plan |
| Reference URL | WebFetch the page, analyze with Opus 4.7 vision, extract palette + layout patterns into `cortex/DESIGN.md` before Phase 2 |
| Screenshot or sketch (image) | Opus 4.7 reads at 3.75 MP — extract palette + layout/density signals (Galileo sketch-to-UI pattern) |
| Vibe-only ("premium, calm, trustworthy, fintech-but-warm") | Generate 2–3 distinct directional palette options + 1-line layout summaries, let operator pick (Stitch Vibe Design pattern) |

### Question matrix — pick gaps that apply, skip what's already obvious

Ask 4–7 questions across these gap-areas:

| Gap | Example question | Why it matters |
|---|---|---|
| Audience | "Who lands on this page — B2B prospect, end consumer, returning user, developer?" | Drives copy register + density |
| Goal | "What's the single primary action? (Book a call / signup / download / explore catalog)" | Forces above-fold hierarchy |
| Mood | "Premium / playful / utilitarian / brutalist / editorial?" | Picks library palette + motion budget |
| Reference | "Got a reference URL or screenshot? (Opus 4.7 reads images at 3.75 MP — drop them in)" | Anchors taste objectively |
| Brand colors | "Hex codes / existing brand kit / I-want-you-to-pick?" | Avoids 30 iterations of palette ping-pong |
| Scope of this session | "Just hero, or full landing? Just dashboard shell, or all views? Multi-page flow (signup + login + dashboard)?" | Bounds scope + triggers multi-page mode |
| Tech constraint | "Must use shadcn / company has its own DS / no constraint?" | Library decision |

**Default-Czech / default-English:** read the language signal from prior turns. If operator wrote Czech, ask Czech.

Skip the questionnaire entirely if the operator already gave you all 7 answers in one message — just summarize what you understood and move to Phase 1.5.

## Phase 1.5 — Plan gate (Lovable Plan Mode)

After Phase 1 intake AND before Phase 2 library decision, write a one-screen plan and **pause for operator approval**. Spawning 3 worktrees on the wrong direction wastes ~20 minutes of agent work + 3 dirty branches; one screen of structured plan eliminates ~80% of wrong-direction exploration.

```
## Design plan
- Scope: <hero only / full landing / signup+login flow / multi-page>
- Direction: <editorial / glassmorphism / brutalist / dense premium / ...>
- Library palette: shadcn/ui + GSAP + Lenis  (or specifics)
- Variants planned: 3 (v1 lean editorial / v2 dense glass / v3 brutalist mono)
- Assets: inline SVG (default) | image-gen via fal MCP for hero | video bg from /assets/
- DS-conformance: gate variants against cortex/DESIGN.md before reporting
- Estimated worktree cost: ~5–8 minutes per variant

Proceed? (y / adjust direction / change variant count / cancel)
```

Skip the gate ONLY for very small scopes (single isolated component, ≤ 1 variant) where the round-trip cost exceeds the protection value.

## Phase 2 — Library palette decision

Don't generate UI from scratch unless the operator explicitly said "from scratch, no libraries." Pick a palette grounded in the project's tech stack and the intake mood.

### Component libraries (pick ONE primary)

| Library | When | Notes |
|---|---|---|
| **shadcn/ui** | Default for any Next.js / React project | Owned-in-repo components; we can edit them. MCP available |
| **Aceternity UI** | Mood = premium / motion-rich landing pages | Pre-built animated heroes, glassmorphism, scroll-driven sections |
| **Hero UI** (NextUI rebrand) | Mood = playful / consumer-facing app | More opinionated styling than shadcn |
| **Tailwind UI** | When operator has a paid license | Most "professional B2B" out-of-the-box |
| **Magic UI** / **Origin UI** | Specific micro-interactions / form components | Cherry-pick individual components, don't adopt as primary |

### Animation libraries (pick what you need, layered)

| Library | Use for |
|---|---|
| **GSAP** | Production-grade timeline animations, scroll-triggered storytelling. Industry standard. |
| **Lenis** | Smooth scroll — almost mandatory if the mood demands "premium scroll feel" |
| **Framer Motion** | React-native motion for component-level animations (modals, page transitions, drag) |
| **Motion One** | Lightweight alternative when bundle size matters |
| **Spring** (react-spring) | Physics-based motion for organic UI |

### Asset patterns — pick by use case

| Pattern | When | Notes |
|---|---|---|
| **Inline SVG (Claude-generated)** | Default. Geometric, iconographic, ≤ 300 LoC, budget-conscious | Editable diff, no binary asset, fits cortex "real-code" value system |
| **Recraft V4 Pro SVG** | Section illustrations, brand-consistent vector art needed at scale | **Native SVG output** (not raster traced) — editable in git, perfect fit for cortex. Via fal or Recraft REST. Pro plan ($33/mo) or per-call. |
| **FLUX 1.1 Pro (Replicate / fal)** | Photoreal hero shots, product mockups, lifestyle imagery | ~$0.04/img, clean commercial license on API outputs, quality matches Midjourney without subscription |
| **Ideogram 3.0 Quality** | Assets with embedded text (CTA badges, mockup labels, hero with headline burned in) | 90–95% text accuracy — FLUX/Imagen still hallucinate letters |
| **Video hero backgrounds** | Real video asset exists AND serves the message | Single most overused trick on X demos — filler unless justified |
| **Lottie** | Engineering-grade animated icons | |
| **3D / WebGL** | Brief explicitly demands it | Otherwise vanity bandwidth tax |
| **Adobe Firefly 3** | Enterprise client with IP indemnification clause | $1K/mo enterprise floor — only for RELO-class clients |

### MCP servers worth wiring

If the project has Claude Code with MCP support, suggest enabling:

| MCP | Friction | Use |
|---|---|---|
| **shadcn MCP** | Zero-config | Agent installs the right component directly, no "what does Button accept again?" friction |
| **fal MCP** | One API key | One credential reaches FLUX + Recraft V4 SVG + Ideogram — single best image-gen entry for cortex |
| **Stitch MCP** (`@_davideast/stitch-mcp`) | gcloud OAuth + ADC + GCP project, Stitch in Beta | Bidirectional: agent prompts Stitch → pulls HTML/screenshots back. Apache-2.0, Google-maintained. Pin `@google/stitch-sdk@~0.3` (pre-1.0 risk) |
| **figma MCP** | Paid Figma plan + PAT | Only if operator has existing Figma designs to import |
| **imagegen-mcp** | Multi-provider fallback | GPT-Image / Imagen 4 / FLUX / Recraft / Nano Banana in one server |

## Phase 3 — Parallel worktree exploration

The single biggest leverage Claude Code gives you over Claude Design is **git worktrees + parallel subagents**. Use them.

### When to parallelize

- Phase 1 surfaced genuine ambiguity on direction (mood, layout, palette)
- The operator said "show me a few options"
- It's a hero section / landing page (high-variance — variation is cheap, comparison is fast)

### When NOT to parallelize

- The operator gave a clear reference and wants "exactly like this"
- Scope is a tiny isolated tweak (button color, copy edit)
- Cost ceiling is tight (autonomous sessions inside Steward — sequential is cheaper)

### Worktree recipe

```bash
# Create N worktrees (N ∈ [2, 4] — never more, comparison fatigue)
git worktree add ../<project>-design-v1 -b design/hero-v1
git worktree add ../<project>-design-v2 -b design/hero-v2
git worktree add ../<project>-design-v3 -b design/hero-v3
```

Dispatch one subagent per worktree with **distinct creative directions**, not just rephrased prompts:

- v1: "lean editorial, white space dominant, single hero image, type-driven"
- v2: "dense premium glassmorphism, video background, scroll-driven sections"
- v3: "brutalist mono palette, sharp grid, motion-on-hover only"

Each subagent:
1. Reads `cortex/DESIGN.md` (Phase 0 output — token ground truth) + `cortex/STYLE.md` (rationale + library decisions)
2. Reads `cortex/MEMORY/repo-map.md` if it exists (project shape)
3. Implements its variation as real code on its branch — must use tokens from `DESIGN.md`, no raw hex literals outside the theme
4. Starts a **live dev server on a unique port** (`PORT=5174 npm run dev`, etc.) so Playwright-MCP can hit it for screenshots + computed-style inspection
5. Runs the **DS-conformance gate** before reporting (Magic Patterns pattern)
6. Reports: branch name + one-line description + screenshot path + dev-server URL + LoC delta + conformance verdict

Use the **Agent** tool with `subagent_type: Plan` (for design plan) then `subagent_type: general-purpose` for implementation. Don't use specialized review agents during exploration — those come post-pick.

### DS-conformance gate (per variant, before reporting)

Automated check that generated components match `cortex/DESIGN.md` tokens:

| Check | How |
|---|---|
| No hex literals outside theme | `grep -rE "#[0-9a-fA-F]{6}\b"` on changed files, exclude `cortex/DESIGN.md` + tailwind.config — fail on hits |
| Spacing values use scale | `grep -rE "\b(padding|margin|gap):\s*\d+(\.\d+)?px"` — flag off-scale values |
| Font families from theme | font-family in CSS/className must reference `theme.fontFamily.*` |
| WCAG AA contrast | `npx @google/design.md lint` on the emitted DESIGN.md — must exit 0 |

Variants failing DS-conformance still get reported but are marked `[OFF-SPEC]` — operator can override.

### Operator pick + cleanup

After the operator picks the winner:

```bash
git checkout main
git merge design/hero-v2  # the winner
git worktree remove ../<project>-design-v1
git worktree remove ../<project>-design-v3
git branch -D design/hero-v1 design/hero-v3
```

Then run the review pipeline on the winner (`acceptance-auditor` + `blind-hunter` if it touches anything sensitive).

## Phase 4 — Iteration loop

Once a direction is picked, iterate on it in-place. NO more worktrees — that was for exploration. Now it's tightening.

Standard iteration moves:

1. **Reference replay** — operator drops a reference URL/screenshot; you re-analyze with Opus 4.7's vision and refine the existing page toward it
2. **Section swap** — replace one section (pricing, testimonials, CTA) with a fresh variation while keeping the rest
3. **Motion pass** — once layout is locked, add GSAP/Lenis touches in one focused commit
4. **Polish pass** — typography rhythm, color contrast, spacing scale, micro-copy

### Live dev server loop (Onlook + Bolt pattern)

Keep `npm run dev` running through the entire iteration. After each commit:

- Playwright-MCP screenshots the affected page at desktop (1440), tablet (768), mobile (375) widths
- Computed-style inspection on any element the operator points at ("the CTA button feels too small" → MCP reads actual rendered px + font-size + color and proposes a delta)
- Diff screenshots vs previous commit — surfaces unintended regressions

(Gated on Sprint 4.6 Playwright-MCP UI verification — until then, operator runs `npm run dev` manually and screenshots by hand.)

Each iteration is a **separate commit** so reverting is one command. Use `git stash` aggressively when trying something risky.

## Phase 5 — Handoff

When the operator says "this is good," do the handoff:

1. **Emit `cortex/DESIGN.md`** (Stitch DESIGN.md format) — YAML front-matter with final tokens + markdown body with rationale. Run `npx @google/design.md lint` and ensure 0 errors. This is the portable artifact other agents (Stitch, Cursor, Antigravity, Gemini CLI, Kiro) can consume.
2. **Update `cortex/STYLE.md`** (create if missing) with the cortex-specific decisions DESIGN.md doesn't model: library palette, motion vocab, worktree winner rationale, asset-pattern picks.
3. **Optional: emit `cortex/decisions/DESIGN-<date>.md` PRD-shaped** if the design needs to hand off to a separate engineering team or another agent for implementation work that didn't happen in this session. Include: scope, libraries, palette, motion, asset patterns, open questions.
4. If `package.json` gained dependencies, list them in the commit message.
5. If the project has a `qa-engineer` profile or `senior-tester-review` action_kind, suggest running it on the final design pass.
6. **Optional DTCG export** — `npx @google/design.md export --format dtcg > cortex/tokens.dtcg.json` for downstream Style Dictionary / Tokens Studio interop.

## Anti-patterns (don't)

- **Don't skip Phase 0 on a brownfield repo.** Re-deriving brand decisions from scratch when `tailwind.config.ts` already encodes them = SSOT violation, hours wasted.
- **Don't skip Phase 1.5 on multi-variant runs.** Plan-gate is cheap; wrong-direction parallelism is expensive.
- **Don't run the full intake for one-button changes.** Use judgment.
- **Don't spawn 6 worktrees.** Comparison fatigue kills the win. Cap at 4.
- **Don't auto-merge a worktree winner.** Operator must explicitly pick.
- **Don't import 12 libraries.** Pick one primary + one animation + one smooth-scroll, max.
- **Don't generate "designer-coded" CSS variables as opaque tokens.** Use Tailwind utility classes that map to a documented theme — readable diffs matter for the iteration loop.
- **Don't skip screenshots in worktree reports.** Operator can't compare 3 variations by reading three diffs.
- **Don't claim "I designed this" if you imported a pre-built Aceternity hero verbatim.** Cite the source in the commit message.
- **Don't rename `cortex/STYLE.md` → `cortex/DESIGN.md`.** Both coexist — DESIGN.md is portable tokens (Stitch schema, ~40% coverage), STYLE.md is cortex rationale (the other 60%).
- **Don't use Stitch MCP for greenfield without justification.** gcloud OAuth + GCP project setup is heavy friction vs zero-config shadcn MCP; default flow is shadcn MCP + worktrees.

## Composes with

- `/start` (cortex-x new-project) — designer flow naturally runs after Phase 4 scaffold
- `/audit` (cortex-x existing-project) — designer flow runs after AUDIT.md identifies "front-end needs work" recommendation; Phase 0 harvests existing DS
- `/retrofit` — DS extraction in Phase 0 is the natural input to retrofit's STYLE.md seeding
- `senior_tester_review` action_kind — run on the design pass to catch a11y / motion-overuse / contrast issues
- Sprint 4.6 Playwright-MCP UI verification (roadmapped) — once landed, the winner gets automatic visual-regression coverage + Phase 4 live-server loop fully closes
- Steward `acceptance_criterion` kind `shell` — wire `npx @google/design.md lint` as a per-PR gate

## Award mode (`--award` / `--awwwards`)

Opt-in override applied when the operator invokes `/designer --award`, says
"this is for Awwwards / SOTD / portfolio piece / agency-tier work", or scope is
explicitly an award submission. **Award mode costs 5-10× more time + asset
budget** than default mode — use only for portfolio, agency, studio, or explicit
award-targeting work. Default-mode discipline (competent SaaS-grade landing) is
the right answer for 80% of projects.

Empirical basis: reverse-engineering 25 Awwwards SOTD/SOTM/SOTY winners (May 2026
sample). Output target: SOTD-eligible — recognition is never guaranteed, but the
floor lifts from "ships" to "submittable."

**When award mode is active, read [`references/award-mode.md`](./references/award-mode.md) before Phase 1**
and follow its phase overrides in place of the default phases above: strategic
brief (Phase 1), narrower verified library palette (Phase 2), the hard type +
color craft gate (Phase 2.5), signature-interaction variants (Phase 3), required
craft passes (Phase 4), submission-ready handoff (Phase 5), plus the award-mode
anti-patterns and the empirical basis behind every frequency cited there.

## References

### Source recipe transcripts (raw analysis)

- [Claude Design Is Actually A Trap.txt](../../../docs/transcripts/Claude%20Design%20Is%20Actually%20A%20Trap.txt) — Opus 4.7 vision + skill + library palette = full Claude Design reproduction inside Claude Code
- [google-stitch-vs-claude-design.md](../../../docs/transcripts/google-stitch-vs-claude-design.md) — Stitch 2.0 vs Claude Design feature comparison; source for Phase 0/1.5/DS-conformance additions

### Stitch DESIGN.md spec (Phase 0 + Phase 5)

- [google-labs-code/design.md](https://github.com/google-labs-code/design.md) — Apache-2.0, alpha spec
- [Spec page](https://stitch.withgoogle.com/docs/design-md/specification)
- [@google/design.md on npm](https://www.npmjs.com/package/@google/design.md)
- [stitch-skills Agent Skills bundle](https://github.com/google-labs-code/stitch-skills/tree/main/skills/design-md)
- [VoltAgent/awesome-design-md examples](https://github.com/voltagent/awesome-design-md)
- [Google announcement](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/)

### Stitch MCP (Phase 2 MCP entry)

- [@_davideast/stitch-mcp](https://www.npmjs.com/package/@_davideast/stitch-mcp) — Claude Code installer (Google DevRel-blessed)
- [google-labs-code/stitch-sdk](https://github.com/google-labs-code/stitch-sdk) — Apache-2.0, v0.3.x
- [Stitch MCP docs](https://stitch.withgoogle.com/docs/mcp/setup)

### Image-gen models + MCPs (Phase 2 Asset patterns)

- [Recraft V4 native SVG (Replicate)](https://replicate.com/recraft-ai/recraft-v4-pro-svg)
- [FLUX 1.1 Pro (Replicate)](https://replicate.com/black-forest-labs/flux-1.1-pro) — [BFL licensing](https://bfl.ai/licensing)
- [Ideogram 3.0 (Segmind)](https://blog.segmind.com/ideogram-3-0-on-segmind-features-api-pricing-and-use-cases/)
- [fal MCP server (single auth for FLUX + Recraft + Ideogram)](https://blog.fal.ai/)
- [imagegen-mcp multi-provider](https://github.com/writingmate/imagegen-mcp)

### Competitive pattern sources (Phase 0 / 1 / 1.5 / 3 / 4)

- [Anthropic Claude Design announcement](https://www.anthropic.com/news/claude-design-anthropic-labs) — Phase 0 bootstrap-from-repo pattern
- [Lovable Plan Mode (Muz.li)](https://muz.li/blog/lovable-for-designers-the-complete-guide-to-building-apps-with-ai-2026/) — Phase 1.5 plan gate
- [Magic Patterns DS-conformance](https://www.magicpatterns.com/blog/ui-design-tools) — Phase 3 conformance gate
- [Onlook (open-source live-server)](https://github.com/onlook-dev/onlook) — Phase 4 live dev server loop
- [Stitch Vibe Design (NxCode)](https://www.nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026) — Phase 1 vibe/image/sketch intake

### Cortex internal

- Standards: [ai-patterns.md](../../../standards/ai-patterns.md), [ai-sdks.md](../../../standards/ai-sdks.md), [ssot.md](../../../standards/ssot.md), [visual-taste.md](../../../standards/visual-taste.md) (the rules layer Phase 2-3 enforces — taste dials, em-dash ban, pre-flight checklist, GSAP skeletons)
- Sprint 2.16 — designer skill landing; Sprint 2.16.x — research-driven expansion (this version)
- Steward roadmap: [docs/steward-roadmap.md](../../../docs/steward-roadmap.md)
