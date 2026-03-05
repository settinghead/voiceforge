---
name: voiceforge-config
description: View and edit VoiceForge configuration (voice notifications)
user_invocable: true
---

# VoiceForge Configuration

VoiceForge generates character voice notifications for Claude Code hook events.

## Config File Location

`voiceforge config path` — typically `~/.voiceforge/config.json` (npm global) or `<repo>/config.json` (run from clone).

## Configuration Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Master on/off switch |
| `openrouter_api_key` | string | `""` | OpenRouter API key for LLM phrase generation |
| `openrouter_model` | string | `"google/gemini-2.0-flash-001"` | LLM model for generating contextual phrases |
| `chatterbox_url` | string | `"http://localhost:8004"` | Chatterbox TTS server URL |
| `active_pack` | string | `"sc2-adjutant"` | Active voice pack ID (see `packs/` directory) |
| `voice` | string | `"default.wav"` | Legacy voice reference WAV file name (overridden by pack) |
| `volume` | number | `1.0` | Playback volume (0.0 to 1.0) |
| `categories` | object | see below | Per-category enable/disable |

### Categories

| Category | Hook Event | Default |
|---|---|---|
| `session.start` | SessionStart | enabled |
| `task.complete` | Stop | enabled |
| `task.acknowledge` | UserPromptSubmit | disabled |
| `task.error` | PostToolUseFailure | enabled |
| `input.required` | PermissionRequest | enabled |
| `resource.limit` | PreCompact | enabled |
| `notification` | Notification | enabled |

## Instructions

When the user asks to configure VoiceForge:

1. **Read** the current config (path may vary; use `voiceforge config path` or try `~/.voiceforge/config.json`):

2. **Edit** values using the Edit tool on that file.

3. Changes take effect on the next hook event (no restart needed).

## Voice Pack Switching

Switch voice packs using the CLI:
```bash
voiceforge pack list              # List available packs
voiceforge pack use <pack-id>     # Switch active pack
```

Or edit `active_pack` in config.json directly. Available packs: `sc1-adjutant`, `sc2-adjutant`, `red-alert-eva`.

## Cache Management

To clear the TTS audio cache (e.g., after changing voice):

```bash
rm -f ~/.voiceforge/cache/*.wav
```
(If config path is elsewhere, cache is in the same directory as config, under `cache/`.)
