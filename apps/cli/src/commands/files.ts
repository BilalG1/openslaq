import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatFileTable } from "../output";
import { getAuthenticatedClient } from "../client";

const listFlags = {
  workspace: { type: "string", default: "default" },
  channel: { type: "string" },
  category: { type: "string" },
  limit: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const filesCommand = defineCommand({
  help() {
    printHelp("openslaq files <subcommand>", "Browse workspace files.");
    console.log("Subcommands:");
    console.log("  list        List files shared in workspace channels");
    console.log("\nRun `openslaq files <subcommand> --help` for more information.\n");
  },
  subcommands: {
    list: defineCommand({
      help() {
        printHelp("openslaq files list [flags]", "List files shared in workspace channels.", [
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--channel ID", desc: "Filter by channel ID" },
          { name: "--category TYPE", desc: "Filter by category (images/videos/documents/audio/other)" },
          { name: "--limit N", desc: "Max number of files to return" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const query: Record<string, string> = {};
        if (f.channel) query.channelId = f.channel;
        if (f.category) query.category = f.category;
        if (f.limit) query.limit = f.limit;

        const res = await client.api.workspaces[":slug"].files.$get({
          param: { slug: f.workspace },
          query,
        });

        if (!res.ok) {
          console.error(`Failed to list files: ${res.status}`);
          process.exit(1);
        }

        const data = (await res.json()) as {
          files: { filename: string; size: number; category: string; channelName: string; uploaderName: string; createdAt: string }[];
          nextCursor: string | null;
        };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(formatFileTable(data.files));
        }
      },
    }),
  },
});
