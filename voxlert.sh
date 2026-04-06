#!/usr/bin/env bash
# Voxlert - Game character voice notifications for Claude Code
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')] voxlert.sh invoked pid=$$ SCRIPT_DIR=$SCRIPT_DIR" >> "$HOME/.voxlert/hook-debug.log" 2>/dev/null
exec node "$SCRIPT_DIR/src/voxlert.js"
