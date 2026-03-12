import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestClient,
  signTestJwt,
  testId,
} from "../helpers/api-client";

describe("upload command (integration)", () => {
  let token: string;
  let baseUrl: string;

  beforeAll(async () => {
    const userId = `cli-up-${testId()}`;
    await createTestClient({
      id: userId,
      displayName: "CLI Upload User",
      email: `${userId}@openslaq.dev`,
    });
    token = (await signTestJwt({
      id: userId,
      displayName: "CLI Upload User",
      email: `${userId}@openslaq.dev`,
      emailVerified: true,
    }));
    baseUrl = process.env.API_BASE_URL || "http://localhost:3001";
  });

  test("upload a file via raw fetch with FormData", async () => {
    const content = `test file content ${testId()}`;
    const file = new File([content], "test.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.append("files", file);

    const res = await fetch(`${baseUrl}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    expect(res.status).toBe(201);

    const data = (await res.json()) as {
      attachments: { filename: string; size: number; downloadUrl: string }[];
    };
    expect(data.attachments).toHaveLength(1);
    const att = data.attachments[0]!;
    expect(att.filename).toBe("test.txt");
    expect(att.size).toBeGreaterThan(0);
    expect(att.downloadUrl).toBeTruthy();
  });
});
