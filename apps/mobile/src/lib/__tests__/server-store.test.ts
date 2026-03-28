import {
  getActiveServer,
  setActiveServer,
  clearActiveServer,
  getServerSession,
  setServerSession,
  clearServerSession,
  serverIdFromUrl,
  type ServerConfig,
} from "../server-store";

describe("server-store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("serverIdFromUrl", () => {
    it("generates deterministic IDs", () => {
      const id1 = serverIdFromUrl("https://example.com");
      const id2 = serverIdFromUrl("https://example.com");
      expect(id1).toBe(id2);
    });

    it("normalizes trailing slashes", () => {
      const id1 = serverIdFromUrl("https://example.com");
      const id2 = serverIdFromUrl("https://example.com/");
      expect(id1).toBe(id2);
    });

    it("is case-insensitive", () => {
      const id1 = serverIdFromUrl("https://Example.COM");
      const id2 = serverIdFromUrl("https://example.com");
      expect(id1).toBe(id2);
    });

    it("generates different IDs for different URLs", () => {
      const id1 = serverIdFromUrl("https://a.com");
      const id2 = serverIdFromUrl("https://b.com");
      expect(id1).not.toBe(id2);
    });

    it("starts with srv_ prefix", () => {
      const id = serverIdFromUrl("https://example.com");
      expect(id).toMatch(/^srv_/);
    });
  });

  describe("active server", () => {
    const testServer: ServerConfig = {
      id: "srv_test",
      url: "https://test.example.com",
      name: "Test Server",
      authType: "builtin",
    };

    it("returns null when no server stored", async () => {
      const server = await getActiveServer();
      expect(server).toBeNull();
    });

    it("stores and retrieves a server", async () => {
      await setActiveServer(testServer);
      const server = await getActiveServer();
      expect(server).toEqual(testServer);
    });

    it("replaces the previous server", async () => {
      await setActiveServer(testServer);
      const other: ServerConfig = {
        id: "srv_other",
        url: "https://other.example.com",
        name: "Other Server",
        authType: "stack-auth",
        stackProjectId: "proj_1",
        stackPublishableKey: "pck_1",
      };
      await setActiveServer(other);
      const server = await getActiveServer();
      expect(server).toEqual(other);
    });

    it("clears the stored server", async () => {
      await setActiveServer(testServer);
      await clearActiveServer();
      const server = await getActiveServer();
      expect(server).toBeNull();
    });
  });

  describe("server sessions", () => {
    it("returns null for unknown server", async () => {
      const session = await getServerSession("srv_unknown");
      expect(session).toBeNull();
    });

    it("stores and retrieves a session", async () => {
      const session = {
        accessToken: "at-123",
        refreshToken: "rt-456",
        userId: "user-789",
      };
      await setServerSession("srv_test", session);
      const retrieved = await getServerSession("srv_test");
      expect(retrieved).toEqual(session);
    });

    it("clears a session", async () => {
      await setServerSession("srv_test", {
        accessToken: "at",
        refreshToken: "rt",
        userId: "uid",
      });
      await clearServerSession("srv_test");
      const session = await getServerSession("srv_test");
      expect(session).toBeNull();
    });
  });
});
