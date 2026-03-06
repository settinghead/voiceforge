import { voicePick } from "./pack-helpers.js";

export const voiceCommand = {
  name: "voice",
  aliases: ["voices"],
  help: [
    "  voxlert voice               Interactive voice pack picker",
  ],
  skipSetupWizard: false,
  skipUpgradeCheck: false,
  async run() {
    await voicePick();
  },
};
