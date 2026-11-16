#!/bin/sh
# Publishes the plugin: checks, bumps the version, commits, pushes, refreshes
# the local install. Installs only update when the version changes, so every
# push of plugin code goes through here.
#
#   tools/release.sh          bump the patch number (0.2.0 -> 0.2.1)
#   tools/release.sh minor    bump the minor number (0.2.1 -> 0.3.0)
set -eu

cd "$(dirname "$0")/.."
part=${1:-patch}
manifest=.claude-plugin/plugin.json

fail() { echo "release: $*" >&2; exit 1; }

# The push guard lives in .githooks; make sure this clone uses it.
git config core.hooksPath .githooks

[ "$(git branch --show-current)" = main ] || fail "not on main"
git fetch -q origin
[ "$(git rev-list --count HEAD..origin/main)" = 0 ] || fail "origin/main has commits this clone lacks: git pull first"
[ -z "$(git status --porcelain)" ] || fail "uncommitted changes: commit them first (the release commit carries only the version)"

# The Claude Code the desktop app runs (it may be newer than the one on PATH).
claude=$(ls -d "$HOME/Library/Application Support/Claude/claude-code/"*/*/claude.app/Contents/MacOS/claude 2>/dev/null | sort -V | tail -1)
[ -x "${claude:-}" ] || claude=$(command -v claude) || fail "no claude found"

gitleaks dir . >/dev/null 2>&1 || fail "gitleaks dir found something: stop and tell the owner"
"$claude" plugin validate "$manifest" >/dev/null || fail "plugin validate failed"
"$claude" plugin test . >/dev/null || fail "plugin test failed"

old=$(sed -n 's/.*"version": *"\([0-9.]*\)".*/\1/p' "$manifest")
new=$(echo "$old" | awk -F. -v part="$part" '{
  if (part == "minor") print $1 "." $2 + 1 ".0"
  else if (part == "major") print $1 + 1 ".0.0"
  else print $1 "." $2 "." $3 + 1 }')
sed -i '' "s/\"version\": *\"$old\"/\"version\": \"$new\"/" "$manifest"

git commit -q -m "Release $new" -- "$manifest"
gitleaks git . >/dev/null 2>&1 || { git reset -q --soft HEAD~1; git checkout -q -- "$manifest"; fail "gitleaks git found something: stop and tell the owner"; }
git push -q origin main

# This Mac's install follows GitHub; bring it to the version just pushed.
claude plugin marketplace update claude-looks >/dev/null
claude plugin update looks@claude-looks >/dev/null
echo "release: $old -> $new pushed; local install refreshed (open a new session to see it)"
