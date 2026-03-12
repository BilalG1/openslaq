import { defineCommand, type FlagSchema } from "../framework";
import { printHelp } from "../output";
import {
  initiateDeviceFlow,
  pollForToken,
  refreshAccessToken,
} from "../auth/device-flow";
import { saveTokens } from "../auth/token-store";
import { STACK_AUTH_BASE, STACK_PROJECT_ID } from "../config";

const flags = {
  "api-key": { type: "string" },
} as const satisfies FlagSchema;

export const loginCommand = defineCommand({
  help() {
    printHelp(
      "openslaq login",
      "Log in to OpenSlaq via browser-based device flow, or with an API key.",
      [
        { name: "--api-key <token>", desc: "Authenticate with an API key (osk_...) instead of browser flow" },
      ],
    );
    console.log("\nEnvironment variables:");
    console.log("  OPENSLAQ_API_KEY    API key for non-interactive auth (e.g. CI/CD)");
  },
  flags,
  async action(f) {
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

    const loginUrl = `${STACK_AUTH_BASE}/handler/${STACK_PROJECT_ID}/cli?code=${loginCode}`;
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
