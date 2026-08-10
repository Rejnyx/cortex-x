# Designer — Award mode (`--award` / `--awwwards`)

> Progressive-disclosure reference for `shared/skills/designer/SKILL.md`.
> Loaded ONLY when the operator opts into award mode. Keeping it out of the
> skill body holds SKILL.md under the agentskills.io 500-line cap and keeps
> the default flow (80% of invocations) free of award-tier overhead.


Opt-in override applied when operator invokes `/designer --award`, says "this is for Awwwards / SOTD / portfolio piece / agency-tier work", or scope is explicitly an award submission. **Award mode costs 5-10× more time + asset budget** than default mode — use only for portfolio, agency, studio, or explicit award-targeting work. Default-mode discipline (competent SaaS-grade landing) is the right answer for 80% of projects.

Empirical basis: reverse-engineering 25 Awwwards SOTD/SOTM/SOTY winners (May 2026 sample, mix of Webflow + Next.js + custom stacks). All frequencies cited below are over that sample unless noted. Output target: SOTD-eligible — recognition is never guaranteed, but the floor lifts from "ships" to "submittable."

### Award Phase 1 override — Strategic brief (replaces functional intake)

Replace the 7 functional intake questions with the 7 strategic-brief questions. Each is chosen because it forces a decision the AI default skips. Output: emit `cortex/AWARD-BRIEF.md` containing operator's answers; that file becomes Phase 1.5 plan input and is archived for the eventual submission "About this site" / colophon.

1. **Concept metaphor (one sentence).** "If this site were a physical place, object, or ritual, what is it?" — forces commitment to a singular idea (Resn: "narrative as the core driver"; Unseen: "surreal digital home"). AI default = generic SaaS layout.
2. **Narrative arc (4-6 acts).** "Name sections as story acts with one-line emotional intent each — NOT Hero/Features/Pricing." Forces sectional intentionality (Locomotive: "each section is a chapter").
3. **3 refs + 3 anti-refs + 1 bridge.** "3 sites you admire + 3 you must NOT resemble (with the gravitational-pull-rationale) + 1 reference outside the category (film, magazine, physical product)." Anti-refs force trap awareness. AI default = average of training corpus.
4. **Tone pillars (3 × 5 adjectives + 3 anti-adjectives each).** No "premium", "modern", "clean", "minimal" allowed — too cheap. Forces vocabulary precision (Off-Brand "vocabulary cards" pattern).
5. **Motion + sound ethos (one sentence each).** "How does everything move (weight, decay, rhythm)?" / "Silent / ambient / event-cued / signature score?" Forces commitment up front (Resn + Active Theory pattern).
6. **Type behaviour + color tension.** "Does type LEAD or SUPPORT? Hero color + tension color (not a palette of 5) + why those two fight well together." Forces principle over palette.
7. **3-5 prohibitions phrased as rules.** "Write 3-5 rules starting with 'Never' or 'Only' that any reviewer can use to reject work." AI default = add more; this layer subtracts.

Optional 8th: "What is the one thing a visitor must FEEL within 4 seconds?" — single-emotion gate.

### Award Phase 2 override — Narrower library palette (verified by data)

Award winners use **less, not more**. Hard data overrules speculation:

#### Required stack

| Layer | Pick | Award winner frequency |
|---|---|---|
| **Meta-stack** | Next.js OR Webflow | Next.js 28% (7/25), Webflow 16% (4/25 + SOTY 2025 — Lando Norris on Webflow) |
| **Motion runtime** | GSAP 3.15 (free since Webflow acquisition 2025) | 36% (9/25) + both SOTYs |
| **GSAP plugins** | Observer + ScrollTrigger + SplitText + CustomEase | Observer 32%, ScrollTrigger 24%, SplitText 20% |
| **Smooth scroll** | Lenis 1.3 | 32% (8/25); Locomotive Scroll on Webflow legacy only |
| **3D when justified** | **Raw Three.js r184** (NOT R3F) | Three.js 16% (4/25) + Developer SOTY 2025 (Messenger). R3F: **0/25** |
| **Page transition** | Barba.js OR hand-rolled curtain | 8% explicit, more in feel — table stakes craft |
| **Custom cursor** | Cuberto mouse-follower OR pure GSAP recipe | 16%+ explicit |
| **Sound** | Howler.js + mandatory mute toggle (top-right) | Studio sites yes, B2B SaaS no |

#### Forbidden in award mode (0/25 winners)

- **Component libraries shipped unmodified:** shadcn/ui, Aceternity UI, Hero UI, Tailwind UI as primary palette. **0 of 25** winners use them. Hand-build buttons, nav, cards. (Cherry-picking single components is OK; adopting as system is the AI tell.)
- **React motion libraries:** Framer Motion / Motion v12 / react-spring / Motion One. **0/25 winners.** Switch to GSAP Observer + ScrollTrigger.
- **`@react-three/fiber` + drei + postprocessing.** **0/25 winners** in this sample — go raw Three.js when 3D is justified, or skip 3D.
- **Rive (@rive-app/canvas).** **0/25 winners confirmed** ("Rive is hype, not winning"). Lottie acceptable only when client supplies the .lottie asset.
- **Theatre.js.** **0/25 winners.** Pure GSAP ScrollTrigger is cleaner; Theatre is overkill outside cinematic camera work.
- **View Transitions API / CSS scroll-timeline.** **0/25 winners** as of May 2026 — winners distrust bleeding-edge browser APIs. Revisit when adoption > 20%.
- **Generic Spline scene with default lighting.** Spline appears in 8% but always with custom material + lighting. Default-lit floating-blob = AI tell.
- **Default Tailwind palette utilities** (`purple-600`, `indigo-500`, `slate-50`) as brand color. Zero winners use Tailwind utility colors as the brand.

#### Optional studio-cinematic tier (scope > landing)

Only when budget supports it: Theatre.js for camera choreography, OGL for lightweight WebGL (Active Theory style), Lygia shader library, Tone.js for generative audio, Cuberto mouse-follower (gated on `pointer: fine` — never on touch-primary audiences).

### Award Phase 2.5 — Type + color craft gate (HARD)

Applied mid-generation and re-checked at Phase 3 DS-conformance gate.

#### Type discipline

Bundle from **Fontshare / Pangram Pangram free-tier ONLY** (all .woff2 variable, all OFL/commercial-free, all SOTD-grade):

| Preset | Display | Text | Mono |
|---|---|---|---|
| **Editorial premium** | PP Editorial New | Switzer | JetBrains Mono |
| **Brutalist colorful** | Clash Display | Cabinet Grotesk | Recursive (CASL=1) |
| **Quiet luxury** | PP Editorial New Italic | Satoshi | — |
| **Tech / agentic** | Switzer (huge) | Recursive (MONO axis) | JetBrains Mono |

Rules (every winner enforces these):

- Every size uses `clamp(min, vw-based, max)` — **NEVER** static `text-6xl` Tailwind utilities. (floema.com declares clamp() 33 times.)
- Variable fonts via `@font-face` with controlled axes (`wght`, `opsz`, optionally `CASL`/`MONO`). NO static .woff2 sets.
- Display > 48px: negative tracking `letter-spacing: -0.02em` to `-0.04em`
- Body: `text-wrap: pretty`, `hanging-punctuation: first last`, `font-optical-sizing: auto`
- Headlines: `text-wrap: balance`
- Modular type scale ratio 1.25 (UI) or 1.333 (editorial) or 1.618 (poster-hero)
- Type-as-section-divider — single word at 200px+ acts as chapter break (floema.com, mors.design, brets.fr)

Forbidden type defaults: Inter / Roboto / Open Sans / Poppins / Geist as primary brand voice. (Inter fine as fallback in font stack only.) Static text sizes. System font stack.

#### Color discipline

- **≤ 7 hex literals site-wide** (verified rule: 0-3 on portfolio winners, e-commerce up to 22 with content imagery). Force CSS custom properties: `var(--brand)`, `var(--bg)`, `var(--fg)`, `var(--accent)`, `var(--muted)`.
- **OKLCH tokens, not hex.** Tailwind v4 native; Cortex differentiator since **0/25 sampled winners use OKLCH in raw HTML** — we lead on perceptual uniformity + P3 gamut:
  ```css
  --brand:    oklch(0.62 0.19 27);   /* ONE saturated hue, ONE accent */
  --bg:       oklch(0.99 0.005 90);  /* warm-white, NEVER #fff */
  --fg:       oklch(0.18 0.02 270);  /* hinted-blue near-black, NEVER #000 */
  --muted:    oklch(0.55 0.02 270);
  ```
- **1 brand + 1 accent + 2 neutrals max.** Anything more requires explicit brand justification.
- **Off-black + off-white + ONE saturated accent.** Never pure `#000` or `#fff`.
- **Wide-gamut P3 accent** on a single hue: `color(display-p3 1 0.42 0.21)` for colors literally impossible in sRGB.
- **`mix-blend-mode: difference` on text-over-image collisions** — 32% of winners (simonholm.studio uses it 4 times). Craft signal AI rarely reaches for.
- **Background-color-as-section-divider** — flat color blocks between sections instead of imagery (recurring SOTD pattern).

Forbidden color defaults:
- **Purple→pink gradient** (`#6366f1 → #ec4899` / any indigo-violet ramp) — canonical AI-slop signature
- Tailwind `indigo-500` / `violet-500` / `purple-600` as primary
- Generic charcoal `#1a1a1a` / `#0a0a0a` — use `oklch(0.16 0.01 270)` instead
- Neon mint `#00ffa3`, "AI startup" cyan/blue, "trustworthy" navy + orange Stripe-cliché
- Conic-gradient mesh as background (**0/25 winners** use them)
- 5+ color brand palettes, rainbow-chip hero illustrations

### Award Phase 3 override — Worktree variants with signature interactions

Worktree subagents (still 2-4 variants) commit to DISTINCT signature interactions, not just rephrased prompts. Each variant must implement:

1. **Preloader concept** — hand-built, NOT library-imported. Count-up / logo-reveal / brand-specific sequence. 32% of winners ship one. Without preloader = no SOTD.
2. **Custom cursor behavior** — magnetic + contextual (link / drag / video states). Gated on `pointer: fine`, feature-detected; harmless on touch.
3. **Page-transition curtain** — wipe / mask / dissolve. Default Next.js route changes never win.
4. **Signature interaction** — the brand-specific moment that justifies the award. ONE distinctive thing the variant becomes known for.

#### Award DS-conformance gate (extends default Phase 3 gate)

Each variant must pass before reporting:

| Check | Command |
|---|---|
| No purple/violet/indigo Tailwind utilities | `! grep -rE "(purple\|violet\|indigo)-(4\|5\|6\|7\|8)00"` |
| No static text size utilities | `! grep -rE "text-(4\|5\|6\|7\|8\|9)xl"` |
| `clamp(` present in type CSS | `grep -r "clamp("` must hit |
| No pure black/white | `! grep -rE "#(000\|fff)([^0-9a-f]\|$)"` |
| Variable font via @font-face | `grep -r "font-variation-settings\|@font-face" must hit |
| Preloader class present | `grep -r "preloader\|page-loader"` must hit |
| Custom cursor class present | `grep -r "custom-cursor\|cursor-follower"` must hit |
| WCAG AA contrast | `npx @google/design.md lint` exit 0 |

Variants failing this gate ship marked `[OFF-SPEC]` — operator can override. Default mode's gate is a subset of this.

### Award Phase 4 override — Required craft passes

Three sequential passes before "good enough":

1. **Preloader pass** — hand-build the loading sequence (30-90 sec of LoC). Brand-specific number/logo motion.
2. **Cursor pass** — Cuberto mouse-follower OR pure GSAP recipe. Feature-detect `(pointer: fine)`.
3. **Blend-mode pass** — apply `mix-blend-mode: difference` on 4-8 text-image crossings (simonholm.studio frequency).
4. **(Optional) Sound pass** — Howler one-tick on key interactions + mute toggle in top-right (mandatory if any sound).

### Award Phase 5 override — Submission-ready handoff

Beyond default handoff, additionally emit:

1. **`cortex/AWARD-BRIEF.md`** — the strategic brief itself (Phase 1 answers), archived for the submission "About this site" page.
2. **Lighthouse ≥ 90 Performance** — Awwwards juries penalize sub-90 explicitly. Run `npx lighthouse --only-categories=performance` in CI.
3. **WCAG AA mandatory, AAA preferred** — Awwwards Accessibility honor is a separate award.
4. **Custom 404 page** — table stakes for SOTD. Match concept metaphor from Phase 1.
5. **"About this site" / colophon page** — credit libraries + foundries + concept + acknowledgments. Awwwards jurors read this.
6. **Submission asset bundle** — 1920×1080 hero screenshot + 15-30 sec screen recording (Playwright-MCP can drive). Ship to `cortex/award-submission/`.

### Award mode anti-patterns

- **Don't enable award mode by default.** It's 5-10× the asset/time budget. Reserve for portfolio / agency / explicit award targets.
- **Don't apply award stack to a Steward autonomous run.** Award mode requires human craft pass at Phase 4; autonomous nightly runs lack the iteration capacity.
- **Don't mix shadcn award-mode-forbidden imports with award stack.** If award mode is on, removal of shadcn imports from the variant is part of Phase 3 conformance gate.
- **Don't pretend a competent SaaS landing is award-tier.** Calling default `/designer` output "Awwwards-ready" misleads the operator. Only `--award` runs claim that target.
- **Don't ship Spline default-lit scenes in award mode.** Always custom material + lighting; otherwise skip 3D.

### Award mode references — empirical basis

**Reverse-engineered winners (25-site sample, May 2026):**

- [Awwwards SOTD archive](https://www.awwwards.com/websites/)
- [SOTY 2025 — Lando Norris (OFF+BRAND / Webflow / GSAP)](https://www.itsoffbrand.com/our-work/lando-norris)
- [SOTY 2025 Developer — Messenger (raw Three.js)](https://www.webgpu.com/showcase/messenger/)
- Sample sites: obys.agency, floema.com, mors.design, studionamma.com, simonholm.studio, mina-massoud.com, pixila.net, paodao.fr, 375.studio, marvellco.com.au, brets.fr, ordrhealth.com, adcker.com, eclettica.bulgari.com, camperandnicholsons.com, sazabi.com, gethapply.com, idyllic.co.nz, itomdev.com, t11.com, thepush.com.au, xox.makemepulse.com, fourmula.ai, kvs.services, astrodither.robertborghesi.is

**Strategic brief frameworks:**

- [Resn case studies](https://www.awwwards.com/case-study-resn-presents-adventuring-the-fantastical.html)
- [Locomotive — "two typefaces, four styles"](https://www.awwwards.com/locomotive-by-locomotive-wins-site-of-the-month-june-a-case-study.html)
- [Pentagram Brand Strategy](https://www.pentagram.com/brand-strategy)
- [Black Frame Framework template](https://framenoir.com/framework/)
- [Off-Brand vocabulary cards pattern (the-brandidentity.com interview)](https://the-brandidentity.com/interview/presented-by-brandpad-how-to-systemise-a-brand-featuring-pentagram-how-how-and-studio-blackburn)

**Library landscape:**

- [GSAP 3.13 — premium plugins now free](https://gsap.com/blog/3-13/)
- [Lenis (darkroomengineering)](https://github.com/darkroomengineering/lenis)
- [Cuberto mouse-follower](https://github.com/Cuberto/mouse-follower)
- [Howler.js](https://github.com/goldfire/howler.js)

**Type + color craft:**

- [Fontshare (ITF free commercial tier)](https://fontshare.com/)
- [Pangram Pangram free-to-try](https://pangrampangram.com/)
- [Recursive variable font (5 axes)](https://www.recursive.design/)
- [Utopia fluid type calculator](https://utopia.fyi/type/calculator/)
- [MDN variable fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/Variable_fonts_guide)
- [MDN hanging-punctuation](https://developer.mozilla.org/en-US/docs/Web/CSS/hanging-punctuation)
- [Evil Martians — OKLCH](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [Tailwind v4 P3 gamut discussion](https://github.com/tailwindlabs/tailwindcss/discussions/13628)
- [Radix Colors 12-step](https://www.radix-ui.com/colors)
- [Why AI keeps building purple gradients](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)
- [AI Slop Web Design guide](https://www.925studios.co/blog/ai-slop-web-design-guide)
- [Creative Boom — top 50 fonts 2026](https://www.creativeboom.com/resources/top-50-fonts-in-2026/)

