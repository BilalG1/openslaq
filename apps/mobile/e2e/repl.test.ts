/**
 * Detox REPL — a long-running test that exposes an HTTP command server
 * so the `dtx` CLI can send Detox commands interactively.
 *
 * Start with: dtx start
 * Then use:   dtx tap --text "Submit"
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { by, device, element, expect as jestExpect, waitFor } from "detox";
import { signTestJwt, createTestWorkspace, deleteTestWorkspace, type TestUser } from "./helpers/api";
import { launchApp } from "./helpers/setup";

const PORT = parseInt(process.env.DTX_PORT || "9099", 10);
const STATE_FILE = path.join(__dirname, "test-results", `.dtx.state.${PORT}.json`);

type Matcher = { by: "id" | "text" | "label" | "type"; value: string; index?: number };

function buildMatcher(m: Matcher) {
  const matchers: Record<string, (v: string) => Detox.NativeMatcher> = {
    id: by.id,
    text: by.text,
    label: by.label,
    type: by.type,
  };
  const fn = matchers[m.by];
  if (!fn) throw new Error(`Unknown matcher type: ${m.by}`);
  return fn(m.value);
}

function getElement(m: Matcher) {
  const base = element(buildMatcher(m));
  if (m.index !== undefined) return base.atIndex(m.index);
  return base;
}

async function handleCommand(cmd: {
  action: string;
  matcher?: Matcher;
  args?: any[];
}): Promise<{ ok: boolean; error?: string; data?: any; quit?: boolean }> {
  const el = cmd.matcher ? getElement(cmd.matcher) : null;

  switch (cmd.action) {
    case "tap":
      await el!.tap();
      return { ok: true };

    case "longPress":
      await el!.longPress();
      return { ok: true };

    case "multiTap":
      await el!.multiTap(cmd.args?.[0] ?? 2);
      return { ok: true };

    case "typeText":
      await el!.typeText(cmd.args![0]);
      return { ok: true };

    case "replaceText":
      await el!.replaceText(cmd.args![0]);
      return { ok: true };

    case "clearText":
      await el!.clearText();
      return { ok: true };

    case "scroll":
      await el!.scroll(cmd.args?.[0] ?? 200, cmd.args?.[1] ?? "down");
      return { ok: true };

    case "scrollTo":
      await el!.scrollTo(cmd.args?.[0] ?? "bottom");
      return { ok: true };

    case "swipe":
      await el!.swipe(cmd.args?.[0] ?? "up", cmd.args?.[1] ?? "slow", cmd.args?.[2]);
      return { ok: true };

    case "expect": {
      const assertion = cmd.args?.[0] ?? "toBeVisible";
      if (assertion.startsWith("not.")) {
        await (jestExpect(el!) as any).not[assertion.slice(4)]();
      } else {
        await (jestExpect(el!) as any)[assertion]();
      }
      return { ok: true };
    }

    case "waitFor": {
      const timeout = cmd.args?.[0] ?? 5000;
      await waitFor(el!).toBeVisible().withTimeout(timeout);
      return { ok: true };
    }

    case "screenshot": {
      const name = cmd.args?.[0] ?? `repl-${Date.now()}`;
      const tmpPath = await device.takeScreenshot(name);
      const resultsDir = path.join(__dirname, "test-results");
      fs.mkdirSync(resultsDir, { recursive: true });
      const dest = path.join(resultsDir, `${name}.png`);
      fs.copyFileSync(tmpPath, dest);
      return { ok: true, data: { path: dest } };
    }

    case "openURL":
      await device.openURL({ url: cmd.args![0] });
      return { ok: true };

    case "reloadApp":
      await device.reloadReactNative();
      return { ok: true };

    case "launchApp": {
      // args[0] = options like { delete: true, newInstance: true, launchArgs: {...} }
      const opts = { newInstance: true, ...(cmd.args?.[0] ?? {}) };
      await device.launchApp(opts);
      return { ok: true };
    }

    case "setURLBlacklist":
      await device.setURLBlacklist(cmd.args?.[0] ?? []);
      return { ok: true };

    case "enableSynchronization":
      await device.enableSynchronization();
      return { ok: true };

    case "disableSynchronization":
      await device.disableSynchronization();
      return { ok: true };

    case "ping":
      return { ok: true };

    case "quit":
      return { ok: true, quit: true };

    default:
      return { ok: false, error: `Unknown action: ${cmd.action}` };
  }
}

describe("REPL", () => {
  let workspaceSlug: string;
  let token: string;

  beforeAll(async () => {
    const userId = process.env.DTX_USER_ID || "mobile-e2e-user-001";
    const user: TestUser = {
      id: userId,
      displayName: `DTX User ${userId}`,
      email: `${userId}@openslaq.dev`,
      emailVerified: true,
    };
    token = await signTestJwt(user);
    const ws = await createTestWorkspace(token);
    workspaceSlug = ws.slug;
    await launchApp(token, userId, ws.slug);
  }, 120000);

  afterAll(async () => {
    if (workspaceSlug) {
      await deleteTestWorkspace(token, workspaceSlug).catch(() => {});
    }
    try { fs.unlinkSync(STATE_FILE); } catch {}
  });

  it(
    "interactive session",
    async () => {
      await new Promise<void>((resolve) => {
        const server = http.createServer(async (req, res) => {
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk; });
          req.on("end", async () => {
            try {
              const cmd = JSON.parse(body);
              const result = await handleCommand(cmd);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
              if (result.quit) {
                server.close();
                resolve();
              }
            } catch (err: any) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: err.message }));
            }
          });
        });

        server.listen(PORT, () => {
          console.log(`\n[dtx] REPL server ready on port ${PORT}\n`);
          fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
          fs.writeFileSync(STATE_FILE, JSON.stringify({ pid: process.pid, port: PORT }));
        });
      });
    },
    24 * 60 * 60 * 1000,
  );
});
