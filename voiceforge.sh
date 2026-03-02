#!/usr/bin/env bash
# VoiceForge - Game character voice notifications for Claude Code
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/voiceforge.py"
