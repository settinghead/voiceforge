#!/usr/bin/env node

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadConfig, saveConfig, FALLBACK_PHRASES } from "./config.js";
import { generatePhraseLlm } from "./llm.js";
import { speakPhrase } from "./audio.js";
import { formatCost, resetUsage } from "./cost.js";
import { CONFIG_PATH } from "./paths.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const HELP = `
voiceforge v${pkg.version} — Game character voice notifications for Claude Code

Usage:
  voiceforge config              Show current configuration
  voiceforge config show         Show current configuration
  voiceforge config set <k> <v>  Set a config value (supports categories.X dot notation)
  voiceforge config path         Print config file path
  voiceforge test "<text>"       Run full pipeline: LLM -> TTS -> audio playback
  voiceforge cost                Show accumulated token usage and estimated cost
  voiceforge cost reset          Clear the usage log
  voiceforge help                Show this help message
  voiceforge --version           Show version
`.trim();

function maskKey(key) {
  if (!key || typeof key !== "string") return "(not set)";
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "…" + key.slice(-4);
}

function showConfig() {
  const config = loadConfig();
  const display = { ...config };
  if (display.openrouter_api_key) {
    display.openrouter_api_key = maskKey(display.openrouter_api_key);
  }
  console.log(JSON.stringify(display, null, 2));
}

function configSet(key, value) {
  if (!key) {
    console.error("Usage: voiceforge config set <key> <value>");
    process.exit(1);
  }

  // Auto-coerce booleans and numbers
  let coerced = value;
  if (value === "true") coerced = true;
  else if (value === "false") coerced = false;
  else if (value !== "" && !isNaN(Number(value))) coerced = Number(value);

  const config = loadConfig();

  // Support dot notation for categories (e.g. categories.notification)
  const parts = key.split(".");
  if (parts.length === 2) {
    if (!config[parts[0]] || typeof config[parts[0]] !== "object") {
      config[parts[0]] = {};
    }
    config[parts[0]][parts[1]] = coerced;
  } else {
    config[key] = coerced;
  }

  saveConfig(config);
  console.log(`Set ${key} = ${JSON.stringify(coerced)}`);
}

async function testPipeline(text) {
  if (!text) {
    console.error("Usage: voiceforge test \"<text>\"");
    process.exit(1);
  }

  const config = loadConfig();

  console.log(`Input: ${text}`);
  console.log("Generating phrase via LLM...");

  const context = `Coding task completed. Assistant's summary: ${text}`;
  const result = await generatePhraseLlm(context, config);

  let phrase;
  if (result.phrase) {
    phrase = result.phrase;
    console.log(`LLM phrase: ${phrase}`);
    if (result.usage) {
      console.log(`Tokens: ${result.usage.total_tokens || 0} (${result.usage.prompt_tokens || 0} prompt + ${result.usage.completion_tokens || 0} completion)`);
    }
  } else {
    console.log(`LLM failed (${result.fallbackReason}), using raw text as phrase.`);
    phrase = text;
  }

  console.log("Sending to TTS...");
  await speakPhrase(phrase, config);
  console.log("Done.");
}

async function showCost() {
  console.log(await formatCost());
}

function costReset() {
  resetUsage();
  console.log("Usage log cleared.");
}

// --- Main ---
(async () => {
  const args = process.argv.slice(2);
  const cmd = args[0] || "help";
  const sub = args[1] || "";

  switch (cmd) {
    case "config":
      if (sub === "set") {
        configSet(args[2], args.slice(3).join(" "));
      } else if (sub === "path") {
        console.log(CONFIG_PATH);
      } else {
        showConfig();
      }
      break;

    case "test":
      await testPipeline(args.slice(1).join(" "));
      break;

    case "cost":
      if (sub === "reset") {
        costReset();
      } else {
        await showCost();
      }
      break;

    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      break;

    case "--version":
    case "-v":
      console.log(pkg.version);
      break;

    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exit(1);
  }
})();
