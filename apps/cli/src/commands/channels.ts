import type { Channel } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatChannelTable, formatBrowseChannelTable } from "../output";
import { getAuthenticatedClient } from "../client";

const listFlags = {
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const createFlags = {
  name: { type: "string", required: true },
  type: { type: "string", default: "public" },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const joinFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const leaveFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const markReadFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const browseFlags = {
  workspace: { type: "string", default: "default" },
  "include-archived": { type: "boolean" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const updateFlags = {
  channel: { type: "string", required: true },
  description: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const archiveFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const starFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const starredFlags = {
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const channelsCommand = defineCommand({
  help() {
    printHelp("openslaq channels <subcommand>", "Manage channels.");
    console.log("Subcommands:");
    console.log(`  ${"list".padEnd(12)}List channels in a workspace`);
    console.log(`  ${"browse".padEnd(12)}Browse public channels`);
    console.log(`  ${"create".padEnd(12)}Create a new channel`);
    console.log(`  ${"update".padEnd(12)}Update a channel`);
    console.log(`  ${"join".padEnd(12)}Join a public channel`);
    console.log(`  ${"leave".padEnd(12)}Leave a channel`);
    console.log(`  ${"archive".padEnd(12)}Archive a channel`);
    console.log(`  ${"unarchive".padEnd(12)}Unarchive a channel`);
    console.log(`  ${"star".padEnd(12)}Star a channel`);
    console.log(`  ${"unstar".padEnd(12)}Unstar a channel`);
    console.log(`  ${"starred".padEnd(12)}List starred channels`);
    console.log(`  ${"mark-read".padEnd(12)}Mark a channel as read`);
    console.log();
  },
  subcommands: {
    list: defineCommand({
      help() {
        printHelp("openslaq channels list [flags]", "List channels in a workspace.", [
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels.$get({
          param: { slug: f.workspace },
        });
        if (!res.ok) {
          console.error(`Failed to list channels: ${res.status}`);
          process.exit(1);
        }
        const channels = (await res.json()) as Channel[];

        if (f.json) {
          console.log(JSON.stringify(channels, null, 2));
        } else {
          console.log(formatChannelTable(channels));
        }
      },
    }),
    create: defineCommand({
      help() {
        printHelp("openslaq channels create [flags]", "Create a new channel.", [
          { name: "--name NAME", desc: "Channel name (required)" },
          { name: "--type TYPE", desc: 'Channel type: public or private (default: "public")' },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: createFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels.$post({
          param: { slug: f.workspace },
          json: { name: f.name, type: f.type as "public" | "private" },
        });
        if (!res.ok) {
          console.error(`Failed to create channel: ${res.status}`);
          process.exit(1);
        }
        const channel = await res.json();

        if (f.json) {
          console.log(JSON.stringify(channel, null, 2));
        } else {
          console.log(`Channel #${f.name} created.`);
        }
      },
    }),
    join: defineCommand({
      help() {
        printHelp("openslaq channels join [flags]", "Join a public channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: joinFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].join.$post({
          param: { slug: f.workspace, id: f.channel },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const error = (body as { error?: string })?.error;
          console.error(error ?? `Failed to join channel: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Joined channel.");
        }
      },
    }),
    leave: defineCommand({
      help() {
        printHelp("openslaq channels leave [flags]", "Leave a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: leaveFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].leave.$post({
          param: { slug: f.workspace, id: f.channel },
        });
        if (!res.ok) {
          console.error(`Failed to leave channel: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Left channel.");
        }
      },
    }),
    "mark-read": defineCommand({
      help() {
        printHelp("openslaq channels mark-read [flags]", "Mark a channel as read.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: markReadFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].read.$post({
          param: { slug: f.workspace, id: f.channel },
        });
        if (!res.ok) {
          console.error(`Failed to mark channel as read: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Channel marked as read.");
        }
      },
    }),
    browse: defineCommand({
      help() {
        printHelp("openslaq channels browse [flags]", "Browse public channels.", [
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--include-archived", desc: "Include archived channels" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: browseFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels.browse.$get({
          param: { slug: f.workspace },
          query: { includeArchived: f["include-archived"] ? "true" : undefined },
        });
        if (!res.ok) {
          console.error(`Failed to browse channels: ${res.status}`);
          process.exit(1);
        }
        const channels = await res.json();

        if (f.json) {
          console.log(JSON.stringify(channels, null, 2));
        } else {
          console.log(formatBrowseChannelTable(channels as { name: string; type: string; memberCount?: number | null; isMember: boolean }[]));
        }
      },
    }),
    update: defineCommand({
      help() {
        printHelp("openslaq channels update [flags]", "Update a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--description TEXT", desc: "New description (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: updateFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].$patch({
          param: { slug: f.workspace, id: f.channel },
          json: { description: f.description },
        });
        if (!res.ok) {
          console.error(`Failed to update channel: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Channel updated.");
        }
      },
    }),
    archive: defineCommand({
      help() {
        printHelp("openslaq channels archive [flags]", "Archive a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: archiveFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].archive.$post({
          param: { slug: f.workspace, id: f.channel },
        });
        if (!res.ok) {
          console.error(`Failed to archive channel: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Channel archived.");
        }
      },
    }),
    unarchive: defineCommand({
      help() {
        printHelp("openslaq channels unarchive [flags]", "Unarchive a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: archiveFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].unarchive.$post({
          param: { slug: f.workspace, id: f.channel },
        });
        if (!res.ok) {
          console.error(`Failed to unarchive channel: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Channel unarchived.");
        }
      },
    }),
    star: defineCommand({
      help() {
        printHelp("openslaq channels star [flags]", "Star a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: starFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].star.$post({
          param: { slug: f.workspace, id: f.channel },
        });
        if (!res.ok) {
          console.error(`Failed to star channel: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Channel starred.");
        }
      },
    }),
    unstar: defineCommand({
      help() {
        printHelp("openslaq channels unstar [flags]", "Unstar a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: starFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].star.$delete({
          param: { slug: f.workspace, id: f.channel },
        });
        if (!res.ok) {
          console.error(`Failed to unstar channel: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Channel unstarred.");
        }
      },
    }),
    starred: defineCommand({
      help() {
        printHelp("openslaq channels starred [flags]", "List starred channels.", [
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: starredFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels.starred.$get({
          param: { slug: f.workspace },
        });
        if (!res.ok) {
          console.error(`Failed to list starred channels: ${res.status}`);
          process.exit(1);
        }
        const ids = await res.json();

        if (f.json) {
          console.log(JSON.stringify(ids, null, 2));
        } else {
          const list = ids as string[];
          if (list.length === 0) {
            console.log("No starred channels.");
          } else {
            console.log(list.join("\n"));
          }
        }
      },
    }),
  },
});
