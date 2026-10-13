#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

usage() {
  echo "Usage: $0 <feature-slug>" >&2
  echo "Example: pnpm feature:start -- account-settings" >&2
}

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

readonly slug="$1"
readonly branch="feature/$slug"
readonly template="$RALPH_ROOT/docs/ralph/PRD.template.md"

if [[ ! "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  ralph_die "feature slug must use lowercase kebab-case."
fi

[[ -f "$template" ]] || ralph_die "missing PRD template at docs/ralph/PRD.template.md."
[[ ! -e "$RALPH_PRD" ]] || ralph_die "PRD.md already exists; finish or archive the active feature first."
[[ ! -e "$RALPH_PROGRESS" ]] || ralph_die "progress.txt already exists; finish or archive the active feature first."
ralph_require_clean_worktree

git show-ref --verify --quiet "refs/heads/$branch" &&
  ralph_die "branch '$branch' already exists."

git switch -c "$branch"

awk -v slug="$slug" '{ gsub(/\{\{FEATURE_SLUG\}\}/, slug); print }' "$template" > "$RALPH_PRD"
printf '# Progress: %s\n\nNo implementation work has started.\n' "$slug" > "$RALPH_PROGRESS"

cat <<EOF
Created $branch with:
  PRD.md
  progress.txt

Next:
  1. Draft the PRD with Pi and review it.
  2. Change its status to APPROVED only after explicit human approval.
  3. Commit PRD.md and progress.txt.
  4. Run: pnpm ralph:once
EOF
