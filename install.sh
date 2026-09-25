#!/usr/bin/env bash
# cortex-x installer
# Installs shared framework to ~/.claude/ for global use across projects.
# Safe: backs up existing ~/.claude/shared/ before overwriting.
#
# Two execution modes:
#
#   1) curl | bash (recommended for fresh users):
#        curl -fsSL https://raw.githubusercontent.com/Rejnyx/cortex-x/main/install.sh | bash
#      The script self-detects pipe execution and clones cortex-x to ~/cortex-x
#      (or $CORTEX_HOME), then re-execs the local install.sh from that clone.
#
#   2) Local execution (after manual git clone):
#        git clone https://github.com/Rejnyx/cortex-x ~/cortex-x
#        ~/cortex-x/install.sh
#      Standard install path; copies framework assets to ~/.claude/shared/.
#
# Env vars honored (see standards/ship-ready.md):
#   CORTEX_CHANNEL=beta|stable  — beta = track main HEAD (default for now);
#                                 stable = checkout highest semver tag.
#   CORTEX_HOME=<path>          — override cortex-x source directory
#                                 (default: script location, or ~/cortex-x in
#                                 curl|bash mode).
#   CORTEX_NO_UPDATE=1          — skip checkout step even if CHANNEL=stable.

set -e

# Stream detection — when invoked via `curl | bash`, $BASH_SOURCE is empty or
# points to a non-existent location. Self-clone the repo first, then re-exec
# the local install.sh from the clone. This is the modern install pattern
# used by Bun, Deno, Rustup, uv, fnm, mise, oh-my-zsh, Homebrew.
SCRIPT_PATH="${BASH_SOURCE[0]:-}"
if [ -z "$SCRIPT_PATH" ] || [ ! -f "$SCRIPT_PATH" ]; then
  CORTEX_CLONE_DIR="${CORTEX_HOME:-$HOME/cortex-x}"
  echo "cortex-x bootstrap (curl | bash mode)"
  echo "  source: https://github.com/Rejnyx/cortex-x"
  echo "  clone:  $CORTEX_CLONE_DIR"
  echo
  if ! command -v git > /dev/null 2>&1; then
    echo "ERROR: git is required but not found on PATH." >&2
    echo "  Install git first, then re-run." >&2
    exit 1
  fi
  if [ -d "$CORTEX_CLONE_DIR/.git" ]; then
    echo "  existing clone found — fetching origin/main"
    cd "$CORTEX_CLONE_DIR"
    if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
      git fetch --quiet origin main 2>/dev/null || echo "  warning: fetch failed (offline?), using current HEAD"
      git checkout --quiet main 2>/dev/null || true
      git pull --ff-only --quiet origin main 2>/dev/null || echo "  warning: pull failed, using current HEAD"
    else
      echo "  local changes detected in $CORTEX_CLONE_DIR — skipping update"
      echo "  to manually update: cd $CORTEX_CLONE_DIR && git pull --ff-only origin main"
    fi
    cd - > /dev/null
  else
    mkdir -p "$(dirname "$CORTEX_CLONE_DIR")"
    # Clone strategy: try anonymous HTTPS first (works for public repos).
    # Fall back to gh-cli (works for private repos when user is gh-auth'd) or
    # to GITHUB_TOKEN-authenticated HTTPS.
    if git clone --quiet https://github.com/Rejnyx/cortex-x "$CORTEX_CLONE_DIR" 2>/dev/null; then
      echo "  cloned successfully (public)"
    elif [ -n "$GITHUB_TOKEN" ] && git clone --quiet "https://x-access-token:${GITHUB_TOKEN}@github.com/Rejnyx/cortex-x" "$CORTEX_CLONE_DIR" 2>/dev/null; then
      echo "  cloned successfully (GITHUB_TOKEN)"
    elif command -v gh > /dev/null 2>&1 && gh auth status > /dev/null 2>&1 && gh repo clone Rejnyx/cortex-x "$CORTEX_CLONE_DIR" -- --quiet 2>/dev/null; then
      echo "  cloned successfully (gh-cli)"
    else
      echo "ERROR: git clone failed." >&2
      echo "  If cortex-x is still in closed beta, you need either:" >&2
      echo "    1) gh CLI authenticated:  gh auth login" >&2
      echo "    2) a GITHUB_TOKEN env var with read access to Rejnyx/cortex-x" >&2
      echo "  Then re-run this installer." >&2
      exit 1
    fi
  fi
  echo "  re-executing $CORTEX_CLONE_DIR/install.sh"
  echo "============================================================"
  exec bash "$CORTEX_CLONE_DIR/install.sh" "$@"
fi

# Resolve cortex-x source directory.
# Precedence: $CORTEX_HOME → script location.
if [ -n "$CORTEX_HOME" ] && [ -d "$CORTEX_HOME" ]; then
  CORTEX_ROOT="$CORTEX_HOME"
else
  CORTEX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi
CLAUDE_HOME="${HOME}/.claude"
CHANNEL="${CORTEX_CHANNEL:-beta}"

# Sprint 2.28.3 SSOT extract — Rule-of-Three on 3 consent gates below.
# Single source for env-var normalization + interactive-consent decision.
#
# normalize_consent_var: lowercases + strips whitespace from $1 with LC_ALL=C
# (Sprint 2.28.3 item #8 MED edge — Turkish locale dotless-i hardening).
normalize_consent_var() {
  printf '%s' "${1:-}" | LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C tr -d '[:space:]'
}

# consent_prompt_decision: reads $1 (env-var raw value), $2 (TTY prompt text).
# Echoes 'y' / 'n' to stdout. Settings-mutating prompts use abort-on-empty
# (Sprint 2.28.3 item #5 MED — align install.sh with CLI's Sprint 2.28.1
# edge HIGH #11 fix). For non-TTY runs without env-var → 'n' (skip silently).
#
# Recognized env-var values (case-insensitive, whitespace-tolerant):
#   1 / y / yes / true  → 'y'
#   0 / n / no / false  → 'n'
#   anything else / empty → fall through to TTY prompt, else 'n'.
consent_prompt_decision() {
  local raw_var="$1"
  local prompt_text="$2"
  local norm
  norm="$(normalize_consent_var "$raw_var")"
  case "$norm" in
    1|y|yes|true) echo 'y'; return 0 ;;
    0|n|no|false) echo 'n'; return 0 ;;
  esac
  if [ -t 0 ]; then
    local reply=''
    local norm_reply=''
    printf '%s' "$prompt_text"
    read -r reply || true
    # H-5 R2 hardening: CRLF-cloned install.sh (Git autocrlf on Windows)
    # would leave $'\r' at end of $reply, breaking literal case match. Strip
    # before normalize.
    reply="${reply%$'\r'}"
    # H-6 R2 hardening: route reply through the same normalizer as env-var
    # input so "Yes", " y ", "YES\n" all accept consistently with the CJS
    # parseConfirmReply contract (trim + lowercase). Without this,
    # install.sh accepted only `[yY]|[yY][eE][sS]` while CJS accepted any
    # case + whitespace — cross-platform parity gap.
    norm_reply="$(normalize_consent_var "$reply")"
    case "$norm_reply" in
      y|yes) echo 'y' ;;
      *) echo 'n' ;;
    esac
  else
    echo 'n'
  fi
}

# Language preference — interactive prompt unless CORTEX_LANGUAGE is set
# or stdin is not a TTY (for CI/non-interactive runs).
if [ -z "$CORTEX_LANGUAGE" ] && [ -t 0 ]; then
  echo "Communication language for Claude in cortex-x sessions?"
  echo "  en  — English (default)"
  echo "  cs  — Czech (čeština)"
  echo "  de  — German (Deutsch)"
  echo "  fr  — French (français)"
  echo "  es  — Spanish (español)"
  printf "Language code [en]: "
  read -r CORTEX_LANGUAGE || true
fi
CORTEX_LANGUAGE="${CORTEX_LANGUAGE:-en}"

# Profile selection (Sprint 2.10.2) — pick the user role to tailor post-install
# experience. dev (default, full developer experience) | qa-tester (Verča —
# tester role, primes /test-audit + qa-engineer profile) | ai-engineer (heavy
# AI-agent stack focus) | minimal (just the framework, no extra slash-skill).
#
# Precedence: --profile=<name> CLI arg > $CORTEX_PROFILE env > interactive
# prompt > "dev" default. Skip prompt if non-interactive (CI / unattended).
CORTEX_PROFILE="${CORTEX_PROFILE:-}"
for arg in "$@"; do
  case "$arg" in
    --profile=*) CORTEX_PROFILE="${arg#--profile=}" ;;
  esac
done
if [ -z "$CORTEX_PROFILE" ] && [ -t 0 ]; then
  echo
  echo "Which role best describes you? (tailors which slash-skill is primed)"
  echo "  dev          — full-stack developer (default — primes /cortex-init)"
  echo "  qa-tester    — QA engineer / tester (primes /test-audit + qa-engineer profile)"
  echo "  ai-engineer  — AI / agent engineer (primes /cortex-init + ai-agent profile)"
  echo "  minimal      — framework only, no extra skill"
  printf "Profile [dev]: "
  read -r CORTEX_PROFILE || true
fi
CORTEX_PROFILE="${CORTEX_PROFILE:-dev}"
case "$CORTEX_PROFILE" in
  dev|qa-tester|ai-engineer|minimal) ;;
  *)
    echo "  warning: unknown profile '$CORTEX_PROFILE' — falling back to 'dev'."
    CORTEX_PROFILE="dev"
    ;;
esac

# Identity capture (Sprint 1.7.4) — auto-detect from git config + Intl + gh.
# Detector ALWAYS runs when node + detector are available (so platform/locale
# always populate). Interactive Y/n confirmation only when TTY + not CORTEX_NO_IDENTITY.
# Persists to ~/.claude/cortex/user.yaml.
CORTEX_USER_NAME=''
CORTEX_USER_EMAIL=''
CORTEX_USER_USERNAME=''
CORTEX_USER_PLATFORM=''
CORTEX_USER_LOCALE=''
CORTEX_USER_GH_LOGIN=''
CORTEX_USER_CONFIRMED='false'
if command -v node > /dev/null 2>&1 && [ -f "$CORTEX_ROOT/detectors/detect-user-identity.cjs" ]; then
  # Detector emits CORTEX_USER_* assignments — safe to eval (single-quoted with bash escaping).
  IDENTITY_OUT="$(node "$CORTEX_ROOT/detectors/detect-user-identity.cjs" --shell 2>/dev/null || true)"
  if [ -n "$IDENTITY_OUT" ]; then
    eval "$IDENTITY_OUT"
  fi
fi
# Interactive confirmation gate — only when TTY + identity capture not opted out.
if [ -z "$CORTEX_NO_IDENTITY" ] && [ -t 0 ] && [ -n "$IDENTITY_OUT" ]; then
  echo
  echo "Detected user identity:"
  [ -n "$CORTEX_USER_NAME" ]     && echo "  name:    $CORTEX_USER_NAME"     || echo "  name:    (none — set git config user.name to use)"
  [ -n "$CORTEX_USER_EMAIL" ]    && echo "  email:   $CORTEX_USER_EMAIL"    || echo "  email:   (none — set git config user.email to use)"
  [ -n "$CORTEX_USER_LOCALE" ]   && echo "  locale:  $CORTEX_USER_LOCALE"
  [ -n "$CORTEX_USER_GH_LOGIN" ] && echo "  gh:      $CORTEX_USER_GH_LOGIN"
  if [ -z "$CORTEX_USER_NAME" ] && [ -z "$CORTEX_USER_EMAIL" ]; then
    echo "  (no signals — Claude will address you generically; you can edit ~/.claude/cortex/user.yaml later)"
  else
    printf "Use this identity? [Y/n]: "
    read -r CORTEX_IDENTITY_REPLY || true
    CORTEX_IDENTITY_REPLY="${CORTEX_IDENTITY_REPLY:-y}"
    case "$CORTEX_IDENTITY_REPLY" in
      [yY]|[yY][eE][sS]) CORTEX_USER_CONFIRMED='true' ;;
      *)
        echo "  ↳ Skipped — running with empty identity. Edit ~/.claude/cortex/user.yaml after install."
        CORTEX_USER_NAME=''; CORTEX_USER_EMAIL=''; CORTEX_USER_LOCALE=''; CORTEX_USER_GH_LOGIN=''
        CORTEX_USER_CONFIRMED='false'
        ;;
    esac
  fi
fi

echo "cortex-x installer"
echo "  from:     $CORTEX_ROOT"
echo "  to:       $CLAUDE_HOME/shared"
echo "  channel:  $CHANNEL"
echo "  language: $CORTEX_LANGUAGE"
echo "  profile:  $CORTEX_PROFILE"
echo

# Channel resolution — check out appropriate ref before copying.
if [ "$CHANNEL" = "stable" ] && [ -z "$CORTEX_NO_UPDATE" ]; then
  if [ -d "$CORTEX_ROOT/.git" ]; then
    cd "$CORTEX_ROOT"
    git fetch --tags --quiet || echo "Warning: git fetch failed (offline?); using local tags."
    LATEST="$(git tag -l 'v*' --sort=-v:refname | grep -vE -- '-(alpha|beta|rc)' | head -1 || true)"
    if [ -n "$LATEST" ]; then
      echo "Checking out stable tag: $LATEST"
      git checkout --quiet "$LATEST"
    else
      echo "No stable tag found (no v*.*.* yet); staying on current branch."
    fi
    cd - > /dev/null
  else
    echo "Note: $CORTEX_ROOT is not a git repo; cannot resolve stable tag."
  fi
elif [ "$CHANNEL" = "beta" ] && [ -z "$CORTEX_NO_UPDATE" ]; then
  if [ -d "$CORTEX_ROOT/.git" ]; then
    cd "$CORTEX_ROOT"
    if git diff --quiet && git diff --cached --quiet; then
      git fetch --quiet || echo "Warning: git fetch failed (offline?); using local main."
      git checkout --quiet main 2>/dev/null || true
    else
      echo "Local changes detected — skipping beta auto-update. Commit or stash to resume."
    fi
    cd - > /dev/null
  fi
fi

if [ -d "$CLAUDE_HOME/shared" ]; then
  BACKUP="$CLAUDE_HOME/shared.backup-$(date +%Y%m%d-%H%M%S)"
  echo "Existing ~/.claude/shared/ found. Backing up to: $BACKUP"
  mv "$CLAUDE_HOME/shared" "$BACKUP"
  # Rotate: keep only the most recent backup. The cortex-x source repo at
  # $CORTEX_ROOT (with full git history + remote) is the canonical backup;
  # this snapshot is just last-install rollback safety, not deep history.
  # Without rotation these accumulate forever and pollute ~/.claude/ git status
  # (10 backups × ~74 files = 700+ untracked observed in field 2026-05-01).
  ls -1dt "$CLAUDE_HOME"/shared.backup-* 2>/dev/null | tail -n +2 | xargs -r rm -rf
fi

mkdir -p "$CLAUDE_HOME/shared"

# Copy shared content (hooks, skills, agents, standards, prompts, review agents)
cp -r "$CORTEX_ROOT/shared/." "$CLAUDE_HOME/shared/"
cp -r "$CORTEX_ROOT/standards" "$CLAUDE_HOME/shared/"
cp -r "$CORTEX_ROOT/templates" "$CLAUDE_HOME/shared/"
cp -r "$CORTEX_ROOT/profiles" "$CLAUDE_HOME/shared/"
cp -r "$CORTEX_ROOT/prompts" "$CLAUDE_HOME/shared/"
cp -r "$CORTEX_ROOT/agents" "$CLAUDE_HOME/shared/"

# Skills already copied via $CORTEX_ROOT/shared/. above (shared/skills/ is the
# canonical location). Root-level $CORTEX_ROOT/skills/ is reserved for future
# top-level cortex-x skills and currently empty — no separate copy needed.

# Detectors directory — deterministic profile/stack/stage classifiers (auto-optimization).
# Read by session-start hook + cortex-doctor prompt. Fail-open contract.
if [ -d "$CORTEX_ROOT/detectors" ]; then
  cp -r "$CORTEX_ROOT/detectors" "$CLAUDE_HOME/shared/" 2>/dev/null || true
fi

# Tools directory — Node CLIs invoked by cortex-doctor + ad-hoc by users.
# Currently: verify-audit-output.cjs (Tier 3 QA). Includes lib/ for shared
# helpers like resolve-cortex-home.cjs (SSOT).
if [ -d "$CORTEX_ROOT/tools" ]; then
  cp -r "$CORTEX_ROOT/tools" "$CLAUDE_HOME/shared/" 2>/dev/null || true
fi

# Record cortex-x source dir for {{cortex_source}} placeholder resolution at scaffold time.
# Templates reference installed assets via ~/.claude/shared/; dynamic dirs (projects/, research/)
# stay in source and need an absolute path baked into scaffolded files.
#
# Sprint 1.6: also record CORTEX_DATA_HOME (default ~/.cortex). User-personal
# data — research caches, projects library, insights, journal, evals — lives
# here, NOT inside the cortex-x source repo. See MIGRATIONS.md Sprint 1.6.
CORTEX_DATA_HOME="${CORTEX_DATA_HOME:-$HOME/.cortex}"
mkdir -p "$CORTEX_DATA_HOME"/{research,projects,insights/proposals,journal,evals}

# Seed insights/README.md on first install only — never overwrite user content.
if [ ! -f "$CORTEX_DATA_HOME/insights/README.md" ] && [ -f "$CORTEX_ROOT/templates/cortex-data-insights-readme.md" ]; then
  cp "$CORTEX_ROOT/templates/cortex-data-insights-readme.md" "$CORTEX_DATA_HOME/insights/README.md"
fi

# Convert MSYS/Git-Bash paths (/c/Users/...) to Windows mixed-style (C:/Users/...)
# so Windows-native Node — used by hooks and bin/cortex-bootstrap.cjs — can
# resolve them via path.join. Native Linux/macOS paths pass through unchanged.
to_node_path() {
  if command -v cygpath > /dev/null 2>&1; then
    cygpath -m "$1"
  else
    printf '%s' "$1"
  fi
}
CORTEX_ROOT_NP=$(to_node_path "$CORTEX_ROOT")
CORTEX_DATA_HOME_NP=$(to_node_path "$CORTEX_DATA_HOME")
printf 'cortex_source: %s\ncortex_data_home: %s\n' \
  "$CORTEX_ROOT_NP" "$CORTEX_DATA_HOME_NP" \
  > "$CLAUDE_HOME/shared/cortex-source.yaml"

# Write/update module.local.yaml with user preference (gitignored).
MODULE_LOCAL="$CORTEX_ROOT/module.local.yaml"
cat > "$MODULE_LOCAL" <<YAML
# Per-user override (gitignored). See module.yaml for defaults.
# Regenerated by install.sh — edit freely after install, won't be overwritten
# unless you re-run install.
config:
  communication_language: $CORTEX_LANGUAGE
YAML

# Sprint 1.7.4 — write user identity to ~/.claude/cortex/user.yaml.
# Templates + session-start hook read this to address the user by name in
# their detected locale. Always written (even with empty fields) so callers
# can rely on the file existing. Idempotent: regenerated on every install.
USER_YAML_DIR="$CLAUDE_HOME/cortex"
USER_YAML="$USER_YAML_DIR/user.yaml"
mkdir -p "$USER_YAML_DIR"
cat > "$USER_YAML" <<YAML
# cortex-x user identity (gitignored — written by install.sh).
# Populated from git config + Intl + gh CLI. Edit freely; install will not
# overwrite unless you re-run it. Used by templates (CLAUDE.md, MEMORY.md)
# and session-start hook to personalize output.
name: $CORTEX_USER_NAME
email: $CORTEX_USER_EMAIL
username: $CORTEX_USER_USERNAME
platform: $CORTEX_USER_PLATFORM
locale: $CORTEX_USER_LOCALE
gh_login: $CORTEX_USER_GH_LOGIN
language: $CORTEX_LANGUAGE
profile: $CORTEX_PROFILE
confirmed: $CORTEX_USER_CONFIRMED
detected_at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
YAML

case "$CORTEX_LANGUAGE" in
  cs) LANG_NAME="Czech (čeština)" ;;
  de) LANG_NAME="German (Deutsch)" ;;
  fr) LANG_NAME="French (français)" ;;
  es) LANG_NAME="Spanish (español)" ;;
  *)  LANG_NAME="English" ;;
esac

# Install cortex-bootstrap helper to ~/.claude/shared/bin/.
mkdir -p "$CLAUDE_HOME/shared/bin/_lib"
[ -f "$CORTEX_ROOT/bin/cortex-bootstrap" ]      && { cp "$CORTEX_ROOT/bin/cortex-bootstrap"      "$CLAUDE_HOME/shared/bin/"; chmod +x "$CLAUDE_HOME/shared/bin/cortex-bootstrap"; }
[ -f "$CORTEX_ROOT/bin/cortex-bootstrap.ps1" ]  && cp "$CORTEX_ROOT/bin/cortex-bootstrap.ps1"   "$CLAUDE_HOME/shared/bin/"
[ -f "$CORTEX_ROOT/bin/cortex-bootstrap.cjs" ]  && cp "$CORTEX_ROOT/bin/cortex-bootstrap.cjs"   "$CLAUDE_HOME/shared/bin/"
[ -f "$CORTEX_ROOT/bin/_lib/select.cjs" ]       && cp "$CORTEX_ROOT/bin/_lib/select.cjs"        "$CLAUDE_HOME/shared/bin/_lib/"
[ -f "$CORTEX_ROOT/bin/cortex-gap-report" ]     && { cp "$CORTEX_ROOT/bin/cortex-gap-report"     "$CLAUDE_HOME/shared/bin/"; chmod +x "$CLAUDE_HOME/shared/bin/cortex-gap-report"; }
[ -f "$CORTEX_ROOT/bin/cortex-gap-report.ps1" ] && cp "$CORTEX_ROOT/bin/cortex-gap-report.ps1"  "$CLAUDE_HOME/shared/bin/"
[ -f "$CORTEX_ROOT/bin/cortex-gap-report.cjs" ] && cp "$CORTEX_ROOT/bin/cortex-gap-report.cjs"  "$CLAUDE_HOME/shared/bin/"
[ -f "$CORTEX_ROOT/bin/cortex-migrate-data" ]   && { cp "$CORTEX_ROOT/bin/cortex-migrate-data"   "$CLAUDE_HOME/shared/bin/" 2>/dev/null || true; }
[ -f "$CORTEX_ROOT/bin/cortex-migrate-data.sh" ] && { cp "$CORTEX_ROOT/bin/cortex-migrate-data.sh" "$CLAUDE_HOME/shared/bin/"; chmod +x "$CLAUDE_HOME/shared/bin/cortex-migrate-data.sh"; }
[ -f "$CORTEX_ROOT/bin/cortex-migrate-data.ps1" ] && cp "$CORTEX_ROOT/bin/cortex-migrate-data.ps1" "$CLAUDE_HOME/shared/bin/"
# cortex-steward shim — bash + pwsh entry points that delegate to
# $CORTEX_ROOT/bin/cortex-steward.cjs via cortex-source.yaml. The shim is
# small + stable; the actual steward runtime stays in the source repo
# (no drift between $CLAUDE_HOME/shared/bin/ and bin/steward/).
[ -f "$CORTEX_ROOT/bin/cortex-steward" ]     && { cp "$CORTEX_ROOT/bin/cortex-steward"     "$CLAUDE_HOME/shared/bin/"; chmod +x "$CLAUDE_HOME/shared/bin/cortex-steward"; }
[ -f "$CORTEX_ROOT/bin/cortex-steward.ps1" ] && cp "$CORTEX_ROOT/bin/cortex-steward.ps1" "$CLAUDE_HOME/shared/bin/"

# Sprint LR.B+ (2026-05-12) — cortex-capabilities CLI. Without this shim,
# /cortex-help could not surface the registry on a stranger's machine
# because the implementation was never copied out of the source repo.
# Writes a thin wrapper that delegates via cortex-source.yaml — same
# pattern as cortex-steward (source repo stays SSOT, no drift).
if [ -f "$CORTEX_ROOT/bin/cortex-capabilities.cjs" ]; then
  # R2 blind-hunter IMPORTANT: heredoc write must fail loud if it fails mid-stream.
  if ! cat > "$CLAUDE_HOME/shared/bin/cortex-capabilities" <<'CAPSHIM'
#!/usr/bin/env bash
# cortex-capabilities shim — delegates to $CORTEX_SOURCE/bin/cortex-capabilities.cjs.
# R2 edge audit MED: handle both space + tab after the yaml key, strip trailing \r
# from Windows-edited yaml.
set -e
SRC_YAML="$HOME/.claude/shared/cortex-source.yaml"
if [ ! -f "$SRC_YAML" ]; then
  echo "cortex-x not configured ($SRC_YAML missing). Re-run install.sh." >&2
  exit 1
fi
CORTEX_SOURCE=$(grep '^cortex_source:' "$SRC_YAML" | head -1 | sed 's/^cortex_source:[[:space:]]*//' | tr -d '"' | tr -d "'" | tr -d '\r')
if [ -z "$CORTEX_SOURCE" ] || [ ! -d "$CORTEX_SOURCE" ]; then
  echo "cortex-x source not found at: $CORTEX_SOURCE" >&2
  exit 1
fi
exec node "$CORTEX_SOURCE/bin/cortex-capabilities.cjs" "$@"
CAPSHIM
  then
    echo "  ✗ Failed to write cortex-capabilities shim — check disk space + perms" >&2
    exit 1
  fi
  chmod +x "$CLAUDE_HOME/shared/bin/cortex-capabilities"
fi

# Sprint 2.8.1 + 3.0 v0/v1/v2 + 3.1 v0 + 3.2 v0/v1 — operator CLIs that ship
# with the same delegation-shim pattern as cortex-capabilities. SSOT stays in
# the source repo; the installed shim only resolves cortex_source and execs.
# Added 2026-05-13 afternoon — without these, operator can only invoke as
# `node $CORTEX_SOURCE/bin/cortex-*.cjs` rather than as a first-class command.
emit_delegate_shim() {
  local SHIM_NAME="$1"
  local IMPL_FILE="$2"
  if [ ! -f "$CORTEX_ROOT/bin/$IMPL_FILE" ]; then return 0; fi
  if ! cat > "$CLAUDE_HOME/shared/bin/$SHIM_NAME" <<EOF
#!/usr/bin/env bash
# $SHIM_NAME shim — delegates to \$CORTEX_SOURCE/bin/$IMPL_FILE
set -e
SRC_YAML="\$HOME/.claude/shared/cortex-source.yaml"
if [ ! -f "\$SRC_YAML" ]; then
  echo "cortex-x not configured (\$SRC_YAML missing). Re-run install.sh." >&2
  exit 1
fi
CORTEX_SOURCE=\$(grep '^cortex_source:' "\$SRC_YAML" | head -1 | sed 's/^cortex_source:[[:space:]]*//' | tr -d '"' | tr -d "'" | tr -d '\r')
if [ -z "\$CORTEX_SOURCE" ] || [ ! -d "\$CORTEX_SOURCE" ]; then
  echo "cortex-x source not found at: \$CORTEX_SOURCE" >&2
  exit 1
fi
exec node "\$CORTEX_SOURCE/bin/$IMPL_FILE" "\$@"
EOF
  then
    echo "  ✗ Failed to write $SHIM_NAME shim — check disk space + perms" >&2
    exit 1
  fi
  chmod +x "$CLAUDE_HOME/shared/bin/$SHIM_NAME"
}
emit_delegate_shim cortex-propose-skill    cortex-propose-skill.cjs
emit_delegate_shim cortex-lessons-search   cortex-lessons-search.cjs
emit_delegate_shim cortex-evolve-ab        cortex-evolve-ab.cjs
emit_delegate_shim cortex-export-lessons   cortex-export-lessons.cjs
emit_delegate_shim cortex-doc-audit        cortex-doc-audit.cjs
emit_delegate_shim cortex-doc-regen        cortex-doc-regen.cjs
emit_delegate_shim cortex-doc-currency     cortex-doc-currency.cjs
emit_delegate_shim cortex-wiki-consolidate cortex-wiki-consolidate.cjs
emit_delegate_shim cortex-update           cortex-update.cjs
emit_delegate_shim cortex-uninstall        cortex-uninstall.cjs
emit_delegate_shim cortex-hooks-register      cortex-hooks-register.cjs
emit_delegate_shim cortex-claude-md-augment   cortex-claude-md-augment.cjs
emit_delegate_shim cortex-permissions-register cortex-permissions-register.cjs
emit_delegate_shim cortex-doctor           cortex-doctor.cjs
# Sprint 2.22 / 2.25 / 2.22.1 — three CLIs shipped 2026-05-14. Without these
# shims, fresh-install operator can invoke them only as
# `node $CORTEX_SOURCE/bin/cortex-{skill-validate,dream,insights}.cjs`.
emit_delegate_shim cortex-skill-validate   cortex-skill-validate.cjs
emit_delegate_shim cortex-dream            cortex-dream.cjs
emit_delegate_shim cortex-insights         cortex-insights.cjs
emit_delegate_shim cortex-usage            cortex-usage.cjs

# Install default agents to ~/.claude/agents/ for Claude Code discovery.
#
# Claude Code's agent discovery checks ~/.claude/agents/ (user-level) and
# .claude/agents/ (project-level). It does NOT check ~/.claude/shared/agents/
# — that path is cortex-x-internal staging. Without this copy, every cortex-x
# project's default adversarial pipeline (cortex-thinker, blind-hunter,
# edge-case-hunter, acceptance-auditor, security-auditor, ssot-enforcer,
# correctness-auditor, planner, synthesizer) is invisible at runtime.
#
# Field test #5 (interview-brief, 2026-05-07) caught this: scaffolded project
# wired hooks via settings.json but had only 1 synthesized agent in
# .claude/agents/, leaving the project agent-less for the default pipeline.
#
# Per-project .claude/agents/ remains for synthesized + project overrides only.
mkdir -p "$CLAUDE_HOME/agents"
if [ -d "$CORTEX_ROOT/agents" ]; then
  cp -f "$CORTEX_ROOT"/agents/*.md "$CLAUDE_HOME/agents/" 2>/dev/null || true
fi

# Install user-level slash-skill /cortex-init at ~/.claude/skills/cortex-init/.
# This is the RECOMMENDED post-install entry point — user just opens claude in
# any project dir and types /cortex-init. The skill asks N/E/F via Claude's
# native AskUserQuestion tool, writes the marker, chains to /start or /audit.
mkdir -p "$CLAUDE_HOME/skills/cortex-init"
if [ -f "$CORTEX_ROOT/shared/skills/cortex-init/SKILL.md" ]; then
  cp "$CORTEX_ROOT/shared/skills/cortex-init/SKILL.md" "$CLAUDE_HOME/skills/cortex-init/SKILL.md"
fi

# Sprint 2.17 — install /cortex-help at user-level so it's discoverable as a
# slash command. Namespaced as cortex-help (not /help) because /help is
# Claude Code's built-in help command — a custom skill named "help" collides
# and gets rejected. The skill prints a one-screen menu of what's available
# plus a project-state-aware "default next" nudge.
mkdir -p "$CLAUDE_HOME/skills/cortex-help"
if [ -f "$CORTEX_ROOT/shared/skills/cortex-help/SKILL.md" ]; then
  cp "$CORTEX_ROOT/shared/skills/cortex-help/SKILL.md" "$CLAUDE_HOME/skills/cortex-help/SKILL.md"
fi

# Sprint 2.10.2 — profile-specific slash-skill priming. For qa-tester, also
# install /test-audit at user-level so it's the prominent entry point. The
# skill content stays in shared/ canonical location; this is just a top-level
# marker for Claude Code's skill discovery.
if [ "$CORTEX_PROFILE" = "qa-tester" ]; then
  mkdir -p "$CLAUDE_HOME/skills/test-audit"
  if [ -f "$CORTEX_ROOT/shared/skills/test-audit/SKILL.md" ]; then
    cp "$CORTEX_ROOT/shared/skills/test-audit/SKILL.md" "$CLAUDE_HOME/skills/test-audit/SKILL.md"
  fi
fi

# Sprint LR.B+ (2026-05-12) — promote remaining shared skills to user-level so
# they're discoverable as slash commands (Claude Code only auto-loads from
# ~/.claude/skills/<name>/SKILL.md, NOT from ~/.claude/shared/skills/).
# Without this, /audit, /designer, /start are invisible.
# 2026-05-25: switched from `cp SKILL.md` to `cp -r` of the whole skill dir —
# ux-copywriter is the first skill to ship companion `references/` files that
# SKILL.md links to relatively; copying only SKILL.md would break those links.
for SKILL_NAME in audit designer start ux-copywriter ralph-loop improve-codebase-architecture cortex-doctor cortex-goal cortex-update cortex-uninstall; do
  SRC_SKILL_DIR="$CORTEX_ROOT/shared/skills/$SKILL_NAME"
  if [ -f "$SRC_SKILL_DIR/SKILL.md" ]; then
    mkdir -p "$CLAUDE_HOME/skills/$SKILL_NAME"
    cp -r "$SRC_SKILL_DIR/." "$CLAUDE_HOME/skills/$SKILL_NAME/"
  fi
done

# Generate INSTALL_NOTES.md with all the verbose detail. Keep terminal output
# tight — users who want detail can read the file. (Pattern from Bun, Deno.)
INSTALL_NOTES="$CLAUDE_HOME/shared/INSTALL_NOTES.md"
cat > "$INSTALL_NOTES" <<NOTES
# cortex-x install notes

Generated by \`install.sh\` on $(date '+%Y-%m-%d %H:%M:%S').

- Source:    $CORTEX_ROOT
- Installed: $CLAUDE_HOME/shared/
- Channel:   $CHANNEL
- Language:  $LANG_NAME (\`$CORTEX_LANGUAGE\`)

## Hooks (in \`hooks/\`)

| File | Event |
|---|---|
| \`block-destructive.cjs\` | PreToolUse matcher:Bash |
| \`session-start.cjs\` | SessionStart — sprint state, git context, budget surface, bootstrap-marker reader |
| \`pre-compact.cjs\` | PreCompact — saves sprint state to \`.claude/compact-state.md\` |
| \`post-compact.cjs\` | PostCompact — flags the saved state for re-injection |
| \`pre-tool-use.cjs\` | PreToolUse all tools — journal companion |
| \`post-tool-use.cjs\` | PostToolUse all tools — journal + budget writer |
| \`auto-orchestrate.cjs\` | UserPromptSubmit — 3-fronta hint + budget warn + compaction recovery |
| \`subagent-start.cjs\` | SubagentStart — propagates cortex discipline into subagents |
| \`task-completed.cjs\` | TaskCompleted — verification gate, nudges once per task |
| \`tirith-scan.cjs\` | SessionStart — optional, no-op if tirith binary absent |
| \`_lib/redact.cjs\` | Shared secret-scrubbing library |
| \`_lib/budget.cjs\` | Shared token-cost tracking library |

## Register hooks in \`~/.claude/settings.json\`

\`\`\`json
"hooks": {
  "PreToolUse": [
    { "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/block-destructive.cjs\"", "timeout": 5 }] },
    { "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/pre-commit-review-gate.cjs\"", "timeout": 6 }] },
    { "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/pre-tool-use.cjs\"", "timeout": 3 }] }
  ],
  "PostToolUse": [
    { "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/post-tool-use.cjs\"", "timeout": 5 }] }
  ],
  "UserPromptSubmit": [
    { "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/auto-orchestrate.cjs\"", "timeout": 3 }] }
  ],
  "SessionStart": [
    { "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/session-start.cjs\"", "timeout": 5 }] }
  ],
  "PreCompact": [
    { "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/pre-compact.cjs\"", "timeout": 5 }] }
  ],
  "PostCompact": [
    { "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/post-compact.cjs\"", "timeout": 5 }] }
  ],
  "SubagentStart": [
    { "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/subagent-start.cjs\"", "timeout": 3 }] }
  ],
  "TaskCompleted": [
    { "hooks": [{ "type": "command", "command": "node \"\$HOME/.claude/shared/hooks/task-completed.cjs\"", "timeout": 3 }] }
  ]
}
\`\`\`

> SSOT alignment: this block must match \`bin/cortex-hooks-register.cjs\` HOOK_SPEC (Sprint 2.21.2). \`cortex-hooks-register --apply\` registers the same set programmatically.

## Language preference (optional)

Add this block to \`~/.claude/CLAUDE.md\` so Claude responds in \`$LANG_NAME\` for cortex-x sessions:

\`\`\`markdown
<!-- BEGIN cortex-x — communication language -->
## cortex-x language
When working in a cortex-x-scaffolded project or invoking cortex-x prompts,
respond in: **$LANG_NAME** (code: \`$CORTEX_LANGUAGE\`). Never switch languages mid-reply.
<!-- END cortex-x -->
\`\`\`

cortex-x will not auto-edit your global \`~/.claude/CLAUDE.md\` (Principle 1 from standards/coding-behavior.md).

## Budget cap

Set \`CORTEX_SESSION_BUDGET_USD\` env var (default \$5.00). Spend log: \`\$CORTEX_DATA_HOME/journal/.budget.jsonl\`.
Set \`CORTEX_BUDGET_DISABLED=1\` to suppress budget output entirely (e.g. for flat-subscription installs).

## Journal

Tool-call traces (privacy-redacted) write to: \`$CORTEX_ROOT/journal/YYYY-MM-DD-<project-slug>.jsonl\`. See \`journal/README.md\` for schema + privacy contract.

## Optional: Tirith (context-file prompt-injection scanner)

\`\`\`bash
cargo install tirith
# or download from https://github.com/NousResearch/tirith/releases
\`\`\`

\`tirith-scan.cjs\` hook auto-detects once installed. Skip if not doing agentic work.

## Re-running

Re-run \`install.sh\` after pulling cortex-x updates. Existing \`~/.claude/shared/\` is backed up to \`shared.backup-YYYYMMDD-HHMMSS\`. Only the most recent backup is kept.

## See also

- \`standards/ship-ready.md\` — \`CORTEX_HOME\` / \`CORTEX_CHANNEL\` semantics
- \`docs/sprint-1.5-design.md\` — onboarding architecture
- \`MIGRATIONS.md\` — pre-public-tag debt and version migrations
NOTES

# ── Post-copy verification — delegated to tests/smoke/verify-install.cjs.
# Runs all 30 post-condition checks (file existence, dir counts, source-to-
# installed mirror, cortex-source.yaml integrity, $CORTEX_DATA_HOME structure).
# Single source of truth — same script runs from install.sh, install.ps1, CI
# matrix, and integration tests. Exit codes: 0 OK / 1 validation fail / 2 bug.
VERIFIER="$CORTEX_ROOT/tests/smoke/verify-install.cjs"
if [ ! -f "$VERIFIER" ]; then
  echo >&2
  echo "  ✗ Verifier not found: $VERIFIER" >&2
  echo "    Your cortex-x clone is incomplete. Re-clone from origin and re-run." >&2
  exit 1
fi
if ! command -v node > /dev/null 2>&1; then
  echo >&2
  echo "  ✗ node is required to verify install but not found on PATH." >&2
  echo "    Install Node.js >=22 (Active LTS) and re-run." >&2
  exit 1
fi
# Numeric version check — refuse to verify on Node <22 (cortex-x uses
# built-in fetch, structuredClone, AbortController, top-level await widely).
# `node --version` prints "v22.4.1" — strip leading v, take major segment.
NODE_VER_RAW="$(node --version 2>/dev/null || true)"
NODE_MAJOR="$(printf '%s' "${NODE_VER_RAW#v}" | cut -d. -f1)"
if ! printf '%s' "$NODE_MAJOR" | grep -Eq '^[0-9]+$' || [ "$NODE_MAJOR" -lt 22 ]; then
  echo >&2
  echo "  ✗ Node.js $NODE_VER_RAW is too old (cortex-x needs >=22, Active LTS)." >&2
  echo "    Upgrade via nvm/fnm/volta or your system package manager, then re-run." >&2
  exit 1
fi
if ! node "$VERIFIER"; then
  echo >&2
  echo "  ✗ Install verification FAILED — see output above." >&2
  echo "    Try: re-run install.sh, or open an issue at" >&2
  echo "         https://github.com/Rejnyx/cortex-x/issues" >&2
  exit 1
fi

# Sprint 2.21 — opt-in hook registration. Without hooks in
# ~/.claude/settings.json, fresh users lose block-destructive safety,
# SessionStart context injection, auto-orchestrate parallel-agent
# suggestion, post-tool-use journal/budget, pre-compact state save.
# We never auto-edit settings.json (Principle 1) but the install path is
# the natural moment to OFFER explicit registration. Skip silently in
# non-interactive mode unless CORTEX_REGISTER_HOOKS is set.
#
# CORTEX_REGISTER_HOOKS=1 → register without prompting (e.g. CI / scripts)
# CORTEX_REGISTER_HOOKS=0 → skip without prompting
# (unset, TTY)            → interactive Y/n
# (unset, non-TTY)        → skip silently
# Sprint 2.21.3 MED #8 R2 hardening: track per-step success/failure so we
# can print a partial-state warning + rollback hint if some succeed and
# others fail. Empty = skipped; 'y' = applied OK; 'n' = applied-failed.
REGISTER_STATUS_HOOKS=''
REGISTER_STATUS_AUGMENT=''
REGISTER_STATUS_PERMISSIONS=''

if command -v node > /dev/null 2>&1 && [ -f "$CORTEX_ROOT/bin/cortex-hooks-register.cjs" ]; then
  # Show benefits paragraph BEFORE the prompt (only on TTY without env-var override).
  CORTEX_REGISTER_HOOKS_NORM="$(normalize_consent_var "${CORTEX_REGISTER_HOOKS:-}")"
  if [ -z "$CORTEX_REGISTER_HOOKS_NORM" ] && [ -t 0 ]; then
    echo
    echo "  Cortex hooks (block-destructive safety, SessionStart context, auto-orchestrate)"
    echo "  are NOT active until registered in ~/.claude/settings.json."
    echo "  Without them, you lose ~50% of cortex-x value — but settings.json is yours,"
    echo "  so the choice is explicit. A timestamped backup is written before any change."
  fi
  REGISTER_HOOKS_DECISION="$(consent_prompt_decision "${CORTEX_REGISTER_HOOKS:-}" "  Register cortex hooks now? [y/N]: ")"
  if [ "$REGISTER_HOOKS_DECISION" = "y" ]; then
    if node "$CORTEX_ROOT/bin/cortex-hooks-register.cjs" --apply --yes; then
      REGISTER_STATUS_HOOKS='y'
    else
      REGISTER_STATUS_HOOKS='n'
      echo "  warning: hook registration failed (settings.json untouched per safety contract)." >&2
      echo "  manual: paste the block from $INSTALL_NOTES under '## Register hooks in ~/.claude/settings.json'." >&2
    fi
  elif [ "$REGISTER_HOOKS_DECISION" = "n" ]; then
    if [ -t 0 ]; then
      echo "  ↳ Skipped. Re-run anytime: cortex-hooks-register"
    fi
  fi
fi

# Sprint 2.21 — opt-in CLAUDE.md discipline block. Without this, the user's
# Claude has no instruction to dispatch parallel research / R1 / R2 outside
# cortex-specific slash commands. Same consent model as hooks above.
#
# CORTEX_AUGMENT_CLAUDE_MD=1 → apply without prompting
# CORTEX_AUGMENT_CLAUDE_MD=0 → skip without prompting
# (unset, TTY)               → interactive Y/n
# (unset, non-TTY)           → skip silently
if command -v node > /dev/null 2>&1 && [ -f "$CORTEX_ROOT/bin/cortex-claude-md-augment.cjs" ]; then
  CORTEX_AUGMENT_CLAUDE_MD_NORM="$(normalize_consent_var "${CORTEX_AUGMENT_CLAUDE_MD:-}")"
  if [ -z "$CORTEX_AUGMENT_CLAUDE_MD_NORM" ] && [ -t 0 ]; then
    echo
    echo "  Cortex discipline block (R1 research-first, R2 review pipeline, parallel agents"
    echo "  by default) can be appended to your global ~/.claude/CLAUDE.md. This biases EVERY"
    echo "  Claude Code session — not just cortex slash commands — toward cortex behavior."
    echo "  Bracketed by BEGIN/END markers — your existing CLAUDE.md content is preserved."
  fi
  AUGMENT_CLAUDE_MD_DECISION="$(consent_prompt_decision "${CORTEX_AUGMENT_CLAUDE_MD:-}" "  Append cortex discipline block to global CLAUDE.md? [y/N]: ")"
  if [ "$AUGMENT_CLAUDE_MD_DECISION" = "y" ]; then
    if node "$CORTEX_ROOT/bin/cortex-claude-md-augment.cjs" --apply --yes; then
      REGISTER_STATUS_AUGMENT='y'
    else
      REGISTER_STATUS_AUGMENT='n'
      echo "  warning: CLAUDE.md augment failed (file untouched per safety contract)." >&2
      echo "  manual: cortex-claude-md-augment --apply" >&2
    fi
  elif [ "$AUGMENT_CLAUDE_MD_DECISION" = "n" ]; then
    if [ -t 0 ]; then
      echo "  ↳ Skipped. Re-run anytime: cortex-claude-md-augment"
    fi
  fi
fi

# Sprint 2.28 — opt-in safety-floor permissions registration. Replaces the
# blunt --dangerously-skip-permissions flag with a curated deny floor +
# allow baseline. Claude Code precedence is deny > ask > allow > defaultMode,
# so cortex's deny entries hold even if the user widens allow elsewhere.
# Same consent model as hooks + augment above.
#
# CORTEX_REGISTER_PERMISSIONS=1 → register without prompting (e.g. CI)
# CORTEX_REGISTER_PERMISSIONS=0 → skip without prompting
# (unset, TTY)                  → interactive Y/n
# (unset, non-TTY)              → skip silently
if command -v node > /dev/null 2>&1 && [ -f "$CORTEX_ROOT/bin/cortex-permissions-register.cjs" ]; then
  CORTEX_REGISTER_PERMISSIONS_NORM="$(normalize_consent_var "${CORTEX_REGISTER_PERMISSIONS:-}")"
  if [ -z "$CORTEX_REGISTER_PERMISSIONS_NORM" ] && [ -t 0 ]; then
    echo
    echo "  Cortex safety-floor permissions can be registered in ~/.claude/settings.json:"
    echo "  a deny list blocking destructive operations + an allow baseline skipping"
    echo "  approval prompts on common-safe ops (npm test, git status, ls, cortex CLIs)."
    echo "  Replaces --dangerously-skip-permissions: same speed, deny-precedence floor."
  fi
  REGISTER_PERMISSIONS_DECISION="$(consent_prompt_decision "${CORTEX_REGISTER_PERMISSIONS:-}" "  Register cortex safety-floor permissions? [y/N]: ")"
  if [ "$REGISTER_PERMISSIONS_DECISION" = "y" ]; then
    if node "$CORTEX_ROOT/bin/cortex-permissions-register.cjs" --apply --yes; then
      REGISTER_STATUS_PERMISSIONS='y'
    else
      REGISTER_STATUS_PERMISSIONS='n'
      echo "  warning: permissions registration failed (settings.json untouched per safety contract)." >&2
      echo "  manual: cortex-permissions-register --apply" >&2
    fi
  elif [ "$REGISTER_PERMISSIONS_DECISION" = "n" ]; then
    if [ -t 0 ]; then
      echo "  ↳ Skipped. Re-run anytime: cortex-permissions-register"
    fi
  fi
fi

# Sprint 2.21.3 MED #8 R2 hardening — partial-failure rollback hint.
# If at least one register step succeeded AND at least one failed, the user
# is in a partial-install state. Print explicit recovery hint so they don't
# discover the mixed state via debugging later.
if [ -n "$REGISTER_STATUS_HOOKS" ] || [ -n "$REGISTER_STATUS_AUGMENT" ] || [ -n "$REGISTER_STATUS_PERMISSIONS" ]; then
  ANY_SUCCESS=''
  ANY_FAIL=''
  for s in "$REGISTER_STATUS_HOOKS" "$REGISTER_STATUS_AUGMENT" "$REGISTER_STATUS_PERMISSIONS"; do
    [ "$s" = "y" ] && ANY_SUCCESS='y'
    [ "$s" = "n" ] && ANY_FAIL='y'
  done
  if [ -n "$ANY_SUCCESS" ] && [ -n "$ANY_FAIL" ]; then
    echo
    echo "  warning: PARTIAL install state — some register steps succeeded, others failed:" >&2
    [ "$REGISTER_STATUS_HOOKS" = "y" ]       && echo "    hooks:       APPLIED (rollback: cortex-hooks-register --remove)" >&2
    [ "$REGISTER_STATUS_HOOKS" = "n" ]       && echo "    hooks:       FAILED (settings.json untouched)" >&2
    [ "$REGISTER_STATUS_AUGMENT" = "y" ]     && echo "    CLAUDE.md:   APPLIED (rollback: cortex-claude-md-augment --remove)" >&2
    [ "$REGISTER_STATUS_AUGMENT" = "n" ]     && echo "    CLAUDE.md:   FAILED (file untouched)" >&2
    [ "$REGISTER_STATUS_PERMISSIONS" = "y" ] && echo "    permissions: APPLIED (rollback: cortex-permissions-register --remove)" >&2
    [ "$REGISTER_STATUS_PERMISSIONS" = "n" ] && echo "    permissions: FAILED (settings.json untouched)" >&2
    echo "  Retry the failed step manually, or roll back the applied ones for a clean slate." >&2
  fi
fi

# Detect shell + PATH state for the final action line.
SHELL_NAME="$(basename "${SHELL:-bash}")"
case "$SHELL_NAME" in
  zsh)  RC_FILE="$HOME/.zshrc" ;;
  bash) RC_FILE="$HOME/.bashrc" ;;
  fish) RC_FILE="$HOME/.config/fish/config.fish" ;;
  *)    RC_FILE="$HOME/.profile" ;;
esac
PATH_HAS_BIN=0
echo "$PATH" | tr ':' '\n' | grep -qx "$HOME/.claude/shared/bin" && PATH_HAS_BIN=1

# Compact final summary — model: Bun, uv, Rustup. Detail lives in INSTALL_NOTES.md.
echo
AGENT_COUNT=$(ls -1 "$CLAUDE_HOME/agents"/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ cortex-x installed"
echo "    framework  ~/.claude/shared/                  (cortex-x assets · prompts · standards · skills · staging)"
echo "    agents     ~/.claude/agents/                  ($AGENT_COUNT default agents — auto-discovered by Claude Code)"
if [ "$CORTEX_PROFILE" = "qa-tester" ]; then
  echo "    skill      ~/.claude/skills/test-audit/       (RECOMMENDED for QA — type /test-audit in any project)"
  echo "    skill      ~/.claude/skills/cortex-init/      (general retrofit — chain after /test-audit if needed)"
else
  echo "    skill      ~/.claude/skills/cortex-init/      (RECOMMENDED entry point — type /cortex-init in any project)"
fi
echo "    user data  $CORTEX_DATA_HOME/                  (research · projects · insights · journal · evals — your own knowledge graph)"
echo "    bootstrap  ~/.claude/shared/bin/cortex-bootstrap"
echo "    language   $LANG_NAME ($CORTEX_LANGUAGE)"
echo "    profile    $CORTEX_PROFILE"
echo "    notes      $INSTALL_NOTES"
echo
case "$CORTEX_PROFILE" in
  qa-tester)
    echo "  Next step (QA tester) — open Claude Code at the root of the repo you're auditing:"
    echo
    echo "    claude"
    echo "    /test-audit"
    echo
    echo "  ↳ /test-audit produces a senior-QA-consultant deliverable in 30 min:"
    echo "    cortex/qa/AUDIT.md (12-section ISO 25010:2023), testing-strategy.md,"
    echo "    testing-gaps.md (P0/P1/P2 backlog with auto-research-nudge per gap)."
    echo
    echo "  Profile loaded: qa-engineer (~/.claude/shared/profiles/qa-engineer.yaml)"
    echo "    Risk-tiered quality gates · 15 QA concerns (testing + DevOps/CI) · ASVS 5.0 mappings"
    echo
    echo "  Standards to read first:"
    echo "    ~/.claude/shared/standards/testing.md      — pyramid + 5 pillars per test"
    echo "    ~/.claude/shared/standards/correctness.md  — Zod boundaries, property-based, mutation"
    echo "    ~/.claude/shared/standards/security.md     — 8-layer defense, ASVS L1/L2 alignment"
    ;;
  ai-engineer)
    echo "  Next step (AI engineer) — open Claude Code in any project dir:"
    echo
    echo "    claude"
    echo "    /cortex-init   # use ai-agent profile for AI-heavy projects"
    echo
    echo "  Profile loaded: ai-agent (~/.claude/shared/profiles/ai-agent.yaml)"
    echo "    Lethal-trifecta defense · 7 MUST patterns · safe-tool wrapper · evals scaffold"
    ;;
  minimal)
    echo "  Next step — framework installed, no extra skill primed."
    echo "  Invoke prompts manually from ~/.claude/shared/prompts/."
    ;;
  *)
    echo "  Next step (recommended) — open Claude Code in any project dir:"
    echo
    echo "    claude"
    echo "    /cortex-init"
    echo
    echo "  ↳ /cortex-init asks New / Existing / Framework-only via arrow keys,"
    echo "    writes the marker, chains to the right cortex-x workflow."
    ;;
esac
echo
echo "  Steward — your AI nightly autopilot (after scaffold):"
echo "    Drop cortex/recommendations.md in your repo; Steward opens a draft PR overnight."
echo "    Debug:    cortex-steward status --slug=<your-repo>  (preview without spend)"
echo "    Activate: docs/steward-usage.md.  Halt: touch ~/.cortex/STEWARD_HALT."
echo
echo "  Shell-only alternative (power users / scripts):"
if [ "$PATH_HAS_BIN" = "1" ]; then
  echo "    cortex-bootstrap     # already on PATH"
else
  echo "    ~/.claude/shared/bin/cortex-bootstrap"
  echo
  echo "  Add bin/ to PATH (one-time, optional):"
  if [ "$SHELL_NAME" = "fish" ]; then
    echo "    fish_add_path \"\$HOME/.claude/shared/bin\""
  else
    echo "    echo 'export PATH=\"\$HOME/.claude/shared/bin:\$PATH\"' >> $RC_FILE && source $RC_FILE"
  fi
fi
echo
