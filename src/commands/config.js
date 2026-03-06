import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { loadConfig, saveConfig } from "../config.js";
import { CONFIG_PATH } from "../paths.js";

function maskKey(key) {
  if (!key || typeof key !== "string") return "(not set)";
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "…" + key.slice(-4);
}

function coerceValue(value) {
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !isNaN(Number(value))) return Number(value);
  return value;
}

function setValue(target, key, value) {
  const dotIdx = key.indexOf(".");
  if (dotIdx !== -1) {
    const parent = key.slice(0, dotIdx);
    const child = key.slice(dotIdx + 1);
    if (!target[parent] || typeof target[parent] !== "object") {
      target[parent] = {};
    }
    target[parent][child] = value;
    return;
  }
  target[key] = value;
}

function showConfig() {
  const config = loadConfig(process.cwd());
  const display = { ...config };
  if (display.llm_api_key) display.llm_api_key = maskKey(display.llm_api_key);
  if (display.openrouter_api_key) display.openrouter_api_key = maskKey(display.openrouter_api_key);
  console.log(JSON.stringify(display, null, 2));
}

function configSet(key, value) {
  if (!key) {
    console.error("Usage: voxlert config set <key> <value>");
    process.exit(1);
  }
  const config = loadConfig(process.cwd());
  setValue(config, key, coerceValue(value));
  saveConfig(config);
  console.log(`Set ${key} = ${JSON.stringify(coerceValue(value))}`);
}

function configSetLocal(key, value) {
  if (!key) {
    console.error("Usage: voxlert config local set <key> <value>");
    process.exit(1);
  }
  const filePath = join(process.cwd(), ".voxlert.json");
  let local = {};
  try {
    if (existsSync(filePath)) local = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    // malformed — overwrite
  }
  setValue(local, key, coerceValue(value));
  writeFileSync(filePath, JSON.stringify(local, null, 2) + "\n");
  console.log(`Set ${key} = ${JSON.stringify(coerceValue(value))} in ${filePath}`);
}

function configSetSource(name, key, value) {
  if (!name || !key) {
    console.error("Usage: voxlert config source <name> set <key> <value>");
    process.exit(1);
  }
  const config = loadConfig(process.cwd());
  if (!config.sources) config.sources = {};
  if (!config.sources[name] || typeof config.sources[name] !== "object") config.sources[name] = {};
  setValue(config.sources[name], key, coerceValue(value));
  saveConfig(config);
  console.log(`Set sources.${name}.${key} = ${JSON.stringify(coerceValue(value))}`);
}

export const configCommand = {
  name: "config",
  aliases: [],
  help: [
    "  voxlert config                    Show current configuration",
    "  voxlert config show               Show current configuration",
    "  voxlert config set <k> <v>        Set a global config value (supports categories.X dot notation)",
    "  voxlert config path               Print global config file path",
    "  voxlert config local              Show local (project) config for current directory",
    "  voxlert config local set <k> <v>  Set a value in .voxlert.json in the current directory",
    "  voxlert config local path         Print path to local config file",
    "  voxlert config source <name>              Show overrides for a source (cursor, claude, codex)",
    "  voxlert config source <name> set <k> <v> Set a per-source override (supports categories.X dot notation)",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: false,
  async run(context) {
    const [, sub, ...rest] = context.args;
    if (sub === "set") {
      configSet(rest[0], rest.slice(1).join(" "));
      return;
    }
    if (sub === "local") {
      if (rest[0] === "set") {
        configSetLocal(rest[1], rest.slice(2).join(" "));
      } else if (rest[0] === "path") {
        console.log(join(process.cwd(), ".voxlert.json"));
      } else {
        const localPath = join(process.cwd(), ".voxlert.json");
        if (existsSync(localPath)) {
          console.log(readFileSync(localPath, "utf-8"));
        } else {
          console.log("No local config found in", process.cwd());
        }
      }
      return;
    }
    if (sub === "source") {
      const srcName = rest[0];
      if (rest[1] === "set") {
        configSetSource(srcName, rest[2], rest.slice(3).join(" "));
      } else {
        const cfg = loadConfig(process.cwd());
        const srcCfg = (cfg.sources || {})[srcName];
        if (srcCfg) {
          console.log(JSON.stringify(srcCfg, null, 2));
        } else {
          console.log(`No source overrides configured for "${srcName}"`);
        }
      }
      return;
    }
    if (sub === "path") {
      console.log(CONFIG_PATH);
      return;
    }
    showConfig();
  },
};
