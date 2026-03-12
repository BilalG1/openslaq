import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  createTestClient,
  createTestWorkspace,
  cleanupTestWorkspaces,
  signTestJwt,
  testId,
} from "../helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

type Client = ReturnType<typeof hc<AppType>>;

/** Create a valid 4x4 RGBA PNG as a File. */
function createTestImage(filename = "test.png"): File {
  const pngBytes = new Uint8Array([
    137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,4,0,0,0,4,
    8,6,0,0,0,169,241,158,126,0,0,0,9,112,72,89,115,0,0,3,232,0,0,
    3,232,1,181,123,82,107,0,0,0,18,73,68,65,84,120,156,99,248,207,
    192,240,31,25,51,144,46,0,0,60,64,31,225,224,129,119,180,0,0,0,
    0,73,69,78,68,174,66,96,130,
  ]);
  return new File([pngBytes], filename, { type: "image/png" });
}

describe("emoji command (integration)", () => {
  let client: Client;
  let slug: string;
  let token: string;
  let baseUrl: string;

  beforeAll(async () => {
    const userId = `cli-em-${testId()}`;
    const ctx = await createTestClient({
      id: userId,
      displayName: "CLI Emoji User",
      email: `cli-em-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
    token = (await signTestJwt({
      id: userId,
      displayName: "CLI Emoji User",
      email: `cli-em-${testId()}@openslaq.dev`,
      emailVerified: true,
    }));
    baseUrl = process.env.API_BASE_URL || "http://localhost:3001";
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("list emoji on empty workspace returns empty array", async () => {
    const res = await client.api.workspaces[":slug"].emoji.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { emojis: any[] };
    expect(data.emojis).toHaveLength(0);
  });

  test("upload emoji returns created emoji", async () => {
    const name = `test-${testId()}`;
    const file = createTestImage("test-emoji.png");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    const res = await fetch(`${baseUrl}/api/workspaces/${slug}/emoji`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { emoji: any };
    expect(data.emoji.name).toBe(name);
    expect(data.emoji.url).toBeTruthy();
  });

  test("list emoji after upload includes it", async () => {
    const name = `list-${testId()}`;
    const file = createTestImage(`${name}.png`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    await fetch(`${baseUrl}/api/workspaces/${slug}/emoji`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const res = await client.api.workspaces[":slug"].emoji.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { emojis: { name: string }[] };
    const found = data.emojis.find((e) => e.name === name);
    expect(found).toBeDefined();
  });

  test("upload duplicate name returns 409", async () => {
    const name = `dup-${testId()}`;

    const formData1 = new FormData();
    formData1.append("file", createTestImage(`${name}.png`));
    formData1.append("name", name);
    await fetch(`${baseUrl}/api/workspaces/${slug}/emoji`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData1,
    });

    const formData2 = new FormData();
    formData2.append("file", createTestImage(`${name}.png`));
    formData2.append("name", name);
    const res = await fetch(`${baseUrl}/api/workspaces/${slug}/emoji`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData2,
    });
    expect(res.status).toBe(409);
  });

  test("delete emoji", async () => {
    const name = `del-${testId()}`;

    const formData = new FormData();
    formData.append("file", createTestImage(`${name}.png`));
    formData.append("name", name);

    const createRes = await fetch(`${baseUrl}/api/workspaces/${slug}/emoji`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const created = (await createRes.json()) as { emoji: { id: string } };

    const delRes = await client.api.workspaces[":slug"].emoji[":emojiId"].$delete({
      param: { slug, emojiId: created.emoji.id },
    });
    expect(delRes.status).toBe(200);

    // Verify deleted
    const listRes = await client.api.workspaces[":slug"].emoji.$get({
      param: { slug },
    });
    const data = (await listRes.json()) as { emojis: { id: string }[] };
    const found = data.emojis.find((e) => e.id === created.emoji.id);
    expect(found).toBeUndefined();
  });
});
