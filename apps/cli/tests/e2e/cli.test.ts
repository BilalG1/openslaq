import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";
import { signTestJwt } from "@openslaq/test-utils";
import {
  runCli,
  createAuthEnv,
  cleanupAuthEnv,
  getBaseUrl,
  testId,
} from "./helpers";

// ── Help output (no server needed) ──────────────────────────────────

describe("help output", () => {
  test("no args shows help", async () => {
    const { stdout, exitCode } = await runCli([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("OpenSlaq CLI");
    expect(stdout).toContain("login");
    expect(stdout).toContain("channels");
    expect(stdout).toContain("dm");
    expect(stdout).toContain("messages");
  });

  test("--help shows help", async () => {
    const { stdout, exitCode } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("OpenSlaq CLI");
  });

  test("login --help shows login description", async () => {
    const { stdout, exitCode } = await runCli(["login", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Log in");
  });

  test("logout --help shows logout description", async () => {
    const { stdout, exitCode } = await runCli(["logout", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Log out");
  });

  test("whoami --help shows whoami description", async () => {
    const { stdout, exitCode } = await runCli(["whoami", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("logged-in user");
  });

  test("channels --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["channels", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("list");
    expect(stdout).toContain("create");
    expect(stdout).toContain("join");
    expect(stdout).toContain("leave");
  });

  test("channels list --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["channels", "list", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--workspace");
  });

  test("channels create --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["channels", "create", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--name");
    expect(stdout).toContain("--type");
  });

  test("channels join --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["channels", "join", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--channel");
    expect(stdout).toContain("--workspace");
  });

  test("channels leave --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["channels", "leave", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--channel");
    expect(stdout).toContain("--workspace");
  });

  test("dm --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["dm", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("open");
    expect(stdout).toContain("list");
    expect(stdout).toContain("send");
    expect(stdout).toContain("messages");
  });

  test("dm open --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["dm", "open", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--user");
    expect(stdout).toContain("--workspace");
  });

  test("dm list --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["dm", "list", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--workspace");
    expect(stdout).toContain("--json");
  });

  test("dm send --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["dm", "send", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--user");
    expect(stdout).toContain("--text");
  });

  test("dm messages --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["dm", "messages", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--user");
    expect(stdout).toContain("--limit");
  });

  test("messages --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["messages", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("list");
    expect(stdout).toContain("send");
    expect(stdout).toContain("search");
  });

  test("messages send --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["messages", "send", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--channel");
    expect(stdout).toContain("--text");
  });

  test("messages search --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["messages", "search", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--query");
    expect(stdout).toContain("--channel");
  });

  test("workspaces --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["workspaces", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("list");
  });

  test("workspaces list --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["workspaces", "list", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--json");
  });

  test("upload --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["upload", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--file");
  });

  test("no args shows help with workspaces and upload", async () => {
    const { stdout, exitCode } = await runCli([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("workspaces");
    expect(stdout).toContain("upload");
    expect(stdout).toContain("status");
    expect(stdout).toContain("unread");
  });

  test("status --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["status", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("set");
    expect(stdout).toContain("clear");
  });

  test("status set --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["status", "set", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--emoji");
    expect(stdout).toContain("--text");
    expect(stdout).toContain("--expires");
  });

  test("status clear --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["status", "clear", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--json");
  });

  test("unread --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["unread", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("list");
    expect(stdout).toContain("mark-all-read");
  });

  test("unread list --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["unread", "list", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--workspace");
    expect(stdout).toContain("--json");
  });

  test("unread mark-all-read --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["unread", "mark-all-read", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--workspace");
    expect(stdout).toContain("--json");
  });

  test("files --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["files", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("list");
  });

  test("files list --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["files", "list", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--workspace");
    expect(stdout).toContain("--channel");
    expect(stdout).toContain("--category");
    expect(stdout).toContain("--json");
  });

  test("presence --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["presence", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--workspace");
    expect(stdout).toContain("--json");
  });

  test("channels mark-read --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["channels", "mark-read", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--channel");
    expect(stdout).toContain("--workspace");
  });

  test("messages schedule --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["messages", "schedule", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--channel");
    expect(stdout).toContain("--text");
    expect(stdout).toContain("--at");
  });

  test("messages scheduled --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["messages", "scheduled", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--workspace");
    expect(stdout).toContain("--json");
  });

  test("unknown command exits 1", async () => {
    const { stderr, exitCode } = await runCli(["bogus"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Unknown command");
  });

  test("no args shows api-keys, emoji, files, and presence in help", async () => {
    const { stdout, exitCode } = await runCli([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("api-keys");
    expect(stdout).toContain("emoji");
    expect(stdout).toContain("files");
    expect(stdout).toContain("presence");
  });

  test("api-keys --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["api-keys", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("create");
    expect(stdout).toContain("list");
    expect(stdout).toContain("get");
    expect(stdout).toContain("update");
    expect(stdout).toContain("delete");
  });

  test("api-keys create --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["api-keys", "create", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--name");
    expect(stdout).toContain("--scopes");
    expect(stdout).toContain("--expires");
  });

  test("api-keys list --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["api-keys", "list", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--json");
  });

  test("emoji --help shows subcommands", async () => {
    const { stdout, exitCode } = await runCli(["emoji", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("list");
    expect(stdout).toContain("upload");
    expect(stdout).toContain("bulk-upload");
    expect(stdout).toContain("delete");
  });

  test("emoji upload --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["emoji", "upload", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--file");
    expect(stdout).toContain("--name");
    expect(stdout).toContain("--workspace");
  });

  test("emoji bulk-upload --help shows flags", async () => {
    const { stdout, exitCode } = await runCli(["emoji", "bulk-upload", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--dir");
    expect(stdout).toContain("--workspace");
  });
});

// ── Auth-dependent commands (require dev servers) ───────────────────

describe("authenticated commands", () => {
  let authEnv: Awaited<ReturnType<typeof createAuthEnv>>;
  let slug: string;
  let channelId: string;
  const userId = `cli-e2e-${testId()}`;

  // Set up: create auth env + workspace via API client directly
  beforeAll(async () => {
    authEnv = await createAuthEnv({
      id: userId,
      displayName: "CLI E2E Tester",
      email: `${userId}@openslaq.dev`,
    });

    // Create a test workspace using the API directly
    const token = await signTestJwt({
      id: userId,
      displayName: "CLI E2E Tester",
      email: `${userId}@openslaq.dev`,
      emailVerified: true,
    });
    const client = hc<AppType>(getBaseUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const wsRes = await client.api.workspaces.$post({
      json: { name: `CLI E2E ${testId()}` },
    });
    if (wsRes.status !== 201) {
      throw new Error(`Failed to create workspace: ${wsRes.status}`);
    }
    const workspace = (await wsRes.json()) as { slug: string };
    slug = workspace.slug;

    // Get #general channel ID
    const chRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await chRes.json()) as { id: string; name: string }[];
    const general = channels.find((c) => c.name === "general");
    if (!general) throw new Error("No #general channel");
    channelId = general.id;
  });

  afterAll(async () => {
    // Clean up workspace
    const token = await signTestJwt({
      id: userId,
      displayName: "CLI E2E Tester",
      email: `${userId}@openslaq.dev`,
      emailVerified: true,
    });
    const client = hc<AppType>(getBaseUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    await client.api.workspaces[":slug"].$delete({ param: { slug } });
    await cleanupAuthEnv(authEnv.tempDir);
  });

  test("whoami shows user info", async () => {
    const { stdout, exitCode } = await runCli(["whoami"], authEnv.env);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("CLI E2E Tester");
  });

  test("whoami --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(["whoami", "--json"], authEnv.env);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.displayName).toBe("CLI E2E Tester");
  });

  test("channels list shows channels", async () => {
    const { stdout, exitCode } = await runCli(
      ["channels", "list", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("general");
  });

  test("channels list --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["channels", "list", "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((c: { name: string }) => c.name === "general")).toBe(true);
  });

  test("messages send + list round trip", async () => {
    const text = `e2e-cli-msg-${testId()}`;

    const sendResult = await runCli(
      ["messages", "send", "--channel", channelId, "--text", text, "--workspace", slug],
      authEnv.env,
    );
    expect(sendResult.exitCode).toBe(0);
    expect(sendResult.stdout).toContain("Message sent");

    const listResult = await runCli(
      ["messages", "list", "--channel", channelId, "--workspace", slug],
      authEnv.env,
    );
    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain(text);
  });

  test("messages list --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["messages", "list", "--channel", channelId, "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("messages");
    expect(Array.isArray(parsed.messages)).toBe(true);
  });

  test("messages send missing --channel exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["messages", "send", "--text", "hello"],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--channel");
  });

  test("messages send missing --text exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["messages", "send", "--channel", channelId],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--text");
  });

  test("channels create round-trip", async () => {
    const name = `cli-e2e-ch-${testId()}`;
    const createResult = await runCli(
      ["channels", "create", "--name", name, "--workspace", slug],
      authEnv.env,
    );
    expect(createResult.exitCode).toBe(0);
    expect(createResult.stdout).toContain(`Channel #${name} created`);

    const listResult = await runCli(
      ["channels", "list", "--workspace", slug],
      authEnv.env,
    );
    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain(name);
  });

  test("channels create missing --name exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["channels", "create", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--name");
  });

  test("messages search finds sent message", async () => {
    const text = `e2e-search-${testId()}`;

    // Send a message first
    await runCli(
      ["messages", "send", "--channel", channelId, "--text", text, "--workspace", slug],
      authEnv.env,
    );

    // Give search index a moment to update
    await Bun.sleep(500);

    const { stdout, exitCode } = await runCli(
      ["messages", "search", "--query", text, "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain(text);
  });

  test("workspaces list shows workspace", async () => {
    const { stdout, exitCode } = await runCli(
      ["workspaces", "list"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain(slug);
  });

  test("workspaces list --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["workspaces", "list", "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((w: { slug: string }) => w.slug === slug)).toBe(true);
  });

  test("upload --file uploads a file", async () => {
    const tmpPath = `/tmp/openslaq-cli-upload-test-${testId()}.txt`;
    await Bun.write(tmpPath, `test upload content ${testId()}`);

    const { stdout, exitCode } = await runCli(
      ["upload", "--file", tmpPath],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Uploaded");
    expect(stdout).toContain(".txt");

    // Cleanup
    try { await Bun.file(tmpPath).exists() && (await import("node:fs/promises")).rm(tmpPath); } catch { /* ignore */ }
  });

  test("upload missing --file exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["upload"],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--file");
  });

  test("status set + clear round trip", async () => {
    const setResult = await runCli(
      ["status", "set", "--emoji", "🏠", "--text", "Working from home"],
      authEnv.env,
    );
    expect(setResult.exitCode).toBe(0);
    expect(setResult.stdout).toContain("Status set");
    expect(setResult.stdout).toContain("🏠");

    const clearResult = await runCli(
      ["status", "clear"],
      authEnv.env,
    );
    expect(clearResult.exitCode).toBe(0);
    expect(clearResult.stdout).toContain("Status cleared");
  });

  test("status set --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["status", "set", "--emoji", "☕", "--text", "Coffee", "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.statusEmoji).toBe("☕");
    expect(parsed.statusText).toBe("Coffee");

    // Cleanup
    await runCli(["status", "clear"], authEnv.env);
  });

  test("channels mark-read works", async () => {
    const { stdout, exitCode } = await runCli(
      ["channels", "mark-read", "--channel", channelId, "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Channel marked as read");
  });

  test("channels mark-read missing --channel exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["channels", "mark-read", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--channel");
  });

  test("unread list shows counts", async () => {
    const { stdout, exitCode } = await runCli(
      ["unread", "list", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    // May show channel counts or "All caught up!"
    expect(stdout.trim()).toBeTruthy();
  });

  test("unread list --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["unread", "list", "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(typeof parsed).toBe("object");
  });

  test("unread mark-all-read works", async () => {
    const { stdout, exitCode } = await runCli(
      ["unread", "mark-all-read", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("All channels marked as read");
  });

  test("unread mark-all-read --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["unread", "mark-all-read", "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(true);
  });

  test("files list returns 200", async () => {
    const { stdout, exitCode } = await runCli(
      ["files", "list", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    // May have files or "No files found."
    expect(stdout.trim()).toBeTruthy();
  });

  test("files list --json outputs valid JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["files", "list", "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("files");
    expect(Array.isArray(parsed.files)).toBe(true);
  });

  test("presence returns 200", async () => {
    const { stdout, exitCode } = await runCli(
      ["presence", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBeTruthy();
  });

  test("presence --json outputs valid JSON array", async () => {
    const { stdout, exitCode } = await runCli(
      ["presence", "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
  });

  test("messages schedule + scheduled round trip", async () => {
    const text = `e2e-sched-${testId()}`;
    const futureTime = new Date(Date.now() + 3_600_000).toISOString();

    const schedResult = await runCli(
      ["messages", "schedule", "--channel", channelId, "--text", text, "--at", futureTime, "--workspace", slug],
      authEnv.env,
    );
    expect(schedResult.exitCode).toBe(0);
    expect(schedResult.stdout).toContain("Message scheduled");

    const listResult = await runCli(
      ["messages", "scheduled", "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(listResult.exitCode).toBe(0);
    const parsed = JSON.parse(listResult.stdout);
    expect(parsed.scheduledMessages.some((m: { content: string }) => m.content === text)).toBe(true);
  });

  test("messages schedule missing --at exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["messages", "schedule", "--channel", channelId, "--text", "hello"],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--at");
  });

  test("channels join/leave round-trip", async () => {
    // Create a second channel to join/leave
    const name = `cli-e2e-jl-${testId()}`;
    const createResult = await runCli(
      ["channels", "create", "--name", name, "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(createResult.exitCode).toBe(0);
    const created = JSON.parse(createResult.stdout) as { id: string };

    // Leave the channel
    const leaveResult = await runCli(
      ["channels", "leave", "--channel", created.id, "--workspace", slug],
      authEnv.env,
    );
    expect(leaveResult.exitCode).toBe(0);
    expect(leaveResult.stdout).toContain("Left channel");

    // Join the channel back
    const joinResult = await runCli(
      ["channels", "join", "--channel", created.id, "--workspace", slug],
      authEnv.env,
    );
    expect(joinResult.exitCode).toBe(0);
    expect(joinResult.stdout).toContain("Joined channel");
  });

  test("channels join missing --channel exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["channels", "join", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--channel");
  });

  test("channels leave missing --channel exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["channels", "leave", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--channel");
  });
});

// ── DM commands (require dev servers + second user) ──────────────────

describe("dm commands", () => {
  let authEnv1: Awaited<ReturnType<typeof createAuthEnv>>;
  let slug: string;
  const user1Id = `cli-e2e-dm1-${testId()}`;
  const user2Id = `cli-e2e-dm2-${testId()}`;

  beforeAll(async () => {
    // Create user1 and workspace
    authEnv1 = await createAuthEnv({
      id: user1Id,
      displayName: "CLI DM User 1",
      email: `${user1Id}@openslaq.dev`,
    });

    const token1 = await signTestJwt({
      id: user1Id,
      displayName: "CLI DM User 1",
      email: `${user1Id}@openslaq.dev`,
      emailVerified: true,
    });
    const client1 = hc<AppType>(getBaseUrl(), {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const wsRes = await client1.api.workspaces.$post({
      json: { name: `CLI DM E2E ${testId()}` },
    });
    if (wsRes.status !== 201) {
      throw new Error(`Failed to create workspace: ${wsRes.status}`);
    }
    const workspace = (await wsRes.json()) as { slug: string };
    slug = workspace.slug;

    // Create user2 and add to workspace via invite
    const token2 = await signTestJwt({
      id: user2Id,
      displayName: "CLI DM User 2",
      email: `${user2Id}@openslaq.dev`,
      emailVerified: true,
    });
    const client2 = hc<AppType>(getBaseUrl(), {
      headers: { Authorization: `Bearer ${token2}` },
    });

    // Create invite and accept
    const inviteRes = await client1.api.workspaces[":slug"].invites.$post({
      param: { slug },
      json: {},
    });
    if (inviteRes.status !== 201) {
      throw new Error(`Failed to create invite: ${inviteRes.status}`);
    }
    const invite = (await inviteRes.json()) as { code: string };
    const acceptRes = await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
    if (acceptRes.status !== 200) {
      throw new Error(`Failed to accept invite: ${acceptRes.status}`);
    }
  });

  afterAll(async () => {
    const token = await signTestJwt({
      id: user1Id,
      displayName: "CLI DM User 1",
      email: `${user1Id}@openslaq.dev`,
      emailVerified: true,
    });
    const client = hc<AppType>(getBaseUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    await client.api.workspaces[":slug"].$delete({ param: { slug } });
    await cleanupAuthEnv(authEnv1.tempDir);
  });

  test("dm open returns channel ID", async () => {
    const { stdout, exitCode } = await runCli(
      ["dm", "open", "--user", user2Id, "--workspace", slug],
      authEnv1.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBeTruthy();
  });

  test("dm send + messages round trip", async () => {
    const text = `e2e-dm-msg-${testId()}`;

    const sendResult = await runCli(
      ["dm", "send", "--user", user2Id, "--text", text, "--workspace", slug],
      authEnv1.env,
    );
    expect(sendResult.exitCode).toBe(0);
    expect(sendResult.stdout).toContain("Message sent");

    const msgsResult = await runCli(
      ["dm", "messages", "--user", user2Id, "--workspace", slug],
      authEnv1.env,
    );
    expect(msgsResult.exitCode).toBe(0);
    expect(msgsResult.stdout).toContain(text);
  });

  test("dm list shows conversation", async () => {
    // Ensure a DM exists first
    await runCli(
      ["dm", "open", "--user", user2Id, "--workspace", slug],
      authEnv1.env,
    );

    const { stdout, exitCode } = await runCli(
      ["dm", "list", "--workspace", slug],
      authEnv1.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("CLI DM User 2");
  });

  test("dm list --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["dm", "list", "--workspace", slug, "--json"],
      authEnv1.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
  });

  test("dm open missing --user exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["dm", "open", "--workspace", slug],
      authEnv1.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--user");
  });

  test("dm send missing --user exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["dm", "send", "--text", "hello"],
      authEnv1.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--user");
  });

  test("dm send missing --text exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["dm", "send", "--user", user2Id],
      authEnv1.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--text");
  });
});

// ── API Keys commands (require dev servers) ─────────────────────────

describe("api-keys commands", () => {
  let authEnv: Awaited<ReturnType<typeof createAuthEnv>>;
  const userId = `cli-e2e-ak-${testId()}`;

  beforeAll(async () => {
    authEnv = await createAuthEnv({
      id: userId,
      displayName: "CLI E2E API Keys",
      email: `${userId}@openslaq.dev`,
    });
  });

  afterAll(async () => {
    await cleanupAuthEnv(authEnv.tempDir);
  });

  test("api-keys create + list + delete round trip", async () => {
    const name = `e2e-key-${testId()}`;

    // Create
    const createResult = await runCli(
      ["api-keys", "create", "--name", name, "--scopes", "chat:read,users:read"],
      authEnv.env,
    );
    expect(createResult.exitCode).toBe(0);
    expect(createResult.stdout).toContain("Token:");
    expect(createResult.stdout).toContain("Save this token");

    // Create again with --json to get the ID
    const name2 = `e2e-key2-${testId()}`;
    const createJson = await runCli(
      ["api-keys", "create", "--name", name2, "--scopes", "chat:read", "--json"],
      authEnv.env,
    );
    expect(createJson.exitCode).toBe(0);
    const created = JSON.parse(createJson.stdout);
    expect(created.token).toBeTruthy();
    expect(created.id).toBeTruthy();

    // List
    const listResult = await runCli(["api-keys", "list"], authEnv.env);
    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain(name2);

    // Delete
    const deleteResult = await runCli(
      ["api-keys", "delete", "--id", created.id],
      authEnv.env,
    );
    expect(deleteResult.exitCode).toBe(0);
    expect(deleteResult.stdout).toContain("API key deleted");
  });

  test("api-keys create missing --name exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["api-keys", "create", "--scopes", "chat:read"],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--name");
  });

  test("api-keys create missing --scopes exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["api-keys", "create", "--name", "test"],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--scopes");
  });

  test("api-keys list --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["api-keys", "list", "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("keys");
    expect(Array.isArray(parsed.keys)).toBe(true);
  });
});

// ── Emoji commands (require dev servers) ────────────────────────────

describe("emoji commands", () => {
  let authEnv: Awaited<ReturnType<typeof createAuthEnv>>;
  let slug: string;
  const userId = `cli-e2e-em-${testId()}`;

  beforeAll(async () => {
    authEnv = await createAuthEnv({
      id: userId,
      displayName: "CLI E2E Emoji",
      email: `${userId}@openslaq.dev`,
    });

    const token = await signTestJwt({
      id: userId,
      displayName: "CLI E2E Emoji",
      email: `${userId}@openslaq.dev`,
      emailVerified: true,
    });
    const client = hc<AppType>(getBaseUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const wsRes = await client.api.workspaces.$post({
      json: { name: `CLI Emoji E2E ${testId()}` },
    });
    if (wsRes.status !== 201) {
      throw new Error(`Failed to create workspace: ${wsRes.status}`);
    }
    const workspace = (await wsRes.json()) as { slug: string };
    slug = workspace.slug;
  });

  afterAll(async () => {
    const token = await signTestJwt({
      id: userId,
      displayName: "CLI E2E Emoji",
      email: `${userId}@openslaq.dev`,
      emailVerified: true,
    });
    const client = hc<AppType>(getBaseUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    await client.api.workspaces[":slug"].$delete({ param: { slug } });
    await cleanupAuthEnv(authEnv.tempDir);
  });

  test("emoji list initially empty", async () => {
    const { stdout, exitCode } = await runCli(
      ["emoji", "list", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("No custom emoji found");
  });

  test("emoji upload + list + delete round trip", async () => {
    // Create a temp 4x4 RGBA PNG file (valid for sharp processing)
    const pngBytes = new Uint8Array([
      137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,4,0,0,0,4,
      8,6,0,0,0,169,241,158,126,0,0,0,9,112,72,89,115,0,0,3,232,0,0,
      3,232,1,181,123,82,107,0,0,0,18,73,68,65,84,120,156,99,248,207,
      192,240,31,25,51,144,46,0,0,60,64,31,225,224,129,119,180,0,0,0,
      0,73,69,78,68,174,66,96,130,
    ]);
    const tmpFile = `/tmp/openslaq-emoji-e2e-${testId()}.png`;
    await Bun.write(tmpFile, pngBytes);

    const emojiName = `e2e-${testId()}`;

    // Upload
    const uploadResult = await runCli(
      ["emoji", "upload", "--file", tmpFile, "--name", emojiName, "--workspace", slug],
      authEnv.env,
    );
    expect(uploadResult.exitCode).toBe(0);
    expect(uploadResult.stdout).toContain(`:${emojiName}:`);

    // List
    const listResult = await runCli(
      ["emoji", "list", "--workspace", slug],
      authEnv.env,
    );
    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain(emojiName);

    // Upload --json to get ID for deletion
    const tmpFile2 = `/tmp/openslaq-emoji-e2e2-${testId()}.png`;
    await Bun.write(tmpFile2, pngBytes);
    const emojiName2 = `e2e2-${testId()}`;
    const uploadJson = await runCli(
      ["emoji", "upload", "--file", tmpFile2, "--name", emojiName2, "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(uploadJson.exitCode).toBe(0);
    const uploaded = JSON.parse(uploadJson.stdout);
    expect(uploaded.emoji.id).toBeTruthy();

    // Delete
    const deleteResult = await runCli(
      ["emoji", "delete", "--id", uploaded.emoji.id, "--workspace", slug],
      authEnv.env,
    );
    expect(deleteResult.exitCode).toBe(0);
    expect(deleteResult.stdout).toContain("Emoji deleted");

    // Cleanup temp files
    try { await (await import("node:fs/promises")).rm(tmpFile); } catch { /* ignore */ }
    try { await (await import("node:fs/promises")).rm(tmpFile2); } catch { /* ignore */ }
  });

  test("emoji upload missing --file exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["emoji", "upload", "--name", "test", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--file");
  });

  test("emoji upload missing --name exits 1", async () => {
    const { stderr, exitCode } = await runCli(
      ["emoji", "upload", "--file", "/tmp/nonexistent.png", "--workspace", slug],
      authEnv.env,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--name");
  });

  test("emoji bulk-upload from directory", async () => {
    const tmpDir = `/tmp/openslaq-bulk-e2e-${testId()}`;
    await (await import("node:fs/promises")).mkdir(tmpDir, { recursive: true });

    const pngBytes = new Uint8Array([
      137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,4,0,0,0,4,
      8,6,0,0,0,169,241,158,126,0,0,0,9,112,72,89,115,0,0,3,232,0,0,
      3,232,1,181,123,82,107,0,0,0,18,73,68,65,84,120,156,99,248,207,
      192,240,31,25,51,144,46,0,0,60,64,31,225,224,129,119,180,0,0,0,
      0,73,69,78,68,174,66,96,130,
    ]);
    await Bun.write(`${tmpDir}/bulk-a-${testId()}.png`, pngBytes);
    await Bun.write(`${tmpDir}/bulk-b-${testId()}.png`, pngBytes);

    const result = await runCli(
      ["emoji", "bulk-upload", "--dir", tmpDir, "--workspace", slug],
      authEnv.env,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Uploaded 2/2 emoji");

    // Cleanup
    try { await (await import("node:fs/promises")).rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  test("emoji list --json outputs JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["emoji", "list", "--workspace", slug, "--json"],
      authEnv.env,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("emojis");
    expect(Array.isArray(parsed.emojis)).toBe(true);
  });
});

// ── Unauthenticated (no token file) ────────────────────────────────

describe("unauthenticated", () => {
  const noAuthEnv = {
    OPENSLAQ_TOKEN_FILE: "/tmp/nonexistent-openslaq-auth.json",
    OPENSLAQ_STACK_AUTH_BASE: "http://localhost:19999",
    OPENSLAQ_API_URL: getBaseUrl(),
  };

  test("whoami without auth exits 1", async () => {
    const { stderr, exitCode } = await runCli(["whoami"], noAuthEnv);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Not logged in");
  });

  test("channels list without auth exits 1", async () => {
    const { stderr, exitCode } = await runCli(["channels", "list"], noAuthEnv);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Not logged in");
  });
});
