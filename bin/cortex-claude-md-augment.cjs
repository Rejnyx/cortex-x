#!/usr/bin/env node
// cortex-claude-md-augment — opt-in append of cortex-x discipline block to
// the user's global ~/.claude/CLAUDE.md.
//
// Why this exists: skills only kick in inside /cortex-init, /audit, /start,
// /designer flows. For ad-hoc work ("make me a feature") the operator's
// Claude model has no instruction to dispatch parallel research agents,
// follow R1 (research-before-implement), or auto-spawn the R2 review
// pipeline. The global CLAUDE.md is the lever that biases EVERY session
// toward cortex discipline — but cortex install never auto-edits it
// (Principle 1). This helper is the bridge: explicit user consent →
// idempotent BEGIN/END-marked append.
//
// Identity rule: the cortex-managed block lives between two literal markers
// (see CORTEX_BLOCK_START / CORTEX_BLOCK_END below). Everything outside
// the markers is the user's content and is never touched.
//
// Modes:
//   --apply        append cortex discipline block (default)
//   --remove       strip the block between BEGIN/END markers
//   --status       print whether block is present + version
//   --dry-run      print planned diff, no mutation
//
// Flags:
//   --yes / -y     skip interactive confirmation
//   --json         machine-readable output
//   --help / -h
//
// Exit codes:
//   0   success / nothing-to-do
//   1   user-visible failure
//   2   internal bug

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseConfirmReply, confirmInteractive } = require('./_lib/confirm.cjs');
const { backupFile, writeFileAtomic } = require('./_lib/atomic-write.cjs');

const HOME = os.homedir();
const CLAUDE_MD_PATH = path.join(HOME, '.claude', 'CLAUDE.md');

// Block version — bump when content changes so we can detect outdated blocks
// and offer to refresh them.
// v3 (Sprint 2.27 + 2.30 co-ship): verification-discipline + worktree/mode
// hints added.
// v4 (2026-05-26): TodoWrite → Task-tools migration (TodoWrite disabled by
// default since Claude Code v2.1.142); native subagent worktree isolation hint.
// v5 (2026-05-28): R1 broadened from "research before implement" to "research
// before ASSERT or implement" — frozen training data means even answering a
// current-state question needs web research first (operator directive: AI is a
// tool, not an oracle). +context-engineering standard, 29 files.
// v6 (Sprint 2.44): added Dynamic Workflows sub-section — Claude Code v2.1.154+
// JS-script orchestration of subagents (shared/workflows/r2-review.js + audit.js),
// fan-out threshold (≥6 agents or multi-stage), hook composition semantics,
// 1-level nesting limit.
// v7 (2026-09-25): Claude Code v2.1.233+ no longer offers TaskCreate/TodoWrite
// on Opus 4.8 / Sonnet 5 / Fable 5 and newer; the block now says where the list
// lives instead and names CLAUDE_CODE_ENABLE_TODO_TOOLS=1.
const BLOCK_VERSION = '7';
const CORTEX_BLOCK_START = '<!-- BEGIN cortex-x discipline (v' + BLOCK_VERSION + ') — managed by cortex-claude-md-augment -->';
const CORTEX_BLOCK_END = '<!-- END cortex-x discipline -->';
// Match any version of the block (for removal + version-drift detection).
const CORTEX_BLOCK_RE = /<!-- BEGIN cortex-x discipline \(v(\d+)\) — managed by cortex-claude-md-augment -->[\s\S]*?<!-- END cortex-x discipline -->/g;

const DISCIPLINE_BLOCK = `## cortex-x discipline (auto-loaded — see standards/ for full rules)

You are working in an environment where cortex-x is installed (~/.claude/shared/). Apply these defaults to **every** session, not just inside cortex slash commands:

### Research, review, parallelism

**R1 — research before you ASSERT or implement.** Your training data is frozen; you don't know current state — not even about yourself (a newly-released model has to web-search to describe its own version). So whenever an ANSWER or a task depends on external/current state (framework + model versions, "what's the latest X", availability, pricing, library APIs, design trends, CVEs, a11y standards, competitive landscape, best practices that change yearly), dispatch web research FIRST — before stating it as fact AND before writing code against it. Say "let me verify" and check; never present frozen training knowledge as current truth. Treat AI as a tool, not an oracle. Cite findings with URLs. Cache under \`$CORTEX_DATA_HOME/research/\`. SSOT: \`~/.claude/shared/standards/web-research.md\`.

**R2 — review pipeline.** For non-trivial diffs (≥3 files, public API change, security-adjacent, agentic code paths), dispatch the 6-agent parallel review pipeline (\`security-auditor\`, \`correctness-auditor\`, \`acceptance-auditor\`, \`ssot-enforcer\`, \`blind-hunter\`, \`edge-case-hunter\`) BEFORE the user merges. Apply consensus HIGH findings in-commit.

**Parallel by default.** When multiple agent calls are independent (research topics, audit dimensions, file scans), dispatch them in a single message with multiple Agent tool blocks. Sequential calls only when later calls depend on earlier output.

**Dynamic Workflows for high fan-out.** Claude Code v2.1.154+ supports dynamic workflows — JS scripts orchestrating subagents. cortex ships \`shared/workflows/r2-review.js\` (R2 6-agent pipeline) and \`shared/workflows/audit.js\` (12-dim audit). Use a workflow when N ≥ 6 parallel agents OR multi-stage with fan-in barriers. For ≤6 agents in one task, single-message Agent dispatch is cheaper. Hooks compose transparently — post-tool-use handles \`Task\` subagent_type, block-destructive intercepts Bash regardless of permission mode, pre-commit-review-gate sees review markers per \`review-agents.cjs\` SSOT. See \`standards/workflows.md\`. Never call a workflow from inside a workflow agent (1-level nesting limit).

### Execution discipline

**Track multi-step work with a task list.** Any task with 3+ distinct steps gets a task list at the start. Since Claude Code v2.1.233 the task tools (\`TaskCreate\` / \`TodoWrite\`) are not offered on Opus 4.8, Sonnet 5, Fable 5 and newer models — keep the list as a short checklist in your reply (or the PROGRESS.md section for sprint work), or set \`CLAUDE_CODE_ENABLE_TODO_TOOLS=1\` to bring the tools back. Exactly ONE task \`in_progress\` at a time. Mark \`completed\` IMMEDIATELY when finished — never batch completions. New discoveries during execution → add as new tasks. This is load-bearing for hackathons + sprints — without it long tasks drift.

**Think before code.** State the plan in 1-2 sentences before the first edit. State assumptions you're making. If the plan is wrong, the operator catches it in seconds; if you start coding, the cost is rework.

**Surgical changes.** A bug fix doesn't need surrounding cleanup. A one-shot operation doesn't need a helper. Three similar lines beats a premature abstraction. Don't add features, refactor, or introduce abstractions beyond what the task requires. Don't add error handling, fallbacks, or validation for scenarios that can't happen.

**Counts not praise (voice charter).** No greetings, no emoji, no emotion words ("perfect!", "great!"). State results and decisions directly. End-of-turn summary: one or two sentences. What changed and what's next. SSOT: \`~/.claude/shared/standards/voice.md\`.

### Where things live

**Standards order** (when budgets conflict): Rule 0 Ship-Ready → Rule 1 SSOT/Modular/Scalable → Rule 1.5 Coding Behavior → Rule 2 Security/Testing/Observability/Correctness/Context-engineering → Rule 3 process. Browse: \`~/.claude/shared/standards/\` (29 files).

**Memory.** Per-project \`MEMORY.md\` (this project). Cross-project library: \`$CORTEX_DATA_HOME/projects/<slug>.md\` (populate via paste \`prompts/cortex-sync.md\` at end of session). Sprint state: \`PROGRESS.md\` (pending/in-progress/done/blocked). Check memory before assumptions; recall, then verify the file/symbol still exists before acting on it.

**Discoverability.** Type \`/cortex-help\` to see the slash command menu. \`/cortex-init\` (new project) · \`/audit\` (existing) · \`/test-audit\` (QA lens) · \`/designer\` (UI) · \`/cortex-doctor\` (health check). For nightly autonomous work: \`steward-setup.md\`.

**Safety hooks** are registered in \`~/.claude/settings.json\` if you ran \`cortex-hooks-register\` post-install. Verify: \`cortex-doctor --json\`. Without hooks: no block-destructive guard, no SessionStart context, no auto-orchestrate parallel-agent nudge.

### Verification discipline (Sprint 2.27)

**Pair every implementation todo with a verification todo on the next line.** Implementation = build/edit. Verification = run the test, open the URL, screenshot, read the log. Implementation alone is "compiles"; verification is "actually works."

**Before commit, the verification todo must be checked off** — not just the implementation one. A green test suite proves correctness; it doesn't prove the feature does what was asked. Screenshot + render + visual assertion proves the user-facing outcome.

**UI-shaped todos**: verification is \`Chrome DevTools MCP\` (\`claude mcp add chrome-devtools\`) → screenshot → assert, not \`npm run build → green\`. Build success is necessary, not sufficient. SSOT: \`~/.claude/shared/standards/verification-loop.md\`.

**95% confidence baseline.** When the user gives an ambiguous brief, ask clarifying questions until you're at ~95% confidence about scope + acceptance criteria BEFORE the first edit. One question round saves 3-4 rounds of corrections. Use \`prompts/95-confidence.md\` as the canonical phrasing.

### Claude Code mode hints (Sprint 2.30)

**Plan mode for ≥3 unknowns or cross-system impact.** Press \`shift+tab\` to enter plan mode (read+research only, no mutation). Produce the plan, get operator sign-off, then exit and execute. Cheap to cancel; expensive to mid-rollback.

**\`ultrathink\` for architecture decisions / non-trivial refactors / ambiguous bug reports.** Prefix the prompt with the literal token \`ultrathink\` to switch to the 32K-token thinking budget tier (other tiers: \`think\` 4K, \`think hard\`/\`megathink\` 10K). Not every task needs it; lean toward more thinking when the cost of being wrong is high.

**Parallel features → \`claude --worktree <name>\`** (shorthand \`-w\`). Each gets isolated \`.claude/worktrees/<name>/\` on branch \`worktree-<name>\`. Run from the primary worktree before sleeping — cortex Steward refuses to run in a non-primary worktree by default (\`STEWARD_WORKTREE_DENIED\`).

**Filesystem-isolate risky subagents with \`isolation: worktree\`.** When dispatching an Agent that WRITES (autonomous loops, bulk refactors, anything that could corrupt the tree), pass \`isolation: "worktree"\` so it works on a throwaway copy — auto-cleaned if it makes no changes, otherwise the branch + path are returned. Read-only review agents (\`blind-hunter\`, \`ssot-enforcer\`, …) don't need it. This is the native containment for the lethal-trifecta risk that \`/ralph-loop\` documents.

**Out-of-date?** This block is auto-generated. Refresh: \`cortex-claude-md-augment --apply\` (upgrades stale versions in place). Remove: \`cortex-claude-md-augment --remove\`. Health audit any time: \`cortex-doctor\`.`;

function parseArgs(argv) {
  const args = { mode: 'apply', yes: false, json: false, help: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.mode = 'apply';
    else if (a === '--remove') args.mode = 'remove';
    else if (a === '--status') args.mode = 'status';
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--yes' || a === '-y') args.yes = true;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else {
      console.error(`cortex-claude-md-augment: unknown flag '${a}'. Use --help for usage.`);
      process.exit(1);
    }
  }
  return args;
}

function printHelp() {
  console.log('cortex-claude-md-augment — opt-in append of cortex-x discipline block to ~/.claude/CLAUDE.md');
  console.log('');
  console.log('Usage:');
  console.log('  cortex-claude-md-augment             append discipline block (default)');
  console.log('  cortex-claude-md-augment --remove    strip the cortex block, leave user content');
  console.log('  cortex-claude-md-augment --status    print current state, no mutation');
  console.log('  cortex-claude-md-augment --dry-run   print planned diff, no mutation');
  console.log('  cortex-claude-md-augment --yes       skip interactive confirmation');
  console.log('  cortex-claude-md-augment --json      machine-readable output');
  console.log('');
  console.log('Identity rule: only the content between');
  console.log(`  ${CORTEX_BLOCK_START}`);
  console.log(`  ${CORTEX_BLOCK_END}`);
  console.log('is touched. User content outside the markers is preserved verbatim.');
}

// Sprint 2.21.2 R2 hardening: read as Buffer, sniff for invalid UTF-8 BEFORE
// committing to a utf8 string view. fs.readFileSync(path, 'utf8') silently
// replaces invalid bytes with U+FFFD, which would round-trip back to disk on
// write and permanently corrupt non-UTF8 user content (rare but real for
// legacy latin1-edited globals). We refuse to mutate non-UTF8 files.
function isWellFormedUtf8(buffer) {
  // Node ≥18 has TextDecoder with `fatal: true` that throws on invalid bytes.
  try {
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function readCurrent() {
  if (!fs.existsSync(CLAUDE_MD_PATH)) return { exists: false, content: '', wellFormed: true };
  const buf = fs.readFileSync(CLAUDE_MD_PATH);
  if (!isWellFormedUtf8(buf)) {
    return { exists: true, content: null, wellFormed: false };
  }
  let raw = buf.toString('utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return { exists: true, content: raw, wellFormed: true };
}

// Sprint 2.21.2 R2 hardening: detect orphan markers (BEGIN without END or
// END without BEGIN) — these indicate the user manually edited the cortex
// block and removed a marker. If we proceed with --apply on an orphan, the
// next --apply matches the new END against the orphan BEGIN and DELETES all
// user content between them. Refuse loudly instead.
const CORTEX_BEGIN_RE = /<!-- BEGIN cortex-x discipline \(v\d+\) — managed by cortex-claude-md-augment -->/g;
const CORTEX_END_RE = /<!-- END cortex-x discipline -->/g;

function countMarkers(content) {
  // Reset both regexes (safe even if already 0 — defensive).
  CORTEX_BEGIN_RE.lastIndex = 0;
  CORTEX_END_RE.lastIndex = 0;
  const begins = (content.match(CORTEX_BEGIN_RE) || []).length;
  const ends = (content.match(CORTEX_END_RE) || []).length;
  return { begins, ends };
}

// Scan content for any existing cortex block(s) and return:
//   { present: bool, version: '1' | '2' | ..., count: number, orphan: 'begin'|'end'|null }
function detectBlock(content) {
  const { begins, ends } = countMarkers(content);
  // Reset the multi-pair regex too.
  CORTEX_BLOCK_RE.lastIndex = 0;
  const matches = [...content.matchAll(CORTEX_BLOCK_RE)];
  const orphan = begins > matches.length ? 'begin' : (ends > matches.length ? 'end' : null);
  if (matches.length === 0) return { present: false, version: null, count: 0, orphan };
  return { present: true, version: matches[0][1], count: matches.length, orphan };
}

function backupClaudeMd(rawContent) {
  return backupFile(CLAUDE_MD_PATH, rawContent);
}

function writeContent(content) {
  writeFileAtomic(CLAUDE_MD_PATH, content);
}

// Sprint 2.21.3 MED #4 R2 hardening: detect whether a position falls inside
// an unclosed Markdown code fence per CommonMark §4.5.
//
// R2 round-2 fix (correctness HIGH): naive regex parity-count failed on
// fences nested by length. CommonMark: an N-backtick fence is closed only
// by a line of ≥N backticks. Shorter backtick runs inside are literal
// content. Walk line-by-line maintaining the currently-open fence length;
// position is "inside" iff openLen > 0 when we reach it.
const FENCE_LINE_RE = /^(`{3,})/;
function isInsideCodeFence(content, position) {
  const before = content.slice(0, position);
  const lines = before.split(/\r?\n/);
  let openLen = 0;
  for (const line of lines) {
    const m = line.match(FENCE_LINE_RE);
    if (!m) continue;
    const n = m[1].length;
    if (openLen === 0) {
      openLen = n;
    } else if (n >= openLen) {
      openLen = 0;
    }
  }
  return openLen > 0;
}

// Sprint 2.21.3 MED #3 + #6 R2 hardening: replace cortex blocks with a
// scoped pass that (a) preserves the input file's EOL convention (LF vs
// CRLF — Windows operator on Git Bash often has CRLF CLAUDE.md), (b) skips
// matches inside Markdown code fences (a user documenting cortex itself
// with the example BEGIN/END markers inside ``` should not have their docs
// stripped), and (c) only collapses whitespace at the SITE of the removed
// block, never elsewhere in the file (user's intentional triple-newlines
// outside the block region are preserved).
function stripCortexBlocks(currentContent) {
  CORTEX_BLOCK_RE.lastIndex = 0;
  const matches = [...currentContent.matchAll(CORTEX_BLOCK_RE)];
  if (matches.length === 0) return currentContent;
  // Build the stripped string by slicing around matches, skipping those
  // inside fences. For each removed match, also consume one preceding +
  // one following blank line if present, so the local whitespace doesn't
  // leave a double-gap. The rest of the file is byte-preserved.
  let result = '';
  let cursor = 0;
  for (const m of matches) {
    if (isInsideCodeFence(currentContent, m.index)) continue;
    // Extend the consumed range to one trailing blank line and one leading
    // blank line if present, capping at content boundary.
    let start = m.index;
    let end = m.index + m[0].length;
    // trailing newlines after block
    while (end < currentContent.length && (currentContent[end] === '\n' || currentContent[end] === '\r')) {
      end++;
    }
    // Leading blank line BEFORE the block (\n\n on LF files, \r\n\r\n on CRLF).
    // R2 round-2 fix (blind HIGH + edge MED): the old walk consumed `\n`,
    // optional `\r`, `\n` — three chars of `\r\n\r\n` — leaving a stray `\r`
    // at the consumed boundary. New walk consumes the full second EOL pair
    // including its leading `\r` when present.
    if (start >= 2 && currentContent[start - 1] === '\n') {
      let lookback = start - 1;
      if (lookback > 0 && currentContent[lookback - 1] === '\r') lookback--;
      if (lookback > 0 && currentContent[lookback - 1] === '\n') {
        lookback--;
        if (lookback > 0 && currentContent[lookback - 1] === '\r') lookback--;
        start = lookback;
      }
    }
    result += currentContent.slice(cursor, start);
    cursor = end;
  }
  result += currentContent.slice(cursor);
  return result;
}

// Detect the file's dominant line-ending convention. Counts CRLF pairs vs
// bare-LF lines (LF that is not part of a CRLF). Majority wins; ties favor
// LF (the Unix default + the DISCIPLINE_BLOCK template's native EOL).
// R2 round-2 fix (edge HIGH): the previous `/\r\n/.test()` flipped the
// entire output to CRLF on a SINGLE accidental CRLF in a mostly-LF file.
function detectEol(content) {
  const crlfMatches = content.match(/\r\n/g);
  const allLfMatches = content.match(/\n/g);
  const crlf = crlfMatches ? crlfMatches.length : 0;
  const totalLf = allLfMatches ? allLfMatches.length : 0;
  const bareLf = totalLf - crlf;
  return crlf > bareLf ? '\r\n' : '\n';
}

// Compute the new content after applying mode. Pure function.
function computeNext(currentContent, mode) {
  // EOL detection: dominant convention (majority count). The DISCIPLINE_BLOCK
  // body (template literal with bare LF) is normalized to the detected EOL
  // before insertion. User content outside the block is byte-preserved.
  const eol = detectEol(currentContent);
  const stripped = stripCortexBlocks(currentContent);
  if (mode === 'remove') {
    return stripped.trimEnd() + eol;
  }
  // apply: strip any existing block first, then append fresh with eol-
  // normalized body.
  const blockBody = eol === '\n' ? DISCIPLINE_BLOCK : DISCIPLINE_BLOCK.replace(/\r?\n/g, eol);
  const fullBlock = `${CORTEX_BLOCK_START}${eol}${blockBody}${eol}${CORTEX_BLOCK_END}`;
  const base = stripped.trimEnd();
  return (base.length > 0 ? base + eol + eol : '') + fullBlock + eol;
}

// Sprint 2.28.3 parity backport: confirmInteractive + parseConfirmReply
// moved to bin/_lib/confirm.cjs. Semantics changed from "empty=yes" (Sprint
// 2.21.2) to "empty=abort" (Sprint 2.28.1 edge HIGH #11). Same threat model
// as cortex-permissions-register: writes CLAUDE.md, closed stdin must not
// auto-confirm. Helpers imported at top of file.

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); return 0; }

  const current = readCurrent();

  // Sprint 2.21.2 R2 hardening: refuse to mutate a non-UTF8 CLAUDE.md.
  // readFileSync('utf8') would silently replace invalid bytes with U+FFFD,
  // and we'd write the corruption back permanently. Status mode can still
  // report (best-effort) but apply/remove abort cleanly.
  if (current.exists && !current.wellFormed) {
    const msg = `${CLAUDE_MD_PATH} is not valid UTF-8 — refusing to mutate to avoid corrupting your content`;
    if (args.json) {
      console.log(JSON.stringify({ ok: false, error: msg, code: 'NOT_UTF8' }, null, 2));
    } else {
      console.error(`cortex-claude-md-augment: ${msg}`);
      console.error('  Convert to UTF-8 (e.g. iconv -f latin1 -t utf-8 < file > tmp && mv tmp file) and retry.');
    }
    return 1;
  }

  const detected = detectBlock(current.content);

  if (args.mode === 'status') {
    const report = {
      claude_md_present: current.exists,
      cortex_block_present: detected.present,
      cortex_block_version: detected.version,
      cortex_block_current_version: BLOCK_VERSION,
      duplicate_blocks: detected.count > 1 ? detected.count : 0,
      orphan_marker: detected.orphan,
      claude_md_path: CLAUDE_MD_PATH,
      stale: detected.present && detected.version !== BLOCK_VERSION,
    };
    if (args.json) {
      console.log(JSON.stringify({ ok: true, ...report }, null, 2));
    } else {
      console.log('cortex-claude-md-augment status:');
      console.log(`  CLAUDE.md: ${current.exists ? CLAUDE_MD_PATH : '(not present)'}`);
      console.log(`  cortex block: ${detected.present ? `present (v${detected.version})` : '(absent)'}`);
      if (report.stale) console.log(`  ↳ STALE — current version is v${BLOCK_VERSION}, run --apply to refresh`);
      if (report.duplicate_blocks > 0) console.log(`  ↳ WARNING: ${report.duplicate_blocks} duplicate blocks — run --apply to dedupe`);
      if (detected.orphan) console.log(`  ↳ WARNING: orphan ${detected.orphan.toUpperCase()} marker — apply/remove will refuse until manually fixed`);
      if (!detected.present) console.log(`  → run \`cortex-claude-md-augment\` to add`);
    }
    return 0;
  }

  // Sprint 2.21.2 R2 hardening: orphan markers indicate manual edit that
  // removed one half of a BEGIN/END pair. Proceeding with --apply would
  // pair the new END with the orphan BEGIN on next run and delete user
  // content between them. Refuse loudly with manual-fix instructions.
  // --remove is also unsafe (would not cleanly strip the orphan).
  if (detected.orphan) {
    const msg = `${CLAUDE_MD_PATH} has an orphan ${detected.orphan.toUpperCase()} marker — manual edit required first`;
    if (args.json) {
      console.log(JSON.stringify({ ok: false, error: msg, code: 'ORPHAN_MARKER', orphan: detected.orphan }, null, 2));
    } else {
      console.error(`cortex-claude-md-augment: ${msg}`);
      console.error(`  Cause: a previous edit removed one side of the BEGIN/END pair.`);
      console.error(`  Fix: open ${CLAUDE_MD_PATH} and either complete the pair (re-add the missing`);
      console.error(`       marker) or delete the orphan, then re-run cortex-claude-md-augment.`);
      console.error(`  Refusing to mutate to avoid permanent data loss on your user content.`);
    }
    return 1;
  }

  const nextContent = computeNext(current.content, args.mode);
  const noChange = nextContent === current.content || (
    !current.exists && args.mode === 'remove'
  );

  if (noChange) {
    if (args.json) {
      console.log(JSON.stringify({ ok: true, mode: args.mode, no_change: true }, null, 2));
    } else {
      console.log(`cortex-claude-md-augment: nothing to do (already in desired state).`);
    }
    return 0;
  }

  if (args.dryRun) {
    if (args.json) {
      console.log(JSON.stringify({
        ok: true, mode: args.mode, dry_run: true,
        prev_length: current.content.length, next_length: nextContent.length,
        block_present_before: detected.present,
        block_version_before: detected.version,
      }, null, 2));
    } else {
      console.log('cortex-claude-md-augment dry-run:');
      console.log(`  CLAUDE.md: ${CLAUDE_MD_PATH}`);
      console.log(`  block currently: ${detected.present ? `v${detected.version}` : 'absent'}`);
      console.log(`  after ${args.mode}: ${args.mode === 'apply' ? `v${BLOCK_VERSION}` : 'absent'}`);
      console.log(`  size: ${current.content.length} → ${nextContent.length} bytes`);
    }
    return 0;
  }

  if (!args.yes) {
    const verb = args.mode === 'apply'
      ? (detected.present ? (detected.version === BLOCK_VERSION ? 'refresh' : `upgrade v${detected.version} → v${BLOCK_VERSION}`) : 'append')
      : 'remove';
    const prompt =
      `cortex-claude-md-augment will ${verb} the cortex discipline block in ${CLAUDE_MD_PATH}.\n` +
      `  (user content outside the markers is preserved.)\n` +
      `Proceed? [y/N] `;
    if (!confirmInteractive(prompt)) {
      if (args.json) {
        console.log(JSON.stringify({ ok: true, aborted: true }, null, 2));
      } else {
        console.log('cortex-claude-md-augment: aborted.');
      }
      return 0;
    }
  }

  let backupPath = null;
  if (current.exists) {
    try {
      backupPath = backupClaudeMd(current.content);
    } catch (err) {
      console.error(`cortex-claude-md-augment: backup failed: ${err.message}`);
      return 1;
    }
  }

  try {
    writeContent(nextContent);
  } catch (err) {
    console.error(`cortex-claude-md-augment: write failed: ${err.message}`);
    if (backupPath) console.error(`  backup preserved at: ${backupPath}`);
    return 1;
  }

  if (args.json) {
    console.log(JSON.stringify({
      ok: true, mode: args.mode, backup_path: backupPath,
      claude_md_path: CLAUDE_MD_PATH, block_version: BLOCK_VERSION,
    }, null, 2));
  } else {
    console.log(`cortex-claude-md-augment: ${args.mode === 'apply' ? 'applied' : 'removed'}.`);
    if (backupPath) console.log(`  backup: ${backupPath}`);
    console.log(`  next Claude Code session will pick up the new global CLAUDE.md.`);
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (err) {
    console.error('cortex-claude-md-augment: internal error:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
}

module.exports = {
  BLOCK_VERSION,
  CORTEX_BLOCK_START,
  CORTEX_BLOCK_END,
  CORTEX_BLOCK_RE,
  CORTEX_BEGIN_RE,
  CORTEX_END_RE,
  DISCIPLINE_BLOCK,
  parseArgs,
  detectBlock,
  computeNext,
  countMarkers,
  isWellFormedUtf8,
  parseConfirmReply,
};
