# cortex-x installer (PowerShell)
# Installs shared framework to ~/.claude/ for global use across projects.
#
# Two execution modes:
#
#   1) iwr | iex (recommended for fresh users):
#        iwr https://raw.githubusercontent.com/Rejnyx/cortex-x/main/install.ps1 | iex
#      The script self-detects pipe execution and clones cortex-x to ~/cortex-x
#      (or $env:CORTEX_HOME), then re-executes the local install.ps1.
#
#   2) Local execution (after manual git clone):
#        git clone https://github.com/Rejnyx/cortex-x ~/cortex-x
#        ~/cortex-x/install.ps1
#      Standard install path; copies framework assets to ~/.claude/shared/.
#
# Env vars honored (see standards/ship-ready.md):
#   $env:CORTEX_CHANNEL = 'beta' | 'stable'  — beta = track main HEAD (default);
#                                              stable = checkout highest semver tag.
#   $env:CORTEX_HOME    = <path>             — override cortex-x source directory.
#   $env:CORTEX_NO_UPDATE = '1'              — skip checkout even if CHANNEL=stable.

$ErrorActionPreference = "Stop"

# Force UTF-8 console output so non-ASCII strings (em-dash, čeština, français,
# español) render correctly on Windows PowerShell 5.1 — its default OEM codepage
# would otherwise mangle them. PS Core 7+ already defaults to UTF-8.
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new() } catch { }

# Stream detection — when invoked via `iwr | iex`, $PSScriptRoot is empty
# because there is no script file on disk. Self-clone the repo first, then
# re-execute the local install.ps1 from the clone. Same pattern as the
# bash install.sh self-clone block; matches Bun, Deno, Rustup install UX.
if (-not $PSScriptRoot -or -not (Test-Path $PSScriptRoot)) {
    $CortexCloneDir = if ($env:CORTEX_HOME) { $env:CORTEX_HOME } else { Join-Path $HOME "cortex-x" }
    Write-Host "cortex-x bootstrap (iwr | iex mode)"
    Write-Host "  source: https://github.com/Rejnyx/cortex-x"
    Write-Host "  clone:  $CortexCloneDir"
    Write-Host ""
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: git is required but not found on PATH." -ForegroundColor Red
        Write-Host "  Install git first, then re-run." -ForegroundColor Red
        exit 1
    }
    $ExistingGitDir = Join-Path $CortexCloneDir ".git"
    if (Test-Path $ExistingGitDir) {
        Write-Host "  existing clone found — fetching origin/main"
        Push-Location $CortexCloneDir
        try {
            git diff --quiet 2>$null
            $unstaged = $LASTEXITCODE -ne 0
            git diff --cached --quiet 2>$null
            $staged = $LASTEXITCODE -ne 0
            if (-not $unstaged -and -not $staged) {
                git fetch --quiet origin main 2>$null
                git checkout --quiet main 2>$null
                git pull --ff-only --quiet origin main 2>$null
            } else {
                Write-Host "  local changes detected in $CortexCloneDir — skipping update"
                Write-Host "  to manually update: cd $CortexCloneDir; git pull --ff-only origin main"
            }
        } finally {
            Pop-Location
        }
    } else {
        $ParentDir = Split-Path -Parent $CortexCloneDir
        if ($ParentDir -and -not (Test-Path $ParentDir)) {
            New-Item -ItemType Directory -Force -Path $ParentDir | Out-Null
        }
        # Clone strategy: anonymous HTTPS first (works for public repos), then
        # GITHUB_TOKEN-authenticated HTTPS, then gh-cli for private-repo
        # closed-beta access.
        $cloned = $false
        git clone --quiet https://github.com/Rejnyx/cortex-x $CortexCloneDir 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  cloned successfully (public)"
            $cloned = $true
        } elseif ($env:GITHUB_TOKEN) {
            git clone --quiet "https://x-access-token:$($env:GITHUB_TOKEN)@github.com/Rejnyx/cortex-x" $CortexCloneDir 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  cloned successfully (GITHUB_TOKEN)"
                $cloned = $true
            }
        }
        if (-not $cloned -and (Get-Command gh -ErrorAction SilentlyContinue)) {
            gh auth status 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                gh repo clone Rejnyx/cortex-x $CortexCloneDir -- --quiet 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  cloned successfully (gh-cli)"
                    $cloned = $true
                }
            }
        }
        if (-not $cloned) {
            Write-Host "ERROR: git clone failed." -ForegroundColor Red
            Write-Host "  If cortex-x is still in closed beta, you need either:" -ForegroundColor Red
            Write-Host "    1) gh CLI authenticated:  gh auth login" -ForegroundColor Red
            Write-Host "    2) a GITHUB_TOKEN env var with read access to Rejnyx/cortex-x" -ForegroundColor Red
            Write-Host "  Then re-run this installer." -ForegroundColor Red
            exit 1
        }
    }
    $LocalInstaller = Join-Path $CortexCloneDir "install.ps1"
    Write-Host "  re-executing $LocalInstaller"
    Write-Host "============================================================"
    & $LocalInstaller
    exit $LASTEXITCODE
}

# Resolve cortex-x source directory.
if ($env:CORTEX_HOME -and (Test-Path $env:CORTEX_HOME)) {
    $CortexRoot = $env:CORTEX_HOME
} else {
    $CortexRoot = $PSScriptRoot
}
$ClaudeHome   = Join-Path $HOME ".claude"
$SharedTarget = Join-Path $ClaudeHome "shared"
$Channel      = if ($env:CORTEX_CHANNEL) { $env:CORTEX_CHANNEL } else { "beta" }

# Sprint 2.28.3 SSOT extract — Rule-of-Three on 3 consent gates below.
# Single source for env-var normalization + interactive-consent decision.
function Get-NormalizedConsent {
    param([string]$EnvVarName)
    $raw = [Environment]::GetEnvironmentVariable($EnvVarName)
    if ($null -eq $raw) { return $null }
    $trimmed = $raw.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { return $null }
    return $trimmed.ToLowerInvariant()
}

# Get-ConsentDecision: reads env var $EnvVarName, prompts on TTY when unset.
# Returns 'y' or 'n'. Settings-mutating prompts use abort-on-empty
# (Sprint 2.28.3 item #5 MED — align install.ps1 with CLI's Sprint 2.28.1
# edge HIGH #11 fix).
function Get-ConsentDecision {
    param(
        [string]$EnvVarName,
        [string]$PromptText
    )
    $norm = Get-NormalizedConsent -EnvVarName $EnvVarName
    if ($norm -match '^(1|y|yes|true)$') { return 'y' }
    if ($norm -match '^(0|n|no|false)$') { return 'n' }
    if ([Environment]::UserInteractive) {
        $reply = Read-Host $PromptText
        # H-6 R2 hardening: trim + lower-invariant so "Yes", " y ", "YES" all
        # accept consistently with CJS parseConfirmReply contract.
        # Without this, install.ps1 accepted only literal y/Y/yes/YES while
        # CJS accepted any case + whitespace — cross-platform parity gap.
        if ($null -eq $reply) { return 'n' }
        $normReply = $reply.Trim().ToLowerInvariant()
        if ($normReply -eq 'y' -or $normReply -eq 'yes') { return 'y' }
        return 'n'
    }
    return 'n'
}

# Language preference — interactive prompt unless $env:CORTEX_LANGUAGE is set.
$Language = $env:CORTEX_LANGUAGE
if (-not $Language -and [Environment]::UserInteractive) {
    Write-Host "Communication language for Claude in cortex-x sessions?"
    Write-Host "  en  — English (default)"
    Write-Host "  cs  — Czech (čeština)"
    Write-Host "  de  — German (Deutsch)"
    Write-Host "  fr  — French (français)"
    Write-Host "  es  — Spanish (español)"
    $Language = Read-Host "Language code [en]"
}
if (-not $Language) { $Language = "en" }

# Profile selection (Sprint 2.10.2) — pick the user role to tailor post-install
# experience. dev (default) | qa-tester (Verča — primes /test-audit) |
# ai-engineer | minimal. Precedence: -Profile param > $env:CORTEX_PROFILE >
# interactive prompt > "dev" default. Skip prompt in non-interactive runs.
$Profile = $env:CORTEX_PROFILE
foreach ($a in $args) {
    if ($a -match '^--profile=(.+)$') { $Profile = $Matches[1] }
}
if (-not $Profile -and [Environment]::UserInteractive) {
    Write-Host "Which role best describes you? (tailors which slash-skill is primed)"
    Write-Host "  dev          — full-stack developer (default — primes /cortex-init)"
    Write-Host "  qa-tester    — QA engineer / tester (primes /test-audit + qa-engineer profile)"
    Write-Host "  ai-engineer  — AI / agent engineer (primes /cortex-init + ai-agent profile)"
    Write-Host "  minimal      — framework only, no extra skill"
    $Profile = Read-Host "Profile [dev]"
}
if (-not $Profile) { $Profile = "dev" }
if (@("dev","qa-tester","ai-engineer","minimal") -notcontains $Profile) {
    Write-Host "  warning: unknown profile '$Profile' — falling back to 'dev'."
    $Profile = "dev"
}

# Identity capture (Sprint 1.7.4) — auto-detect from git config + Intl + gh.
# Detector ALWAYS runs when node + detector are available (so platform/locale
# always populate). Interactive Y/n confirmation only when interactive + not
# CORTEX_NO_IDENTITY. Persists to ~/.claude/cortex/user.yaml.
$CortexUserName    = ''
$CortexUserEmail   = ''
$CortexUserUsername = ''
$CortexUserPlatform = ''
$CortexUserLocale  = ''
$CortexUserGhLogin = ''
$CortexUserConfirmed = 'false'
$IdentityDetected = $false
$IdentityDetectorPath = Join-Path $CortexRoot "detectors\detect-user-identity.cjs"
if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $IdentityDetectorPath)) {
    try {
        $IdentityJson = & node $IdentityDetectorPath --json 2>$null
        if ($LASTEXITCODE -eq 0 -and $IdentityJson) {
            $Identity = $IdentityJson | ConvertFrom-Json
            if ($Identity.name)     { $CortexUserName     = $Identity.name }
            if ($Identity.email)    { $CortexUserEmail    = $Identity.email }
            if ($Identity.username) { $CortexUserUsername = $Identity.username }
            if ($Identity.platform) { $CortexUserPlatform = $Identity.platform }
            if ($Identity.locale)   { $CortexUserLocale   = $Identity.locale }
            if ($Identity.gh_login) { $CortexUserGhLogin  = $Identity.gh_login }
            $IdentityDetected = $true
        }
    } catch {
        # Detector failure is non-fatal — user.yaml will be written with empty fields.
    }
}
if (-not $env:CORTEX_NO_IDENTITY -and [Environment]::UserInteractive -and $IdentityDetected) {
    Write-Host ""
    Write-Host "Detected user identity:"
    if ($CortexUserName)    { Write-Host "  name:    $CortexUserName" }    else { Write-Host "  name:    (none — set git config user.name to use)" }
    if ($CortexUserEmail)   { Write-Host "  email:   $CortexUserEmail" }   else { Write-Host "  email:   (none — set git config user.email to use)" }
    if ($CortexUserLocale)  { Write-Host "  locale:  $CortexUserLocale" }
    if ($CortexUserGhLogin) { Write-Host "  gh:      $CortexUserGhLogin" }

    if (-not $CortexUserName -and -not $CortexUserEmail) {
        Write-Host "  (no signals — Claude will address you generically; you can edit ~/.claude/cortex/user.yaml later)"
    } else {
        $Reply = Read-Host "Use this identity? [Y/n]"
        if (-not $Reply) { $Reply = 'y' }
        if ($Reply -match '^[yY]') {
            $CortexUserConfirmed = 'true'
        } else {
            Write-Host "  -> Skipped - running with empty identity. Edit ~/.claude/cortex/user.yaml after install."
            $CortexUserName = ''; $CortexUserEmail = ''; $CortexUserLocale = ''; $CortexUserGhLogin = ''
            $CortexUserConfirmed = 'false'
        }
    }
}

Write-Host "cortex-x installer"
Write-Host "  from:     $CortexRoot"
Write-Host "  to:       $SharedTarget"
Write-Host "  channel:  $Channel"
Write-Host "  language: $Language"
Write-Host "  profile:  $Profile"
Write-Host ""

# Channel resolution.
$GitDir = Join-Path $CortexRoot ".git"
if ((Test-Path $GitDir) -and (-not $env:CORTEX_NO_UPDATE)) {
    Push-Location $CortexRoot
    try {
        if ($Channel -eq "stable") {
            git fetch --tags --quiet
            $Tags = git tag -l "v*" --sort=-v:refname 2>$null | Where-Object { $_ -notmatch "-(alpha|beta|rc)" }
            $Latest = $Tags | Select-Object -First 1
            if ($Latest) {
                Write-Host "Checking out stable tag: $Latest"
                git checkout --quiet $Latest
            } else {
                Write-Host "No stable tag found (no v*.*.* yet); staying on current branch."
            }
        } elseif ($Channel -eq "beta") {
            # Capture each exit code explicitly — `$Clean = ... -and ...` captures stdout, not codes.
            # Relax ErrorActionPreference around git so non-zero exits from --quiet don't throw.
            $prevEAP = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            git diff --quiet 2>$null;        $unstagedDirty = $LASTEXITCODE
            git diff --cached --quiet 2>$null; $stagedDirty   = $LASTEXITCODE
            if ($unstagedDirty -eq 0 -and $stagedDirty -eq 0) {
                git fetch --quiet 2>$null | Out-Null
                git checkout --quiet main 2>$null | Out-Null
            } else {
                Write-Host "Local changes detected — skipping beta auto-update. Commit or stash to resume."
            }
            $ErrorActionPreference = $prevEAP
        }
    } finally { Pop-Location }
}

if (Test-Path $SharedTarget) {
    $backup = Join-Path $ClaudeHome "shared.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "Existing ~/.claude/shared/ found. Backing up to: $backup"
    Move-Item $SharedTarget $backup
    # Rotate: keep only the most recent backup. The cortex-x source repo at
    # $CortexRoot (with full git history + remote) is the canonical backup;
    # this snapshot is just last-install rollback safety, not deep history.
    # Without rotation these accumulate forever and pollute ~/.claude/ git status
    # (10 backups x ~74 files = 700+ untracked observed in field 2026-05-01).
    Get-ChildItem -Path $ClaudeHome -Directory -Filter 'shared.backup-*' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 1 |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $SharedTarget -Force | Out-Null

# Copy shared content (hooks, skills, standards, templates, profiles, prompts, review agents)
Copy-Item -Recurse -Path (Join-Path $CortexRoot "shared\*") -Destination $SharedTarget
Copy-Item -Recurse -Path (Join-Path $CortexRoot "standards") -Destination $SharedTarget
Copy-Item -Recurse -Path (Join-Path $CortexRoot "templates") -Destination $SharedTarget
Copy-Item -Recurse -Path (Join-Path $CortexRoot "profiles") -Destination $SharedTarget
Copy-Item -Recurse -Path (Join-Path $CortexRoot "prompts") -Destination $SharedTarget
Copy-Item -Recurse -Path (Join-Path $CortexRoot "agents") -Destination $SharedTarget

# Skills already copied via "shared\*" above (shared/skills/ is the canonical
# location). Root-level skills/ is reserved for future top-level cortex-x skills
# and currently empty — no separate copy needed.

# Detectors directory — deterministic profile/stack/stage classifiers (auto-optimization).
# Read by session-start hook + cortex-doctor prompt. Fail-open contract.
$DetectorsSrc = Join-Path $CortexRoot "detectors"
if (Test-Path $DetectorsSrc) {
    Copy-Item -Recurse -Path $DetectorsSrc -Destination $SharedTarget -ErrorAction SilentlyContinue
}

# Tools directory — Node CLIs invoked by cortex-doctor + ad-hoc by users.
# Currently: verify-audit-output.cjs (Tier 3 QA). Includes lib/ for shared
# helpers like resolve-cortex-home.cjs (SSOT).
$ToolsSrc = Join-Path $CortexRoot "tools"
if (Test-Path $ToolsSrc) {
    Copy-Item -Recurse -Path $ToolsSrc -Destination $SharedTarget -ErrorAction SilentlyContinue
}

# Record cortex-x source dir for {{cortex_source}} placeholder resolution at scaffold time.
# Templates reference installed assets via ~/.claude/shared/; dynamic user-data dirs (research,
# projects, insights, journal, evals) live in $CortexDataHome (default ~/.cortex).
#
# Sprint 1.6: introduce cortex_data_home — user-personal data NEVER inside cortex-x source repo.
# See MIGRATIONS.md Sprint 1.6 entry.
$CortexDataHome = if ($env:CORTEX_DATA_HOME) { $env:CORTEX_DATA_HOME } else { Join-Path $HOME ".cortex" }
foreach ($sub in @("research", "projects", "insights/proposals", "journal", "evals")) {
    New-Item -ItemType Directory -Force -Path (Join-Path $CortexDataHome $sub) | Out-Null
}

# Seed insights/README.md on first install only — never overwrite user content.
$InsightsReadme = Join-Path $CortexDataHome "insights/README.md"
$InsightsReadmeSrc = Join-Path $CortexRoot "templates/cortex-data-insights-readme.md"
if ((-not (Test-Path $InsightsReadme)) -and (Test-Path $InsightsReadmeSrc)) {
    Copy-Item -Path $InsightsReadmeSrc -Destination $InsightsReadme -Force
}
# Write cortex-source.yaml WITHOUT UTF-8 BOM. PS 5.1's Set-Content -Encoding UTF8
# emits BOM (EF BB BF) which makes Node's regex `^cortex_source:` fail because
# the line starts with the BOM bytes, not 'c'. session-start.cjs and
# verify-install.cjs both consume this file via flat-YAML regex — BOM = silent
# field-missing on Windows. Use [System.IO.File]::WriteAllText with explicit
# UTF8Encoding($false) for BOM-free output, works on both PS 5.1 and pwsh 7+.
$CortexSourceYaml = "cortex_source: $CortexRoot`ncortex_data_home: $CortexDataHome`n"
[System.IO.File]::WriteAllText(
    (Join-Path $SharedTarget "cortex-source.yaml"),
    $CortexSourceYaml,
    [System.Text.UTF8Encoding]::new($false)
)

# Write/update module.local.yaml with user preference (gitignored).
$ModuleLocal = Join-Path $CortexRoot "module.local.yaml"
@"
# Per-user override (gitignored). See module.yaml for defaults.
# Regenerated by install.ps1 — edit freely after install.
config:
  communication_language: $Language
"@ | Set-Content -Path $ModuleLocal -Encoding UTF8

# Sprint 1.7.4 — write user identity to ~/.claude/cortex/user.yaml.
# Templates + session-start hook read this to address the user by name in
# their detected locale. Always written (even with empty fields) so callers
# can rely on the file existing. Idempotent: regenerated on every install.
$UserYamlDir = Join-Path $ClaudeHome "cortex"
New-Item -ItemType Directory -Force -Path $UserYamlDir | Out-Null
$UserYamlPath = Join-Path $UserYamlDir "user.yaml"
$DetectedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$UserYamlContent = @"
# cortex-x user identity (gitignored — written by install.ps1).
# Populated from git config + Intl + gh CLI. Edit freely; install will not
# overwrite unless you re-run it. Used by templates (CLAUDE.md, MEMORY.md)
# and session-start hook to personalize output.
name: $CortexUserName
email: $CortexUserEmail
username: $CortexUserUsername
platform: $CortexUserPlatform
locale: $CortexUserLocale
gh_login: $CortexUserGhLogin
language: $Language
profile: $Profile
confirmed: $CortexUserConfirmed
detected_at: $DetectedAt
"@
# BOM-free UTF-8 (PS 5.1 quirk — Set-Content -Encoding UTF8 emits BOM which
# breaks flat-yaml regex parsers in hooks/detectors).
[System.IO.File]::WriteAllText(
    $UserYamlPath,
    $UserYamlContent,
    [System.Text.UTF8Encoding]::new($false)
)

# Print directive for user to add to ~/.claude/CLAUDE.md
# (don't auto-edit user's global file — Principle 1 from coding-behavior.md)
$LangName = switch ($Language) {
    "cs" { "Czech (čeština)" }
    "de" { "German (Deutsch)" }
    "fr" { "French (français)" }
    "es" { "Spanish (español)" }
    default { "English" }
}
Write-Host ""
Write-Host "To enforce the language preference, add this block to ~/.claude/CLAUDE.md:"
Write-Host ""
Write-Host "---"
Write-Host "<!-- BEGIN cortex-x — communication language -->"
Write-Host "## cortex-x language"
Write-Host "When working in a cortex-x-scaffolded project or invoking cortex-x prompts,"
Write-Host "respond in: **$LangName** (code: $Language). Never switch languages mid-reply."
Write-Host "<!-- END cortex-x -->"
Write-Host "---"
Write-Host ""

# Install cortex-bootstrap helper to ~/.claude/shared/bin/ (per-project mode selector).
# Files installed:
#   cortex-bootstrap        — bash shim (calls node)
#   cortex-bootstrap.ps1    — pwsh shim (calls node)
#   cortex-bootstrap.cjs    — actual Node implementation with arrow-key TUI
#   _lib/select.cjs         — zero-dep arrow-key select prompt utility
$BinTarget = Join-Path $SharedTarget "bin"
$BinLibTarget = Join-Path $BinTarget "_lib"
New-Item -ItemType Directory -Force -Path $BinTarget | Out-Null
New-Item -ItemType Directory -Force -Path $BinLibTarget | Out-Null

$BootstrapFiles = @(
    @{ Src = "bin/cortex-bootstrap";       Dst = "cortex-bootstrap" }
    @{ Src = "bin/cortex-bootstrap.ps1";   Dst = "cortex-bootstrap.ps1" }
    @{ Src = "bin/cortex-bootstrap.cjs";   Dst = "cortex-bootstrap.cjs" }
    @{ Src = "bin/cortex-gap-report";       Dst = "cortex-gap-report" }
    @{ Src = "bin/cortex-gap-report.ps1";   Dst = "cortex-gap-report.ps1" }
    @{ Src = "bin/cortex-gap-report.cjs";   Dst = "cortex-gap-report.cjs" }
    @{ Src = "bin/cortex-migrate-data.sh";  Dst = "cortex-migrate-data.sh" }
    @{ Src = "bin/cortex-migrate-data.ps1"; Dst = "cortex-migrate-data.ps1" }
    # cortex-steward shim — bash + pwsh entry points that delegate to
    # $CortexRoot/bin/cortex-steward.cjs via cortex-source.yaml. The shim
    # stays small + stable; the actual steward runtime lives in the source
    # repo (no drift between bin/ shim and bin/steward/ implementation).
    @{ Src = "bin/cortex-steward";          Dst = "cortex-steward" }
    @{ Src = "bin/cortex-steward.ps1";      Dst = "cortex-steward.ps1" }
)
foreach ($f in $BootstrapFiles) {
    $srcPath = Join-Path $CortexRoot $f.Src
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination (Join-Path $BinTarget $f.Dst) -Force
    }
}

$LibSelectSrc = Join-Path $CortexRoot "bin/_lib/select.cjs"
if (Test-Path $LibSelectSrc) {
    Copy-Item -Path $LibSelectSrc -Destination (Join-Path $BinLibTarget "select.cjs") -Force
}

# Sprint LR.B+ (2026-05-12) — cortex-capabilities CLI shims.
# Delegates to $CortexSource/bin/cortex-capabilities.cjs via cortex-source.yaml.
# Without these, /cortex-help can't surface the capability registry on a
# stranger's machine because the implementation lives only in the source repo.
# Emit BOTH variants (bash + ps1) so Git Bash users on Windows get the
# extension-less form too — same convention as cortex-bootstrap / cortex-steward.
$CapShimPath = Join-Path $BinTarget "cortex-capabilities.ps1"
$CapShimContent = @'
# cortex-capabilities shim — delegates to $CortexSource\bin\cortex-capabilities.cjs.
$ErrorActionPreference = "Stop"
$SrcYaml = Join-Path $env:USERPROFILE ".claude\shared\cortex-source.yaml"
if (-not (Test-Path $SrcYaml)) {
    Write-Error "cortex-x not configured ($SrcYaml missing). Re-run install.ps1."
    exit 1
}
$line = Get-Content $SrcYaml | Where-Object { $_ -match '^cortex_source:' } | Select-Object -First 1
if (-not $line) { Write-Error "cortex_source missing in $SrcYaml"; exit 1 }
$CortexSource = ($line -replace '^cortex_source:\s*', '').Trim().Trim('"').Trim("'")
if (-not (Test-Path $CortexSource)) { Write-Error "cortex-x source not found at: $CortexSource"; exit 1 }
& node (Join-Path $CortexSource "bin\cortex-capabilities.cjs") @args
'@
Set-Content -Path $CapShimPath -Value $CapShimContent -Encoding UTF8

# Bash variant for Git Bash users on Windows (verify-install.cjs --strict
# expects this file to exist; install.sh emits the same body, install.ps1
# matches the contract).
$CapShimBashPath = Join-Path $BinTarget "cortex-capabilities"
$CapShimBashContent = @'
#!/usr/bin/env bash
# cortex-capabilities shim — delegates to $CORTEX_SOURCE/bin/cortex-capabilities.cjs.
set -e
SRC_YAML="$HOME/.claude/shared/cortex-source.yaml"
if [ ! -f "$SRC_YAML" ]; then
  echo "cortex-x not configured ($SRC_YAML missing). Re-run install.ps1 (or install.sh on POSIX)." >&2
  exit 1
fi
CORTEX_SOURCE=$(grep '^cortex_source:' "$SRC_YAML" | head -1 | sed 's/^cortex_source:[[:space:]]*//' | tr -d '"' | tr -d "'" | tr -d '\r')
if [ -z "$CORTEX_SOURCE" ] || [ ! -d "$CORTEX_SOURCE" ]; then
  echo "cortex-x source not found at: $CORTEX_SOURCE" >&2
  exit 1
fi
exec node "$CORTEX_SOURCE/bin/cortex-capabilities.cjs" "$@"
'@
# Use UTF8NoBOM via [System.IO.File]::WriteAllText with explicit encoding —
# install.ps1 already does this for cortex-source.yaml (line 317 per existing
# pattern) because PS 5.1's `Set-Content -Encoding UTF8` writes BOM, and a BOM
# in a bash script causes `bad interpreter` errors on Git Bash.
[System.IO.File]::WriteAllText($CapShimBashPath, $CapShimBashContent, (New-Object System.Text.UTF8Encoding($false)))

# Sprint 2.8.1 + 3.0 v0/v1/v2 + 3.1 v0 + 3.2 v0/v1 — operator CLI delegation
# shims (PowerShell + bash variants for Git Bash on Windows). Same pattern as
# cortex-capabilities above. Added 2026-05-13 afternoon.
function New-DelegateShim {
  param([string]$ShimName, [string]$ImplFile)
  $ImplPath = Join-Path $CortexRoot "bin\$ImplFile"
  if (-not (Test-Path $ImplPath)) { return }

  # PowerShell variant
  $Ps1Path = Join-Path $BinTarget ("$ShimName.ps1")
  $Ps1Content = @"
# $ShimName shim — delegates to `$CortexSource\bin\$ImplFile
`$ErrorActionPreference = "Stop"
`$SrcYaml = Join-Path `$env:USERPROFILE ".claude\shared\cortex-source.yaml"
if (-not (Test-Path `$SrcYaml)) {
  Write-Error "cortex-x not configured (`$SrcYaml missing). Re-run install.ps1."
  exit 1
}
`$line = (Select-String -Path `$SrcYaml -Pattern '^cortex_source:' | Select-Object -First 1).Line
if (-not `$line) { Write-Error "cortex_source missing in `$SrcYaml"; exit 1 }
`$CortexSource = (`$line -replace '^cortex_source:\s*', '').Trim().Trim('"').Trim("'")
if (-not (Test-Path `$CortexSource)) { Write-Error "cortex-x source not found at: `$CortexSource"; exit 1 }
& node (Join-Path `$CortexSource "bin\$ImplFile") @args
"@
  Set-Content -Path $Ps1Path -Value $Ps1Content -Encoding UTF8

  # Bash variant (Git Bash on Windows)
  $BashPath = Join-Path $BinTarget $ShimName
  $BashContent = @"
#!/usr/bin/env bash
# $ShimName shim — delegates to `$CORTEX_SOURCE/bin/$ImplFile
set -e
SRC_YAML="`$HOME/.claude/shared/cortex-source.yaml"
if [ ! -f "`$SRC_YAML" ]; then
  echo "cortex-x not configured (`$SRC_YAML missing). Re-run install." >&2
  exit 1
fi
CORTEX_SOURCE=`$(grep '^cortex_source:' "`$SRC_YAML" | head -1 | sed 's/^cortex_source:[[:space:]]*//' | tr -d '"' | tr -d "'" | tr -d '\r')
if [ -z "`$CORTEX_SOURCE" ] || [ ! -d "`$CORTEX_SOURCE" ]; then
  echo "cortex-x source not found at: `$CORTEX_SOURCE" >&2
  exit 1
fi
exec node "`$CORTEX_SOURCE/bin/$ImplFile" "`$@"
"@
  [System.IO.File]::WriteAllText($BashPath, $BashContent, (New-Object System.Text.UTF8Encoding($false)))
}
New-DelegateShim "cortex-propose-skill"  "cortex-propose-skill.cjs"
New-DelegateShim "cortex-lessons-search" "cortex-lessons-search.cjs"
New-DelegateShim "cortex-evolve-ab"      "cortex-evolve-ab.cjs"
New-DelegateShim "cortex-export-lessons" "cortex-export-lessons.cjs"
New-DelegateShim "cortex-doc-audit"      "cortex-doc-audit.cjs"
New-DelegateShim "cortex-doc-regen"      "cortex-doc-regen.cjs"
New-DelegateShim "cortex-doc-currency"   "cortex-doc-currency.cjs"
New-DelegateShim "cortex-wiki-consolidate" "cortex-wiki-consolidate.cjs"
New-DelegateShim "cortex-update"         "cortex-update.cjs"
New-DelegateShim "cortex-uninstall"      "cortex-uninstall.cjs"
New-DelegateShim "cortex-hooks-register" "cortex-hooks-register.cjs"
New-DelegateShim "cortex-claude-md-augment" "cortex-claude-md-augment.cjs"
New-DelegateShim "cortex-permissions-register" "cortex-permissions-register.cjs"
New-DelegateShim "cortex-doctor"         "cortex-doctor.cjs"
# Sprint 2.22 / 2.25 / 2.22.1 — three CLIs shipped 2026-05-14.
New-DelegateShim "cortex-skill-validate" "cortex-skill-validate.cjs"
New-DelegateShim "cortex-dream"          "cortex-dream.cjs"
New-DelegateShim "cortex-insights"       "cortex-insights.cjs"
New-DelegateShim "cortex-usage"          "cortex-usage.cjs"

# Install default agents to ~/.claude/agents/ for Claude Code discovery.
#
# Claude Code's agent discovery checks ~/.claude/agents/ (user-level) and
# .claude/agents/ (project-level). It does NOT check ~/.claude/shared/agents/
# — that path is cortex-x-internal staging. Without this copy, every cortex-x
# project's default adversarial pipeline is invisible at runtime.
#
# Field test #5 (interview-brief, 2026-05-07) caught this. Per-project
# .claude/agents/ remains for synthesized + project overrides only.
$UserAgentsDir = Join-Path $ClaudeHome "agents"
New-Item -ItemType Directory -Force -Path $UserAgentsDir | Out-Null
$AgentsSrc = Join-Path $CortexRoot "agents"
if (Test-Path $AgentsSrc) {
    Get-ChildItem -Path $AgentsSrc -Filter "*.md" -File | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination (Join-Path $UserAgentsDir $_.Name) -Force
    }
}

# Install user-level slash-skill /cortex-init at ~/.claude/skills/cortex-init/.
# This is the RECOMMENDED post-install entry point — user just opens claude in
# any project dir and types /cortex-init. The skill asks N/E/F via Claude's
# native AskUserQuestion tool, writes the marker, chains to /start or /audit.
$UserSkillsDir = Join-Path $ClaudeHome "skills/cortex-init"
New-Item -ItemType Directory -Force -Path $UserSkillsDir | Out-Null
$CortexInitSkillSrc = Join-Path $CortexRoot "shared/skills/cortex-init/SKILL.md"
if (Test-Path $CortexInitSkillSrc) {
    Copy-Item -Path $CortexInitSkillSrc -Destination (Join-Path $UserSkillsDir "SKILL.md") -Force
}

# Sprint 2.17 — install /cortex-help at user-level so it's discoverable as a
# slash command. Namespaced as cortex-help (not /help) because /help is
# Claude Code's built-in help command — a custom skill named "help" collides.
$CortexHelpSkillDir = Join-Path $ClaudeHome "skills/cortex-help"
New-Item -ItemType Directory -Force -Path $CortexHelpSkillDir | Out-Null
$CortexHelpSkillSrc = Join-Path $CortexRoot "shared/skills/cortex-help/SKILL.md"
if (Test-Path $CortexHelpSkillSrc) {
    Copy-Item -Path $CortexHelpSkillSrc -Destination (Join-Path $CortexHelpSkillDir "SKILL.md") -Force
}

# Sprint 2.10.2 — profile-specific slash-skill priming. For qa-tester also
# install /test-audit at user-level so it's the prominent entry point.
if ($Profile -eq "qa-tester") {
    $TestAuditSkillDir = Join-Path $ClaudeHome "skills/test-audit"
    New-Item -ItemType Directory -Force -Path $TestAuditSkillDir | Out-Null
    $TestAuditSkillSrc = Join-Path $CortexRoot "shared/skills/test-audit/SKILL.md"
    if (Test-Path $TestAuditSkillSrc) {
        Copy-Item -Path $TestAuditSkillSrc -Destination (Join-Path $TestAuditSkillDir "SKILL.md") -Force
    }
}

# Sprint LR.B+ (2026-05-12) — promote remaining shared skills to user-level so
# they're discoverable as slash commands. Claude Code only auto-loads from
# ~/.claude/skills/<name>/SKILL.md, NOT from ~/.claude/shared/skills/.
# 2026-05-25: switched from `Copy-Item SKILL.md` to a recursive directory copy
# — ux-copywriter is the first skill to ship companion `references/` files
# that SKILL.md links to relatively; copying only SKILL.md would break those.
foreach ($SkillName in @("audit", "designer", "start", "ux-copywriter", "ralph-loop", "improve-codebase-architecture", "cortex-doctor", "cortex-goal", "cortex-update", "cortex-uninstall")) {
    $SrcSkillDir = Join-Path $CortexRoot "shared/skills/$SkillName"
    $SrcSkillFile = Join-Path $SrcSkillDir "SKILL.md"
    if (Test-Path $SrcSkillFile) {
        $DstSkillDir = Join-Path $ClaudeHome "skills/$SkillName"
        New-Item -ItemType Directory -Force -Path $DstSkillDir | Out-Null
        Copy-Item -Path (Join-Path $SrcSkillDir "*") -Destination $DstSkillDir -Recurse -Force
    }
}

# Generate INSTALL_NOTES.md with all the verbose detail. Keep terminal output
# tight — users who want detail can read the file.
$InstallNotes = Join-Path $SharedTarget "INSTALL_NOTES.md"
$LangName = switch ($Language) {
    "cs" { "Czech (čeština)" }
    "de" { "German (Deutsch)" }
    "fr" { "French (français)" }
    "es" { "Spanish (español)" }
    default { "English" }
}
$Now = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
$NotesContent = @"
# cortex-x install notes

Generated by `install.ps1` on $Now.

- Source:    $CortexRoot
- Installed: $SharedTarget
- Channel:   $Channel
- Language:  $LangName (``$Language``)

## Hooks (in ``hooks/``)

| File | Event |
|---|---|
| ``block-destructive.cjs`` | PreToolUse matcher:Bash |
| ``session-start.cjs`` | SessionStart — sprint state, git context, budget surface, bootstrap-marker reader |
| ``pre-compact.cjs`` | PreCompact — saves sprint state to ``.claude/compact-state.md`` |
| ``post-compact.cjs`` | PostCompact — flags the saved state for re-injection |
| ``pre-tool-use.cjs`` | PreToolUse all tools — journal companion |
| ``post-tool-use.cjs`` | PostToolUse all tools — journal + budget writer |
| ``auto-orchestrate.cjs`` | UserPromptSubmit — 3-fronta hint + budget warn + compaction recovery |
| ``subagent-start.cjs`` | SubagentStart — propagates cortex discipline into subagents |
| ``task-completed.cjs`` | TaskCompleted — verification gate, nudges once per task |
| ``tirith-scan.cjs`` | SessionStart — optional, no-op if tirith binary absent |
| ``_lib/redact.cjs`` | Shared secret-scrubbing library |
| ``_lib/budget.cjs`` | Shared token-cost tracking library |

## Register hooks in ``~/.claude/settings.json``

``````json
"hooks": {
  "PreToolUse": [
    { "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/block-destructive.cjs\"", "timeout": 5 }] },
    { "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/pre-commit-review-gate.cjs\"", "timeout": 6 }] },
    { "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/pre-tool-use.cjs\"", "timeout": 3 }] }
  ],
  "PostToolUse": [
    { "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/post-tool-use.cjs\"", "timeout": 5 }] }
  ],
  "UserPromptSubmit": [
    { "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/auto-orchestrate.cjs\"", "timeout": 3 }] }
  ],
  "SessionStart": [
    { "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/session-start.cjs\"", "timeout": 5 }] }
  ],
  "PreCompact": [
    { "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/pre-compact.cjs\"", "timeout": 5 }] }
  ],
  "PostCompact": [
    { "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/post-compact.cjs\"", "timeout": 5 }] }
  ],
  "SubagentStart": [
    { "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/subagent-start.cjs\"", "timeout": 3 }] }
  ],
  "TaskCompleted": [
    { "hooks": [{ "type": "command", "command": "node \"`$HOME/.claude/shared/hooks/task-completed.cjs\"", "timeout": 3 }] }
  ]
}
``````

> SSOT alignment: this block must match ``bin/cortex-hooks-register.cjs`` HOOK_SPEC (Sprint 2.21.2). ``cortex-hooks-register --apply`` registers the same set programmatically.

## Language preference (optional)

Add this block to ``~/.claude/CLAUDE.md`` so Claude responds in $LangName for cortex-x sessions:

``````markdown
<!-- BEGIN cortex-x — communication language -->
## cortex-x language
When working in a cortex-x-scaffolded project or invoking cortex-x prompts,
respond in: **$LangName** (code: ``$Language``). Never switch languages mid-reply.
<!-- END cortex-x -->
``````

cortex-x will not auto-edit your global ``~/.claude/CLAUDE.md`` (Principle 1 from standards/coding-behavior.md).

## Budget cap

Set ``CORTEX_SESSION_BUDGET_USD`` env var (default ``\$5.00``). Spend log: ``\$CORTEX_DATA_HOME/journal/.budget.jsonl``.
Set ``CORTEX_BUDGET_DISABLED=1`` to suppress budget output entirely (e.g. flat-subscription installs).

## Optional: Tirith (context-file prompt-injection scanner)

``````bash
cargo install tirith
# or download from https://github.com/NousResearch/tirith/releases
``````

``tirith-scan.cjs`` hook auto-detects once installed.

## Re-running

Re-run ``install.ps1`` after pulling cortex-x updates. Existing ``~/.claude/shared/`` is backed up to ``shared.backup-yyyyMMdd-HHmmss``. Only the most recent backup is kept.

## See also

- ``standards/ship-ready.md`` — ``CORTEX_HOME`` / ``CORTEX_CHANNEL`` semantics
- ``docs/sprint-1.5-design.md`` — onboarding architecture
- ``MIGRATIONS.md`` — pre-public-tag debt and version migrations
"@
$NotesContent | Set-Content -Path $InstallNotes -Encoding UTF8

# ── Post-copy verification — delegated to tests/smoke/verify-install.cjs.
# Single source of truth: same verifier runs from install.sh, install.ps1,
# CI matrix, and integration tests. Exit codes: 0 OK / 1 validation fail / 2 bug.
$Verifier = Join-Path $CortexRoot "tests/smoke/verify-install.cjs"
if (-not (Test-Path $Verifier -PathType Leaf)) {
    Write-Host ""
    Write-Host "  $([char]0x2717) Verifier not found: $Verifier" -ForegroundColor Red
    Write-Host "    Your cortex-x clone is incomplete. Re-clone from origin and re-run." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  $([char]0x2717) node is required to verify install but not found on PATH." -ForegroundColor Red
    Write-Host "    Install Node.js >=22 (Active LTS) and re-run." -ForegroundColor Red
    exit 1
}
# Numeric Node version check — cortex-x uses built-in fetch / structuredClone /
# AbortController / top-level await widely. Anything <22 fails at runtime
# with cryptic errors; reject loudly at install time instead.
$NodeVerRaw = (& node --version 2>$null)
$NodeMajor = -1
if ($NodeVerRaw -match '^v(\d+)\.') { $NodeMajor = [int]$Matches[1] }
if ($NodeMajor -lt 22) {
    Write-Host ""
    Write-Host "  $([char]0x2717) Node.js $NodeVerRaw is too old (cortex-x needs >=22, Active LTS)." -ForegroundColor Red
    Write-Host "    Upgrade via nvm-windows / fnm / volta, then re-run." -ForegroundColor Red
    exit 1
}
& node $Verifier
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  $([char]0x2717) Install verification FAILED $([char]0x2014) see output above." -ForegroundColor Red
    Write-Host "    Try: re-run install.ps1, or open an issue at" -ForegroundColor Red
    Write-Host "         https://github.com/Rejnyx/cortex-x/issues" -ForegroundColor Red
    exit 1
}

# Sprint 2.21 — opt-in hook registration (mirror install.sh logic).
# $env:CORTEX_REGISTER_HOOKS:
#   '1' / 'y' / 'yes' / 'true'  → register without prompting
#   '0' / 'n' / 'no' / 'false'  → skip without prompting
#   unset, interactive          → ask Y/n
#   unset, non-interactive      → skip silently
$HooksRegisterScript = Join-Path $CortexRoot "bin\cortex-hooks-register.cjs"
if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $HooksRegisterScript)) {
    $NormHooks = Get-NormalizedConsent -EnvVarName 'CORTEX_REGISTER_HOOKS'
    if ($null -eq $NormHooks -and [Environment]::UserInteractive) {
        Write-Host ""
        Write-Host "  Cortex hooks (block-destructive safety, SessionStart context, auto-orchestrate)"
        Write-Host "  are NOT active until registered in ~/.claude/settings.json."
        Write-Host "  Without them, you lose ~50% of cortex-x value — but settings.json is yours,"
        Write-Host "  so the choice is explicit. A timestamped backup is written before any change."
    }
    $RegisterDecision = Get-ConsentDecision -EnvVarName 'CORTEX_REGISTER_HOOKS' -PromptText "  Register cortex hooks now? [y/N]"
    if ($RegisterDecision -eq 'y') {
        & node $HooksRegisterScript --apply --yes
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  warning: hook registration failed (settings.json untouched per safety contract)." -ForegroundColor Yellow
            Write-Host "  manual: paste the block from $InstallNotes under '## Register hooks in ~/.claude/settings.json'." -ForegroundColor Yellow
        }
    } elseif ($RegisterDecision -eq 'n' -and [Environment]::UserInteractive) {
        Write-Host "  $([char]0x21B3) Skipped. Re-run anytime: cortex-hooks-register"
    }
}

# Sprint 2.21 — opt-in CLAUDE.md discipline block (mirror install.sh logic).
$AugmentScript = Join-Path $CortexRoot "bin\cortex-claude-md-augment.cjs"
if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $AugmentScript)) {
    $NormAugment = Get-NormalizedConsent -EnvVarName 'CORTEX_AUGMENT_CLAUDE_MD'
    if ($null -eq $NormAugment -and [Environment]::UserInteractive) {
        Write-Host ""
        Write-Host "  Cortex discipline block (R1 research-first, R2 review pipeline, parallel agents"
        Write-Host "  by default) can be appended to your global ~/.claude/CLAUDE.md. This biases EVERY"
        Write-Host "  Claude Code session — not just cortex slash commands — toward cortex behavior."
        Write-Host "  Bracketed by BEGIN/END markers — your existing CLAUDE.md content is preserved."
    }
    $AugmentDecision = Get-ConsentDecision -EnvVarName 'CORTEX_AUGMENT_CLAUDE_MD' -PromptText "  Append cortex discipline block to global CLAUDE.md? [y/N]"
    if ($AugmentDecision -eq 'y') {
        & node $AugmentScript --apply --yes
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  warning: CLAUDE.md augment failed (file untouched per safety contract)." -ForegroundColor Yellow
            Write-Host "  manual: cortex-claude-md-augment --apply" -ForegroundColor Yellow
        }
    } elseif ($AugmentDecision -eq 'n' -and [Environment]::UserInteractive) {
        Write-Host "  $([char]0x21B3) Skipped. Re-run anytime: cortex-claude-md-augment"
    }
}

# Sprint 2.28 — opt-in safety-floor permissions registration (mirror install.sh logic).
$PermissionsScript = Join-Path $CortexRoot "bin\cortex-permissions-register.cjs"
if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $PermissionsScript)) {
    $NormPerms = Get-NormalizedConsent -EnvVarName 'CORTEX_REGISTER_PERMISSIONS'
    if ($null -eq $NormPerms -and [Environment]::UserInteractive) {
        Write-Host ""
        Write-Host "  Cortex safety-floor permissions can be registered in ~/.claude/settings.json:"
        Write-Host "  a deny list blocking destructive operations + an allow baseline skipping"
        Write-Host "  approval prompts on common-safe ops (npm test, git status, ls, cortex CLIs)."
        Write-Host "  Replaces --dangerously-skip-permissions: same speed, deny-precedence floor."
    }
    $PermissionsDecision = Get-ConsentDecision -EnvVarName 'CORTEX_REGISTER_PERMISSIONS' -PromptText "  Register cortex safety-floor permissions? [y/N]"
    if ($PermissionsDecision -eq 'y') {
        & node $PermissionsScript --apply --yes
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  warning: permissions registration failed (settings.json untouched per safety contract)." -ForegroundColor Yellow
            Write-Host "  manual: cortex-permissions-register --apply" -ForegroundColor Yellow
        }
    } elseif ($PermissionsDecision -eq 'n' -and [Environment]::UserInteractive) {
        Write-Host "  $([char]0x21B3) Skipped. Re-run anytime: cortex-permissions-register"
    }
}

# Compact final summary — model: Bun, uv, Rustup. Detail in INSTALL_NOTES.md.
$BinDir = Join-Path $SharedTarget "bin"
$PathEntries = $env:PATH -split [IO.Path]::PathSeparator
$PathHasBin = $PathEntries -contains $BinDir

Write-Host ""
$AgentCount = (Get-ChildItem -Path (Join-Path $ClaudeHome "agents") -Filter "*.md" -File -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "  ✓ cortex-x installed"
Write-Host "    framework  ~/.claude/shared/      (cortex-x assets · prompts · standards · skills · staging)"
Write-Host "    agents     ~/.claude/agents/      ($AgentCount default agents — auto-discovered by Claude Code)"
if ($Profile -eq "qa-tester") {
    Write-Host "    skill      ~/.claude/skills/test-audit/   (RECOMMENDED for QA — type /test-audit in any project)"
    Write-Host "    skill      ~/.claude/skills/cortex-init/  (general retrofit — chain after /test-audit if needed)"
} else {
    Write-Host "    skill      ~/.claude/skills/cortex-init/  (RECOMMENDED entry point — type /cortex-init in any project)"
}
Write-Host "    user data  $CortexDataHome/      (research · projects · insights · journal · evals — your own knowledge graph)"
Write-Host "    bootstrap  ~/.claude/shared/bin/cortex-bootstrap"
Write-Host "    language   $LangName ($Language)"
Write-Host "    profile    $Profile"
Write-Host "    notes      $InstallNotes"
Write-Host ""
switch ($Profile) {
    "qa-tester" {
        Write-Host "  Next step (QA tester) — open Claude Code at the root of the repo you're auditing:"
        Write-Host ""
        Write-Host "    claude"
        Write-Host "    /test-audit"
        Write-Host ""
        Write-Host "  ↳ /test-audit produces a senior-QA-consultant deliverable in 30 min:"
        Write-Host "    cortex/qa/AUDIT.md (12-section ISO 25010:2023), testing-strategy.md,"
        Write-Host "    testing-gaps.md (P0/P1/P2 backlog with auto-research-nudge per gap)."
        Write-Host ""
        Write-Host "  Profile loaded: qa-engineer (~/.claude/shared/profiles/qa-engineer.yaml)"
        Write-Host "    Risk-tiered quality gates · 15 QA concerns (testing + DevOps/CI) · ASVS 5.0 mappings"
        Write-Host ""
        Write-Host "  Standards to read first:"
        Write-Host "    ~/.claude/shared/standards/testing.md      — pyramid + 5 pillars per test"
        Write-Host "    ~/.claude/shared/standards/correctness.md  — Zod boundaries, property-based, mutation"
        Write-Host "    ~/.claude/shared/standards/security.md     — 8-layer defense, ASVS L1/L2 alignment"
    }
    "ai-engineer" {
        Write-Host "  Next step (AI engineer) — open Claude Code in any project dir:"
        Write-Host ""
        Write-Host "    claude"
        Write-Host "    /cortex-init   # use ai-agent profile for AI-heavy projects"
        Write-Host ""
        Write-Host "  Profile loaded: ai-agent (~/.claude/shared/profiles/ai-agent.yaml)"
        Write-Host "    Lethal-trifecta defense · 7 MUST patterns · safe-tool wrapper · evals scaffold"
    }
    "minimal" {
        Write-Host "  Next step — framework installed, no extra skill primed."
        Write-Host "  Invoke prompts manually from ~/.claude/shared/prompts/."
    }
    default {
        Write-Host "  Next step (recommended) — open Claude Code in any project dir:"
        Write-Host ""
        Write-Host "    claude"
        Write-Host "    /cortex-init"
        Write-Host ""
        Write-Host "  ↳ /cortex-init asks New / Existing / Framework-only via arrow keys,"
        Write-Host "    writes the marker, chains to the right cortex-x workflow."
    }
}
Write-Host ""
Write-Host "  Steward — your AI nightly autopilot (after scaffold):"
Write-Host "    Drop cortex/recommendations.md in your repo; Steward opens a draft PR overnight."
Write-Host "    Debug:    cortex-steward status --slug=<your-repo>  (preview without spend)"
Write-Host "    Activate: docs/steward-usage.md.  Halt: touch ~/.cortex/STEWARD_HALT."
Write-Host ""
Write-Host "  Shell-only alternative (power users / scripts):"
if ($PathHasBin) {
    Write-Host "    cortex-bootstrap     # already on PATH"
} else {
    Write-Host "    & '$BinDir\cortex-bootstrap.ps1'"
    Write-Host ""
    Write-Host "  Add bin/ to PATH (one-time, optional):"
    Write-Host "    Add-Content `$PROFILE '`$env:PATH = `"$BinDir;`" + `$env:PATH'"
}
Write-Host ""
