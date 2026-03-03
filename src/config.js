import { readFileSync, writeFileSync } from "fs";
import { CONFIG_PATH } from "./paths.js";

// Hook event name -> internal category
export const EVENT_MAP = {
  Stop: "task.complete",
  UserPromptSubmit: "task.acknowledge",
  PermissionRequest: "input.required",
  PreCompact: "resource.limit",
  Notification: "notification",
};

// Events where we call the LLM for a contextual phrase
export const CONTEXTUAL_EVENTS = new Set(["Stop"]);

// Fallback phrases when LLM is unavailable or for non-contextual events
export const FALLBACK_PHRASES = {
  "task.complete": [
    "Mission complete",
    "Objective secured",
    "All tasks fulfilled",
    "Operation completed",
    "Orders carried out",
    "Target achieved",
  ],
  "task.acknowledge": [
    "Orders received",
    "Request acknowledged",
    "Operations initiated",
    "Command confirmed",
    "Directive understood",
  ],
  "input.required": [
    "Authorization required",
    "Input needed",
    "Clearance requested",
    "Decision awaited",
    "Confirmation required",
  ],
  "resource.limit": [
    "Memory capacity critical",
    "Resources nearly exhausted",
    "Buffer limit approached",
    "Context capacity strained",
    "Power reserves depleted",
  ],
  notification: [
    "Alert received",
    "Status change detected",
    "Notification logged",
  ],
};

export function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return { enabled: true };
  }
}

export function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}
