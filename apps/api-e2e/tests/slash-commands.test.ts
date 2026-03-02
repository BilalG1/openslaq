import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, testId, createTestWorkspace, addToWorkspace } from "./helpers/api-client";

describe("Slash Commands", () => {
  let ownerClient: any;
  let ownerSlug: string;
  let channelId: string;

  beforeAll(async () => {
    const { client } = await createTestClient({
      id: `slash-cmd-owner-${testId()}`,
      displayName: "Slash Owner",
      email: `slash-owner-${testId()}@test.dev`,
    });
    ownerClient = client;
    const ws = await createTestWorkspace(ownerClient);
    ownerSlug = ws.slug;

    // Get general channel
    const chRes = await ownerClient.api.workspaces[":slug"].channels.$get({
      param: { slug: ownerSlug },
    });
    const channels = (await chRes.json()) as any[];
    channelId = channels.find((c: any) => c.name === "general")?.id;
    expect(channelId).toBeTruthy();
  });

  test("GET /commands returns built-in commands", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.$get({
      param: { slug: ownerSlug },
    });
    expect(res.status).toBe(200);
    const commands = (await res.json()) as any[];
    expect(commands.length).toBeGreaterThanOrEqual(5);

    const names = commands.map((c: any) => c.name);
    expect(names).toContain("status");
    expect(names).toContain("remind");
    expect(names).toContain("invite");
    expect(names).toContain("mute");
    expect(names).toContain("unmute");

    // All built-in commands should have source "builtin"
    const builtins = commands.filter((c: any) => c.source === "builtin");
    expect(builtins.length).toBe(5);
  });

  test("POST /commands/execute with /status sets user status", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "status", args: ":palm_tree: On vacation", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0].text).toContain("Status set to");
    expect(result.ephemeralMessages[0].ephemeral).toBe(true);
  });

  test("POST /commands/execute with /status clear clears status", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "status", args: "clear", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Status cleared");
  });

  test("POST /commands/execute with /mute sets pref to muted", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "mute", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("muted");
  });

  test("POST /commands/execute with /unmute sets pref to all", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "unmute", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("unmuted");
  });

  test("POST /commands/execute with /invite adds channel member", async () => {
    // Create a private channel (so second user isn't auto-joined)
    const createChRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug: ownerSlug },
      json: { name: `invite-test-${testId()}`, type: "private" },
    });
    expect(createChRes.status).toBe(201);
    const privateChannel = (await createChRes.json()) as any;

    // Create a second user and add to workspace
    const secondId = `slash-invite-target-${testId()}`;
    const { client: secondClient } = await createTestClient({
      id: secondId,
      displayName: "Invite Target",
      email: `invite-target-${testId()}@test.dev`,
    });
    await addToWorkspace(ownerClient, ownerSlug, secondClient);

    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "invite", args: `<@${secondId}>`, channelId: privateChannel.id },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Invited");
  });

  test("POST /commands/execute with /remind creates reminder", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "remind", args: "standup in 30 minutes", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("remind you");
    expect(result.ephemeralMessages[0].text).toContain("standup");
  });

  test("unknown command returns error", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "nonexistent", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown command");
  });

  test("bot command registration and listing", async () => {
    // Create a bot
    const botRes = await ownerClient.api.workspaces[":slug"].bots.$post({
      param: { slug: ownerSlug },
      json: {
        name: `Cmd Bot ${testId()}`,
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:write", "commands:write"],
        subscribedEvents: ["slash_command"],
      },
    });
    expect(botRes.status).toBe(201);
    const { bot } = (await botRes.json()) as any;

    // Register a command
    const cmdRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].commands.$post({
      param: { slug: ownerSlug, botId: bot.id },
      json: { name: "deploy", description: "Deploy app", usage: "/deploy [env]" },
    });
    expect(cmdRes.status).toBe(201);
    const cmd = (await cmdRes.json()) as any;
    expect(cmd.name).toBe("deploy");

    // List commands should include bot command
    const listRes = await ownerClient.api.workspaces[":slug"].commands.$get({
      param: { slug: ownerSlug },
    });
    const commands = (await listRes.json()) as any[];
    const deployCmd = commands.find((c: any) => c.name === "deploy");
    expect(deployCmd).toBeTruthy();
    expect(deployCmd.source).toBe("bot");
    expect(deployCmd.botName).toBe(bot.name);

    // Delete the command
    const delRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].commands[":commandId"].$delete({
      param: { slug: ownerSlug, botId: bot.id, commandId: cmd.id },
    });
    expect(delRes.status).toBe(200);

    // Verify it's gone
    const afterRes = await ownerClient.api.workspaces[":slug"].commands.$get({
      param: { slug: ownerSlug },
    });
    const afterCommands = (await afterRes.json()) as any[];
    expect(afterCommands.find((c: any) => c.name === "deploy")).toBeFalsy();
  });
});
