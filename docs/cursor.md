# Cursor Integration

Voxlert speaks character voice notifications when using [Cursor](https://cursor.com) Agent (Cmd+K or Agent Chat). This page is a reference for Cursor-specific setup and troubleshooting.

## How It Works

Cursor runs hook scripts when certain agent events occur. Voxlert registers a single command, `voxlert cursor-hook`, which:

1. Receives Cursor’s JSON payload on stdin
2. Maps Cursor hook names (camelCase) to Voxlert events (PascalCase)
3. Optionally reads the conversation transcript on **stop** to generate an in-character summary
4. Runs the same pipeline as Claude Code (LLM phrase or fallback → TTS → playback)
5. Returns `{}` on stdout so Cursor receives valid JSON

## Config Location

- **User-level (all workspaces):** `~/.cursor/hooks.json`
- **Project-level (single repo):** `<project-root>/.cursor/hooks.json`

Voxlert’s setup wizard installs user-level hooks. To restrict Voxlert to one project, copy the hook entries into that project’s `.cursor/hooks.json` instead.

## Events We Subscribe To

| Cursor Hook           | Voxlert Event     | Category        |
|-----------------------|----------------------|-----------------|
| `sessionStart`        | SessionStart         | session.start   |
| `sessionEnd`          | SessionEnd           | session.end     |
| `stop`                | Stop                 | task.complete   |
| `postToolUseFailure`  | PostToolUseFailure   | task.error      |
| `preCompact`          | PreCompact           | resource.limit  |

Turn categories on or off in Voxlert config (`voxlert config set categories.<name> true|false` or `voxlert setup`).

## Install

**During setup:**

```bash
voxlert setup
```

When prompted **"Install Cursor hooks?"**, choose **Yes**.

**Manual install:** Ensure `~/.cursor/hooks.json` exists and includes:

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [{ "command": "voxlert cursor-hook", "timeout": 10 }],
    "sessionEnd": [{ "command": "voxlert cursor-hook", "timeout": 10 }],
    "stop": [{ "command": "voxlert cursor-hook", "timeout": 10 }],
    "postToolUseFailure": [{ "command": "voxlert cursor-hook", "timeout": 10 }],
    "preCompact": [{ "command": "voxlert cursor-hook", "timeout": 10 }]
  }
}
```

Restart Cursor after installing or editing hooks.

## Uninstall

Remove Voxlert from Cursor (and Claude Code) and optionally delete config/cache:

```bash
voxlert uninstall
```

To remove only Cursor hooks, edit `~/.cursor/hooks.json` and delete the entries that call `voxlert cursor-hook`.

## Configuration

Voxlert uses the same config for Cursor as for Claude Code (and for OpenClaw — see [OpenClaw integration](openclaw.md)):

- Config path: `voxlert config path` (typically `~/.voxlert/config.json` or install-dir `config.json`)
- Toggle categories, voice pack, volume, and LLM/TTS via `voxlert config` or `voxlert setup`

## Troubleshooting

- **No voice when agent stops / starts**
  - Confirm hooks are installed: open `~/.cursor/hooks.json` and check for `voxlert cursor-hook` entries.
  - Restart Cursor after changing `hooks.json`.
  - In Cursor: **Settings → Hooks** (or the Hooks output channel) to see whether hooks ran and any errors.

- **`voxlert cursor-hook` not found**
  - Install Voxlert globally so the command is on PATH: `npm install -g @settinghead/voxlert`, then run `voxlert setup`.
  - Or use the full path to the script in `hooks.json`, e.g. `"/path/to/voxlert/repo/node_modules/.bin/voxlert" cursor-hook` (adjust for your install).

- **Test the adapter manually**
  - Echo a minimal Cursor payload and pipe to the CLI:
    ```bash
    echo '{"hook_event_name":"stop","workspace_roots":["/tmp"]}' | voxlert cursor-hook
    ```
  - You should see `{}` on stdout and hear a fallback phrase (or an LLM phrase if transcript/context is available).

For full Cursor hook schema and options, see [Cursor Hooks documentation](https://cursor.com/docs/agent/hooks).
