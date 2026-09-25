/**
 * Session Start — Global Hook
 * Auto-detects PROGRESS.md, CLAUDE.md, MEMORY.md in ANY project.
 * Injects sprint state + git context at session start.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

function readFile(fp) {
  try { return fs.readFileSync(path.join(ROOT, fp), 'utf8'); } catch { return null; }
}

function getProjectName() {
  const pkg = readFile('package.json');
  if (pkg) {
    try { return JSON.parse(pkg).name; } catch {}
  }
  return path.basename(ROOT);
}

function getActiveSprint(progress) {
  if (!progress) return { name: null, stories: [], nextStory: null };
  const lines = progress.split('\n');
  const stories = [];
  let inActive = false;
  let sprintName = null;
  let nextStory = null;

  for (const line of lines) {
    // Detect active sprint/phase (### or ####, NOT marked done)
    if (/^#{2,4}\s+.*(Sprint|Fáze|Phase|Milestone|V\d)/i.test(line) && !line.includes('done') && !line.match(/[✅✓☑]/)) {
      if (inActive) break; // only first active
      inActive = true;
      sprintName = line.replace(/^#{2,4}\s+/, '').trim();
    } else if (/^#{2,4}\s+.*(Sprint|Fáze|Phase|Milestone|V\d)/i.test(line) && (line.includes('done') || line.match(/[✅✓☑]/))) {
      inActive = false;
    }

    // Parse story rows in tables or checklists
    if (inActive) {
      if (/^\|/.test(line) && !line.includes('---') && !/Story|Popis|Status|Description/i.test(line)) {
        stories.push(line.trim());
        if (!nextStory && /pending|todo|⬜|planned/i.test(line)) {
          const match = line.match(/\|\s*([\w\d.]+)\s*\|/);
          if (match) nextStory = match[1];
        }
      }
      // Checklist format: - [ ] or - [x]
      if (/^[-*]\s+\[[ x]\]/i.test(line)) {
        stories.push(line.trim());
        if (!nextStory && /\[ \]/.test(line)) {
          nextStory = line.replace(/^[-*]\s+\[ \]\s*/, '').slice(0, 60);
        }
      }
    }
  }
  return { name: sprintName, stories, nextStory };
}

function exec(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 5000 }).trim(); } catch { return null; }
}

// Detect project files
const progress = readFile('PROGRESS.md');
const hasClaude = fs.existsSync(path.join(ROOT, 'CLAUDE.md'));
const hasMemory = fs.existsSync(path.join(ROOT, 'MEMORY.md')) ||
  fs.existsSync(path.join(ROOT, '.claude', 'memory', 'MEMORY.md'));
const recovery = readFile('.claude/compact-state.md');

const { name: sprint, stories, nextStory } = getActiveSprint(progress);
const branch = exec('git branch --show-current');
const commits = exec('git log --oneline -5');
const status = exec('git status --short');

const projectName = getProjectName();

const ctx = [`=== ${projectName} — Session Context ===`];
ctx.push('');

// Sprint 1.7.6 — greet by name if user.yaml is populated. Falls back silently
// if file missing or name field empty (fresh install without identity capture).
try {
  const os = require('os');
  const userYaml = path.join(os.homedir(), '.claude', 'cortex', 'user.yaml');
  if (fs.existsSync(userYaml)) {
    const txt = fs.readFileSync(userYaml, 'utf8');
    const nameMatch = txt.match(/^name:\s*(.+)$/m);
    if (nameMatch && nameMatch[1].trim() && nameMatch[1].trim() !== '""') {
      ctx.push(`Operator: ${nameMatch[1].trim()}`);
      ctx.push('');
    }
  }
} catch (_) {
  // user.yaml unreadable — skip greeting; non-blocking augmentation.
}

// Sprint tracking
if (sprint) {
  ctx.push(`Active Phase: ${sprint}`);
  if (nextStory) ctx.push(`Next Story: ${nextStory}`);
  if (stories.length > 0) {
    const done = stories.filter(s => /done|✅|✓|☑|\[x\]/i.test(s)).length;
    ctx.push(`Progress: ${done}/${stories.length} stories`);
  }
} else if (progress) {
  ctx.push('PROGRESS.md exists but no active sprint detected');
}

// Git state
if (branch) ctx.push(`\nGit Branch: ${branch}`);
if (commits) {
  ctx.push('Recent commits:');
  commits.split('\n').forEach(c => ctx.push(`  ${c}`));
}
if (status) {
  const files = status.split('\n').length;
  ctx.push(`\nUncommitted changes: ${files} file(s)`);
}

// Available docs
const docs = [];
if (hasClaude) docs.push('CLAUDE.md');
if (progress) docs.push('PROGRESS.md');
if (hasMemory) docs.push('MEMORY.md');
if (recovery) docs.push('.claude/compact-state.md (recovery available)');
if (docs.length > 0) ctx.push(`\nDocs: ${docs.join(', ')}`);

// Auto-optimization: run deterministic detectors, surface profile + stage.
// Detectors live in ~/.claude/shared/detectors/ (copied by install.ps1/install.sh).
// Fail-open — any error silently skipped; detection is augmentation not blocker.
try {
  const os = require('os');
  const detectorsDir = path.join(os.homedir(), '.claude', 'shared', 'detectors');
  const profileDetector = path.join(detectorsDir, 'detect-profile.cjs');
  const stageDetector = path.join(detectorsDir, 'detect-stage.cjs');

  let profileResult = null;
  let stageResult = null;

  try {
    if (fs.existsSync(profileDetector)) {
      const { detect } = require(profileDetector);
      profileResult = detect(ROOT);
    }
  } catch (_) {}

  try {
    if (fs.existsSync(stageDetector)) {
      const { detect } = require(stageDetector);
      stageResult = detect(ROOT);
    }
  } catch (_) {}

  if (profileResult && profileResult.top && profileResult.top.score >= 0.6) {
    const top = profileResult.top;
    ctx.push(`\nAuto-detected profile: ${top.name} (confidence ${top.score.toFixed(2)}, ${top.confidence})`);
    if (top.matched && top.matched.length > 0) {
      ctx.push(`  Evidence: ${top.matched.slice(0, 3).join('; ')}`);
    }
  } else if (profileResult && profileResult.candidates.length > 0) {
    const top = profileResult.candidates[0];
    if (top && top.score >= 0.3) {
      ctx.push(`\nProfile signal (low confidence ${top.score.toFixed(2)}): ${top.name} — ambiguous, paste /cortex-doctor for drift check`);
    }
  }

  if (stageResult && stageResult.stage && stageResult.stage !== 'unknown') {
    ctx.push(`Project stage: ${stageResult.stage} (${stageResult.evidence.slice(0, 2).join(', ')})`);
    if (stageResult.suggestions && stageResult.suggestions.length > 0 && stageResult.suggestions.length <= 3) {
      ctx.push(`  Upgrade suggestions: ${stageResult.suggestions.slice(0, 2).join(' · ')}`);
    }
  }
} catch (_) {
  // Detectors unavailable — silently skip, detection is augmentation not blocker
}

// cortex-x awareness — detect if current project has a cortex library entry
// Sprint 1.6: user-data lives in $CORTEX_DATA_HOME (default ~/.cortex/), NOT in
// the cortex-x source repo. Resolve precedence: env var → cortex-source.yaml →
// legacy ~/cortex-x/projects/ fallback (pre-Sprint-1.6 installs).
let libraryEntry = null; // { slug, path } — read again by the memory-health block below
try {
  const os = require('os');
  let dataHome = process.env.CORTEX_DATA_HOME;
  if (!dataHome) {
    try {
      const sourceYamlPath = path.join(os.homedir(), '.claude', 'shared', 'cortex-source.yaml');
      let yaml = fs.readFileSync(sourceYamlPath, 'utf8');
      // Strip UTF-8 BOM if present — PS 5.1 install.ps1 prior to 2026-05-07
      // emitted BOM via Set-Content -Encoding UTF8, which made ^regex fail.
      if (yaml.charCodeAt(0) === 0xfeff) yaml = yaml.slice(1);
      const m = yaml.match(/^cortex_data_home:\s*(.+)$/m);
      if (m) dataHome = m[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* yaml missing — fall through */ }
  }
  if (!dataHome) dataHome = path.join(os.homedir(), '.cortex');

  // Legacy fallback: pre-Sprint-1.6 installs kept projects/ inside cortex-x repo.
  const legacyCandidates = [
    path.join(os.homedir(), 'cortex-x', 'projects'),
    path.join(os.homedir(), 'Desktop', 'APPs', 'cortex-x', 'projects'),
    path.join(os.homedir(), '.cortex-x', 'projects'),
  ];
  const projectsDir = fs.existsSync(path.join(dataHome, 'projects'))
    ? path.join(dataHome, 'projects')
    : legacyCandidates.find(p => fs.existsSync(p));

  if (projectsDir) {
    // Derive slug from project name — matches projects/<slug>.md convention
    const slug = String(projectName || '')
      .replace(/^@[^/]+\//, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'unknown';
    const entryPath = path.join(projectsDir, `${slug}.md`);
    const dataRoot = path.dirname(projectsDir);

    if (fs.existsSync(entryPath)) {
      libraryEntry = { slug, path: entryPath };
      ctx.push(`\ncortex-x library: entry exists (${slug}.md)`);
      ctx.push('  Claude: reference it for cross-project context when relevant');
    } else {
      ctx.push(`\ncortex-x library: no entry for '${slug}'`);
      ctx.push(`  Suggest: paste ~/.claude/shared/prompts/project-scan.md to populate`);
    }

    // Sprint LR.B+ (2026-05-12): discovery nudge. Most operators never read
    // capabilities.md unless prompted. On first session per ~18h surface a
    // one-line reminder + the canonical entry points. Marker file prevents
    // spam.
    //
    // R2 hardening (correctness HIGH + edge MED):
    //   - Strip CR after yaml regex capture (Windows-edited yaml ships with
    //     \r in $1, breaks existsSync silently).
    //   - Clock-skew guard: if marker mtime is in the future, treat as stale
    //     so operator doesn't get silently disabled for years.
    //   - Counts read dynamically from capabilities.json (SSOT) — never
    //     hardcoded prose.
    //   - mkdirSync(parent) before write so fresh-install marker survives.
    //   - Atomic exclusive-create for concurrent-session race; second
    //     session skips the nudge cleanly.
    try {
      const markerPath = path.join(dataRoot, '.last-capability-tip');
      // Containment check (correctness HIGH): marker MUST stay inside dataRoot.
      const relCheck = path.relative(dataRoot, markerPath);
      if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) throw new Error('marker escape');
      const NUDGE_INTERVAL_MS = 18 * 60 * 60 * 1000;
      let shouldNudge = true;
      try {
        const markerStat = fs.statSync(markerPath);
        const ageMs = Date.now() - markerStat.mtimeMs;
        // Clock-skew: future-dated marker (negative age) is suspect; treat
        // as expired so the nudge isn't silently suppressed for years.
        if (ageMs >= 0 && ageMs < NUDGE_INTERVAL_MS) shouldNudge = false;
      } catch { /* missing marker = first session, do nudge */ }
      if (shouldNudge) {
        const sourceYamlPath = path.join(os.homedir(), '.claude', 'shared', 'cortex-source.yaml');
        let cortexSourceRoot = null;
        try {
          let yaml = fs.readFileSync(sourceYamlPath, 'utf8');
          if (yaml.charCodeAt(0) === 0xfeff) yaml = yaml.slice(1);
          const m = yaml.match(/^cortex_source:\s*(.+)$/m);
          if (m) cortexSourceRoot = m[1].replace(/\r$/, '').trim().replace(/^["']|["']$/g, '');
        } catch { /* no source yaml */ }
        const capsMdPath = cortexSourceRoot ? path.join(cortexSourceRoot, 'cortex', 'capabilities.md') : null;
        const capsJsonPath = cortexSourceRoot ? path.join(cortexSourceRoot, 'cortex', 'capabilities.json') : null;
        if (capsMdPath && fs.existsSync(capsMdPath)) {
          // Read counts from capabilities.json (SSOT) instead of hardcoding —
          // SSOT enforcer Orange #1 (counts drifted in same commit). Fail-open
          // to a generic line if JSON unreadable.
          let countsLine = '  • Machine-readable inventory: cortex/capabilities.md (auto-generated registry)';
          try {
            if (capsJsonPath && fs.existsSync(capsJsonPath)) {
              const reg = JSON.parse(fs.readFileSync(capsJsonPath, 'utf8'));
              const ak = (reg.action_kinds && reg.action_kinds.length) || 0;
              const std = (reg.standards && reg.standards.length) || 0;
              const prof = (reg.profiles && reg.profiles.length) || 0;
              const hk = (reg.hooks && reg.hooks.length) || 0;
              const wf = (reg.workflows && reg.workflows.length) || 0;
              countsLine = `  • Machine-readable inventory: cortex/capabilities.md (${ak} action_kinds, ${std} standards, ${prof} profiles, ${hk} hooks, ${wf} workflows)`;
            }
          } catch { /* fall through to generic line */ }
          // Try atomic exclusive-create FIRST so concurrent sessions don't
          // double-fire. If the open succeeds, this session owns the nudge.
          let ownsNudge = true;
          try {
            fs.mkdirSync(path.dirname(markerPath), { recursive: true, mode: 0o700 });
            const fd = fs.openSync(markerPath, 'wx', 0o600);
            fs.writeSync(fd, new Date().toISOString());
            fs.closeSync(fd);
          } catch (err) {
            // EEXIST = another session beat us. Refresh mtime so other
            // session's stat reflects our window; skip the nudge to avoid
            // duplicates.
            if (err && err.code === 'EEXIST') {
              try { fs.utimesSync(markerPath, new Date(), new Date()); } catch {}
              ownsNudge = false;
            }
            // Any other write error (permission, ENOSPC) → still show the
            // nudge once (best-effort UX) but don't loop on next session
            // because we couldn't persist.
          }
          if (ownsNudge) {
            ctx.push('\ncortex-x discovery (tip refreshed every 18h):');
            ctx.push('  • Type /cortex-help inside Claude Code for one-screen capability menu');
            ctx.push(countsLine);
            ctx.push('  • Web research: cortex defaults to dispatching WebSearch+WebFetch on external-state tasks; SSOT ~/.claude/shared/research-protocol.md');
          }
        }
      }
    } catch { /* nudge failures are non-blocking */ }

    // Check for pending insights (in same data root — siblings of projects/)
    const insightsDir = path.join(dataRoot, 'insights');
    if (fs.existsSync(insightsDir)) {
      const insights = fs.readdirSync(insightsDir)
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .filter(f => {
          try {
            const content = fs.readFileSync(path.join(insightsDir, f), 'utf8');
            const projectMatch = content.match(/^project:\s*(\S+)/m);
            return projectMatch && projectMatch[1] === slug;
          } catch { return false; }
        });
      if (insights.length > 0) {
        ctx.push(`  ${insights.length} pending insight(s) — paste prompts/cortex-reflect.md to review`);
      }
    }
  }
} catch {
  // cortex-x not installed or unreachable — silently skip
}

// Memory health — auto-memory index size, broken links, stale project
// memories, and a library entry that fell behind the repo. Silent when healthy.
try {
  const os = require('os');
  const { execFileSync } = require('child_process');
  const health = require('./_lib/memory-health.cjs');
  const nowMs = Date.now();
  // execFile, not a shell: no cmd.exe per call on Windows (and no git.bat
  // picked up from the project dir). Short timeout — this is a status line.
  const git = (args) => {
    try {
      return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch { return null; }
  };

  let memory = null;
  try {
    const configDir = path.resolve(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'));
    // Claude Code keys auto-memory on the git repository, shared by every
    // worktree and subdirectory; the main checkout is the parent of the common
    // .git dir. Fall back to the worktree top, then cwd (outside git). One
    // process answers both; outside a repo it fails and we stay on cwd.
    const [commonDir, topLevel] = (git(['rev-parse', '--path-format=absolute', '--git-common-dir', '--show-toplevel']) || '').split(/\r?\n/);
    const mainRoot = commonDir && path.basename(commonDir) === '.git' ? path.dirname(commonDir) : null;
    const projectRoot = mainRoot || topLevel || ROOT;
    const configured = health.configuredMemoryDir(projectRoot, configDir, os.homedir());
    const memDir = configured ? configured.dir : health.autoMemoryDir([mainRoot, topLevel, ROOT], configDir);
    memory = memDir ? health.inspectAutoMemory(memDir, nowMs) : null;
  } catch { /* unreadable memory dir — still check the library below */ }

  let library = null;
  if (libraryEntry) {
    const age = health.libraryAge(libraryEntry.path, nowMs);
    let commitsSince = null;
    // Only spend a git call when the age alone could trigger the warning.
    if (age && age.ageDays >= health.LIBRARY_STALE_DAYS) {
      const n = git(['rev-list', '--count', `--since=${age.sinceIso}`, 'HEAD', '--', '.']);
      commitsSince = n !== null && /^\d+$/.test(n) ? Number(n) : null;
    }
    library = { slug: libraryEntry.slug, ageDays: age ? age.ageDays : null, commitsSince };
  }
  const lines = health.formatMemoryHealth({ memory, library });
  if (lines.length) ctx.push('', ...lines);
} catch {
  // _lib missing on an older install — skip silently.
}

// Auto-orchestration: surface recent session budget if .budget.jsonl exists.
// Helps the operator see at a glance whether yesterday's session was expensive and adjust
// today's agent-spawning caution accordingly. Skipped on flat-subscription
// installs (CORTEX_BUDGET_DISABLED=1) where token-cost warnings are noise.
if (process.env.CORTEX_BUDGET_DISABLED !== '1') {
  try {
    const os = require('os');
    const candidates = [
      path.join(os.homedir(), 'cortex-x'),
      path.join(os.homedir(), 'Desktop', 'APPs', 'cortex-x'),
      path.join(os.homedir(), '.cortex-x'),
    ];
    const cortexRoot = candidates.find(p => fs.existsSync(p));
    if (cortexRoot) {
      const { lastSessionSummary, getCapUsd } = require(
        path.join(os.homedir(), '.claude', 'shared', 'hooks', '_lib', 'budget.cjs')
      );
      const summary = lastSessionSummary(cortexRoot);
      const cap = getCapUsd();
      const sessions = Object.entries(summary.totalBySession || {})
        .sort((a, b) => (b[1].last_ts || '').localeCompare(a[1].last_ts || ''))
        .slice(0, 3);
      if (sessions.length > 0) {
        ctx.push(`\nAuto-orchestration budget (cap $${cap.toFixed(2)}/session):`);
        for (const [sid, totals] of sessions) {
          const shortSid = String(sid).slice(0, 8);
          ctx.push(
            `  session ${shortSid}: $${totals.cost_usd.toFixed(2)} ` +
            `(${totals.count} Agent/Task calls, ${totals.tokens.toLocaleString()} tokens)`
          );
        }
      }
    }
  } catch {
    // budget.cjs missing or unreadable — silently skip
  }
}

// cortex/.adapt-pending — written by new-project.md Phase 4 §4.5 (greenfield)
// or existing-project-audit.md Phase 4 (existing). Indicates Phase 5 (Adapt /
// Synthesis) did NOT complete (user quit, agent timeout, error). On next
// SessionStart we surface this so Claude can offer to resume.
// See docs/sprint-1.5-design.md §2.5.
try {
  const adaptMarkerPath = path.join(ROOT, 'cortex', '.adapt-pending');
  if (fs.existsSync(adaptMarkerPath)) {
    const raw = fs.readFileSync(adaptMarkerPath, 'utf8').trim();
    ctx.push('');
    ctx.push('=== cortex/.adapt-pending detected ===');
    ctx.push("A previous /start or /audit session wrote scaffold/audit artifacts but");
    ctx.push("did not complete Phase 5 (Adapt / Synthesis — auto-research + recommendations).");
    if (raw) ctx.push(`Marker contents: ${raw.slice(0, 200)}`);
    ctx.push("Offer to resume: 'Mám dokončit Phase 5 — spustit auto-research + napsat");
    ctx.push("cortex/recommendations.md? [y/n]'. The synthesizer agent at");
    ctx.push("~/.claude/shared/agents/synthesizer.md handles the merge once research is done.");
  }
} catch {
  // Adapt marker unreadable — silently skip.
}

// cortex-bootstrap marker — written by `cortex-bootstrap` helper in the
// project dir. One-shot: TTL 1 hour. If present and fresh, prime the next
// claude session to invoke /start (new) or /audit (existing).
// See docs/sprint-1.5-design.md §2.1.
try {
  const markerPath = path.join(ROOT, '.cortex-bootstrap-pending');
  if (fs.existsSync(markerPath)) {
    const raw = fs.readFileSync(markerPath, 'utf8');
    const modeMatch = raw.match(/^mode=(new|existing)\s*$/m);
    const atMatch = raw.match(/^at=(\S+)/m);
    if (modeMatch && atMatch) {
      const mode = modeMatch[1];
      const atIso = atMatch[1];
      const ageMs = Date.now() - Date.parse(atIso);
      const TTL_MS = 60 * 60 * 1000;  // 1 hour
      if (ageMs >= 0 && ageMs < TTL_MS) {
        ctx.push('');
        ctx.push('=== cortex-bootstrap pending ===');
        if (mode === 'new') {
          ctx.push("This directory was flagged by `cortex-bootstrap` for a NEW PROJECT.");
          ctx.push("Invoke the `/start` skill (~/.claude/shared/prompts/new-project.md)");
          ctx.push("after greeting the user, unless they explicitly redirect.");
          ctx.push("The skill itself will delete .cortex-bootstrap-pending on completion.");
        } else {
          ctx.push("This directory was flagged by `cortex-bootstrap` for an EXISTING PROJECT AUDIT.");
          ctx.push("Invoke the `/audit` skill (~/.claude/shared/prompts/existing-project-audit.md)");
          ctx.push("after greeting the user, unless they explicitly redirect.");
          ctx.push("The skill itself will delete .cortex-bootstrap-pending on completion.");
        }
      } else if (ageMs >= TTL_MS) {
        ctx.push('');
        ctx.push('=== cortex-bootstrap marker (stale, ignored) ===');
        ctx.push(`Marker is ${Math.round(ageMs / 60000)}min old (TTL 60min); ignoring.`);
        ctx.push("To re-arm: re-run `cortex-bootstrap` in this directory.");
      }
    }
  }
} catch {
  // Marker unreadable — silently skip; bootstrap is augmentation, not blocker.
}

// Sprint 2.20.1 — first-run discoverability. The operator's most-common
// blocker is "I installed cortex-x but didn't remember to type /cortex-init."
// SessionStart hooks can't auto-invoke skills, but they CAN inject a strong
// imperative context line that pushes Claude to OFFER /cortex-init proactively
// before answering the user's first prompt.
//
// Detection (all must hold):
//   - $PWD looks like a real project (has .git OR one of the common manifest
//     files / src dirs) — skip scratch dirs like /tmp/foo where the operator
//     would not want a setup picker.
//   - $PWD has no cortex-x footprint: no CLAUDE.md, no cortex/ artifacts,
//     no .cortex-bootstrap-pending or cortex/.adapt-pending in-progress marker.
//   - $PWD is NOT the cortex-x source repo itself (≥2 of install.sh,
//     install.ps1, bin/cortex-bootstrap.cjs, templates/CLAUDE.md.hbs match).
//
// Fail-open: any fs probe error → skip the nudge entirely; never noisy.
try {
  const claudeMdExists = fs.existsSync(path.join(ROOT, 'CLAUDE.md'));
  const cortexArtifactsExist = ['AUDIT.md', 'discovery.md', 'proposal.md', 'recommendations.md']
    .some((f) => fs.existsSync(path.join(ROOT, 'cortex', f)));
  const bootstrapPending = fs.existsSync(path.join(ROOT, '.cortex-bootstrap-pending'));
  const adaptPending = fs.existsSync(path.join(ROOT, 'cortex', '.adapt-pending'));

  const realProjectSignals = [
    '.git', 'package.json', 'pyproject.toml', 'Cargo.toml',
    'go.mod', 'Gemfile', 'README.md', 'src',
  ];
  const isRealProject = realProjectSignals.some((s) => fs.existsSync(path.join(ROOT, s)));

  const cortexSrcSignals = [
    'install.sh', 'install.ps1', 'bin/cortex-bootstrap.cjs', 'templates/CLAUDE.md.hbs',
  ];
  const insideCortexSource = cortexSrcSignals
    .filter((s) => fs.existsSync(path.join(ROOT, s))).length >= 2;

  if (
    isRealProject
    && !claudeMdExists
    && !cortexArtifactsExist
    && !bootstrapPending
    && !adaptPending
    && !insideCortexSource
  ) {
    ctx.push('');
    ctx.push('=== cortex-x first-run hint ===');
    ctx.push('This project has no CLAUDE.md, no cortex/ artifacts, and no in-progress');
    ctx.push('cortex-x flow. The operator installed cortex-x to make this moment frictionless.');
    ctx.push('Claude: proactively OFFER /cortex-init as the next action before answering');
    ctx.push('any unrelated question. Do not wait for the operator to recall the command.');
    ctx.push('Suggested opening (match the language of prior turns; default Czech for this');
    ctx.push('operator):  "Vidím, že tahle složka ještě nemá cortex-x setup. Spustím');
    ctx.push('/cortex-init?"  (English: "I see this folder has no cortex-x setup yet. Run');
    ctx.push('/cortex-init?"). Skip the offer ONLY if the operator immediately starts an');
    ctx.push('unrelated concrete task — then defer the suggestion to the end of your reply.');
  }
} catch {
  // Probe failed (permissions, race) — non-blocking; skip the nudge silently.
}

// Sprint 1.7.6 — Steward activation surface. If the project has a
// recommendations.md (the Steward input file) but no steward.yml workflow
// AND no halt switch active, surface ONE line nudge so the user discovers
// the autopilot without re-grepping docs.
try {
  const os = require('os');
  const recsPath = path.join(ROOT, 'cortex', 'recommendations.md');
  const stewardWorkflow = path.join(ROOT, '.github', 'workflows', 'steward.yml');
  const stewardHalt = path.join(os.homedir(), '.cortex', 'STEWARD_HALT');
  if (fs.existsSync(recsPath) && !fs.existsSync(stewardWorkflow) && !fs.existsSync(stewardHalt)) {
    ctx.push('');
    ctx.push('→ Steward ready to activate: paste ~/.claude/shared/prompts/steward-setup.md');
    ctx.push('  (autonomous nightly autopilot: reads recommendations.md, opens draft PR overnight, ~$0.0008/run)');
  }
} catch (_) {
  // Path probes failed — non-blocking augmentation; skip the nudge.
}

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: ctx.join('\n')
  }
}));
