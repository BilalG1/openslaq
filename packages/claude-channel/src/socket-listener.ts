import { io as ioClient, type Socket } from "socket.io-client";
import type { OpenSlaqClient } from "./openslaq-client";

export interface IncomingMessage {
  messageId: string;
  channelId: string;
  userId: string;
  content: string;
  isBot?: boolean;
}

export type MessageHandler = (msg: IncomingMessage) => void;

export class SocketListener {
  private socket: Socket | null = null;
  private botUserId: string | null = null;
  private handler: MessageHandler | null = null;

  constructor(
    private apiUrl: string,
    private botToken: string,
    private client: OpenSlaqClient,
  ) {}

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async connect(): Promise<void> {
    // Discover bot's channels to join
    const channels = await this.client.listChannels();

    this.socket = ioClient(this.apiUrl, {
      auth: { token: this.botToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on("connect", () => {
      process.stderr.write("[openslaq-channel] Connected to Socket.IO\n");

      // Join all channels the bot is a member of
      for (const ch of channels) {
        this.socket!.emit("channel:join", { channelId: ch.id });
      }
    });

    this.socket.on("disconnect", (reason) => {
      process.stderr.write(
        `[openslaq-channel] Disconnected: ${reason}\n`,
      );
    });

    this.socket.on("message:new", (message: { id: string; channelId: string; userId: string; content: string; isBot?: boolean }) => {
      // Ignore bot's own messages
      if (message.isBot) return;

      if (this.handler) {
        this.handler({
          messageId: message.id,
          channelId: message.channelId,
          userId: message.userId,
          content: message.content,
          isBot: message.isBot,
        });
      }
    });

    // Wait for initial connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Socket.IO connection timed out")),
        10_000,
      );
      this.socket!.on("connect", () => {
        clearTimeout(timeout);
        resolve();
      });
      this.socket!.on("connect_error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
