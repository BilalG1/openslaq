import type { Message } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatMessages, formatDmTable } from "../output";
import { getAuthenticatedClient, requireWorkspace, type CliClient } from "../client";

async function openDmChannel(client: CliClient, workspace: string, userId: string): Promise<{ channel: { id: string } }> {
  const res = await client.api.workspaces[":slug"].dm.$post({
    param: { slug: workspace },
    json: { userId },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error = (body as { error?: string })?.error;
    console.error(error ?? `Failed to open DM: ${res.status}`);
    process.exit(1);
  }
  return (await res.json()) as { channel: { id: string } };
}

const openFlags = {
  user: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const listFlags = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const sendFlags = {
  user: { type: "string", required: true },
  text: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const messagesFlags = {
  user: { type: "string", required: true },
  workspace: { type: "string" },
  limit: { type: "string", default: "50" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const dmCommand = defineCommand({
  help() {
    printHelp("openslaq dm <subcommand>", "Direct messages.");
    console.log("Subcommands:");
    console.log(`  ${"open".padEnd(12)}Open or create a DM channel`);
    console.log(`  ${"list".padEnd(12)}List DM conversations`);
    console.log(`  ${"send".padEnd(12)}Send a direct message`);
    console.log(`  ${"messages".padEnd(12)}List messages in a DM`);
    console.log();
  },
  subcommands: {
    open: defineCommand({
      help() {
        printHelp("openslaq dm open [flags]", "Open or create a DM channel with a user.", [
          { name: "--user USER_ID", desc: "Target user ID (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: openFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const data = await openDmChannel(client, requireWorkspace(f.workspace), f.user);

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(data.channel.id);
        }
      },
    }),
    list: defineCommand({
      help() {
        printHelp("openslaq dm list [flags]", "List DM conversations.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].dm.$get({
          param: { slug: requireWorkspace(f.workspace) },
        });
        if (!res.ok) {
          console.error(`Failed to list DMs: ${res.status}`);
          process.exit(1);
        }
        const dms = (await res.json()) as { channel: { id: string }; otherUser: { id: string; displayName: string } }[];

        if (f.json) {
          console.log(JSON.stringify(dms, null, 2));
        } else {
          console.log(formatDmTable(dms));
        }
      },
    }),
    send: defineCommand({
      help() {
        printHelp("openslaq dm send [flags]", "Send a direct message.", [
          { name: "--user USER_ID", desc: "Target user ID (required)" },
          { name: "--text TEXT", desc: "Message content (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: sendFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const { channel } = await openDmChannel(client, requireWorkspace(f.workspace), f.user);

        const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
          param: { slug: requireWorkspace(f.workspace), id: channel.id },
          json: { content: f.text },
        });
        if (!msgRes.ok) {
          console.error(`Failed to send message: ${msgRes.status}`);
          process.exit(1);
        }
        const message = await msgRes.json();

        if (f.json) {
          console.log(JSON.stringify(message, null, 2));
        } else {
          console.log("Message sent.");
        }
      },
    }),
    messages: defineCommand({
      help() {
        printHelp("openslaq dm messages [flags]", "List messages in a DM conversation.", [
          { name: "--user USER_ID", desc: "Target user ID (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--limit N", desc: "Max messages to return (default: 50)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: messagesFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const { channel } = await openDmChannel(client, requireWorkspace(f.workspace), f.user);

        const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
          param: { slug: requireWorkspace(f.workspace), id: channel.id },
          query: { limit: Number(f.limit) },
        });
        if (!msgRes.ok) {
          console.error(`Failed to list messages: ${msgRes.status}`);
          process.exit(1);
        }
        const data = (await msgRes.json()) as {
          messages: Message[];
        };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(formatMessages(data.messages));
        }
      },
    }),
  },
});
