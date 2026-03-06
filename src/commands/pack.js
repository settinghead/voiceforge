import { packList, packShow, packUse } from "./pack-helpers.js";

export const packCommand = {
  name: "pack",
  aliases: [],
  help: [
    "  voxlert pack list           List available voice packs",
    "  voxlert pack show           Show active pack details",
    "  voxlert pack use <pack-id>  Switch active voice pack",
  ],
  skipSetupWizard: false,
  skipUpgradeCheck: false,
  async run(context) {
    const [, sub, arg] = context.args;
    if (sub === "list" || sub === "ls") {
      packList();
    } else if (sub === "show") {
      packShow();
    } else if (sub === "use") {
      await packUse(arg);
    } else {
      packList();
    }
  },
};
