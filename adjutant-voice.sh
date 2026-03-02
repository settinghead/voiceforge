#!/usr/bin/env bash
# Adjutant Voice - StarCraft voice notifications for Claude Code
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/adjutant-voice.py"
