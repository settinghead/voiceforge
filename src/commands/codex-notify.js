import { processHookEvent } from "../voxlert.js";
import {
  appendHookDebugLine,
  CODEX_NOTIFY_TYPE_TO_EVENT,
  getHookRuntimeInfo,
  normalizeCodexInputMessages,
  stringifyForLog,
} from "./hook-utils.js";

export const codexNotifyCommand = {
  name: "codex-notify",
  aliases: [],
  help: [
    "  voxlert codex-notify        Process a notify payload from argv (used by OpenAI Codex notify)",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: true,
  async run() {
    const argvTail = process.argv.slice(3);
    const rawArg = argvTail[0] === "--" ? argvTail[1] : argvTail[0];
    const raw = typeof rawArg === "string" ? rawArg : "";
    appendHookDebugLine(`voxlert codex-notify runtime ${stringifyForLog(getHookRuntimeInfo())}`);
    appendHookDebugLine(`voxlert codex-notify argv_tail=${stringifyForLog(argvTail)} raw=${stringifyForLog(raw)}`);
    if (!raw || typeof raw !== "string") {
      appendHookDebugLine("voxlert codex-notify exiting: missing raw payload");
      process.exit(0);
    }
    let payload;
    try {
      payload = JSON.parse(raw);
      appendHookDebugLine(`voxlert codex-notify parsed payload ${stringifyForLog(payload)}`);
      appendHookDebugLine(`voxlert codex-notify payload summary ${stringifyForLog({
        type: payload.type || "",
        cwd: payload.cwd || "",
        hasLastAssistantMessage: Boolean(payload["last-assistant-message"] || payload.last_assistant_message),
        inputMessageCount: Array.isArray(payload["input-messages"] || payload.input_messages || payload.inputMessages)
          ? (payload["input-messages"] || payload.input_messages || payload.inputMessages).length
          : 0,
        threadId: payload["thread-id"] || payload.thread_id || "",
        turnId: payload["turn-id"] || payload.turn_id || "",
      })}`);
    } catch (err) {
      appendHookDebugLine(`voxlert codex-notify parse error ${err && err.message}`);
      process.exit(0);
    }
    const codexType = payload.type || "";
    const ourEvent = CODEX_NOTIFY_TYPE_TO_EVENT[codexType];
    if (!ourEvent) {
      appendHookDebugLine(`voxlert codex-notify exiting: unsupported type=${codexType || "(empty)"}`);
      process.exit(0);
    }
    const translated = {
      hook_event_name: ourEvent,
      cwd: payload.cwd || "",
      source: "codex",
      last_assistant_message: payload["last-assistant-message"] || payload.last_assistant_message || "",
      input_messages: normalizeCodexInputMessages(payload),
      codex_thread_id: payload["thread-id"] || payload.thread_id || "",
      codex_turn_id: payload["turn-id"] || payload.turn_id || "",
    };
    appendHookDebugLine(`voxlert codex-notify translated event ${stringifyForLog(translated)}`);
    try {
      await processHookEvent(translated);
      appendHookDebugLine(`voxlert codex-notify processHookEvent completed type=${codexType} event=${ourEvent}`);
    } catch (err) {
      appendHookDebugLine(`voxlert codex-notify processHookEvent error ${err && err.message}`);
    }
    process.exit(0);
  },
};
