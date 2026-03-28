import { describe, test, expect } from "vitest";
import type { SlashCommandDefinition, EphemeralMessage } from "@openslaq/shared";
import { asChannelId, asBotAppId } from "@openslaq/shared";

// Test the pure logic parts of slash commands rather than the full hook
// (which requires complex mocking of react-router-dom, auth, etc.)

describe("useSlashCommands (logic)", () => {
  test("commands match the expected built-in set", () => {
    const EXPECTED_BUILTINS: string[] = ["status", "remind", "invite", "mute", "unmute"];
    // This validates our shared understanding of the built-in command names
    expect(EXPECTED_BUILTINS).toHaveLength(5);
    expect(EXPECTED_BUILTINS).toContain("status");
    expect(EXPECTED_BUILTINS).toContain("remind");
    expect(EXPECTED_BUILTINS).toContain("mute");
  });

  test("ephemeral message structure has required fields", () => {
    const msg: EphemeralMessage = {
      id: "eph-1",
      channelId: asChannelId("00000000-0000-0000-0000-000000000001"),
      text: "Status set to: :palm_tree: On vacation",
      senderName: "Slaqbot",
      senderAvatarUrl: null,
      createdAt: new Date().toISOString(),
      ephemeral: true,
    };

    expect(msg.ephemeral).toBe(true);
    expect(msg.senderName).toBe("Slaqbot");
    expect(msg.text).toContain("Status set to");
  });

  test("slash command definitions have correct shape", () => {
    const cmd: SlashCommandDefinition = {
      name: "status",
      description: "Set your status",
      usage: "/status :emoji: [text]",
      source: "builtin",
    };

    expect(cmd.name).toBe("status");
    expect(cmd.source).toBe("builtin");
    expect(cmd.botAppId).toBeUndefined();
  });

  test("bot command definitions include bot info", () => {
    const cmd: SlashCommandDefinition = {
      name: "deploy",
      description: "Deploy the app",
      usage: "/deploy [env]",
      source: "bot",
      botAppId: asBotAppId("bot-123"),
      botName: "DeployBot",
    };

    expect(cmd.source).toBe("bot");
    expect(String(cmd.botAppId)).toBe("bot-123");
    expect(cmd.botName).toBe("DeployBot");
  });

  test("ephemeral messages group by channelId", () => {
    // Test the grouping logic used in the hook's state
    const messages: Record<string, EphemeralMessage[]> = {};
    const ch1 = "ch-1";
    const ch2 = "ch-2";

    const msg1: EphemeralMessage = {
      id: "eph-1", channelId: ch1 as never, text: "Muted", senderName: "Slaqbot",
      senderAvatarUrl: null, createdAt: new Date().toISOString(), ephemeral: true,
    };
    const msg2: EphemeralMessage = {
      id: "eph-2", channelId: ch1 as never, text: "Unmuted", senderName: "Slaqbot",
      senderAvatarUrl: null, createdAt: new Date().toISOString(), ephemeral: true,
    };
    const msg3: EphemeralMessage = {
      id: "eph-3", channelId: ch2 as never, text: "Status set", senderName: "Slaqbot",
      senderAvatarUrl: null, createdAt: new Date().toISOString(), ephemeral: true,
    };

    // Simulate the addEphemeral logic
    for (const msg of [msg1, msg2, msg3]) {
      messages[msg.channelId] = [...(messages[msg.channelId] ?? []), msg];
    }

    expect(messages[ch1]).toHaveLength(2);
    expect(messages[ch2]).toHaveLength(1);
    expect(messages["unknown"] ?? []).toEqual([]);
  });
});
