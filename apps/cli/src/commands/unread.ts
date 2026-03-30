import type { Channel } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatUnreadCounts } from "../output";
import { getAuthenticatedClient, requireWorkspace } from "../client";

const listFlags = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const markAllReadFlags = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const unreadCommand = defineCommand({
  help() {
    printHelp("openslaq unread <subcommand>", "Manage unread messages.");
    console.log("Subcommands:");
    console.log("  list           Show unread message counts");
    console.log("  mark-all-read  Mark all channels as read");
    console.log("\nRun `openslaq unread <subcommand> --help` for more information.\n");
  },
  subcommands: {
    list: defineCommand({
      help() {
        printHelp("openslaq unread list [flags]", "Show unread message counts.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const [unreadRes, channelsRes] = await Promise.all([
          client.api.workspaces[":slug"]["unread-counts"].$get({
            param: { slug: requireWorkspace(f.workspace) },
          }),
          client.api.workspaces[":slug"].channels.$get({
            param: { slug: requireWorkspace(f.workspace) },
          }),
        ]);

        if (!unreadRes.ok) {
          console.error(`Failed to get unread counts: ${unreadRes.status}`);
          process.exit(1);
        }
        if (!channelsRes.ok) {
          console.error(`Failed to list channels: ${channelsRes.status}`);
          process.exit(1);
        }

        const counts = (await unreadRes.json()) as Record<string, number>;
        const channels = (await channelsRes.json()) as Channel[];

        if (f.json) {
          console.log(JSON.stringify(counts, null, 2));
        } else {
          const channelMap = new Map(channels.map((ch) => [ch.id, ch.name]));
          console.log(formatUnreadCounts(counts, channelMap));
        }
      },
    }),
    "mark-all-read": defineCommand({
      help() {
        printHelp("openslaq unread mark-all-read [flags]", "Mark all channels as read.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: markAllReadFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].unreads["mark-all-read"].$post({
          param: { slug: requireWorkspace(f.workspace) },
        });

        if (!res.ok) {
          console.error(`Failed to mark all as read: ${res.status}`);
          process.exit(1);
        }

        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("All channels marked as read.");
        }
      },
    }),
  },
});
