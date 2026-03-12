import type { User } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp } from "../output";
import { getAuthenticatedClient } from "../client";

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
    const client = await getAuthenticatedClient();
    const res = await client.api.users.me.$get();
    if (!res.ok) {
      console.error(`Failed to fetch user info: ${res.status}`);
      process.exit(1);
    }
    const user = (await res.json()) as User;

    if (f.json) {
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log(`${user.displayName} (${user.email})`);
    }
  },
});
