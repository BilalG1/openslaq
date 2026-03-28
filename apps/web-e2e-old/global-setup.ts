import net from "node:net";

/** TCP health check — resolves if port is reachable, rejects otherwise. */
function checkPort(host: string, port: number, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`timeout connecting to ${host}:${port}`));
    });
    socket.on("error", (err) => {
      reject(err);
    });
  });
}

export default async function globalSetup() {
  const services = [
    { name: "postgres", port: 3002 },
    { name: "s3mock", port: 3003 },
  ];

  const errors: string[] = [];
  for (const { name, port } of services) {
    try {
      await checkPort("localhost", port);
    } catch {
      errors.push(`  - ${name} (port ${port})`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      [
        "Required Docker services are not running:",
        ...errors,
        "",
        "Start them with:  docker compose up -d",
      ].join("\n"),
    );
  }

  // Disable rate limiting so e2e tests aren't throttled
  const secret = "openslaq-e2e-test-secret-do-not-use-in-prod";
  await fetch("http://localhost:3001/api/test/disable-rate-limits", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  }).catch(() => {
    // Server may not be ready yet — tests will retry on 429
  });
}
