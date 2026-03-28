import type { User } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp } from "../output";
import { getAuthenticatedClient, getAuthToken } from "../client";

const flags = {
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const whoamiCommand = defineCommand({
  help() {
    printHelp("openslaq whoami", "Show the currently logged-in user.", [
      { name: "--json", desc: "Output raw JSON" },
    ]);
  },
  flags,
  async action(f) {
    const token = await getAuthToken();
    const isBot = token.startsWith("osb_");
    const isApiKey = token.startsWith("osk_");

    const client = await getAuthenticatedClient();
    const res = await client.api.users.me.$get();
    if (!res.ok) {
      console.error(`Failed to fetch user info: ${res.status}`);
      process.exit(1);
    }
    const user = (await res.json()) as User;

    if (f.json) {
      console.log(JSON.stringify({ ...user, authKind: isBot ? "bot" : isApiKey ? "api_key" : "jwt" }, null, 2));
    } else if (isBot) {
      console.log(`Bot: ${user.displayName}`);
    } else {
      console.log(`${user.displayName} (${user.email})`);
    }
  },
});
