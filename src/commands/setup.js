export const setupCommand = {
  name: "setup",
  aliases: [],
  help: [
    "  voxlert setup               Interactive setup wizard (LLM, voice, TTS, hooks)",
    "  voxlert setup --yes         Accept all defaults non-interactively",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: false,
  async run({ args }) {
    const nonInteractive = args.includes("--yes") || args.includes("-y");
    const { runSetup } = await import("../setup.js");
    await runSetup({ nonInteractive });
  },
};
