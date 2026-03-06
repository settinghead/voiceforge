import { existsSync, rmSync } from "fs";
import confirm from "@inquirer/confirm";
import { unregisterHooks, removeSkill } from "../hooks.js";
import { unregisterCursorHooks } from "../cursor-hooks.js";
import { unregisterCodexNotify } from "../codex-config.js";
import { STATE_DIR } from "../paths.js";

async function runUninstall() {
  console.log("Removing Voxlert hooks and skill...\n");

  const claudeRemoved = unregisterHooks();
  if (claudeRemoved > 0) {
    console.log(`  Removed ${claudeRemoved} hook(s) from ~/.claude/settings.json`);
  }

  const cursorRemoved = unregisterCursorHooks();
  if (cursorRemoved > 0) {
    console.log(`  Removed ${cursorRemoved} hook(s) from ~/.cursor/hooks.json`);
  }

  const codexRemoved = unregisterCodexNotify();
  if (codexRemoved) {
    console.log("  Removed notify from ~/.codex/config.toml");
  }

  const skillRemoved = removeSkill();
  if (skillRemoved) {
    console.log("  Removed voxlert-config skill");
  }

  if (claudeRemoved === 0 && cursorRemoved === 0 && !codexRemoved && !skillRemoved) {
    console.log("  No Voxlert hooks or skill were found.");
  }

  if (existsSync(STATE_DIR)) {
    const removeData = await confirm({
      message: `Remove config and cache (${STATE_DIR})?`,
      default: false,
    });
    if (removeData) {
      rmSync(STATE_DIR, { recursive: true });
      console.log(`  Removed ${STATE_DIR}`);
    }
  }

  console.log("\nUninstall complete. You can still run 'voxlert' if installed via npm; run 'npm uninstall -g @settinghead/voxlert' to remove the CLI.");
}

export const uninstallCommand = {
  name: "uninstall",
  aliases: [],
  help: [
    "  voxlert uninstall           Remove hooks from Claude Code, Cursor, and Codex, optionally config/cache",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: false,
  async run() {
    await runUninstall();
  },
};
