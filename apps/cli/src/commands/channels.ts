import type { Channel } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatChannelTable, formatBrowseChannelTable, formatChannelMemberTable } from "../output";
import { getAuthenticatedClient, requireWorkspace } from "../client";

const listFlags = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const createFlags = {
  name: { type: "string", required: true },
  type: { type: "string", default: "public" },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const joinFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const leaveFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const markReadFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const browseFlags = {
  workspace: { type: "string" },
  "include-archived": { type: "boolean" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const updateFlags = {
  channel: { type: "string", required: true },
  description: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const archiveFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const starFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const starredFlags = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const membersFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const addMemberFlags = {
  channel: { type: "string", required: true },
  user: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const removeMemberFlags = {
  channel: { type: "string", required: true },
  user: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const notifyGetFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const notifySetFlags = {
  channel: { type: "string", required: true },
  level: { type: "string", required: true },
  workspace: { type: "string" },
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
    console.log(`  ${"mark-read".padEnd(16)}Mark a channel as read`);
    console.log(`  ${"members".padEnd(16)}List channel members`);
    console.log(`  ${"add-member".padEnd(16)}Add a user to a channel`);
    console.log(`  ${"remove-member".padEnd(16)}Remove a user from a channel`);
    console.log(`  ${"notify-get".padEnd(16)}Get notification preference`);
    console.log(`  ${"notify-set".padEnd(16)}Set notification preference`);
    console.log();
  },
  subcommands: {
    list: defineCommand({
      help() {
        printHelp("openslaq channels list [flags]", "List channels in a workspace.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels.$get({
          param: { slug: requireWorkspace(f.workspace) },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: createFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels.$post({
          param: { slug: requireWorkspace(f.workspace) },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: joinFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].join.$post({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: leaveFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].leave.$post({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: markReadFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].read.$post({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--include-archived", desc: "Include archived channels" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: browseFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels.browse.$get({
          param: { slug: requireWorkspace(f.workspace) },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: updateFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].$patch({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: archiveFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].archive.$post({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: archiveFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].unarchive.$post({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: starFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].star.$post({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
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
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: starFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].star.$delete({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
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
    members: defineCommand({
      help() {
        printHelp("openslaq channels members [flags]", "List channel members.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: membersFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].members.$get({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
        });
        if (!res.ok) {
          console.error(`Failed to list members: ${res.status}`);
          process.exit(1);
        }
        const members = (await res.json()) as { displayName: string; email: string; joinedAt: string }[];

        if (f.json) {
          console.log(JSON.stringify(members, null, 2));
        } else {
          console.log(formatChannelMemberTable(members));
        }
      },
    }),
    "add-member": defineCommand({
      help() {
        printHelp("openslaq channels add-member [flags]", "Add a user to a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--user ID", desc: "User ID (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: addMemberFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].members.$post({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
          json: { userId: f.user },
        });
        if (!res.ok) {
          console.error(`Failed to add member: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Member added.");
        }
      },
    }),
    "remove-member": defineCommand({
      help() {
        printHelp("openslaq channels remove-member [flags]", "Remove a user from a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--user ID", desc: "User ID (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: removeMemberFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
          param: { slug: requireWorkspace(f.workspace), id: f.channel, userId: f.user },
        });
        if (!res.ok) {
          console.error(`Failed to remove member: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Member removed.");
        }
      },
    }),
    "notify-get": defineCommand({
      help() {
        printHelp("openslaq channels notify-get [flags]", "Get notification preference for a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: notifyGetFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$get({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
        });
        if (!res.ok) {
          console.error(`Failed to get notification preference: ${res.status}`);
          process.exit(1);
        }
        const data = (await res.json()) as { level: string };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(data.level);
        }
      },
    }),
    "notify-set": defineCommand({
      help() {
        printHelp("openslaq channels notify-set [flags]", "Set notification preference for a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--level LEVEL", desc: 'Notification level: "all", "mentions", or "muted" (required)' },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: notifySetFlags,
      async action(f) {
        const validLevels = ["all", "mentions", "muted"];
        if (!validLevels.includes(f.level)) {
          console.error(`Invalid level "${f.level}". Must be one of: ${validLevels.join(", ")}`);
          process.exit(1);
        }
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
          param: { slug: requireWorkspace(f.workspace), id: f.channel },
          json: { level: f.level as "all" | "mentions" | "muted" },
        });
        if (!res.ok) {
          console.error(`Failed to set notification preference: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(`Notification preference set to "${f.level}".`);
        }
      },
    }),
    starred: defineCommand({
      help() {
        printHelp("openslaq channels starred [flags]", "List starred channels.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: starredFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels.starred.$get({
          param: { slug: requireWorkspace(f.workspace) },
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
