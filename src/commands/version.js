export const versionCommand = {
  name: "version",
  aliases: ["--version", "-v"],
  help: [
    "  voxlert --version           Show version",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: false,
  async run(context) {
    console.log(context.pkg.version);
  },
};
