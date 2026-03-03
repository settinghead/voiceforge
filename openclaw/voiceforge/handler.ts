/**
 * VoiceForge handler for OpenClaw.
 *
 * Translates OpenClaw hook events into VoiceForge-compatible JSON
 * and spawns the existing voiceforge.js pipeline via stdin.
 */

import { spawn } from "child_process";
import { join } from "path";
import { homedir } from "os";

// OpenClaw event -> VoiceForge hook_event_name
const EVENT_MAP: Record<string, string> = {
  "command:stop": "Stop",
  "command:new": "SessionStart",
  "command:reset": "SessionStart",
  "message:received": "UserPromptSubmit",
};

interface OpenClawEvent {
  type: string;
  action: string;
  context?: {
    sessionEntry?: string;
    content?: string;
    cwd?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function translateEvent(event: OpenClawEvent): Record<string, unknown> | null {
  const key = `${event.type}:${event.action}`;
  const hookEventName = EVENT_MAP[key];
  if (!hookEventName) return null;

  const translated: Record<string, unknown> = {
    hook_event_name: hookEventName,
  };

  // Pass through cwd if available
  if (event.context?.cwd) {
    translated.cwd = event.context.cwd;
  }

  // For stop events, extract session content as last_assistant_message
  if (key === "command:stop" && event.context?.sessionEntry) {
    translated.last_assistant_message = event.context.sessionEntry;
  }

  // For message events, pass content if available
  if (key === "message:received" && event.context?.content) {
    translated.last_assistant_message = event.context.content;
  }

  return translated;
}

async function main() {
  // Read event data from stdin
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let event: OpenClawEvent;
  try {
    event = JSON.parse(input);
  } catch {
    return;
  }

  const translated = translateEvent(event);
  if (!translated) return;

  // Resolve voiceforge.js path
  const voiceforgeHome =
    process.env.VOICEFORGE_HOME || join(homedir(), ".claude", "hooks", "voiceforge");
  const voiceforgeJs = join(voiceforgeHome, "src", "voiceforge.js");

  // Spawn voiceforge.js with translated event on stdin (fire-and-forget)
  const child = spawn("node", [voiceforgeJs], {
    stdio: ["pipe", "ignore", "ignore"],
    detached: true,
  });

  child.stdin.write(JSON.stringify(translated));
  child.stdin.end();
  child.unref();
}

main();
