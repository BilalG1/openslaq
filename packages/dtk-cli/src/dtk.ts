#!/usr/bin/env bun
/**
 * dtk — Desktop Test Kit CLI
 *
 * Drives the OpenSlaq Tauri desktop app via an embedded automation server.
 * The Tauri app (debug builds) listens on port 9199 for JSON commands.
 *
 * Usage:
 *   dtk start                          Launch desktop app with automation server
 *   dtk stop                           Quit the desktop app
 *   dtk click --text "General"         Click element by visible text
 *   dtk click --css "button.primary"   Click element by CSS selector
 *   dtk click --testid "sidebar"       Click element by data-testid
 *   dtk click --role "button"          Click element by ARIA role
 *   dtk double-click --testid "item"   Double click element
 *   dtk type --testid "input" "hello"  Type text into element
 *   dtk clear --testid "input"         Clear text field
 *   dtk keys "Meta+k"                  Dispatch keyboard event
 *   dtk snapshot                       Dump page HTML
 *   dtk screenshot [name]              Take screenshot (macOS screencapture)
 *   dtk record start [name]            Start screen recording
 *   dtk record stop                    Stop recording and save video
 *   dtk eval "document.title"          Execute JS in webview
 *   dtk url "/channels/general"        Navigate within the app
 *   dtk deeplink "openslaq://..."      Trigger deep link via macOS open
 *   dtk wait --testid "x" [timeout]    Wait for element to appear
 *   dtk is-displayed --testid "x"      Check if element is visible
 *   dtk get-text --testid "x"          Get element text content
 *   dtk ping                           Check if automation server is running
 */

import fs from "node:fs";
import path from "node:path";
import type { CommandResult, SelectorStrategy } from "./types";

const DEFAULT_PORT = 9199;
const PKG_DIR = path.resolve(import.meta.dir, "..");
const RESULTS_DIR = path.join(PKG_DIR, "test-results");
const PID_FILE = path.join(RESULTS_DIR, ".dtk.pid");
const RECORD_PID_FILE = path.join(RESULTS_DIR, ".dtk.record.pid");

// Auto-detect app paths relative to monorepo root
const MONOREPO_ROOT = path.resolve(PKG_DIR, "../..");
const DEBUG_APP_PATH = path.join(
  MONOREPO_ROOT,
  "apps/desktop/src-tauri/target/debug/bundle/macos/OpenSlaq.app",
);
const DESKTOP_DIR = path.join(MONOREPO_ROOT, "apps/desktop");

// ── Server communication ──

interface ServerCommand {
  action: string;
  args?: unknown[];
}

async function send(cmd: ServerCommand, port: number): Promise<CommandResult> {
  const res = await fetch(`http://127.0.0.1:${port}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  return res.json() as Promise<CommandResult>;
}

async function isRunning(port: number): Promise<boolean> {
  try {
    const r = await send({ action: "ping" }, port);
    return r.ok === true;
  } catch {
    return false;
  }
}

/** Send a JS eval command to the automation server */
async function evalJS(script: string): Promise<CommandResult> {
  return send({ action: "eval", args: [script] }, DEFAULT_PORT);
}

// ── Selector → JS expression ──

function selectorToJS(strategy: SelectorStrategy, value: string): string {
  switch (strategy) {
    case "css":
      return `document.querySelector(${JSON.stringify(value)})`;
    case "testid":
      return `document.querySelector('[data-testid=${JSON.stringify(value)}]')`;
    case "text":
      return `[...document.querySelectorAll('*')].find(el => el.textContent?.trim() === ${JSON.stringify(value)} && el.children.length === 0)`;
    case "role":
      return `document.querySelector('[role=${JSON.stringify(value)}]')`;
    case "xpath":
      return `document.evaluate(${JSON.stringify(value)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue`;
    default:
      throw new Error(`Unknown selector strategy: ${strategy}`);
  }
}

// ── Arg parsing ──

interface Selector {
  strategy: SelectorStrategy;
  value: string;
}

function parseSelector(args: string[]): Selector | undefined {
  const strategies: SelectorStrategy[] = ["css", "testid", "text", "role", "xpath"];
  for (const strategy of strategies) {
    const idx = args.indexOf(`--${strategy}`);
    if (idx !== -1 && args[idx + 1] !== undefined) {
      return { strategy, value: args[idx + 1]! };
    }
  }
  return undefined;
}

function positionalArgs(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i]!.startsWith("--")) {
      i++;
      continue;
    }
    result.push(args[i]!);
  }
  return result;
}

function printResult(result: CommandResult) {
  if (result.ok) {
    if (result.data !== undefined) {
      const val = result.data;
      if (typeof val === "string") {
        console.log(val);
      } else if (val === null || val === undefined) {
        console.log("OK");
      } else {
        console.log(JSON.stringify(val, null, 2));
      }
    } else {
      console.log("OK");
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

// ── Main ──

const rawArgs = process.argv.slice(2);
const [action, ...rest] = rawArgs;

if (!action || action === "help" || action === "--help") {
  const lines = (await Bun.file(import.meta.path).text()).split("\n");
  const start = lines.findIndex((l) => l.includes("Usage:"));
  const end = lines.findIndex((l, i) => i > start && l.includes("*/"));
  console.log(
    lines
      .slice(start, end)
      .map((l) => l.replace(/^ \*\s?/, ""))
      .join("\n"),
  );
  process.exit(0);
}

// ── start ──
if (action === "start") {
  if (await isRunning(DEFAULT_PORT)) {
    console.log("Automation server already running.");
    process.exit(0);
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // Prefer debug build (has automation server), fall back to tauri dev
  if (fs.existsSync(DEBUG_APP_PATH)) {
    console.log(`Launching: ${DEBUG_APP_PATH}`);
    const proc = Bun.spawn(["open", "-a", DEBUG_APP_PATH], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
  } else {
    console.log("No debug build found. Running `tauri dev`...");
    console.log("(Build with: cd apps/desktop && cargo tauri build --debug)");
    const proc = Bun.spawn(["cargo", "tauri", "dev"], {
      cwd: DESKTOP_DIR,
      stdout: "pipe",
      stderr: "pipe",
    });
    await Bun.write(PID_FILE, String(proc.pid));
    proc.unref();
  }

  // Poll until automation server is ready
  console.log(`Waiting for automation server on port ${DEFAULT_PORT}...`);
  for (let i = 0; i < 120; i++) {
    await Bun.sleep(1000);
    if (await isRunning(DEFAULT_PORT)) {
      console.log("Ready! Run dtk commands in another terminal.");
      process.exit(0);
    }
  }

  console.error("Timed out waiting for automation server (2 min).");
  process.exit(1);
}

// ── stop ──
if (action === "stop") {
  try {
    await send({ action: "quit" }, DEFAULT_PORT);
    console.log("App quit.");
  } catch {
    console.log("App not running.");
  }
  // Clean up PID file if we started via tauri dev
  try {
    const pid = parseInt(await Bun.file(PID_FILE).text());
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {}
    }
    await Bun.write(PID_FILE, "");
  } catch {}
  process.exit(0);
}

// ── screenshot (uses macOS screencapture) ──
if (action === "screenshot") {
  const pos = positionalArgs(rest);
  const name = pos[0] || `dtk-${Date.now()}`;
  const dest = path.join(RESULTS_DIR, `${name}.png`);
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // Capture the frontmost window
  const proc = Bun.spawn(["screencapture", "-l", await getWindowId(), dest], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  if (code !== 0) {
    // Fallback: capture entire screen
    const fallback = Bun.spawn(["screencapture", "-x", dest], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await fallback.exited;
  }

  // Resize if over 1500px (same as mobile screenshot.sh)
  const sipsProc = Bun.spawn(
    ["sips", "--resampleWidth", "1500", dest, "--out", dest],
    { stdout: "pipe", stderr: "pipe" },
  );
  await sipsProc.exited;

  console.log(`Screenshot saved: ${dest}`);
  process.exit(0);
}

// ── record ──
if (action === "record") {
  const subAction = rest[0];

  if (subAction === "start") {
    try {
      const existingPid = parseInt(fs.readFileSync(RECORD_PID_FILE, "utf-8"));
      if (existingPid) {
        try {
          process.kill(existingPid, 0);
          console.error("Already recording. Run 'dtk record stop' first.");
          process.exit(1);
        } catch {
          // Dead process
        }
      }
    } catch {}

    const pos = positionalArgs(rest.slice(1));
    const name = pos[0] || `recording-${Date.now()}`;
    const videoPath = path.join(RESULTS_DIR, `${name}.mp4`);
    fs.mkdirSync(RESULTS_DIR, { recursive: true });

    const proc = Bun.spawn(["screencapture", "-v", "-C", videoPath], {
      stdout: "ignore",
      stderr: "pipe",
    });

    fs.writeFileSync(RECORD_PID_FILE, String(proc.pid));
    await Bun.sleep(500);

    try {
      process.kill(proc.pid, 0);
    } catch {
      const stderr = await new Response(proc.stderr).text();
      console.error(`Failed to start recording: ${stderr.trim()}`);
      try { fs.unlinkSync(RECORD_PID_FILE); } catch {}
      process.exit(1);
    }

    proc.unref();
    console.log(`Recording started: ${videoPath}`);
    console.log("Run 'dtk record stop' to finish.");
    process.exit(0);
  }

  if (subAction === "stop") {
    let pid: number;
    try {
      pid = parseInt(fs.readFileSync(RECORD_PID_FILE, "utf-8"));
    } catch {
      console.error("No active recording found.");
      process.exit(1);
    }

    try {
      process.kill(pid, "SIGINT");
      for (let i = 0; i < 30; i++) {
        await Bun.sleep(200);
        try { process.kill(pid, 0); } catch { break; }
      }
      console.log("Recording saved.");
    } catch {
      console.error("Recording process already stopped.");
    }

    try { fs.unlinkSync(RECORD_PID_FILE); } catch {}
    process.exit(0);
  }

  console.error("Usage: dtk record start [name] | dtk record stop");
  process.exit(1);
}

// ── Helper: get macOS window ID for screencapture ──
async function getWindowId(): Promise<string> {
  // Use osascript to get the window ID of the OpenSlaq app
  const proc = Bun.spawn([
    "osascript",
    "-e",
    'tell application "System Events" to tell process "OpenSlaq" to get id of window 1',
  ], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  return out.trim();
}

// ── Commands that map to JS eval ──

const selector = parseSelector(rest);
const pos = positionalArgs(rest);

function requireSelector(): Selector {
  if (!selector) {
    console.error(`Usage: dtk ${action} --text|--css|--testid|--role|--xpath <value>`);
    process.exit(1);
  }
  return selector;
}

function elExpr(): string {
  const sel = requireSelector();
  return selectorToJS(sel.strategy, sel.value);
}

let result: CommandResult;

switch (action) {
  case "click":
    result = await evalJS(`
      const el = ${elExpr()};
      if (!el) throw new Error('Element not found');
      el.click();
      return 'clicked';
    `);
    break;

  case "double-click":
    result = await evalJS(`
      const el = ${elExpr()};
      if (!el) throw new Error('Element not found');
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      return 'double-clicked';
    `);
    break;

  case "type": {
    if (!pos[0]) {
      console.error('Usage: dtk type --testid <id> "text"');
      process.exit(1);
    }
    const text = JSON.stringify(pos[0]);
    result = await evalJS(`
      const el = ${elExpr()};
      if (!el) throw new Error('Element not found');
      el.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, ${text});
      } else {
        el.value = ${text};
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return 'typed';
    `);
    break;
  }

  case "clear":
    result = await evalJS(`
      const el = ${elExpr()};
      if (!el) throw new Error('Element not found');
      el.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, '');
      } else {
        el.value = '';
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return 'cleared';
    `);
    break;

  case "keys": {
    if (!pos[0]) {
      console.error('Usage: dtk keys "Meta+k"');
      process.exit(1);
    }
    const keyCombo = pos[0];
    // Parse key combo like "Meta+k" into KeyboardEvent options
    const parts = keyCombo.split("+");
    const key = parts[parts.length - 1]!;
    const modifiers = parts.slice(0, -1).map(m => m.toLowerCase());
    result = await evalJS(`
      const opts = {
        key: ${JSON.stringify(key)},
        code: 'Key' + ${JSON.stringify(key.toUpperCase())},
        bubbles: true,
        cancelable: true,
        metaKey: ${modifiers.includes("meta") || modifiers.includes("cmd")},
        ctrlKey: ${modifiers.includes("ctrl") || modifiers.includes("control")},
        shiftKey: ${modifiers.includes("shift")},
        altKey: ${modifiers.includes("alt") || modifiers.includes("option")},
      };
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', opts));
      document.activeElement?.dispatchEvent(new KeyboardEvent('keyup', opts));
      return 'dispatched';
    `);
    break;
  }

  case "snapshot":
    result = await evalJS(`return document.documentElement.outerHTML`);
    break;

  case "eval": {
    if (!pos[0]) {
      console.error('Usage: dtk eval "document.title"');
      process.exit(1);
    }
    result = await evalJS(`return ${pos[0]}`);
    break;
  }

  case "url": {
    if (!pos[0]) {
      console.error('Usage: dtk url "/channels/general"');
      process.exit(1);
    }
    result = await evalJS(`
      window.location.href = ${JSON.stringify(pos[0])};
      return window.location.href;
    `);
    break;
  }

  case "get-url":
    result = await evalJS(`return window.location.href`);
    break;

  case "get-title":
    result = await evalJS(`return document.title`);
    break;

  case "deeplink": {
    if (!pos[0]) {
      console.error('Usage: dtk deeplink "openslaq://..."');
      process.exit(1);
    }
    const proc = Bun.spawn(["open", pos[0]], { stdout: "inherit", stderr: "inherit" });
    const code = await proc.exited;
    if (code !== 0) {
      console.error("Failed to open deep link.");
      process.exit(1);
    }
    console.log("OK");
    process.exit(0);
  }

  case "wait": {
    const sel = requireSelector();
    const timeout = parseInt(pos[0] ?? "") || 5000;
    const jsExpr = selectorToJS(sel.strategy, sel.value);
    result = await evalJS(`
      const start = Date.now();
      while (Date.now() - start < ${timeout}) {
        const el = ${jsExpr};
        if (el && el.offsetParent !== null) return 'found';
        await new Promise(r => setTimeout(r, 100));
      }
      throw new Error('Timed out waiting for element (${timeout}ms)');
    `);
    break;
  }

  case "is-displayed": {
    const jsExpr = elExpr();
    result = await evalJS(`
      const el = ${jsExpr};
      return el ? el.offsetParent !== null : false;
    `);
    break;
  }

  case "get-text":
    result = await evalJS(`
      const el = ${elExpr()};
      if (!el) throw new Error('Element not found');
      return el.textContent;
    `);
    break;

  case "ping":
    result = await send({ action: "ping" }, DEFAULT_PORT);
    break;

  default:
    console.error(`Unknown command: ${action}. Run 'dtk help' for usage.`);
    process.exit(1);
}

try {
  printResult(result);
} catch {
  console.error("Cannot connect to automation server. Run 'dtk start' first.");
  process.exit(1);
}
