import { defineCommand, type FlagSchema } from "../framework";
import { printHelp } from "../output";
import {
  initiateDeviceFlow,
  pollForToken,
  refreshAccessToken,
} from "../auth/device-flow";
import { saveTokens } from "../auth/token-store";
import { WEB_URL } from "../config";

const flags = {
  "api-key": { type: "string" },
  "bot-token": { type: "string" },
} as const satisfies FlagSchema;

export const loginCommand = defineCommand({
  help() {
    printHelp(
      "openslaq login",
      "Log in to OpenSlaq via browser-based device flow, or with an API key.",
      [
        { name: "--api-key <token>", desc: "Authenticate with an API key (osk_...) instead of browser flow" },
        { name: "--bot-token <token>", desc: "Authenticate as a bot (osb_...)" },
      ],
    );
    console.log("\nEnvironment variables:");
    console.log("  OPENSLAQ_API_KEY    API key or bot token for non-interactive auth (e.g. CI/CD)");
  },
  flags,
  async action(f) {
    // Bot token flow
    if (f["bot-token"]) {
      const botToken = f["bot-token"];
      if (!botToken.startsWith("osb_")) {
        console.error("Bot tokens must start with osb_");
        process.exit(1);
      }
      await saveTokens({ refreshToken: "", accessToken: "", apiKey: botToken });
      console.log("Bot token saved. Run `openslaq whoami` to verify.");
      return;
    }

    // API key flow
    if (f["api-key"]) {
      const apiKey = f["api-key"];
      await saveTokens({ refreshToken: "", accessToken: "", apiKey });
      console.log("API key saved. Run `openslaq whoami` to verify.");
      return;
    }

    // Browser-based device flow
    console.log("Initiating login...");
    const { pollingCode, loginCode } = await initiateDeviceFlow();

    const loginUrl = `${WEB_URL}/handler/cli-auth-confirm?login_code=${loginCode}`;
    console.log(`\nOpen this URL in your browser to log in:\n\n  ${loginUrl}\n`);

    // Try to open the URL automatically
    try {
      const cmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      Bun.spawn([cmd, loginUrl], { stdout: "ignore", stderr: "ignore" });
    } catch {
      // Manual open is fine
    }

    console.log("Waiting for login...");
    const refreshToken = await pollForToken(pollingCode);

    const accessToken = await refreshAccessToken(refreshToken);
    await saveTokens({ refreshToken, accessToken });

    console.log("Logged in successfully!");
  },
});
