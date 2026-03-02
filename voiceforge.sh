#!/usr/bin/env bash
# VoiceForge - Game character voice notifications for Claude Code
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$SCRIPT_DIR/src/voiceforge.js"
