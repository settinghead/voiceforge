import { loadConfig, saveConfig } from "../config.js";
import { askLine } from "./pack-helpers.js";

async function setVolume(value) {
  let num;
  if (value == null || value === "") {
    const config = loadConfig(process.cwd());
    const current = Math.round((config.volume ?? 0.5) * 100);
    const answer = await askLine(`Current volume: ${current}. Enter new volume (0-100): `);
    num = Number(answer);
  } else {
    num = Number(value);
  }

  if (isNaN(num) || num < 0 || num > 100) {
    console.error("Volume must be a number between 0 and 100.");
    process.exit(1);
  }

  const config = loadConfig(process.cwd());
  config.volume = num / 100;
  saveConfig(config);
  console.log(`Volume set to ${num}%`);
}

export const volumeCommand = {
  name: "volume",
  aliases: ["vol"],
  help: [
    "  voxlert volume              Show current volume and prompt for new value",
    "  voxlert volume <0-100>      Set playback volume (0 = mute, 100 = max)",
  ],
  skipSetupWizard: false,
  skipUpgradeCheck: false,
  async run(context) {
    await setVolume(context.args[1]);
  },
};
