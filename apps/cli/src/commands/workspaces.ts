import type { WorkspaceListItem } from "@openslaq/client-core";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatWorkspaceTable, formatMemberTable, formatInviteTable } from "../output";
import { getAuthenticatedClient, requireWorkspace } from "../client";

const listFlags = {
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const createFlags = {
  name: { type: "string", required: true },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const membersFlags = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const inviteFlags = {
  workspace: { type: "string" },
  "max-uses": { type: "string" },
  "expires-in-hours": { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const invitesFlags = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const revokeInviteFlags = {
  invite: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const workspacesCommand = defineCommand({
  help() {
    printHelp("openslaq workspaces <subcommand>", "Manage workspaces.");
    console.log("Subcommands:");
    console.log(`  ${"list".padEnd(16)}List your workspaces`);
    console.log(`  ${"create".padEnd(16)}Create a new workspace`);
    console.log(`  ${"members".padEnd(16)}List workspace members`);
    console.log(`  ${"invite".padEnd(16)}Create an invite`);
    console.log(`  ${"invites".padEnd(16)}List invites`);
    console.log(`  ${"revoke-invite".padEnd(16)}Revoke an invite`);
    console.log();
  },
  subcommands: {
    list: defineCommand({
      help() {
        printHelp("openslaq workspaces list [flags]", "List workspaces you are a member of.", [
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();

        const res = await client.api.workspaces.$get();
        if (!res.ok) {
          console.error(`Failed to list workspaces: ${res.status}`);
          process.exit(1);
        }
        const workspaces = (await res.json()) as WorkspaceListItem[];

        if (f.json) {
          console.log(JSON.stringify(workspaces, null, 2));
        } else {
          console.log(formatWorkspaceTable(workspaces));
        }
      },
    }),
    create: defineCommand({
      help() {
        printHelp("openslaq workspaces create [flags]", "Create a new workspace.", [
          { name: "--name NAME", desc: "Workspace name (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: createFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces.$post({
          json: { name: f.name },
        });
        if (!res.ok) {
          console.error(`Failed to create workspace: ${res.status}`);
          process.exit(1);
        }
        const workspace = (await res.json()) as { name: string; slug: string };

        if (f.json) {
          console.log(JSON.stringify(workspace, null, 2));
        } else {
          console.log(`Workspace created. Slug: ${workspace.slug}`);
        }
      },
    }),
    members: defineCommand({
      help() {
        printHelp("openslaq workspaces members [flags]", "List workspace members.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: membersFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].members.$get({
          param: { slug: requireWorkspace(f.workspace) },
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
    invite: defineCommand({
      help() {
        printHelp("openslaq workspaces invite [flags]", "Create a workspace invite.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--max-uses N", desc: "Maximum number of uses" },
          { name: "--expires-in-hours N", desc: "Hours until expiration (default: 168)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: inviteFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const body: { maxUses?: number; expiresInHours?: number } = {};
        if (f["max-uses"]) body.maxUses = parseInt(f["max-uses"], 10);
        if (f["expires-in-hours"]) body.expiresInHours = parseInt(f["expires-in-hours"], 10);

        const res = await client.api.workspaces[":slug"].invites.$post({
          param: { slug: requireWorkspace(f.workspace) },
          json: body,
        });
        if (!res.ok) {
          console.error(`Failed to create invite: ${res.status}`);
          process.exit(1);
        }
        const invite = (await res.json()) as { code: string; id: string };

        if (f.json) {
          console.log(JSON.stringify(invite, null, 2));
        } else {
          console.log(`Invite created. Code: ${invite.code}`);
        }
      },
    }),
    invites: defineCommand({
      help() {
        printHelp("openslaq workspaces invites [flags]", "List workspace invites.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: invitesFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].invites.$get({
          param: { slug: requireWorkspace(f.workspace) },
        });
        if (!res.ok) {
          console.error(`Failed to list invites: ${res.status}`);
          process.exit(1);
        }
        const invites = (await res.json()) as { code: string; maxUses: number | null; useCount: number; expiresAt: string | null; revokedAt: string | null }[];

        if (f.json) {
          console.log(JSON.stringify(invites, null, 2));
        } else {
          console.log(formatInviteTable(invites));
        }
      },
    }),
    "revoke-invite": defineCommand({
      help() {
        printHelp("openslaq workspaces revoke-invite [flags]", "Revoke a workspace invite.", [
          { name: "--invite ID", desc: "Invite ID (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: revokeInviteFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].invites[":inviteId"].$delete({
          param: { slug: requireWorkspace(f.workspace), inviteId: f.invite },
        });
        if (!res.ok) {
          console.error(`Failed to revoke invite: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Invite revoked.");
        }
      },
    }),
  },
});
