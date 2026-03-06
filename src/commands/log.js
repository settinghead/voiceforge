import { existsSync, readFileSync, watchFile } from "fs";
import { loadConfig, saveConfig } from "../config.js";
import { LOG_FILE, MAIN_LOG_FILE } from "../paths.js";

const TAIL_LINES = 100;

function tailLog() {
  if (!existsSync(MAIN_LOG_FILE)) {
    console.log("(No activity log yet. Logging is on by default; events will appear here.)");
    console.log("Path: " + MAIN_LOG_FILE);
  }
  let lastSize = 0;
  function readNew() {
    try {
      const content = readFileSync(MAIN_LOG_FILE, "utf-8");
      if (content.length < lastSize) lastSize = 0;
      if (content.length > lastSize) {
        const newPart = content.slice(lastSize);
        process.stdout.write(newPart);
        lastSize = content.length;
      }
    } catch {
      // file may have been removed
    }
  }
  function init() {
    try {
      const content = readFileSync(MAIN_LOG_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.length > 0);
      const toShow = lines.slice(-TAIL_LINES);
      toShow.forEach((line) => console.log(line));
      lastSize = content.length;
    } catch {
      lastSize = 0;
    }
  }
  init();
  watchFile(MAIN_LOG_FILE, { interval: 500 }, () => {
    readNew();
  });
  process.stdin.resume();
}

function setLoggingOnOff(value) {
  const config = loadConfig(process.cwd());
  config.logging = value === "on" || value === true;
  saveConfig(config);
  console.log("Activity logging: " + (config.logging ? "on" : "off"));
}

function setErrorLogOnOff(value) {
  const config = loadConfig(process.cwd());
  config.error_log = value === "on" || value === true;
  saveConfig(config);
  console.log("Error (fallback) logging: " + (config.error_log ? "on" : "off"));
}

export const logCommand = {
  name: "log",
  aliases: [],
  help: [
    "  voxlert log                  Stream activity log (tail -f style)",
    "  voxlert log path             Print activity log file path",
    "  voxlert log error-path       Print error/fallback log file path",
    "  voxlert log on | off         Enable or disable activity logging",
    "  voxlert log error on | off   Enable or disable error (fallback) logging",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: false,
  async run(context) {
    const [, sub, arg] = context.args;
    if (sub === "path") {
      console.log(MAIN_LOG_FILE);
    } else if (sub === "error-path") {
      console.log(LOG_FILE);
    } else if (sub === "on" || sub === "off") {
      setLoggingOnOff(sub);
    } else if (sub === "error" && (arg === "on" || arg === "off")) {
      setErrorLogOnOff(arg);
    } else if (!sub || sub === "tail") {
      tailLog();
    } else {
      console.log("Activity log: " + MAIN_LOG_FILE);
      console.log("Error log: " + LOG_FILE);
      console.log("Use: voxlert log          (stream activity log)");
      console.log("      voxlert log path    (activity log path)");
      console.log("      voxlert log error-path");
      console.log("      voxlert log on | off");
      console.log("      voxlert log error on | off");
    }
  },
};
