#!/bin/bash
# Takes a simulator screenshot and resizes to max 1500px so Claude Code can read it.
# Usage: scripts/mobile/screenshot.sh <output.png> [--udid <UDID>]
# If no --udid, defaults to "booted".

set -euo pipefail

out="${1:?Usage: screenshot.sh <output.png> [--udid <UDID>]}"
shift

udid="booted"
if [ "${1:-}" = "--udid" ] && [ -n "${2:-}" ]; then
  udid="$2"
fi

xcrun simctl io "$udid" screenshot "$out"
sips --resampleHeightWidthMax 1500 "$out" >/dev/null 2>&1
