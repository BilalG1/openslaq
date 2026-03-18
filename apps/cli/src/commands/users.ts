import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatMemberTable } from "../output";
import { getAuthenticatedClient } from "../client";

const searchFlags = {
  query: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const listFlags = {
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const updateProfileFlags = {
  name: { type: "string" },
  avatar: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const usersCommand = defineCommand({
  help() {
    printHelp("openslaq users <subcommand>", "Search and list workspace users.");
    console.log("Subcommands:");
    console.log(`  ${"search".padEnd(16)}Search members by display name`);
    console.log(`  ${"list".padEnd(16)}List all workspace members`);
    console.log(`  ${"update-profile".padEnd(16)}Update your display name or avatar`);
    console.log();
  },
  subcommands: {
    search: defineCommand({
      help() {
        printHelp("openslaq users search [flags]", "Search members by display name.", [
          { name: "--query TEXT", desc: "Search query (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: searchFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].members.$get({
          param: { slug: f.workspace },
          query: { q: f.query },
        });
        if (!res.ok) {
          console.error(`Failed to search members: ${res.status}`);
          process.exit(1);
        }
        const members = (await res.json()) as { displayName: string; email: string; role: string }[];

        if (f.json) {
          console.log(JSON.stringify(members, null, 2));
        } else {
          console.log(formatMemberTable(members));
        }
      },
    }),
    list: defineCommand({
      help() {
        printHelp("openslaq users list [flags]", "List all workspace members.", [
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].members.$get({
          param: { slug: f.workspace },
          query: {},
        });
        if (!res.ok) {
          console.error(`Failed to list members: ${res.status}`);
          process.exit(1);
        }
        const members = (await res.json()) as { displayName: string; email: string; role: string }[];

        if (f.json) {
          console.log(JSON.stringify(members, null, 2));
        } else {
          console.log(formatMemberTable(members));
        }
      },
    }),
    "update-profile": defineCommand({
      help() {
        printHelp("openslaq users update-profile [flags]", "Update your display name or avatar.", [
          { name: "--name TEXT", desc: "New display name" },
          { name: "--avatar URL", desc: "New avatar URL" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: updateProfileFlags,
      async action(f) {
        if (!f.name && !f.avatar) {
          console.error("At least one of --name or --avatar is required.");
          process.exit(1);
        }
        const client = await getAuthenticatedClient();
        const body: { displayName?: string; avatarUrl?: string } = {};
        if (f.name) body.displayName = f.name;
        if (f.avatar) body.avatarUrl = f.avatar;

        const res = await client.api.users.me.$patch({
          json: body,
        });
        if (!res.ok) {
          console.error(`Failed to update profile: ${res.status}`);
          process.exit(1);
        }
        const user = (await res.json()) as { displayName: string; email: string; avatarUrl: string | null };

        if (f.json) {
          console.log(JSON.stringify(user, null, 2));
        } else {
          console.log(`Profile updated: ${user.displayName}`);
        }
      },
    }),
  },
});
