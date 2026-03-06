import { testPipeline } from "./pack-helpers.js";

export const testCommand = {
  name: "test",
  aliases: [],
  help: [
    "  voxlert test \"<text>\"       Run full pipeline: LLM -> TTS -> audio playback",
  ],
  skipSetupWizard: false,
  skipUpgradeCheck: false,
  async run(context) {
    await testPipeline(context.args.slice(1).join(" "));
  },
};
