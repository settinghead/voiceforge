import select from "@inquirer/select";
import { loadConfig, saveConfig } from "../config.js";

async function notificationPick() {
  const config = loadConfig(process.cwd());
  const platform = process.platform;
  const currentOverlay = config.overlay !== false;
  const currentStyle = config.overlay_style || "custom";

  const choices =
    platform === "darwin"
      ? [
          { value: "custom", name: "Custom overlay (popup)", description: "In-app style popup with gradient and icon" },
          { value: "system", name: "System notification", description: "macOS Notification Center" },
          { value: "off", name: "Off", description: "No popup, voice only" },
        ]
      : [
          { value: "system", name: "System notification", description: platform === "win32" ? "Windows toast" : "notify-send / system tray" },
          { value: "off", name: "Off", description: "No popup, voice only" },
        ];

  const currentValue =
    !currentOverlay ? "off" : platform === "darwin" ? currentStyle : currentOverlay ? "system" : "off";

  const chosen = await select({
    message: "Notification style",
    choices,
    default: currentValue,
  });

  config.overlay = chosen !== "off";
  if (chosen !== "off") config.overlay_style = chosen;
  saveConfig(config);

  const labels = { custom: "Custom overlay", system: "System notification", off: "Off" };
  console.log(`Notifications: ${labels[chosen]}`);
}

export const notificationCommand = {
  name: "notification",
  aliases: ["notify"],
  help: [
    "  voxlert notification        Choose notification style (popup / system / off)",
  ],
  skipSetupWizard: true,
  skipUpgradeCheck: false,
  async run() {
    await notificationPick();
  },
};
