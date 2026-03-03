import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SCRIPT_DIR = dirname(__dirname);
export const CONFIG_PATH = join(SCRIPT_DIR, "config.json");
export const PACKS_DIR = join(SCRIPT_DIR, "packs");
export const CACHE_DIR = join(SCRIPT_DIR, "cache");
export const COLLECT_DIR = join(SCRIPT_DIR, "llm_collect");

// User-level config and state in ~/.voiceforge
export const STATE_DIR = join(homedir(), ".voiceforge");
export const GLOBAL_USER_CONFIG_PATH = join(STATE_DIR, "config.json");
export const QUEUE_DIR = join(STATE_DIR, "queue");
export const LOCK_FILE = join(STATE_DIR, "playback.lock");
export const LOG_FILE = join(STATE_DIR, "fallback.log");
export const USAGE_FILE = join(STATE_DIR, "usage.jsonl");
