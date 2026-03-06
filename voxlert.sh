#!/usr/bin/env bash
# Voxlert - Game character voice notifications for Claude Code
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$SCRIPT_DIR/src/voxlert.js"
