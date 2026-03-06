import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { CONFIG_PATH, HOOK_DEBUG_LOG, IS_NPM_GLOBAL, SCRIPT_DIR, STATE_DIR } from "../paths.js";
import { getCodexConfigPath } from "../codex-config.js";

export const CURSOR_TO_VOXLERT_EVENT = {
  sessionStart: "SessionStart",
  sessionEnd: "SessionEnd",
  stop: "Stop",
  postToolUseFailure: "PostToolUseFailure",
  preCompact: "PreCompact",
};

export const CODEX_NOTIFY_TYPE_TO_EVENT = {
  "agent-turn-complete": "Stop",
};

export function appendHookDebugLine(message) {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    appendFileSync(HOOK_DEBUG_LOG, `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // best-effort
  }
}

export function stringifyForLog(value, limit = 1000) {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (typeof text !== "string") return String(value);
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  } catch {
    return String(value);
  }
}

export function listEnvKeys(prefixes) {
  return Object.keys(process.env)
    .filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
    .sort();
}

export function normalizeCodexInputMessages(payload) {
  const value = payload["input-messages"] || payload.input_messages || payload.inputMessages;
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim());
}

export function getLastAssistantFromTranscript(transcriptPath) {
  try {
    if (!transcriptPath || !existsSync(transcriptPath)) return null;
    const raw = readFileSync(transcriptPath, "utf-8");
    if (!raw || !raw.trim()) return null;
    const slice = raw.length > 500 ? raw.slice(-500) : raw;
    return slice.trim();
  } catch {
    return null;
  }
}

export function getHookRuntimeInfo() {
  return {
    pid: process.pid,
    ppid: process.ppid,
    execPath: process.execPath,
    node: process.version,
    cwd: process.cwd(),
    scriptDir: SCRIPT_DIR,
    isNpmGlobal: IS_NPM_GLOBAL,
    configPath: CONFIG_PATH,
    codexConfigPath: getCodexConfigPath(),
    envKeys: listEnvKeys(["CODEX", "VOXLERT", "OPENAI"]),
  };
}
