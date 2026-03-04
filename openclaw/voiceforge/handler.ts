/**
 * VoiceForge hook handler for OpenClaw.
 *
 * Translates OpenClaw hook events into VoiceForge-compatible JSON
 * and spawns `voiceforge hook` with the translated event on stdin.
 *
 * Must export a default async function — OpenClaw loads hooks via
 * `await import()` and calls the default export with the event object.
 */

import { spawn } from "child_process";

// OpenClaw event type:action -> VoiceForge hook_event_name
const EVENT_MAP: Record<string, string> = {
  "command:stop": "Stop",
  "command:new": "SessionStart",
  "command:reset": "SessionStart",
  "message:received": "UserPromptSubmit",
};

const handler = async (event: {
  type: string;
  action: string;
  sessionKey?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}) => {
  const key = `${event.type}:${event.action}`;
  const hookEventName = EVENT_MAP[key];
  if (!hookEventName) return;

  const translated: Record<string, unknown> = {
    hook_event_name: hookEventName,
  };

  if (event.context?.cwd) {
    translated.cwd = event.context.cwd;
  }

  // For stop events, pass session content for LLM context
  if (key === "command:stop" && event.context?.sessionEntry) {
    translated.last_assistant_message = event.context.sessionEntry;
  }

  // For message events, pass user content
  if (key === "message:received" && event.context?.content) {
    translated.last_assistant_message = event.context.content;
  }

  // Spawn `voiceforge hook` with translated event on stdin (fire-and-forget)
  const child = spawn("voiceforge", ["hook"], {
    stdio: ["pipe", "ignore", "ignore"],
    detached: true,
  });

  child.stdin.write(JSON.stringify(translated));
  child.stdin.end();
  child.unref();
};

export default handler;
