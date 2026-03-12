import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatPresenceTable } from "../output";
import { getAuthenticatedClient } from "../client";

const presenceFlags = {
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const presenceCommand = defineCommand({
  help() {
    printHelp("openslaq presence [flags]", "Show who's online in the workspace.", [
      { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
      { name: "--json", desc: "Output raw JSON" },
    ]);
  },
  flags: presenceFlags,
  async action(f) {
    const client = await getAuthenticatedClient();
    const res = await client.api.workspaces[":slug"].presence.$get({
      param: { slug: f.workspace },
    });

    if (!res.ok) {
      console.error(`Failed to get presence: ${res.status}`);
      process.exit(1);
    }

    const entries = (await res.json()) as {
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
      statusEmoji?: string | null;
      statusText?: string | null;
    }[];

    if (f.json) {
      console.log(JSON.stringify(entries, null, 2));
    } else {
      console.log(formatPresenceTable(entries));
    }
  },
});
