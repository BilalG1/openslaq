import type { Message, SearchResult } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatMessages, formatSearchResults, formatScheduledMessages } from "../output";
import { getAuthenticatedClient } from "../client";
import { parseDuration } from "../parse-duration";

const listFlags = {
  channel: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  limit: { type: "string", default: "50" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const sendFlags = {
  channel: { type: "string", required: true },
  text: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const searchFlags = {
  query: { type: "string", required: true },
  channel: { type: "string" },
  workspace: { type: "string", default: "default" },
  limit: { type: "string", default: "20" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const editFlags = {
  message: { type: "string", required: true },
  text: { type: "string", required: true },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const deleteFlags = {
  message: { type: "string", required: true },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const replyFlags = {
  channel: { type: "string", required: true },
  message: { type: "string", required: true },
  text: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const threadFlags = {
  channel: { type: "string", required: true },
  message: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  limit: { type: "string", default: "50" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const reactFlags = {
  message: { type: "string", required: true },
  emoji: { type: "string", required: true },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const scheduleFlags = {
  channel: { type: "string", required: true },
  text: { type: "string", required: true },
  at: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const scheduledFlags = {
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const messagesCommand = defineCommand({
  help() {
    printHelp("openslaq messages <subcommand>", "Read and send messages.");
    console.log("Subcommands:");
    console.log(`  ${"list".padEnd(12)}List messages in a channel`);
    console.log(`  ${"send".padEnd(12)}Send a message to a channel`);
    console.log(`  ${"search".padEnd(12)}Search messages in a workspace`);
    console.log(`  ${"edit".padEnd(12)}Edit a message`);
    console.log(`  ${"delete".padEnd(12)}Delete a message`);
    console.log(`  ${"reply".padEnd(12)}Reply to a message thread`);
    console.log(`  ${"thread".padEnd(12)}List thread replies`);
    console.log(`  ${"react".padEnd(12)}Toggle an emoji reaction`);
    console.log(`  ${"schedule".padEnd(12)}Schedule a message for later`);
    console.log(`  ${"scheduled".padEnd(12)}List scheduled messages`);
    console.log();
  },
  subcommands: {
    list: defineCommand({
      help() {
        printHelp("openslaq messages list [flags]", "List messages in a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--limit N", desc: "Max messages to return (default: 50)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
          param: { slug: f.workspace, id: f.channel },
          query: { limit: Number(f.limit) },
        });
        if (!res.ok) {
          console.error(`Failed to list messages: ${res.status}`);
          process.exit(1);
        }
        const data = (await res.json()) as { messages: Message[] };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(formatMessages(data.messages));
        }
      },
    }),
    send: defineCommand({
      help() {
        printHelp("openslaq messages send [flags]", "Send a message to a channel.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--text TEXT", desc: "Message content (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: sendFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
          param: { slug: f.workspace, id: f.channel },
          json: { content: f.text },
        });
        if (!res.ok) {
          console.error(`Failed to send message: ${res.status}`);
          process.exit(1);
        }
        const message = await res.json();

        if (f.json) {
          console.log(JSON.stringify(message, null, 2));
        } else {
          console.log("Message sent.");
        }
      },
    }),
    search: defineCommand({
      help() {
        printHelp("openslaq messages search [flags]", "Search messages in a workspace.", [
          { name: "--query TEXT", desc: "Search query (required)" },
          { name: "--channel ID", desc: "Limit to a specific channel ID" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--limit N", desc: "Max results to return (default: 20)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: searchFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].search.$get({
          param: { slug: f.workspace },
          query: { q: f.query, limit: Number(f.limit), ...(f.channel ? { channelId: f.channel } : {}) },
        });
        if (!res.ok) {
          console.error(`Failed to search messages: ${res.status}`);
          process.exit(1);
        }
        const data = (await res.json()) as SearchResult;

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(formatSearchResults(data.results));
        }
      },
    }),
    edit: defineCommand({
      help() {
        printHelp("openslaq messages edit [flags]", "Edit a message.", [
          { name: "--message ID", desc: "Message ID (required)" },
          { name: "--text TEXT", desc: "New message content (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: editFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.messages[":id"].$put({
          param: { id: f.message },
          json: { content: f.text },
        });
        if (!res.ok) {
          console.error(`Failed to edit message: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Message edited.");
        }
      },
    }),
    delete: defineCommand({
      help() {
        printHelp("openslaq messages delete [flags]", "Delete a message.", [
          { name: "--message ID", desc: "Message ID (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: deleteFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.messages[":id"].$delete({
          param: { id: f.message },
        });
        if (!res.ok) {
          console.error(`Failed to delete message: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Message deleted.");
        }
      },
    }),
    reply: defineCommand({
      help() {
        printHelp("openslaq messages reply [flags]", "Reply to a message thread.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--message ID", desc: "Parent message ID (required)" },
          { name: "--text TEXT", desc: "Reply content (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: replyFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
          param: { slug: f.workspace, id: f.channel, messageId: f.message },
          json: { content: f.text },
        });
        if (!res.ok) {
          console.error(`Failed to send reply: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Reply sent.");
        }
      },
    }),
    thread: defineCommand({
      help() {
        printHelp("openslaq messages thread [flags]", "List thread replies.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--message ID", desc: "Parent message ID (required)" },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--limit N", desc: "Max replies to return (default: 50)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: threadFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get({
          param: { slug: f.workspace, id: f.channel, messageId: f.message },
          query: { limit: Number(f.limit) },
        });
        if (!res.ok) {
          console.error(`Failed to list thread replies: ${res.status}`);
          process.exit(1);
        }
        const data = (await res.json()) as { messages: Message[] };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(formatMessages(data.messages));
        }
      },
    }),
    react: defineCommand({
      help() {
        printHelp("openslaq messages react [flags]", "Toggle an emoji reaction on a message.", [
          { name: "--message ID", desc: "Message ID (required)" },
          { name: "--emoji TEXT", desc: "Emoji character (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: reactFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.messages[":id"].reactions.$post({
          param: { id: f.message },
          json: { emoji: f.emoji },
        });
        if (!res.ok) {
          console.error(`Failed to toggle reaction: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Reaction toggled.");
        }
      },
    }),
    schedule: defineCommand({
      help() {
        printHelp("openslaq messages schedule [flags]", "Schedule a message for later.", [
          { name: "--channel ID", desc: "Channel ID (required)" },
          { name: "--text TEXT", desc: "Message content (required)" },
          { name: "--at TIME", desc: 'When to send (e.g. "30m", "2h", "1d", or ISO datetime) (required)' },
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: scheduleFlags,
      async action(f) {
        const scheduledFor = parseDuration(f.at);
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
          param: { slug: f.workspace },
          json: { channelId: f.channel, content: f.text, scheduledFor },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const error = (body as { error?: string })?.error;
          console.error(error ?? `Failed to schedule message: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(`Message scheduled for ${new Date(scheduledFor).toLocaleString()}.`);
        }
      },
    }),
    scheduled: defineCommand({
      help() {
        printHelp("openslaq messages scheduled [flags]", "List scheduled messages.", [
          { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: scheduledFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"]["scheduled-messages"].$get({
          param: { slug: f.workspace },
        });
        if (!res.ok) {
          console.error(`Failed to list scheduled messages: ${res.status}`);
          process.exit(1);
        }
        const data = (await res.json()) as {
          scheduledMessages: { channelName: string; scheduledFor: string; status: string; content: string }[];
        };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(formatScheduledMessages(data.scheduledMessages));
        }
      },
    }),
  },
});
