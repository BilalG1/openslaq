import { defineCommand } from "../framework";
import { printHelp } from "../output";
import { clearTokens } from "../auth/token-store";

export const logoutCommand = defineCommand({
  help() {
    printHelp("openslaq logout", "Log out and clear stored credentials.");
  },
  async action() {
    await clearTokens();
    console.log("Logged out.");
  },
});
