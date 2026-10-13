#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

usage() {
  cat >&2 <<EOF
Usage: $0 <iterations>

AFK mode requires one of:
  RALPH_SANDBOX_NAME=<name>  Run Pi in an existing Docker Sandbox (recommended)
  RALPH_UNSANDBOXED=1        Run Pi on the host (explicit unsafe opt-in)
EOF
}

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ $# -ne 1 ]] || [[ ! "$1" =~ ^[1-9][0-9]*$ ]] || (( $1 > 50 )); then
  usage
  ralph_die "iterations must be an integer from 1 to 50."
fi

readonly iterations="$1"
readonly prompt="$(ralph_prompt)"

ralph_require_ready_feature

run_iteration() {
  if [[ -n "${RALPH_SANDBOX_NAME:-}" ]]; then
    ralph_require_command sbx
    sbx exec "$RALPH_SANDBOX_NAME" -- \
      pi --print --approve --no-session @PRD.md @progress.txt "$prompt"
    return
  fi

  if [[ "${RALPH_UNSANDBOXED:-}" == "1" ]]; then
    ralph_require_command pi
    echo "WARNING: running unattended Pi with host permissions." >&2
    pi --print --approve --no-session @PRD.md @progress.txt "$prompt"
    return
  fi

  usage
  ralph_die "set RALPH_SANDBOX_NAME, or explicitly opt into host execution."
}

for ((iteration = 1; iteration <= iterations; iteration++)); do
  printf '\n=== Ralph iteration %d/%d ===\n' "$iteration" "$iterations"
  ralph_require_clean_worktree

  if ! result="$(run_iteration)"; then
    echo "Ralph: iteration $iteration failed." >&2
    exit 1
  fi

  printf '%s\n' "$result"

  if [[ -n "$(git status --porcelain)" ]]; then
    ralph_die "iteration $iteration left uncommitted changes; stopping for human review."
  fi

  if [[ "$result" == *"<promise>BLOCKED</promise>"* ]]; then
    echo "Ralph stopped because the feature is blocked."
    exit 2
  fi

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "Ralph completed the PRD after $iteration iteration(s)."
    exit 0
  fi
done

echo "Ralph reached the $iterations-iteration cap before completion."
