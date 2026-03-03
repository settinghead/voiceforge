#!/usr/bin/env bash
set -euo pipefail

# VoiceForge OpenClaw Hook Installer
# Installs the VoiceForge hook adapter for OpenClaw

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
VOICEFORGE_HOME="${VOICEFORGE_HOME:-$HOME/.claude/hooks/voiceforge}"
OPENCLAW_HOOKS_DIR="$HOME/.openclaw/hooks"
INSTALL_DIR="$OPENCLAW_HOOKS_DIR/voiceforge"

echo "=== VoiceForge OpenClaw Installer ==="
echo ""

# --- Prerequisites ---
if [[ "$(uname)" != "Darwin" ]]; then
    echo "WARNING: VoiceForge uses 'afplay' for audio playback (macOS only)."
    echo ""
fi

if ! command -v node &>/dev/null; then
    echo "ERROR: node is required but not found."
    exit 1
fi

if ! command -v afplay &>/dev/null; then
    echo "WARNING: afplay not found. Audio playback may not work."
fi

# --- Check VoiceForge installation ---
if [[ ! -f "$VOICEFORGE_HOME/src/voiceforge.js" ]]; then
    echo "ERROR: VoiceForge not found at $VOICEFORGE_HOME"
    echo ""
    echo "Install VoiceForge first:"
    echo "  cd $(dirname "$0") && bash install.sh"
    echo ""
    echo "Or set VOICEFORGE_HOME if installed elsewhere:"
    echo "  VOICEFORGE_HOME=/path/to/voiceforge bash install-openclaw.sh"
    exit 1
fi

echo "  VoiceForge found at $VOICEFORGE_HOME"

# --- Copy hook files ---
mkdir -p "$INSTALL_DIR"
cp "$REPO_DIR/openclaw/voiceforge/HOOK.md" "$INSTALL_DIR/"
cp "$REPO_DIR/openclaw/voiceforge/handler.ts" "$INSTALL_DIR/"

echo "  Copied hook files to $INSTALL_DIR"

# --- Done ---
echo ""
echo "=== Installation Complete ==="
echo ""
echo "The VoiceForge hook is now installed for OpenClaw."
echo ""
echo "Next steps:"
echo "  1. Run 'openclaw hooks list' to verify the hook is discovered"
echo "  2. Run 'openclaw hooks check' to verify eligibility"
echo "  3. Start an OpenClaw session to hear VoiceForge!"
echo ""
echo "Configuration is shared with Claude Code at:"
echo "  $VOICEFORGE_HOME/config.json"
echo ""
echo "To uninstall: bash $(dirname "$0")/uninstall-openclaw.sh"
