import { createAdaptorServer } from "@hono/node-server";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@openslaq/shared";
import app from "./app";
import { setupSocketHandlers } from "./socket";
import { setIO } from "./socket/io";
import { env } from "./env";
import { startCleanup } from "./rate-limit";
import { closeOrphanedHuddleMessages } from "./messages/service";
import { startScheduledMessageProcessor } from "./messages/scheduled-service";
import { startReminderProcessor } from "./commands/reminder-service";

// Use Node.js HTTP server for Socket.IO compatibility
const httpServer = createAdaptorServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, origin?: boolean) => void,
    ) => {
      if (!origin || env.CORS_ORIGIN.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});

setupSocketHandlers(io);
setIO(io);

const port = env.PORT ?? env.API_PORT;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`API server running on http://localhost:${port}`);
  startCleanup();
  startScheduledMessageProcessor();
  startReminderProcessor();
  closeOrphanedHuddleMessages()
    .then((count) => {
      if (count > 0) console.log(`Closed ${count} orphaned huddle message(s)`);
    })
    .catch((err) => console.error("Failed to close orphaned huddle messages:", err));
});
