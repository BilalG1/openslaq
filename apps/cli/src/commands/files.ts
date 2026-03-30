import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatFileTable } from "../output";
import { getAuthenticatedClient, requireWorkspace } from "../client";

const downloadUrlFlags = {
  id: { type: "string", required: true },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const listFlags = {
  workspace: { type: "string" },
  channel: { type: "string" },
  category: { type: "string" },
  limit: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const filesCommand = defineCommand({
  help() {
    printHelp("openslaq files <subcommand>", "Browse workspace files.");
    console.log("Subcommands:");
    console.log("  list            List files shared in workspace channels");
    console.log("  download-url   Get download URL for a file");
    console.log("\nRun `openslaq files <subcommand> --help` for more information.\n");
  },
  subcommands: {
    list: defineCommand({
      help() {
        printHelp("openslaq files list [flags]", "List files shared in workspace channels.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
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
          param: { slug: requireWorkspace(f.workspace) },
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
    "download-url": defineCommand({
      help() {
        printHelp("openslaq files download-url [flags]", "Get download URL for a file.", [
          { name: "--id ID", desc: "Attachment ID (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: downloadUrlFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.uploads[":id"].download.$get({
          param: { id: f.id },
        });
        if (!res.ok) {
          console.error(`Failed to get download URL: ${res.status}`);
          process.exit(1);
        }
        // The endpoint returns a 302 redirect — the redirected URL is the download URL
        const url = res.url;

        if (f.json) {
          console.log(JSON.stringify({ url }, null, 2));
        } else {
          console.log(url);
        }
      },
    }),
  },
});
