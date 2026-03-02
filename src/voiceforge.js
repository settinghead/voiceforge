#!/usr/bin/env node
/**
 * VoiceForge - Game character voice notifications for Claude Code.
 *
 * Generates contextual 1-6 word phrases via OpenRouter LLM,
 * speaks them through a local Chatterbox TTS server.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join, basename } from "path";
import { createHash } from "crypto";
import { spawn } from "child_process";
import { request as httpsRequest } from "https";
import { request as httpRequest } from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCRIPT_DIR = dirname(__dirname);
const CONFIG_PATH = join(SCRIPT_DIR, "config.json");
const CACHE_DIR = join(SCRIPT_DIR, "cache");
const COLLECT_DIR = join(SCRIPT_DIR, "llm_collect");
const PID_FILE = join(SCRIPT_DIR, ".sound.pid");

// Hook event name -> internal category
const EVENT_MAP = {
  Stop: "task.complete",
  UserPromptSubmit: "task.acknowledge",
  PermissionRequest: "input.required",
  PreCompact: "resource.limit",
  Notification: "notification",
};

// Events where we call the LLM for a contextual phrase
const CONTEXTUAL_EVENTS = new Set(["Stop"]);

// Fallback phrases when LLM is unavailable or for non-contextual events
const FALLBACK_PHRASES = {
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

const SYSTEM_PROMPT =
  "You are a terse AI assistant. " +
  "Respond with ONLY 2-8 words as a brief status report. " +
  "The phrase MUST end with a past participle or adjective (e.g. complete, deployed, fixed, detected, adjusted, built, failed, nominal, operational, required). " +
  "Before the final word, state WHAT was done AND WHY it exists — the purpose or goal the item serves. " +
  "Use patterns like 'purpose-noun item-noun adjective' or 'item for purpose adjective'. " +
  "Analyze the context to infer the deeper reason each task or component exists. " +
  "Be authoritative and robotic. No punctuation. No quotes. No explanation. " +
  "Do NOT include the project name — it will be prepended automatically. " +
  "Examples: " +
  "\nAuthorization bypass for session security patched. " +
  "\nDatabase pooling for improved performance refactored. " +
  "\nReliability test suite confirmed. " +
  "\nMemory leak in cache layer fixed. " +
  "\nRate limiter for abuse prevention deployed.";

function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return { enabled: true };
  }
}

function extractContext(eventData) {
  const event = eventData.hook_event_name || "";

  if (event === "Stop") {
    const msg = eventData.last_assistant_message || "";
    if (msg) {
      return `Coding task completed. Assistant's summary: ${msg.slice(0, 300)}`;
    }
    return null;
  }

  return null;
}

function saveLlmPair(messages, responseText, model, config) {
  if (!config.collect_llm_data) return;
  try {
    mkdirSync(COLLECT_DIR, { recursive: true });
    const record = {
      timestamp: Date.now() / 1000,
      model,
      messages,
      response: responseText,
    };
    const filename = `${Date.now()}.json`;
    writeFileSync(
      join(COLLECT_DIR, filename),
      JSON.stringify(record, null, 2),
    );
  } catch {
    // ignore
  }
}

function generatePhraseLlm(context, config) {
  return new Promise((resolve) => {
    const apiKey = config.openrouter_api_key || "";
    if (!apiKey) return resolve(null);

    const model = config.openrouter_model || "qwen/qwen3.5-flash-02-23";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: context },
    ];

    const payload = JSON.stringify({
      model,
      messages,
      max_tokens: 30,
      temperature: 0.9,
    });

    const req = httpsRequest(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 5000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const result = JSON.parse(data);
            let phrase = result.choices[0].message.content.trim();
            saveLlmPair(messages, phrase, model, config);
            // Clean up: remove quotes, punctuation, limit to 8 words
            phrase = phrase.replace(/^["'.,!;:]+|["'.,!;:]+$/g, "").trim();
            const words = phrase.split(/\s+/).slice(0, 8);
            resolve(words.length ? words.join(" ") : null);
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

function killPreviousSound() {
  try {
    const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
    process.kill(pid, "SIGTERM");
  } catch {
    // ignore
  }
}

function savePid(pid) {
  try {
    writeFileSync(PID_FILE, String(pid));
  } catch {
    // ignore
  }
}

function echoFilter() {
  // Short multi-tap echo: two taps at 40ms and 75ms with moderate decay
  return "aecho=0.8:0.88:40|75:0.4|0.25";
}

function playCached(cachePath, volume) {
  killPreviousSound();
  const volPct = String(Math.round(parseFloat(volume) * 100));
  try {
    const proc = spawn(
      "ffplay",
      ["-nodisp", "-autoexit", "-volume", volPct, "-af", echoFilter(), cachePath],
      { stdio: ["ignore", "ignore", "ignore"] },
    );
    proc.on("error", () => {
      // ffplay not available — fall back to afplay (no echo)
      const fallback = spawn("afplay", ["-v", String(volume), cachePath], {
        stdio: ["ignore", "ignore", "ignore"],
      });
      fallback.on("error", () => {});
      savePid(fallback.pid);
    });
    savePid(proc.pid);
  } catch {
    // ignore
  }
}

function streamAndPlay(res, cachePath, volume) {
  return new Promise((resolve) => {
    killPreviousSound();
    const volPct = String(Math.round(parseFloat(volume) * 100));

    let player;
    try {
      player = spawn(
        "ffplay",
        ["-nodisp", "-autoexit", "-volume", volPct, "-af", echoFilter(), "-i", "pipe:0"],
        { stdio: ["pipe", "ignore", "ignore"] },
      );
    } catch {
      resolve(false);
      return;
    }

    player.on("error", () => resolve(false));
    savePid(player.pid);

    // Collect chunks for cache file while piping to player
    const chunks = [];
    res.on("data", (chunk) => {
      chunks.push(chunk);
      try {
        player.stdin.write(chunk);
      } catch {
        // broken pipe
      }
    });

    res.on("end", () => {
      try {
        player.stdin.end();
      } catch {
        // ignore
      }
      // Write cache file
      try {
        writeFileSync(cachePath, Buffer.concat(chunks));
      } catch {
        // ignore
      }
      resolve(true);
    });

    res.on("error", () => {
      try {
        player.stdin.end();
      } catch {
        // ignore
      }
      resolve(false);
    });
  });
}

function speakPhrase(phrase, config) {
  return new Promise((resolve) => {
    mkdirSync(CACHE_DIR, { recursive: true });

    const cacheKey = createHash("md5").update(phrase.toLowerCase()).digest("hex");
    const cachePath = join(CACHE_DIR, `${cacheKey}.wav`);
    const volume = config.volume ?? 0.5;

    // Cached: play immediately
    if (existsSync(cachePath)) {
      playCached(cachePath, volume);
      return resolve();
    }

    // Fetch from TTS server
    const chatterboxUrl = config.chatterbox_url || "http://localhost:8004";
    const endpoint = `${chatterboxUrl}/v1/audio/speech`;

    const payload = JSON.stringify({
      input: phrase,
      voice: config.voice || "default.wav",
      model: "chatterbox-turbo",
      response_format: "wav",
    });

    const url = new URL(endpoint);
    const requestFn = url.protocol === "https:" ? httpsRequest : httpRequest;

    const req = requestFn(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 8000,
      },
      async (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return resolve();
        }

        // Try streaming playback via ffplay
        const streamed = await streamAndPlay(res, cachePath, volume);
        if (!streamed) {
          // ffplay not available — fall back to full download + afplay
          // streamAndPlay already wrote the cache if data arrived
          if (existsSync(cachePath)) {
            playCached(cachePath, volume);
          }
        }
        resolve();
      },
    );

    req.on("error", () => resolve());
    req.on("timeout", () => {
      req.destroy();
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

async function main() {
  // Read event data from stdin
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let eventData;
  try {
    eventData = JSON.parse(input);
  } catch {
    return;
  }

  const config = loadConfig();
  if (config.enabled === false) return;

  const eventName = eventData.hook_event_name || "";
  const category = EVENT_MAP[eventName];
  if (!category) return;

  // Check if category is enabled
  const categories = config.categories || {};
  if (categories[category] === false) return;

  // Extract project name from cwd
  const cwd = eventData.cwd || "";
  const projectName = cwd ? basename(cwd) : "";

  // For contextual events, try LLM phrase generation
  let phrase = null;
  if (CONTEXTUAL_EVENTS.has(eventName)) {
    const context = extractContext(eventData);
    if (context) {
      phrase = await generatePhraseLlm(context, config);
    }
  }

  // Fall back to predefined phrases
  if (!phrase) {
    const phrases = FALLBACK_PHRASES[category] || ["Standing by"];
    phrase = phrases[Math.floor(Math.random() * phrases.length)];
  }

  // Prepend project name as prefix
  if (projectName) {
    phrase = `${projectName}, ${phrase}`;
  }

  await speakPhrase(phrase, config);
}

main();
