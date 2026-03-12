import { afterAll } from "bun:test";
import { createServer } from "node:net";
import { cleanupTestWorkspaces } from "./helpers/api-client";

process.env.E2E_TEST_SECRET ??= "openslaq-e2e-test-secret-do-not-use-in-prod";
process.env.VITE_STACK_PROJECT_ID ??= "924565c5-6377-44b7-aa75-6b7de8d311f4";
process.env.ADMIN_USER_IDS = "admin-test-user";
process.env.API_ARTIFICIAL_DELAY_MS ??= "0";
process.env.GITHUB_WEBHOOK_SECRET ??= "test-webhook-secret-123";

const [{ default: app }, { setIO }, { setEnabled }] = await Promise.all([
  import("../../api/src/app"),
  import("../../api/src/socket/io"),
  import("../../api/src/rate-limit/store"),
]);

// Disable rate limiting by default so non-rate-limit tests aren't affected
setEnabled(false);

setIO({
  to() {
    return {
      emit() {
        return true;
      },
    };
  },
  sockets: {
    sockets: new Map(),
  },
} as never);

async function getFreePort() {
  return await new Promise<number>((resolve, reject) => {
    const socket = createServer();
    socket.listen(0, "127.0.0.1", () => {
      const addr = socket.address();
      if (!addr || typeof addr === "string") {
        socket.close();
        reject(new Error("Failed to determine a free port"));
        return;
      }
      const { port } = addr;
      socket.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(port);
      });
    });
    // Bun's net.Server type lacks EventEmitter methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).on("error", reject);
  });
}

const port = await getFreePort();
const server = Bun.serve({
  port,
  fetch: app.fetch,
});

process.env.API_BASE_URL = `http://127.0.0.1:${server.port}`;

afterAll(async () => {
  await cleanupTestWorkspaces();
  server.stop(true);
});
