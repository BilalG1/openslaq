#!/usr/bin/env bun
/**
 * Creates a GitHub App for local development using the manifest flow.
 * Opens browser → user approves → catches redirect → exchanges code for credentials.
 *
 * Usage: bun scripts/setup/create-github-app.ts <tunnel-url>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CALLBACK_PORT = 3999;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

const tunnelBase = process.argv[2];
if (!tunnelBase) {
  console.error(
    "Usage: bun scripts/setup/create-github-app.ts <tunnel-url>\n" +
      "  e.g. bun scripts/setup/create-github-app.ts https://my-tunnel.example.com"
  );
  process.exit(1);
}

async function main() {
  console.log("Starting GitHub App creation via manifest flow...\n");

  const webhookUrl = `${tunnelBase}/api/integrations/github-bot/webhook`;
  console.log(`Using webhook URL: ${webhookUrl}\n`);

  const manifest = {
    name: `OpenSlaq Dev (${process.env.USER || "local"})`,
    url: "http://localhost:3000",
    hook_attributes: {
      url: webhookUrl,
      active: true,
    },
    redirect_url: CALLBACK_URL,
    callback_urls: [
      "http://localhost:3001/api/integrations/github-bot/callback",
    ],
    public: false,
    default_permissions: {
      contents: "read",
      issues: "read",
      pull_requests: "read",
      checks: "read",
      metadata: "read",
    },
    default_events: [
      "pull_request",
      "pull_request_review",
      "check_suite",
      "issues",
      "push",
    ],
  };

  // HTML form that auto-submits the manifest to GitHub
  const formHtml = `<!DOCTYPE html>
<html>
<body>
  <h2>Creating GitHub App...</h2>
  <p>If not redirected automatically, click the button below.</p>
  <form id="form" action="https://github.com/settings/apps/new" method="post">
    <input type="hidden" name="manifest" value='${JSON.stringify(manifest).replace(/'/g, "&#39;")}'>
    <button type="submit">Create GitHub App</button>
  </form>
  <script>document.getElementById('form').submit();</script>
</body>
</html>`;

  // Promise that resolves when we get the callback with the code
  let resolveCode: (code: string) => void;
  const codePromise = new Promise<string>((resolve) => {
    resolveCode = resolve;
  });

  // Start callback server
  const server = Bun.serve({
    port: CALLBACK_PORT,
    fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/") {
        return new Response(formHtml, {
          headers: { "Content-Type": "text/html" },
        });
      }

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        if (code) {
          resolveCode(code);
          return new Response(
            "<html><body><h2>GitHub App created! You can close this tab.</h2></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        }
        return new Response("Missing code parameter", { status: 400 });
      }

      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`Callback server listening on http://localhost:${CALLBACK_PORT}`);

  // Open browser to the form page
  const openUrl = `http://localhost:${CALLBACK_PORT}/`;
  console.log(`Opening browser to: ${openUrl}\n`);
  Bun.spawn(["open", openUrl]);

  console.log("Waiting for you to approve the app on GitHub...\n");

  // Wait for the code
  const code = await codePromise;
  console.log("Got authorization code, exchanging for credentials...\n");

  // Exchange code for app credentials
  const response = await fetch(
    `https://api.github.com/app-manifests/${code}/conversions`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to exchange code: ${response.status} ${error}`);
    server.stop();
    process.exit(1);
  }

  const appData = (await response.json()) as {
    id: number;
    slug: string;
    name: string;
    client_id: string;
    client_secret: string;
    pem: string;
    webhook_secret: string;
    html_url: string;
  };

  console.log(`GitHub App created successfully!`);
  console.log(`  Name: ${appData.name}`);
  console.log(`  ID: ${appData.id}`);
  console.log(`  Slug: ${appData.slug}`);
  console.log(`  URL: ${appData.html_url}\n`);

  // Update .env file
  const envPath = join(import.meta.dir, "../..", ".env");
  let envContent = readFileSync(envPath, "utf-8");

  const githubEnvBlock = `
# GitHub App (created by scripts/setup/create-github-app.ts)
GITHUB_APP_ID=${appData.id}
GITHUB_APP_CLIENT_ID=${appData.client_id}
GITHUB_APP_CLIENT_SECRET=${appData.client_secret}
GITHUB_WEBHOOK_SECRET=${appData.webhook_secret}
GITHUB_APP_PRIVATE_KEY="${appData.pem.replace(/\n/g, "\\n")}"
`;

  // Remove any existing GitHub block
  envContent = envContent.replace(
    /\n# GitHub App[^\n]*\n(GITHUB_[^\n]*\n)*/g,
    ""
  );
  envContent = envContent.trimEnd() + "\n" + githubEnvBlock;

  writeFileSync(envPath, envContent);
  console.log(`Environment variables written to .env`);

  // Save private key as a standalone PEM file too (easier to debug)
  const pemPath = join(import.meta.dir, "../..", "github-app-private-key.pem");
  writeFileSync(pemPath, appData.pem);
  console.log(`Private key saved to github-app-private-key.pem`);

  console.log(`\nNext steps:`);
  console.log(
    `  1. Install the app on a repo: ${appData.html_url}/installations/new`
  );
  console.log(`  2. Start the tunnel: bun run tunnel`);
  console.log(`  3. Restart dev servers: bun run dev`);

  server.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
