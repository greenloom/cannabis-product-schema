#!/usr/bin/env bash
# Public-repository boundary check. Fails (exit 1) on any hit. See
# BOUNDARY.md for what this enforces and why.
#
# Checks:
#   (a) tracked files against the public denylist (tests/boundary-terms.txt)
#   (b) every URL host in the repo is allowlisted
#   (c) fixtures use only example.com identities
#   (d) no jurisdiction constants inside schema/v0.1/core/
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
say_fail() { echo "FAIL: $1"; fail=1; }
say_pass() { echo "PASS: $1"; }

# Tracked files: prefer `git ls-files` when this is a git checkout (CI, or
# post-publication); fall back to `find` (pre-publication working tree,
# where this script is expected to also pass) excluding node_modules/.git.
# Written to a temp file (not a bash array) so this runs on bash 3.2
# (macOS's default /bin/bash) as well as bash 4+/5 in CI.
FILELIST=$(mktemp)
trap 'rm -f "$FILELIST"' EXIT
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git ls-files > "$FILELIST"
else
  find . \( -path ./node_modules -o -path ./.git \) -prune -o -type f -print | sed 's|^\./||' > "$FILELIST"
fi
echo "Checking $(wc -l < "$FILELIST" | tr -d ' ') files."

# --- (a) public denylist grep --------------------------------------------
echo
echo "-- (a) public denylist (tests/boundary-terms.txt) --"
denylist_hits=0
while IFS= read -r term; do
  [[ -z "$term" || "$term" == \#* ]] && continue
  while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    # boundary-terms.txt and BOUNDARY.md legitimately name the denylisted
    # terms as examples of what's banned — that's documentation, not a hit.
    [[ "$f" == "tests/boundary-terms.txt" || "$f" == "BOUNDARY.md" ]] && continue
    if grep -qiF "$term" -- "$f" 2>/dev/null; then
      say_fail "denylisted term \"$term\" found in $f"
      denylist_hits=$((denylist_hits + 1))
    fi
  done < "$FILELIST"
done < tests/boundary-terms.txt
[[ $denylist_hits -eq 0 ]] && say_pass "no denylisted terms found"

# --- (b) URL host allowlist ------------------------------------------------
echo
echo "-- (b) URL host allowlist --"
# package-lock.json is machine-generated npm registry metadata (resolved
# tarball URLs, funding links) — not authored content, excluded from the
# host scan by design.
ALLOWED_HOSTS=(greenloom.github.io json-schema.org schema.org rules.sos.ga.gov astm.org example.com agr.georgia.gov law.cornell.edu github.com)
host_allowed() {
  local host="$1" allowed
  for allowed in "${ALLOWED_HOSTS[@]}"; do
    if [[ "$host" == "$allowed" || "$host" == *".$allowed" ]]; then
      return 0
    fi
  done
  return 1
}
host_hits=0
while IFS= read -r f; do
  [[ -z "$f" || ! -f "$f" ]] && continue
  # package-lock.json: machine-generated npm registry metadata. LICENSE /
  # LICENSE-DOCS: standard license boilerplate (apache.org, creativecommons.org)
  # inherent to the license text itself, not an authored content citation.
  case "$f" in package-lock.json|LICENSE|LICENSE-DOCS) continue ;; esac
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    host=$(printf '%s' "$url" | sed -E 's#^https?://##; s#[/:].*##')
    if ! host_allowed "$host"; then
      say_fail "URL host \"$host\" (in $f) is not allowlisted"
      host_hits=$((host_hits + 1))
    fi
  done < <(grep -ohE 'https?://[A-Za-z0-9_.-]+' -- "$f" 2>/dev/null || true)
done < "$FILELIST"
[[ $host_hits -eq 0 ]] && say_pass "every URL host is allowlisted"

# --- (c) fixture identities are example.com only ---------------------------
echo
echo "-- (c) fixture identities (example.com only) --"
fixture_hits=0
if [[ -d tests/fixtures ]]; then
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    host=$(printf '%s' "$url" | sed -E 's#^https?://##; s#[/:].*##')
    if [[ "$host" != "example.com" && "$host" != *.example.com ]]; then
      say_fail "fixture URL host \"$host\" is not example.com or a subdomain of it"
      fixture_hits=$((fixture_hits + 1))
    fi
  done < <(grep -rohE 'https?://[A-Za-z0-9_.-]+' tests/fixtures 2>/dev/null || true)
fi
[[ $fixture_hits -eq 0 ]] && say_pass "all fixture identities are example.com"

# --- (d) no jurisdiction constants in core/ ---------------------------------
echo
echo "-- (d) core/ jurisdiction-neutrality (same denylist as tests/run.mjs) --"
core_hits=0
if [[ -d schema/v0.1/core ]]; then
  while IFS= read -r f; do
    for pat in '0\.3\b' '0\.877\b' '\b300\b' '\b1000\b' '\bgeorgia\b' '\bga\b' '\b21\b'; do
      if grep -qiE "$pat" -- "$f" 2>/dev/null; then
        say_fail "jurisdiction constant matching /$pat/ found in $f"
        core_hits=$((core_hits + 1))
      fi
    done
  done < <(find schema/v0.1/core -type f -name "*.json")
fi
[[ $core_hits -eq 0 ]] && say_pass "core/ is jurisdiction-neutral"

echo
if [[ $fail -eq 0 ]]; then
  echo "ALL GREEN"
  exit 0
else
  echo "BOUNDARY CHECK FAILED"
  exit 1
fi
