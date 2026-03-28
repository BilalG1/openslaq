#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./types";
import { OpenSlaqClient } from "./openslaq-client";
import { SocketListener } from "./socket-listener";
import { PairingManager } from "./pairing";

const config = loadConfig();
const client = new OpenSlaqClient(config.apiUrl, config.botToken, config.workspaceSlug);
const pairing = new PairingManager(config.allowedUserIds);
const listener = new SocketListener(config.apiUrl, config.botToken, client);

// Track the most recent sender's channel for convenience replies
let lastSenderChannelId: string | null = null;

// User display name cache
const userNameCache = new Map<string, string>();

async function getUserName(userId: string): Promise<string> {
  const cached = userNameCache.get(userId);
  if (cached) return cached;
  try {
    const user = await client.getUser(userId);
    userNameCache.set(userId, user.displayName);
    return user.displayName;
  } catch {
    return userId;
  }
}

// ---- MCP Server ----

const mcp = new Server(
  { name: "openslaq", version: "0.1.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions: [
      'Messages from OpenSlaq arrive as <channel source="openslaq" sender_id="..." sender_name="..." channel_id="...">.',
      "Reply with the `reply` tool, passing the channel_id from the tag.",
      "If a pairing request arrives, use the `pair` tool to approve or reject it.",
      "Use `list_paired_users` to see who is currently paired.",
    ].join(" "),
  },
);

// ---- Tools ----

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "reply",
      description: "Send a message back to an OpenSlaq DM channel",
      inputSchema: {
        type: "object" as const,
        properties: {
          channel_id: {
            type: "string",
            description:
              "The channel ID to reply in (from the channel_id attribute). If omitted, replies to the most recent sender.",
          },
          text: {
            type: "string",
            description: "The message text to send",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "pair",
      description: "Approve or reject a pairing request from an OpenSlaq user",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: {
            type: "string",
            enum: ["approve", "reject"],
            description: "Whether to approve or reject the pairing",
          },
          code: {
            type: "string",
            description: "The pairing code from the pairing request",
          },
        },
        required: ["action", "code"],
      },
    },
    {
      name: "list_paired_users",
      description: "List all currently paired OpenSlaq users",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "reply") {
    const { channel_id, text } = args as {
      channel_id?: string;
      text: string;
    };
    const targetChannel = channel_id || lastSenderChannelId;
    if (!targetChannel) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No channel_id provided and no recent sender to reply to.",
          },
        ],
      };
    }
    await client.sendMessage(targetChannel, text);
    return { content: [{ type: "text" as const, text: "Message sent." }] };
  }

  if (name === "pair") {
    const { action, code } = args as { action: string; code: string };
    if (action === "approve") {
      const request = pairing.approvePairing(code);
      if (!request) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Pairing code not found or expired.",
            },
          ],
        };
      }
      // Send confirmation DM
      await client.sendMessage(
        request.channelId,
        "Connected! Your messages will now be forwarded to Claude Code.",
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Paired with ${request.displayName} (${request.userId}).`,
          },
        ],
      };
    }
    if (action === "reject") {
      const request = pairing.rejectPairing(code);
      if (!request) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Pairing code not found or expired.",
            },
          ],
        };
      }
      await client.sendMessage(
        request.channelId,
        "Pairing request was rejected.",
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Rejected pairing from ${request.displayName}.`,
          },
        ],
      };
    }
    return {
      content: [
        { type: "text" as const, text: 'Invalid action. Use "approve" or "reject".' },
      ],
    };
  }

  if (name === "list_paired_users") {
    const users = pairing.listPairedUsers();
    if (users.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No paired users." }],
      };
    }
    const list = users
      .map((u) => `- ${u.displayName} (${u.userId})`)
      .join("\n");
    return { content: [{ type: "text" as const, text: list }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ---- Message bridge ----

listener.onMessage(async (msg) => {
  const displayName = await getUserName(msg.userId);

  if (pairing.isPaired(msg.userId)) {
    // Update channel info for pre-approved users on first message
    pairing.updatePairedUser(msg.userId, displayName, msg.channelId);
    lastSenderChannelId = msg.channelId;

    await mcp.notification({
      method: "notifications/claude/channel",
      params: {
        channel: "openslaq",
        content: msg.content,
        meta: {
          sender_id: msg.userId,
          sender_name: displayName,
          channel_id: msg.channelId,
          message_id: msg.messageId,
        },
      },
    });
  } else {
    // Unpaired user — start pairing flow
    const request = pairing.createPairingRequest(
      msg.userId,
      displayName,
      msg.channelId,
    );

    // Send pairing code to the user via DM
    await client.sendMessage(
      msg.channelId,
      `Pairing code: \`${request.code}\`\n\nEnter this code in your Claude Code session to connect.`,
    );

    // Notify Claude Code about the pairing request
    await mcp.notification({
      method: "notifications/claude/channel",
      params: {
        channel: "openslaq",
        content: `Pairing request from ${displayName} (${msg.userId}). Code: ${request.code}. Use the \`pair\` tool with action "approve" and this code to connect.`,
        meta: {
          sender_id: msg.userId,
          sender_name: displayName,
          channel_id: msg.channelId,
          pairing_code: request.code,
        },
      },
    });
  }
});

// ---- Start ----

async function main() {
  await mcp.connect(new StdioServerTransport());
  process.stderr.write("[openslaq-channel] MCP server connected\n");

  await listener.connect();
  process.stderr.write("[openslaq-channel] Socket.IO listener connected\n");
}

main().catch((err) => {
  process.stderr.write(`[openslaq-channel] Fatal error: ${err}\n`);
  process.exit(1);
});
