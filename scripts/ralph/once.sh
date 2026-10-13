#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

if [[ $# -ne 0 ]]; then
  echo "Usage: $0" >&2
  exit 1
fi

ralph_require_command pi
ralph_require_ready_feature

exec pi \
  --approve \
  --no-session \
  @PRD.md \
  @progress.txt \
  "$(ralph_prompt)"
