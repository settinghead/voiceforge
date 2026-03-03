#!/usr/bin/env bash
set -euo pipefail

# VoiceForge OpenClaw Hook Uninstaller
# Removes the VoiceForge hook from OpenClaw

INSTALL_DIR="$HOME/.openclaw/hooks/voiceforge"

echo "=== VoiceForge OpenClaw Uninstaller ==="
echo ""

if [[ -d "$INSTALL_DIR" ]]; then
    rm -rf "$INSTALL_DIR"
    echo "  Removed $INSTALL_DIR"
else
    echo "  No OpenClaw hook found at $INSTALL_DIR — nothing to remove"
fi

echo ""
echo "=== Uninstall Complete ==="
echo "VoiceForge has been removed from OpenClaw."
echo ""
echo "Note: Your VoiceForge configuration and Claude Code hook are unchanged."
