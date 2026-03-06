import { processHookEvent } from "../voxlert.js";
import { CURSOR_TO_VOXLERT_EVENT, getLastAssistantFromTranscript } from "./hook-utils.js";

export const cursorHookCommand = {
  name: "cursor-hook",
  aliases: [],
  help: [
    "  voxlert cursor-hook         Process a hook event from stdin (used by Cursor hooks)",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: true,
  async run() {
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    let payload;
    try {
      payload = JSON.parse(input);
    } catch {
      process.stdout.write("{}\n");
      return;
    }
    const cursorEvent = payload.hook_event_name || "";
    const ourEvent = CURSOR_TO_VOXLERT_EVENT[cursorEvent];
    if (!ourEvent) {
      process.stdout.write("{}\n");
      return;
    }
    const workspaceRoots = payload.workspace_roots;
    const cwd = Array.isArray(workspaceRoots) && workspaceRoots[0] ? workspaceRoots[0] : "";
    const translated = {
      ...payload,
      hook_event_name: ourEvent,
      cwd,
      source: "cursor",
    };
    if (ourEvent === "Stop" && payload.transcript_path) {
      const last = getLastAssistantFromTranscript(payload.transcript_path);
      if (last) translated.last_assistant_message = last;
    }
    if (ourEvent === "PostToolUseFailure" && payload.error_message) {
      translated.error_message = payload.error_message;
    }
    try {
      await processHookEvent(translated);
    } catch {
      // best-effort: still return {} so Cursor doesn't error
    }
    process.stdout.write("{}\n");
  },
};
