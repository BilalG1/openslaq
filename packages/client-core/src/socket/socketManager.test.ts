import { describe, expect, it } from "bun:test";
import { SocketManager } from "./socketManager";

type Listener = (...args: unknown[]) => void;

class MockSocket {
  auth: unknown = null;
  connected = false;
  emitted: Array<{ event: string; payload: unknown }> = [];
  private listeners = new Map<string, Set<Listener>>();
  io = {
    listeners: new Map<string, Set<Listener>>(),
    on: (event: string, listener: Listener) => {
      if (!this.io.listeners.has(event)) {
        this.io.listeners.set(event, new Set());
      }
      this.io.listeners.get(event)?.add(listener);
    },
    emit: (event: string, ...args: unknown[]) => {
      this.io.listeners.get(event)?.forEach((listener) => listener(...args));
    },
    removeAllListeners: () => {
      this.io.listeners.clear();
    },
  };

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);
    return this;
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
    return true;
  }

  connect() {
    return this;
  }

  disconnect() {
    this.connected = false;
    this.trigger("disconnect", "io client disconnect");
    return this;
  }

  removeAllListeners() {
    this.listeners.clear();
    return this;
  }

  trigger(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }
}

const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("SocketManager", () => {
  it("creates a single socket and reuses it for repeated connect attempts", async () => {
    let createCount = 0;
    const socket = new MockSocket();
    const manager = new SocketManager({
      apiUrl: "http://test",
      createSocket: () => {
        createCount += 1;
        return socket as never;
      },
    });

    await manager.connect(async () => "token-a");
    await manager.connect(async () => "token-b");

    expect(createCount).toBe(1);
    expect(socket.auth).toEqual({ token: "token-b" });
  });

  it("ignores stale async token resolution after logout", async () => {
    let createCount = 0;
    const deferred = Promise.withResolvers<string | null>();
    const manager = new SocketManager({
      apiUrl: "http://test",
      createSocket: () => {
        createCount += 1;
        return new MockSocket() as never;
      },
    });

    void manager.connect(() => deferred.promise);
    manager.disconnectForLogout();
    deferred.resolve("late-token");
    await tick();

    expect(createCount).toBe(0);
    expect(manager.getSnapshot().status).toBe("idle");
  });

  it("rejoins desired channels on reconnect", async () => {
    const socket = new MockSocket();
    const manager = new SocketManager({
      apiUrl: "http://test",
      createSocket: () => socket as never,
    });

    manager.joinChannel("channel-1" as never);
    manager.joinChannel("channel-2" as never);
    await manager.connect(async () => "token");

    socket.connected = true;
    socket.trigger("connect");

    const joined = socket.emitted.filter((item) => item.event === "channel:join");
    expect(joined).toEqual([
      { event: "channel:join", payload: { channelId: "channel-1" } },
      { event: "channel:join", payload: { channelId: "channel-2" } },
    ]);
    expect(manager.getSnapshot().status).toBe("connected");
  });

  it("fetches fresh token on reconnect_attempt", async () => {
    const socket = new MockSocket();
    let tokenCallCount = 0;
    const manager = new SocketManager({
      apiUrl: "http://test",
      createSocket: () => socket as never,
    });

    await manager.connect(async () => {
      tokenCallCount += 1;
      return `token-${tokenCallCount}`;
    });

    expect(socket.auth).toEqual({ token: "token-1" });

    // Simulate reconnect attempt
    socket.io.emit("reconnect_attempt");
    await tick();

    expect(tokenCallCount).toBe(2);
    expect(socket.auth).toEqual({ token: "token-2" });
  });

  it("emits leave when connected and removes channel from desired set", async () => {
    const socket = new MockSocket();
    const manager = new SocketManager({
      apiUrl: "http://test",
      createSocket: () => socket as never,
    });

    await manager.connect(async () => "token");
    socket.connected = true;
    socket.trigger("connect");

    manager.joinChannel("channel-1" as never);
    manager.leaveChannel("channel-1" as never);

    const leaves = socket.emitted.filter((item) => item.event === "channel:leave");
    expect(leaves).toEqual([{ event: "channel:leave", payload: { channelId: "channel-1" } }]);

    socket.emitted = [];
    socket.trigger("connect");
    const rejoin = socket.emitted.filter((item) => item.event === "channel:join");
    expect(rejoin).toEqual([]);
  });
});
