import { processHookEvent } from "../voxlert.js";
import { appendHookDebugLine, stringifyForLog } from "./hook-utils.js";

export const hookCommand = {
  name: "hook",
  aliases: [],
  help: [
    "  voxlert hook                Process a hook event from stdin (used by Claude Code hooks)",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: true,
  async run() {
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    try {
      appendHookDebugLine(`voxlert hook stdin received length=${input.length} raw=${stringifyForLog(input, 200)}`);
      const eventData = JSON.parse(input);
      if (!eventData.source) eventData.source = "claude";
      appendHookDebugLine(`voxlert hook parsed eventData ${stringifyForLog(eventData)}`);
      await processHookEvent(eventData);
    } catch (err) {
      appendHookDebugLine(`voxlert hook parse/process error ${err && err.message}`);
    }
  },
};
