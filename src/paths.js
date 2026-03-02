import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SCRIPT_DIR = dirname(__dirname);
export const CONFIG_PATH = join(SCRIPT_DIR, "config.json");
export const CACHE_DIR = join(SCRIPT_DIR, "cache");
export const COLLECT_DIR = join(SCRIPT_DIR, "llm_collect");
export const PID_FILE = join(SCRIPT_DIR, ".sound.pid");
