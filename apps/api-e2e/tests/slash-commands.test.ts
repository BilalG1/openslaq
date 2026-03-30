import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, testId, createTestWorkspace, addToWorkspace, getBaseUrl, TestApiClient } from "./helpers/api-client";

describe("Slash Commands", () => {
  let ownerClient: TestApiClient;
  let superAdminClient: TestApiClient;
  let ownerSlug: string;
  let ownerWorkspaceId: string;
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
    ownerWorkspaceId = ws.id;

    // Create super-admin client using the configured admin user ID
    const superAdmin = await createTestClient({
      id: process.env.ADMIN_USER_IDS?.split(",")[0] || "admin-user",
      displayName: "Super Admin",
      email: `super-admin-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    superAdminClient = superAdmin.client;

    // Get general channel
    const chRes = await ownerClient.api.workspaces[":slug"].channels.$get({
      param: { slug: ownerSlug },
    });
    const channels = (await chRes.json()) as Array<{ id: string; name: string }>;
    channelId = channels.find((c: { name: string }) => c.name === "general")?.id ?? "";
    expect(channelId).toBeTruthy();
  });

  test("GET /commands returns built-in commands", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.$get({
      param: { slug: ownerSlug },
    });
    expect(res.status).toBe(200);
    const commands = (await res.json()) as Array<{ name: string; source?: string; description?: string }>;
    expect(commands.length).toBeGreaterThanOrEqual(5);

    const names = commands.map((c: { name: string }) => c.name);
    expect(names).toContain("status");
    expect(names).toContain("remind");
    expect(names).toContain("invite");
    expect(names).toContain("mute");
    expect(names).toContain("unmute");

    // All built-in commands should have source "builtin"
    const builtins = commands.filter((c) => c.source === "builtin");
    expect(builtins.length).toBe(5);
  });

  test("GET /commands excludes integration commands when not installed", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.$get({
      param: { slug: ownerSlug },
    });
    expect(res.status).toBe(200);
    const commands = (await res.json()) as Array<{ name: string; source?: string; description?: string }>;
    const names = commands.map((c: { name: string }) => c.name);
    expect(names).not.toContain("github");
  });

  test("GET /commands includes integration commands when installed", async () => {
    // Get github-bot listing ID
    const listRes = await ownerClient.api.marketplace.$get({});
    const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
    const ghListing = listings.find((l) => l.slug === "github-bot");
    expect(ghListing).toBeDefined();

    // Enable feature flag and install github-bot
    await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId: ownerWorkspaceId },
      json: { integrationGithub: "true" },
    });
    const installRes = await ownerClient.api.workspaces[":slug"].marketplace.install.$post({
      param: { slug: ownerSlug },
      json: { listingId: ghListing!.id },
    });
    expect(installRes.status).toBe(200);

    // Now /github should appear
    const res = await ownerClient.api.workspaces[":slug"].commands.$get({
      param: { slug: ownerSlug },
    });
    expect(res.status).toBe(200);
    const commands = (await res.json()) as Array<{ name: string; source?: string; description?: string }>;
    const githubCmd = commands.find((c: { name: string }) => c.name === "github");
    expect(githubCmd).toBeTruthy();
    // Integration commands installed via marketplace appear as bot commands
    expect(githubCmd!.source).toBe("bot");

    // Uninstall for test isolation
    await ownerClient.api.workspaces[":slug"].marketplace[":listingId"].uninstall.$delete({
      param: { slug: ownerSlug, listingId: ghListing!.id },
    });
  });

  test("executing integration command when not installed returns unknown command", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "github", args: "subscribe test/repo", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown command");
  });

  test("POST /commands/execute with /status sets user status", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "status", args: ":palm_tree: On vacation", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0]!.text).toContain("Status set to");
    expect(result.ephemeralMessages[0]!.ephemeral).toBe(true);
  });

  test("POST /commands/execute with /status clear clears status", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "status", args: "clear", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Status cleared");
  });

  test("POST /commands/execute with /mute sets pref to muted", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "mute", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("muted");
  });

  test("POST /commands/execute with /unmute sets pref to all", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "unmute", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("unmuted");
  });

  test("POST /commands/execute with /invite adds channel member", async () => {
    // Create a private channel (so second user isn't auto-joined)
    const createChRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug: ownerSlug },
      json: { name: `invite-test-${testId()}`, type: "private" },
    });
    expect(createChRes.status).toBe(201);
    const privateChannel = (await createChRes.json()) as { id: string };

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
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Invited");
  });

  test("POST /commands/execute with /remind creates reminder", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "remind", args: "standup in 30 minutes", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("remind you");
    expect(result.ephemeralMessages[0]!.text).toContain("standup");
  });

  test("/status with no args returns usage", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "status", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage");
  });

  test("/remind with no args returns usage", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "remind", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage");
  });

  test("/invite with no args returns usage", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "invite", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage");
  });

  test("/invite with non-workspace-member returns error", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "invite", args: "<@nonexistent-user-id>", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0]!.text).toContain("not a member of this workspace");
  });

  test("unknown command returns error", async () => {
    const res = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: ownerSlug },
      json: { command: "nonexistent", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; ephemeral?: string; response?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
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
    const { bot } = (await botRes.json()) as unknown as { bot: { id: string; appId: string; name?: string } };

    // Register a command
    const cmdRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].commands.$post({
      param: { slug: ownerSlug, botId: bot.id },
      json: { name: "deploy", description: "Deploy app", usage: "/deploy [env]" },
    });
    expect(cmdRes.status).toBe(201);
    const cmd = (await cmdRes.json()) as { id: string; name: string };
    expect(cmd.name).toBe("deploy");

    // List commands should include bot command
    const listRes = await ownerClient.api.workspaces[":slug"].commands.$get({
      param: { slug: ownerSlug },
    });
    const commands = (await listRes.json()) as Array<{ name: string; source?: string; botName?: string }>;
    const deployCmd = commands.find((c) => c.name === "deploy");
    expect(deployCmd).toBeTruthy();
    expect(deployCmd!.source).toBe("bot");
    expect(deployCmd!.botName).toBe(bot.name);

    // Delete the command
    const delRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].commands[":commandId"].$delete({
      param: { slug: ownerSlug, botId: bot.id, commandId: cmd.id },
    });
    expect(delRes.status).toBe(200);

    // Verify it's gone
    const afterRes = await ownerClient.api.workspaces[":slug"].commands.$get({
      param: { slug: ownerSlug },
    });
    const afterCommands = (await afterRes.json()) as Array<{ name: string }>;
    expect(afterCommands.find((c: { name: string }) => c.name === "deploy")).toBeFalsy();
  });

  describe("bot command execution", () => {
    const apiBaseUrl = getBaseUrl();

    test("webhook returns JSON with text field → ephemeral message with bot response", async () => {
      const botRes = await ownerClient.api.workspaces[":slug"].bots.$post({
        param: { slug: ownerSlug },
        json: {
          name: `Echo Bot ${testId()}`,
          webhookUrl: `${apiBaseUrl}/api/test/webhook-echo-text`,
          scopes: ["chat:write", "commands:write"],
          subscribedEvents: ["slash_command"],
        },
      });
      expect(botRes.status).toBe(201);
      const { bot } = (await botRes.json()) as unknown as { bot: { id: string; appId: string; name?: string } };

      // Register command
      const cmdRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].commands.$post({
        param: { slug: ownerSlug, botId: bot.id },
        json: { name: `echo${testId()}`, description: "Echo test", usage: "/echo" },
      });
      expect(cmdRes.status).toBe(201);
      const cmd = (await cmdRes.json()) as { id: string; name: string };

      // Execute the command
      const execRes = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
        param: { slug: ownerSlug },
        json: { command: cmd.name, args: "hello", channelId },
      });
      expect(execRes.status).toBe(200);
      const result = (await execRes.json()) as { ok?: boolean; error?: string; ephemeral?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
      expect(result.ok).toBe(true);
      expect(result.ephemeralMessages).toHaveLength(1);
      expect(result.ephemeralMessages[0]!.text).toBe("Bot response from webhook");
      expect(result.ephemeralMessages[0]!.ephemeral).toBe(true);
      expect(result.ephemeralMessages[0]!.senderName).toBe(bot.name);
    });

    test("webhook returns JSON without text field → unknown command", async () => {
      // Use /health endpoint which returns { ok: true } (no text field)
      const botRes = await ownerClient.api.workspaces[":slug"].bots.$post({
        param: { slug: ownerSlug },
        json: {
          name: `NoText Bot ${testId()}`,
          webhookUrl: `${apiBaseUrl}/health`,
          scopes: ["chat:write", "commands:write"],
          subscribedEvents: ["slash_command"],
        },
      });
      expect(botRes.status).toBe(201);
      const { bot } = (await botRes.json()) as unknown as { bot: { id: string; appId: string; name?: string } };

      const cmdName = `notext${testId()}`;
      const cmdRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].commands.$post({
        param: { slug: ownerSlug, botId: bot.id },
        json: { name: cmdName, description: "No text test", usage: `/${cmdName}` },
      });
      expect(cmdRes.status).toBe(201);

      const execRes = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
        param: { slug: ownerSlug },
        json: { command: cmdName, args: "", channelId },
      });
      expect(execRes.status).toBe(200);
      const result = (await execRes.json()) as { ok?: boolean; error?: string; ephemeral?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
      // executeBotCommand returns [] → falls through to "Unknown command"
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Unknown command");
    });

    test("webhook fetch fails → unknown command + error logged", async () => {
      // Use an unreachable URL
      const botRes = await ownerClient.api.workspaces[":slug"].bots.$post({
        param: { slug: ownerSlug },
        json: {
          name: `Fail Bot ${testId()}`,
          webhookUrl: "http://127.0.0.1:1/webhook",
          scopes: ["chat:write", "commands:write"],
          subscribedEvents: ["slash_command"],
        },
      });
      expect(botRes.status).toBe(201);
      const { bot } = (await botRes.json()) as unknown as { bot: { id: string; appId: string; name?: string } };

      const cmdName = `fail${testId()}`;
      const cmdRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].commands.$post({
        param: { slug: ownerSlug, botId: bot.id },
        json: { name: cmdName, description: "Fail test", usage: `/${cmdName}` },
      });
      expect(cmdRes.status).toBe(201);

      const execRes = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
        param: { slug: ownerSlug },
        json: { command: cmdName, args: "", channelId },
      });
      expect(execRes.status).toBe(200);
      const result = (await execRes.json()) as { ok?: boolean; error?: string; ephemeral?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Unknown command");

      // Verify webhook delivery was logged with error status
      const testSecret = process.env.E2E_TEST_SECRET;
      const deliveriesRes = await fetch(
        `${apiBaseUrl}/api/test/webhook-deliveries/${bot.id}`,
        { headers: { Authorization: `Bearer ${testSecret}` } },
      );
      expect(deliveriesRes.status).toBe(200);
      const deliveries = (await deliveriesRes.json()) as Array<{ statusCode: string }>;
      const errorDelivery = deliveries.find((d: { statusCode: string }) => d.statusCode === "error");
      expect(errorDelivery).toBeTruthy();
    });

    test("invalid webhook URL → ephemeral error message", async () => {
      // Create bot with valid URL first
      const botRes = await ownerClient.api.workspaces[":slug"].bots.$post({
        param: { slug: ownerSlug },
        json: {
          name: `Invalid URL Bot ${testId()}`,
          webhookUrl: "https://example.com/webhook",
          scopes: ["chat:write", "commands:write"],
          subscribedEvents: ["slash_command"],
        },
      });
      expect(botRes.status).toBe(201);
      const { bot } = (await botRes.json()) as unknown as { bot: { id: string; appId: string; name?: string } };

      const cmdName = `invalidurl${testId()}`;
      const cmdRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].commands.$post({
        param: { slug: ownerSlug, botId: bot.id },
        json: { name: cmdName, description: "Invalid URL test", usage: `/${cmdName}` },
      });
      expect(cmdRes.status).toBe(201);

      // Update webhook URL to invalid via bot update endpoint
      const updateRes = await ownerClient.api.workspaces[":slug"].bots[":botId"].$put({
        param: { slug: ownerSlug, botId: bot.id },
        json: { webhookUrl: "ftp://invalid" },
      });
      expect(updateRes.status).toBe(200);

      const execRes = await ownerClient.api.workspaces[":slug"].commands.execute.$post({
        param: { slug: ownerSlug },
        json: { command: cmdName, args: "", channelId },
      });
      expect(execRes.status).toBe(200);
      const result = (await execRes.json()) as { ok?: boolean; error?: string; ephemeral?: string; ephemeralMessages: Array<{ text: string; ephemeral?: boolean; senderName?: string }> };
      expect(result.ok).toBe(true);
      expect(result.ephemeralMessages).toHaveLength(1);
      expect(result.ephemeralMessages[0]!.text).toContain("webhook URL is invalid");
    });
  });
});
