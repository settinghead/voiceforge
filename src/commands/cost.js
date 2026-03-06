import { formatCost, resetUsage } from "../cost.js";

export const costCommand = {
  name: "cost",
  aliases: [],
  help: [
    "  voxlert cost                Show accumulated token usage and estimated cost",
    "  voxlert cost reset          Clear the usage log",
  ],
  skipSetupWizard: false,
  skipUpgradeCheck: false,
  async run(context) {
    if (context.args[1] === "reset") {
      resetUsage();
      console.log("Usage log cleared.");
      return;
    }
    console.log(await formatCost());
  },
};
