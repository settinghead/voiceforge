---
name: voxlert-config
description: >
  View and edit Voxlert configuration (voice notifications, alerts, announcements).
  Trigger when the user asks to change, set, or customize the voice, sound, announcement,
  alert, or notification style — globally or for a specific project/folder.
  Examples: "change voice to adjutant", "use starcraft voice for this project",
  "set alert sound to kerrigan", "make notifications use EVA voice",
  "change the voice in this folder", "switch to SHODAN for alerts".
user_invocable: true
---

# Voxlert Configuration

Start by running `voxlert help` to get the current command list. Use `voxlert pack list` to discover pack IDs — never guess or hardcode them.

## Scope

- **Project scope** (user says "for this project / in this folder / here", or is working inside a repo): use `voxlert config local set <key> <value>` — writes/merges into `.voxlert.json` in cwd.
- **Global scope** (user says "everywhere / my default", or no project context): use `voxlert config set <key> <value>` and other global commands.

Only these fields are honoured in project-local config: `enabled`, `active_pack`, `volume`, `categories`, `prefix`, `tts_backend`, `qwen_tts_url`, `overlay`, `overlay_dismiss`, `overlay_style`, `collect_llm_data`, `max_cache_entries`, `logging`, `error_log`. API keys and server URLs are global-only.

## Intent mapping

The user may ask to configure any aspect of voice announcements. Map their intent to the right field:

- **Change voice/character/sound/announcement style** → `voxlert pack list` to find matching ID, then `pack use <id>` (global) or `config local set active_pack <id>` (project)
- **Volume / louder / quieter / mute** → `voxlert volume <0-100>` (global) or `config local set volume <0-1>` (project)
- **Disable/enable voxlert entirely** → `config [local] set enabled false/true`
- **Disable/enable a specific event** (task done, errors, session start, permission prompts, etc.) → `config [local] set categories.<name> false/true` — use `voxlert config show` to see the category names
- **LLM / phrase generation** (model, backend, API key) → `config set` on the relevant field — global only
- **TTS server / backend** → `config [local] set tts_backend <value>` or `chatterbox_url` / `qwen_tts_url`
- **Overlay / popup style** → `config [local] set overlay <value>`
- **Spoken prefix** → `config [local] set prefix "<text>"`
- **Anything else** → run `voxlert config show` to see all fields, then `config [local] set <key> <value>`

## Steps

1. Run `voxlert help` to confirm available commands.
2. Run `voxlert config show` to see current state.
3. If changing voice, run `voxlert pack list` and match the user's description to a pack ID.
4. Apply with the appropriate command based on scope above.
5. Tell the user what was changed and where. Changes take effect on the next hook event.
