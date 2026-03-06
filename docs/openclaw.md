# OpenClaw Integration

Voxlert can notify you when [OpenClaw](https://openclaw.dev) agent runs complete — especially useful for long-running tasks. A spoken phrase is generated from the run context and played through your configured Voxlert voice and TTS backend.

This integration uses an **OpenClaw plugin** (not a gateway hook). The plugin subscribes to the `agent_end` lifecycle event and spawns `voxlert hook` with a `Stop` event so you hear a character voice when each run finishes.

## Prerequisites

- **Voxlert** installed and configured: run `voxlert setup` (or use an existing config at `~/.voxlert/config.json`).
- **OpenClaw** gateway running.
- **`voxlert` on PATH** for the process that runs the gateway (so the plugin can spawn `voxlert hook`). If you installed Voxlert with `npm install -g @settinghead/voxlert`, ensure the global bin directory is on the PATH used by the gateway.

## Installation

### From the Voxlert repo

If you have the Voxlert repository (e.g. a git clone):

```bash
openclaw plugins install /path/to/voxlert/openclaw-plugin
```

To link instead of copy (for development):

```bash
openclaw plugins install -l /path/to/voxlert/openclaw-plugin
```

Restart the OpenClaw gateway after installing. The plugin is enabled by default.

### From npm (if published)

If a package like `@settinghead/voxlert-openclaw` is published:

```bash
openclaw plugins install @settinghead/voxlert-openclaw
```

## Configuration

- **Voxlert config** is shared: `~/.voxlert/config.json` (or `voxlert config path`). Use `voxlert setup` or `voxlert config set` to change voice pack, LLM, TTS, volume, and categories. No separate config for the plugin.

- **Plugin config** (optional) lives under OpenClaw’s config, e.g. `plugins.entries.voxlert.config` in `~/.openclaw/openclaw.json`:

  | Field                | Type    | Default | Description                                                                 |
  |----------------------|---------|---------|-----------------------------------------------------------------------------|
  | `enabled`            | boolean | `true`  | Master switch: set to `false` to stop the plugin from calling Voxlert.  |
  | `minDurationSeconds` | number  | `0`     | Only notify for runs that lasted at least this many seconds (0 = always).  |

Example: notify only for runs longer than 30 seconds:

```json
"plugins": {
  "entries": {
    "voxlert": {
      "enabled": true,
      "config": {
        "minDurationSeconds": 30
      }
    }
  }
}
```

Restart the gateway after changing plugin config.

## How it works

1. An OpenClaw agent run completes (success, error, or timeout).
2. The plugin’s `agent_end` handler runs.
3. If `enabled` is not `false` and (if set) the run duration is at least `minDurationSeconds`, the plugin builds a payload with the last assistant message and workspace path (when available).
4. It spawns `voxlert hook` with stdin: `{ "hook_event_name": "Stop", "source": "openclaw", "last_assistant_message": "...", "cwd": "..." }`.
5. Voxlert runs its usual pipeline: LLM phrase (or fallback) → TTS → playback. Activity is logged to `~/.voxlert/voxlert.log` with `source=openclaw`.

## Uninstall

- Disable the plugin: `openclaw plugins disable voxlert` (or set `plugins.entries.voxlert.enabled` to `false` in config), then restart the gateway.
- Remove the plugin: delete or uninstall the plugin from `~/.openclaw/extensions/voxlert` (or run `openclaw plugins uninstall` if supported). Restart the gateway.

Voxlert config and CLI are unchanged; only the OpenClaw integration is removed.

## Troubleshooting

- **No voice when a run completes**
  - Ensure `voxlert` is on the PATH of the user/process that runs the OpenClaw gateway. Test with `which voxlert` in the same environment.
  - Check that Voxlert is enabled and the `task.complete` category is not disabled: `voxlert config` and `voxlert config set categories.task.complete true` if needed.
  - Confirm the plugin is enabled: `openclaw plugins list` should show the voxlert plugin as enabled.

- **Debug logging**
  - Hook debug lines (including plugin spawns) are written to `~/.voxlert/hook-debug.log`. Use `tail -f ~/.voxlert/hook-debug.log` while triggering an agent run to see whether the plugin runs and what payload it sends.
  - Activity log: `tail -f ~/.voxlert/voxlert.log` to see lines with `source=openclaw` when Voxlert processes an event.

- **Plugin not loading**
  - Restart the OpenClaw gateway after installing or updating the plugin.
  - Ensure `openclaw.plugin.json` and `index.ts` (or the entry file) are present in the plugin directory.
