import type { ChannelId } from "@openslaq/shared";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@openslaq/shared";
import { io, type Socket } from "socket.io-client";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type SocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface SocketSnapshot {
  socket: TypedSocket | null;
  status: SocketStatus;
  lastError: string | null;
}

export type SnapshotListener = (snapshot: SocketSnapshot) => void;
export type TokenProvider = () => Promise<string | null>;

interface SocketManagerOptions {
  apiUrl: string;
  createSocket?: () => TypedSocket;
}

export class SocketManager {
  readonly apiUrl: string;
  private socket: TypedSocket | null = null;
  private status: SocketStatus = "idle";
  private lastError: string | null = null;
  private desiredChannels = new Set<ChannelId>();
  private snapshotListeners = new Set<SnapshotListener>();
  private connectAttempt = 0;
  private intentionallyDisconnected = true;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly createSocket: () => TypedSocket;
  private tokenProvider: TokenProvider | null = null;

  constructor(options: SocketManagerOptions) {
    this.apiUrl = options.apiUrl;
    this.createSocket =
      options.createSocket ??
      (() =>
        io(options.apiUrl, {
          autoConnect: false,
          reconnection: true,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
        }));
  }

  subscribe(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  getSnapshot(): SocketSnapshot {
    return {
      socket: this.socket,
      status: this.status,
      lastError: this.lastError,
    };
  }

  getSocket(): TypedSocket | null {
    return this.socket;
  }

  async connect(tokenProvider: TokenProvider): Promise<void> {
    this.tokenProvider = tokenProvider;
    const attempt = ++this.connectAttempt;
    this.intentionallyDisconnected = false;
    this.updateStatus("connecting", null);

    const token = await tokenProvider();
    if (attempt !== this.connectAttempt || !token) {
      if (!token) {
        this.updateStatus("error", "Missing access token");
      }
      return;
    }

    const socket = this.ensureSocket();
    socket.auth = { token };
    socket.connect();
  }

  disconnectForLogout(): void {
    this.connectAttempt += 1;
    this.intentionallyDisconnected = true;
    this.desiredChannels.clear();

    if (this.socket) {
      this.socket.disconnect();
    }

    this.updateStatus("idle", null);
  }

  destroy(): void {
    this.stopHeartbeat();
    this.disconnectForLogout();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.io.removeAllListeners();
    }
    this.socket = null;
    this.emitSnapshot();
  }

  joinChannel(channelId: ChannelId): void {
    this.desiredChannels.add(channelId);

    if (this.socket?.connected) {
      this.socket.emit("channel:join", { channelId });
    }
  }

  leaveChannel(channelId: ChannelId): void {
    this.desiredChannels.delete(channelId);

    if (this.socket?.connected) {
      this.socket.emit("channel:leave", { channelId });
    }
  }

  private ensureSocket(): TypedSocket {
    if (this.socket) return this.socket;

    const socket = this.createSocket();

    socket.on("connect", () => {
      this.updateStatus("connected", null);
      for (const channelId of this.desiredChannels) {
        socket.emit("channel:join", { channelId });
      }
      this.startHeartbeat();
    });

    socket.on("connect_error", (error: Error) => {
      this.updateStatus("error", error.message || "Socket connection error");
    });

    socket.on("disconnect", (reason: string) => {
      this.stopHeartbeat();
      if (reason === "io client disconnect" || this.intentionallyDisconnected) {
        this.updateStatus("disconnected", null);
        return;
      }
      this.updateStatus("reconnecting", this.lastError);
    });

    socket.io.on("reconnect_attempt", async () => {
      if (!this.intentionallyDisconnected) {
        this.updateStatus("reconnecting", this.lastError);
        // Fetch a fresh token so reconnections don't reuse an expired one
        if (this.tokenProvider) {
          const freshToken = await this.tokenProvider();
          if (freshToken && this.socket) {
            this.socket.auth = { token: freshToken };
          }
        }
      }
    });

    this.socket = socket;
    this.emitSnapshot();
    return socket;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("presence:heartbeat");
      }
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateStatus(status: SocketStatus, lastError: string | null): void {
    this.status = status;
    this.lastError = lastError;
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }
}
