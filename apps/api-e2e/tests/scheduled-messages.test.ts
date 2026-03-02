import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";
import { processDueScheduledMessages } from "../../api/src/messages/scheduled-service";
import { db } from "../../api/src/db";
import { scheduledMessages } from "../../api/src/messages/scheduled-schema";
import { eq } from "drizzle-orm";

describe("scheduled messages", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a channel
    const chRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `sched-test-${testId()}` },
    });
    const channel = (await chRes.json()) as { id: string };
    channelId = channel.id;
  });

  function futureTime(minutesFromNow: number): string {
    return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
  }

  test("create scheduled message → 201", async () => {
    const res = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "Hello from the future!",
        scheduledFor: futureTime(30),
      },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { id: string; status: string; content: string };
    expect(data.id).toBeDefined();
    expect(data.status).toBe("pending");
    expect(data.content).toBe("Hello from the future!");
  });

  test("list scheduled messages includes created message", async () => {
    // Create a scheduled message
    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "List test message",
        scheduledFor: futureTime(60),
      },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const listRes = await client.api.workspaces[":slug"]["scheduled-messages"].$get({
      param: { slug },
    });
    expect(listRes.status).toBe(200);
    const data = (await listRes.json()) as {
      scheduledMessages: Array<{ id: string; channelName: string }>;
    };
    expect(data.scheduledMessages.some((m) => m.id === created.id)).toBe(true);
    // Should include channel name
    const item = data.scheduledMessages.find((m) => m.id === created.id);
    expect(item?.channelName).toBeDefined();
  });

  test("get single scheduled message", async () => {
    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "Get test message",
        scheduledFor: futureTime(60),
      },
    });
    const created = (await createRes.json()) as { id: string };

    const getRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$get({
      param: { slug, id: created.id },
    });
    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as { id: string; content: string };
    expect(data.content).toBe("Get test message");
  });

  test("update scheduled message content", async () => {
    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "Original content",
        scheduledFor: futureTime(60),
      },
    });
    const created = (await createRes.json()) as { id: string };

    const updateRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$put({
      param: { slug, id: created.id },
      json: { content: "Updated content" },
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as { content: string };
    expect(updated.content).toBe("Updated content");
  });

  test("update scheduled message time (reschedule)", async () => {
    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "Reschedule test",
        scheduledFor: futureTime(60),
      },
    });
    const created = (await createRes.json()) as { id: string };

    const newTime = futureTime(120);
    const updateRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$put({
      param: { slug, id: created.id },
      json: { scheduledFor: newTime },
    });
    expect(updateRes.status).toBe(200);
  });

  test("delete scheduled message → 200", async () => {
    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "Delete test",
        scheduledFor: futureTime(60),
      },
    });
    const created = (await createRes.json()) as { id: string };

    const deleteRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$delete({
      param: { slug, id: created.id },
    });
    expect(deleteRes.status).toBe(200);

    // Should not appear in list
    const listRes = await client.api.workspaces[":slug"]["scheduled-messages"].$get({
      param: { slug },
    });
    const data = (await listRes.json()) as {
      scheduledMessages: Array<{ id: string }>;
    };
    expect(data.scheduledMessages.some((m) => m.id === created.id)).toBe(false);
  });

  test("past time → 400", async () => {
    const res = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "Past message",
        scheduledFor: new Date(Date.now() - 60_000).toISOString(),
      },
    });
    expect(res.status).toBe(400);
  });

  test("channel count endpoint returns correct number", async () => {
    // Create 2 scheduled messages
    await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: { channelId, content: "Count 1", scheduledFor: futureTime(60) },
    });
    await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: { channelId, content: "Count 2", scheduledFor: futureTime(60) },
    });

    const res = await client.api.workspaces[":slug"]["scheduled-messages"].channel[":channelId"].$get({
      param: { slug, channelId },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { count: number };
    expect(data.count).toBeGreaterThanOrEqual(2);
  });

  test("messages are private (other users can't see them)", async () => {
    // Create a message as user 1
    await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "Private scheduled message",
        scheduledFor: futureTime(60),
      },
    });

    // Create a second user
    const ctx2 = await createTestClient({
      id: `sched-privacy-${testId()}`,
      displayName: "Schedule Privacy",
      email: `sched-privacy-${testId()}@openslaq.dev`,
      emailVerified: true,
    });

    const res = await ctx2.client.api.workspaces[":slug"]["scheduled-messages"].$get({
      param: { slug },
    });

    if (res.status === 200) {
      const data = (await res.json()) as {
        scheduledMessages: Array<{ content: string }>;
      };
      expect(
        data.scheduledMessages.some((m) => m.content === "Private scheduled message"),
      ).toBe(false);
    }
    // If the user can't access the workspace (403/404), that's also fine
  });

  test("non-existent scheduled message → 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$get({
      param: { slug, id: fakeId },
    });
    expect(res.status).toBe(404);
  });

  test("empty content without attachments → 400", async () => {
    const res = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "",
        scheduledFor: futureTime(60),
      },
    });
    expect(res.status).toBe(400);
  });

  test("processor: archived channel → status=failed", async () => {
    const archChRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `sched-arch-${testId()}` },
    });
    const archChannel = (await archChRes.json()) as { id: string };

    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId: archChannel.id,
        content: `archived-test-${testId()}`,
        scheduledFor: futureTime(30),
      },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    // Archive the channel
    await client.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: archChannel.id },
    });

    // Backdate to make it due now
    await db
      .update(scheduledMessages)
      .set({ scheduledFor: new Date(Date.now() - 1000) })
      .where(eq(scheduledMessages.id, created.id));

    await processDueScheduledMessages();

    const getRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$get({
      param: { slug, id: created.id },
    });
    const data = (await getRes.json()) as { status: string; failureReason: string | null };
    expect(data.status).toBe("failed");
    expect(data.failureReason).toBe("Channel is archived");
  });

  test("processor: user removed from channel → status=failed", async () => {
    const leaveChRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `sched-leave-${testId()}` },
    });
    const leaveChannel = (await leaveChRes.json()) as { id: string };

    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId: leaveChannel.id,
        content: `leave-test-${testId()}`,
        scheduledFor: futureTime(30),
      },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    // Remove user from channel
    await client.api.workspaces[":slug"].channels[":id"].leave.$post({
      param: { slug, id: leaveChannel.id },
    });

    // Backdate to make it due now
    await db
      .update(scheduledMessages)
      .set({ scheduledFor: new Date(Date.now() - 1000) })
      .where(eq(scheduledMessages.id, created.id));

    await processDueScheduledMessages();

    const getRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$get({
      param: { slug, id: created.id },
    });
    const data = (await getRes.json()) as { status: string; failureReason: string | null };
    expect(data.status).toBe("failed");
    expect(data.failureReason).toBe("User is no longer a channel member");
  });

  test("schedule in archived channel → 403", async () => {
    const archChRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `sched-arch2-${testId()}` },
    });
    const archChannel = (await archChRes.json()) as { id: string };

    await client.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: archChannel.id },
    });

    const res = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId: archChannel.id,
        content: "Should fail",
        scheduledFor: futureTime(30),
      },
    });
    expect(res.status).toBe(403);
  });

  test("schedule without channel membership → 403", async () => {
    const uid = testId();
    const ctx2 = await createTestClient({
      id: `sched-nomem-${uid}`,
      displayName: "Sched No Member",
      email: `sched-nomem-${uid}@openslaq.dev`,
    });
    await addToWorkspace(client, slug, ctx2.client);

    // ctx2 is in workspace but NOT in channelId
    const res = await ctx2.client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: "Should fail",
        scheduledFor: futureTime(30),
      },
    });
    expect(res.status).toBe(403);
  });

  test("update already-sent message → 404", async () => {
    // Create and send a message via processor
    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: `sent-update-test-${testId()}`,
        scheduledFor: futureTime(30),
      },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    // Mark as sent directly in DB
    await db
      .update(scheduledMessages)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(scheduledMessages.id, created.id));

    const updateRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$put({
      param: { slug, id: created.id },
      json: { content: "Updated" },
    });
    expect(updateRes.status).toBe(404);
  });

  test("delete already-sent message → 404", async () => {
    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: `sent-delete-test-${testId()}`,
        scheduledFor: futureTime(30),
      },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    // Mark as sent directly in DB
    await db
      .update(scheduledMessages)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(scheduledMessages.id, created.id));

    const deleteRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$delete({
      param: { slug, id: created.id },
    });
    expect(deleteRes.status).toBe(404);
  });

  test("update with past scheduledFor → 400", async () => {
    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: `update-past-${testId()}`,
        scheduledFor: futureTime(30),
      },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const updateRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$put({
      param: { slug, id: created.id },
      json: { scheduledFor: new Date(Date.now() - 60_000).toISOString() },
    });
    expect(updateRes.status).toBe(400);
  });

  test("scheduler sends due message", async () => {
    // Create a message scheduled in the future (passes API validation)
    const scheduledFor = new Date(Date.now() + 61_000).toISOString();
    const uniqueContent = `scheduler-test-${testId()}`;

    const createRes = await client.api.workspaces[":slug"]["scheduled-messages"].$post({
      param: { slug },
      json: {
        channelId,
        content: uniqueContent,
        scheduledFor,
      },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    // Make the message due now by updating scheduledFor directly in DB
    await db
      .update(scheduledMessages)
      .set({ scheduledFor: new Date(Date.now() - 1000) })
      .where(eq(scheduledMessages.id, created.id));

    // Trigger the processor directly instead of waiting for the 30s interval
    await processDueScheduledMessages();

    // Verify status changed to sent
    const getRes = await client.api.workspaces[":slug"]["scheduled-messages"][":id"].$get({
      param: { slug, id: created.id },
    });
    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as { status: string };
    expect(data.status).toBe("sent");

    // Verify the message appeared in the channel
    const messagesRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(messagesRes.status).toBe(200);
    const messages = (await messagesRes.json()) as {
      messages: Array<{ content: string }>;
    };
    expect(messages.messages.some((m) => m.content === uniqueContent)).toBe(true);
  });
});
