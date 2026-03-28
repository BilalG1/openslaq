import { test } from "./helpers/coverage-fixture";
import { setupMockAuth } from "./helpers/mock-auth";

/**
 * Discovery test: logs all requests to Stack Auth and the API server.
 * Useful for debugging which endpoints need mocking.
 */
test("log Stack Auth and API requests", async ({ page }) => {
  await setupMockAuth(page);

  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("stack-auth") || url.includes("localhost:3001")) {
      console.log(`[${req.method()}] ${url}`);
      const headers = req.headers();
      if (headers.authorization) {
        console.log(`  Authorization: ${headers.authorization.slice(0, 40)}...`);
      }
    }
  });

  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("stack-auth") || url.includes("localhost:3001")) {
      console.log(`  -> ${res.status()} ${url}`);
    }
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
});
