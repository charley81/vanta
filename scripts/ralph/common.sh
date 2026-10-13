#!/usr/bin/env bash

set -euo pipefail

readonly RALPH_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "$RALPH_ROOT" ]]; then
  echo "Ralph must run inside a Git repository." >&2
  exit 1
fi

readonly RALPH_PRD="$RALPH_ROOT/PRD.md"
readonly RALPH_PROGRESS="$RALPH_ROOT/progress.txt"
readonly RALPH_PROMPT="$RALPH_ROOT/scripts/ralph/prompt.md"

cd "$RALPH_ROOT"

ralph_die() {
  echo "Ralph: $*" >&2
  exit 1
}

ralph_require_command() {
  command -v "$1" >/dev/null 2>&1 || ralph_die "required command '$1' was not found."
}

ralph_require_clean_worktree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    ralph_die "the worktree is not clean. Commit or stash changes before an iteration."
  fi
}

ralph_require_feature_branch() {
  local branch
  branch="$(git symbolic-ref --quiet --short HEAD)" || ralph_die "detached HEAD is not supported."

  case "$branch" in
    main | master)
      ralph_die "refusing to run on protected branch '$branch'. Start a feature branch first."
      ;;
  esac
}

ralph_require_ready_feature() {
  [[ -f "$RALPH_PRD" ]] || ralph_die "PRD.md is missing. Run 'pnpm feature:start -- <feature-slug>'."
  [[ -f "$RALPH_PROGRESS" ]] || ralph_die "progress.txt is missing. Run 'pnpm feature:start -- <feature-slug>'."
  [[ -f "$RALPH_PROMPT" ]] || ralph_die "scripts/ralph/prompt.md is missing."

  grep -Eq '^Status:[[:space:]]+APPROVED[[:space:]]*$' "$RALPH_PRD" ||
    ralph_die "PRD.md must contain 'Status: APPROVED' after explicit human approval."

  ralph_require_feature_branch
  ralph_require_clean_worktree
}

ralph_prompt() {
  cat "$RALPH_PROMPT"
}
