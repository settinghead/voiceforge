# Codex Integration

Voxlert can speak when an [OpenAI Codex](https://developers.openai.com/codex/) agent turn completes. Codex's **notify** feature runs an external program with a JSON payload; Voxlert's `codex-notify` command turns that into a character voice notification (and optional popup).

## Prerequisites

- **Voxlert** installed and configured: run `voxlert setup` (or use an existing config at `~/.voxlert/config.json`).
- **Codex** CLI or IDE extension with access to config (e.g. `~/.codex/config.toml`).
- **`voxlert` on PATH** for the process that runs Codex (e.g. terminal or IDE). If you installed with `npm install -g @settinghead/voxlert`, ensure the global bin directory is on that PATH.

## How It Works

1. Codex emits a notify event (currently **agent-turn-complete**) and invokes your configured command with a **single JSON argument**.
2. Voxlert's `voxlert codex-notify` command parses that JSON and maps `agent-turn-complete` to the **Stop** (task complete) event.
3. Voxlert uses `last-assistant-message` from the payload as context for the LLM to generate an in-character phrase, then TTS and playback (same pipeline as Cursor/Claude Code). If that field is missing, it falls back to `input-messages`.

Supported notify type:

| Codex `type`             | Voxlert event | Category       |
|--------------------------|------------------|----------------|
| `agent-turn-complete`    | Stop             | task.complete  |

Other Codex notify types are ignored (no-op, exit 0).

## Configuration

### 1. Codex config

Point Codex's `notify` at Voxlert. Codex passes the notification JSON as one argument to the command.

If you select **Codex** during `voxlert setup`, Voxlert will install or update this entry for you automatically.

**User config:** `~/.codex/config.toml` (or `$CODEX_HOME/config.toml`):

```toml
notify = ["voxlert", "codex-notify"]
```

If `voxlert` is not on PATH when Codex runs, use the full path, for example:

```toml
# macOS / Linux (example path)
notify = ["/usr/local/bin/voxlert", "codex-notify"]

# Or with nvm/fnm (use the same node that has voxlert)
# notify = ["/Users/you/.nvm/versions/node/v20.x.x/bin/voxlert", "codex-notify"]
```

**Project config (optional):** You can override `notify` in a project's `.codex/config.toml` so only that project uses Voxlert; see [Advanced Configuration](https://developers.openai.com/codex/config-advanced/) and "Project config files".

### 2. Voxlert config

Same as other integrations: `~/.voxlert/config.json` (or `voxlert config path`). Ensure:

- `enabled` is not `false`
- `categories.task.complete` is not `false` (default is on)
- LLM and TTS are configured if you want spoken phrases (otherwise you get fallback phrases only)

Use `voxlert config` and `voxlert config set categories.task.complete true` as needed.

## Notify payload (reference)

Codex sends a single JSON object. Fields Voxlert uses:

| Field                   | Use |
|-------------------------|-----|
| `type`                  | Must be `agent-turn-complete` to trigger speech |
| `last-assistant-message`| Preferred context for the LLM phrase (task complete summary) |
| `input-messages`        | Fallback context if `last-assistant-message` is empty |
| `cwd`                   | Working directory (for project config / prefix) |

Other common fields such as `thread-id` and `turn-id` are present in the payload but not otherwise used by Voxlert. See [Advanced Configuration – Notifications](https://developers.openai.com/codex/config-advanced/) for the full schema.

OpenAI's Codex advanced config docs currently describe `notify` as receiving a single JSON argument and list `type`, `thread-id`, `turn-id`, `cwd`, `input-messages`, and `last-assistant-message` as common fields. They also note that `agent-turn-complete` is the only supported notify event at the moment.

## Disable

- **Temporarily:** `voxlert config set enabled false` (disables all Voxlert events).
- **Codex only:** Remove or change the `notify` line in `~/.codex/config.toml` so it no longer calls `voxlert codex-notify` (e.g. set to `[]` or another script).

## Troubleshooting

- **No voice when a turn completes**
  - Check that `voxlert` is on the PATH used by Codex: run `which voxlert` (or the full path you put in `notify`) in the same environment (e.g. terminal or IDE).
  - Ensure Voxlert is enabled and task.complete is on: `voxlert config` and `voxlert config set categories.task.complete true` if needed.
  - Confirm `notify` in Codex config is exactly `["voxlert", "codex-notify"]` (or equivalent full path).

- **Debug**
  - Hook debug log: `tail -f ~/.voxlert/hook-debug.log` (entries with `source=codex` when Codex triggers).
  - Activity log: `tail -f ~/.voxlert/voxlert.log` to see processed events.

- **Test manually**
  - Run: `voxlert codex-notify '{"type":"agent-turn-complete","last-assistant-message":"Test summary.","cwd":"/tmp"}'`
  - You should hear a phrase (and see a notification if enabled). If that works, the issue is likely Codex's PATH or config.
  - Fallback path: `voxlert codex-notify '{"type":"agent-turn-complete","input-messages":["Summarize the repo status."],"cwd":"/tmp"}'`

## Uninstall

Remove or change the `notify` entry in `~/.codex/config.toml` so Codex no longer calls Voxlert. To remove Voxlert entirely (all platforms), run `voxlert uninstall` and optionally uninstall the npm package.
