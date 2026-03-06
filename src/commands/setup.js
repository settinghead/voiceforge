export const setupCommand = {
  name: "setup",
  aliases: [],
  help: [
    "  voxlert setup               Interactive setup wizard (LLM, voice, TTS, hooks)",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: false,
  async run() {
    const { runSetup } = await import("../setup.js");
    await runSetup();
  },
};
