import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const SETTINGS_FILE = join(homedir(), ".claude", "settings.json");
const SKILL_SRC = join(import.meta.dirname, "..", "skills", "voxlert-config", "SKILL.md");
const SKILL_DEST_DIR = join(homedir(), ".claude", "skills", "voxlert-config");

const HOOK_EVENTS = {
  Stop: { matcher: "", timeout: 10, async: true },
  Notification: { matcher: "", timeout: 10, async: true },
  SessionEnd: { matcher: "", timeout: 10, async: true },
  UserPromptSubmit: { matcher: "", timeout: 10, async: true },
  PermissionRequest: { matcher: "", timeout: 10, async: true },
  PreCompact: { matcher: "", timeout: 10, async: true },
};

function loadSettings() {
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  mkdirSync(join(homedir(), ".claude"), { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + "\n");
}

export function hasVoxlertHooks() {
  const settings = loadSettings();
  if (!settings.hooks || typeof settings.hooks !== "object") return false;
  return Object.values(settings.hooks).some(
    (blocks) =>
      Array.isArray(blocks) &&
      blocks.some(
        (block) =>
          block.hooks &&
          block.hooks.some((hook) => (hook.command || "").includes("voxlert")),
      ),
  );
}

/**
 * Register Voxlert hooks in ~/.claude/settings.json.
 * Idempotent — removes any existing voxlert hooks first, then adds fresh ones.
 * @param {string} command — the hook command to execute (e.g. path to voxlert.sh or "voxlert hook")
 */
export function registerHooks(command) {
  const settings = loadSettings();
  if (!settings.hooks) settings.hooks = {};

  for (const [event, cfg] of Object.entries(HOOK_EVENTS)) {
    const hookEntry = {
      type: "command",
      command,
      timeout: cfg.timeout,
    };
    if (cfg.async) hookEntry.async = true;

    const matcherBlock = {
      matcher: cfg.matcher,
      hooks: [hookEntry],
    };

    if (!settings.hooks[event]) settings.hooks[event] = [];

    // Remove any existing voxlert hooks for this event
    settings.hooks[event] = settings.hooks[event].filter(
      (block) =>
        !block.hooks ||
        !block.hooks.some((h) => (h.command || "").includes("voxlert")),
    );

    settings.hooks[event].push(matcherBlock);
  }

  saveSettings(settings);
  return Object.keys(HOOK_EVENTS).length;
}

/**
 * Remove all Voxlert hooks from ~/.claude/settings.json.
 */
export function unregisterHooks() {
  const settings = loadSettings();
  if (!settings.hooks) return 0;

  let removed = 0;
  for (const event of Object.keys(settings.hooks)) {
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(
      (block) =>
        !block.hooks ||
        !block.hooks.some((h) => (h.command || "").includes("voxlert")),
    );
    removed += before - settings.hooks[event].length;
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }

  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  saveSettings(settings);
  return removed;
}

/**
 * Install the voxlert-config skill to ~/.claude/skills/.
 */
export function installSkill() {
  if (!existsSync(SKILL_SRC)) return false;
  mkdirSync(SKILL_DEST_DIR, { recursive: true });
  const content = readFileSync(SKILL_SRC, "utf-8");
  writeFileSync(join(SKILL_DEST_DIR, "SKILL.md"), content);
  return true;
}

export function hasInstalledSkill() {
  return existsSync(join(SKILL_DEST_DIR, "SKILL.md"));
}

/**
 * Remove the voxlert-config skill from ~/.claude/skills/.
 */
export function removeSkill() {
  if (!existsSync(SKILL_DEST_DIR)) return false;
  rmSync(SKILL_DEST_DIR, { recursive: true });
  return true;
}
