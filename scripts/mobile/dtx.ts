#!/usr/bin/env bun
/**
 * dtx — Detox interactive CLI
 *
 * Usage:
 *   dtx start              Start REPL Detox session (launches app)
 *   dtx start --name foo   Start named session (clones simulator)
 *   dtx stop               Stop REPL session
 *   dtx stop -s <id>       Stop named session (deletes cloned sim)
 *   dtx stop --all         Stop all sessions
 *   dtx list               List active sessions
 *   dtx tap --id x         Tap element by testID
 *   dtx tap --text x       Tap element by visible text
 *   dtx tap --label x      Tap element by accessibility label
 *   dtx long-press --id x  Long press element
 *   dtx type --id x "hi"   Type text into element
 *   dtx replace --id x "x" Replace text in element
 *   dtx clear --id x       Clear text field
 *   dtx scroll --id x down 300   Scroll element
 *   dtx swipe --id x left        Swipe element
 *   dtx expect --id x            Assert element is visible
 *   dtx expect --text x exist    Assert element exists
 *   dtx wait --text x 5000       Wait for element to appear
 *   dtx screenshot [name]        Take screenshot
 *   dtx record start [name]      Start recording simulator video
 *   dtx record stop              Stop recording and save video
 *   dtx reload                   Reload React Native
 *   dtx tree                     Accessibility tree (via idb)
 *
 * Multi-session:
 *   -s <id>, --session <id>   Target a named session
 *   --name <name>             Name for new session (dtx start)
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_PORT = 9099;
const MOBILE_DIR = `${import.meta.dir}/../../apps/mobile`;
const RESULTS_DIR = `${MOBILE_DIR}/e2e/test-results`;
const SESSIONS_DIR = `${RESULTS_DIR}/.dtx-sessions`;

// ── Session types ──

interface SessionState {
  pid: number;
  port: number;
  udid: string;
  deviceName: string;
  createdAt: string;
}

// ── Session helpers ──

function generateSessionId(): string {
  return crypto.randomBytes(3).toString("hex");
}

async function allocatePort(sessionId: string): Promise<number> {
  // Hash session ID to get a starting port in 9100-9999
  let hash = 0;
  for (const ch of sessionId) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const base = 9100 + (Math.abs(hash) % 900);

  for (let offset = 0; offset < 900; offset++) {
    const port = 9100 + ((base - 9100 + offset) % 900);
    if (await isPortFree(port)) return port;
  }
  throw new Error("No free port in 9100-9999");
}

async function isPortFree(port: number): Promise<boolean> {
  try {
    await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ping" }),
      signal: AbortSignal.timeout(200),
    });
    // If we get a response, port is in use
    return false;
  } catch {
    return true;
  }
}

function ensureSessionsDir() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionPath(id: string): string {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

function readSession(id: string): SessionState | null {
  try {
    return JSON.parse(fs.readFileSync(sessionPath(id), "utf-8"));
  } catch {
    return null;
  }
}

function writeSession(id: string, data: SessionState) {
  ensureSessionsDir();
  fs.writeFileSync(sessionPath(id), JSON.stringify(data, null, 2));
}

function removeSession(id: string) {
  try {
    fs.unlinkSync(sessionPath(id));
  } catch {}
}

function listSessions(): Array<{ id: string; state: SessionState; alive: boolean }> {
  ensureSessionsDir();
  const results: Array<{ id: string; state: SessionState; alive: boolean }> = [];
  for (const file of fs.readdirSync(SESSIONS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const id = file.replace(".json", "");
    const state = readSession(id);
    if (!state) continue;
    let alive = false;
    try {
      process.kill(state.pid, 0);
      alive = true;
    } catch {}
    results.push({ id, state, alive });
  }
  return results;
}

// ── Helpers ──

async function send(cmd: Record<string, unknown>, port: number): Promise<unknown> {
  const res = await fetch(`http://localhost:${port}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  return res.json();
}

async function isRunning(port: number): Promise<boolean> {
  try {
    const r = await send({ action: "ping" }, port);
    return r.ok === true;
  } catch {
    return false;
  }
}

type MatcherType = "id" | "text" | "label" | "type";

function parseMatcher(args: string[]): { by: MatcherType; value: string; index?: number } | null {
  const flags: MatcherType[] = ["id", "text", "label", "type"];
  for (const flag of flags) {
    const idx = args.indexOf(`--${flag}`);
    if (idx !== -1 && args[idx + 1]) {
      const matcher: { by: MatcherType; value: string; index?: number } = {
        by: flag,
        value: args[idx + 1],
      };
      const atIdx = args.indexOf("--index");
      if (atIdx !== -1 && args[atIdx + 1]) {
        matcher.index = parseInt(args[atIdx + 1], 10);
      }
      return matcher;
    }
  }
  return null;
}

/** Get positional args (not --flag or their values) */
function positionalArgs(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") || args[i] === "-s") {
      i++; // skip flag value
      continue;
    }
    result.push(args[i]);
  }
  return result;
}

function printResult(result: { ok?: boolean; data?: { path?: string }; error?: string }) {
  if (result.ok) {
    if (result.data?.path) {
      console.log(`Screenshot saved: ${result.data.path}`);
    } else {
      console.log("OK");
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

// ── Parse --session / -s and --name from argv ──

function extractSessionArgs(argv: string[]): { sessionId: string | null; sessionName: string | null; rest: string[] } {
  let sessionId: string | null = null;
  let sessionName: string | null = null;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === "--session" || argv[i] === "-s") && argv[i + 1]) {
      sessionId = argv[++i];
    } else if (argv[i] === "--name" && argv[i + 1]) {
      sessionName = argv[++i];
    } else {
      rest.push(argv[i]);
    }
  }

  return { sessionId, sessionName, rest };
}

function resolvePort(sessionId: string | null): number {
  if (!sessionId) return DEFAULT_PORT;
  const session = readSession(sessionId);
  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }
  return session.port;
}

// ── Main ──

const rawArgs = process.argv.slice(2);
const { sessionId, sessionName, rest: strippedArgs } = extractSessionArgs(rawArgs);
const [action, ...rest] = strippedArgs;

if (!action || action === "help" || action === "--help") {
  const lines = (await Bun.file(import.meta.path).text()).split("\n");
  const start = lines.findIndex((l) => l.includes("Usage:"));
  const end = lines.findIndex((l, i) => i > start && l.includes("*/"));
  console.log(lines.slice(start, end).map((l) => l.replace(/^ \*\s?/, "")).join("\n"));
  process.exit(0);
}

// ── list ──
if (action === "list") {
  const sessions = listSessions();

  // Also check default session
  const defaultPidFile = `${RESULTS_DIR}/.dtx.pid`;
  let defaultAlive = false;
  try {
    const pid = parseInt(await Bun.file(defaultPidFile).text());
    if (pid) {
      try { process.kill(pid, 0); defaultAlive = true; } catch {}
    }
  } catch {}

  console.log("SESSION    PORT   DEVICE                          STATUS    CREATED");
  console.log("─".repeat(80));

  if (defaultAlive || await isRunning(DEFAULT_PORT)) {
    console.log(`(default)  ${DEFAULT_PORT}   (booted simulator)              running   -`);
  }

  for (const { id, state, alive } of sessions) {
    const status = alive ? "running" : "dead";
    const created = state.createdAt.slice(0, 19).replace("T", " ");
    console.log(
      `${id.padEnd(10)} ${String(state.port).padEnd(6)} ${state.deviceName.padEnd(31)} ${status.padEnd(9)} ${created}`,
    );
  }

  if (!defaultAlive && !(await isRunning(DEFAULT_PORT)) && sessions.length === 0) {
    console.log("(no active sessions)");
  }

  process.exit(0);
}

// ── start ──
if (action === "start") {
  const isMultiSession = sessionName !== null || sessionId !== null;
  const sid = sessionName || sessionId || null;

  if (isMultiSession) {
    // Multi-session start: clone simulator, allocate port
    const id = sid || generateSessionId();
    const existing = readSession(id);
    if (existing) {
      try {
        process.kill(existing.pid, 0);
        console.log(`Session '${id}' already running on port ${existing.port}.`);
        console.log(`dtx:session:${id}`);
        process.exit(0);
      } catch {
        // Dead session — clean up and restart
        removeSession(id);
      }
    }

    const port = await allocatePort(id);
    const deviceName = `dtx-${id}`;
    const logFile = `${RESULTS_DIR}/.dtx.${id}.log`;

    console.log(`Starting session '${id}' on port ${port}...`);

    // Try cloning the booted simulator; if it fails (e.g. can't clone while booted),
    // fall back to creating a new simulator with the same device type and runtime.
    let udid: string;
    const cloneProc = Bun.spawn(["xcrun", "simctl", "clone", "booted", deviceName], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const cloneOut = await new Response(cloneProc.stdout).text();
    const cloneErr = await new Response(cloneProc.stderr).text();
    const cloneCode = await cloneProc.exited;
    if (cloneCode === 0) {
      udid = cloneOut.trim();
    } else {
      // Fallback: get booted device info and create a fresh simulator
      const listProc = Bun.spawn(["xcrun", "simctl", "list", "devices", "booted", "-j"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const listJson = JSON.parse(await new Response(listProc.stdout).text());
      let bootedDeviceType: string | null = null;
      let bootedRuntime: string | null = null;
      for (const [runtime, devices] of Object.entries(listJson.devices) as [string, { state: string; deviceTypeIdentifier: string }[]][]) {
        for (const d of devices) {
          if (d.state === "Booted") {
            bootedDeviceType = d.deviceTypeIdentifier;
            bootedRuntime = runtime;
            break;
          }
        }
        if (bootedDeviceType) break;
      }
      if (!bootedDeviceType || !bootedRuntime) {
        console.error(`Failed to clone simulator and no booted device found: ${cloneErr.trim()}`);
        process.exit(1);
      }
      console.log(`Clone failed, creating new simulator (${bootedDeviceType}, ${bootedRuntime})...`);
      const createProc = Bun.spawn(["xcrun", "simctl", "create", deviceName, bootedDeviceType, bootedRuntime], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const createOut = await new Response(createProc.stdout).text();
      const createErr = await new Response(createProc.stderr).text();
      const createCode = await createProc.exited;
      if (createCode !== 0) {
        console.error(`Failed to create simulator: ${createErr.trim()}`);
        process.exit(1);
      }
      udid = createOut.trim();
    }
    console.log(`Cloned simulator: ${deviceName} (${udid})`);

    // Boot the clone
    const bootProc = Bun.spawn(["xcrun", "simctl", "boot", udid], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const bootErr = await new Response(bootProc.stderr).text();
    const bootCode = await bootProc.exited;
    if (bootCode !== 0 && !bootErr.includes("already booted")) {
      console.error(`Failed to boot simulator: ${bootErr.trim()}`);
      // Clean up cloned sim
      Bun.spawn(["xcrun", "simctl", "delete", udid]);
      process.exit(1);
    }

    // Spawn Detox with session-specific env and UDID
    const logWriter = Bun.file(logFile).writer();
    const proc = Bun.spawn(
      [
        "bunx", "detox", "test", "-c", "ios.sim.debug",
        "--", "--testPathPattern", "repl", "--watchAll=false",
      ],
      {
        cwd: MOBILE_DIR,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          DTX_PORT: String(port),
          DTX_USER_ID: `dtx-user-${id}`,
          DTX_DEVICE_UDID: udid,
        },
      },
    );

    console.log(`Logs: ${logFile}`);

    // Write session state
    writeSession(id, {
      pid: proc.pid,
      port,
      udid,
      deviceName,
      createdAt: new Date().toISOString(),
    });

    // Stream output to log
    const streamToLog = (stream: ReadableStream<Uint8Array>, out: typeof process.stdout) => {
      (async () => {
        for await (const chunk of stream) {
          const text = new TextDecoder().decode(chunk);
          logWriter.write(text);
          logWriter.flush();
          out.write(text);
        }
      })();
    };

    streamToLog(proc.stdout, process.stdout);
    streamToLog(proc.stderr, process.stderr);

    // Poll until ready
    for (let i = 0; i < 180; i++) {
      await Bun.sleep(1000);
      if (await isRunning(port)) {
        console.log(`\nSession '${id}' ready on port ${port}!\n`);
        console.log(`dtx:session:${id}`);
        proc.unref();
        process.exit(0);
      }
    }

    console.error("Timed out waiting for session (3 min).");
    proc.kill();
    // Clean up cloned sim
    Bun.spawn(["xcrun", "simctl", "shutdown", udid]);
    await Bun.sleep(1000);
    Bun.spawn(["xcrun", "simctl", "delete", udid]);
    removeSession(id);
    process.exit(1);
  }

  // Default session (no flags) — original behavior
  if (await isRunning(DEFAULT_PORT)) {
    console.log("REPL already running.");
    process.exit(0);
  }

  const logFile = `${RESULTS_DIR}/.dtx.log`;
  console.log("Starting Detox REPL session...");
  console.log(`Logs: ${logFile}`);

  const logWriter = Bun.file(logFile).writer();

  const proc = Bun.spawn(
    ["bunx", "detox", "test", "-c", "ios.sim.debug", "--", "--testPathPattern", "repl", "--watchAll=false"],
    {
      cwd: MOBILE_DIR,
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  // Save PID so `dtx stop` can clean up
  await Bun.write(`${RESULTS_DIR}/.dtx.pid`, String(proc.pid));

  // Stream output to log file and console
  const streamToLog = (stream: ReadableStream<Uint8Array>, out: typeof process.stdout) => {
    (async () => {
      for await (const chunk of stream) {
        const text = new TextDecoder().decode(chunk);
        logWriter.write(text);
        logWriter.flush();
        out.write(text);
      }
    })();
  };

  streamToLog(proc.stdout, process.stdout);
  streamToLog(proc.stderr, process.stderr);

  // Poll until server is ready
  for (let i = 0; i < 180; i++) {
    await Bun.sleep(1000);
    if (await isRunning(DEFAULT_PORT)) {
      console.log("\nREPL ready! Run dtx commands in this or another terminal.\n");
      // Detach — let the Detox process run in the background
      proc.unref();
      process.exit(0);
    }
  }

  console.error("Timed out waiting for REPL server (3 min).");
  proc.kill();
  process.exit(1);
}

// ── record (uses simctl directly) ──
if (action === "record") {
  const subAction = rest[0];

  // Resolve UDID for the target simulator
  let udid = "booted";
  if (sessionId) {
    const session = readSession(sessionId);
    if (session) udid = session.udid;
  }

  const recordPidFile = path.join(RESULTS_DIR, `.dtx.record${sessionId ? `.${sessionId}` : ""}.pid`);

  if (subAction === "start") {
    // Check if already recording
    try {
      const existingPid = parseInt(fs.readFileSync(recordPidFile, "utf-8"));
      if (existingPid) {
        try {
          process.kill(existingPid, 0);
          console.error("Already recording. Run 'dtx record stop' first.");
          process.exit(1);
        } catch {
          // Dead process, clean up
        }
      }
    } catch {}

    const name = positionalArgs(rest.slice(1))[0] || `recording-${Date.now()}`;
    const videoPath = path.join(RESULTS_DIR, `${name}.mp4`);
    fs.mkdirSync(RESULTS_DIR, { recursive: true });

    const proc = Bun.spawn(
      ["xcrun", "simctl", "io", udid, "recordVideo", "--codec=h264", "--force", videoPath],
      { stdout: "ignore", stderr: "pipe" },
    );

    fs.writeFileSync(recordPidFile, String(proc.pid));
    // Give simctl a moment to start
    await Bun.sleep(500);

    // Check it's still alive (catches immediate failures)
    try {
      process.kill(proc.pid, 0);
    } catch {
      const stderr = await new Response(proc.stderr).text();
      console.error(`Failed to start recording: ${stderr.trim()}`);
      try { fs.unlinkSync(recordPidFile); } catch {}
      process.exit(1);
    }

    proc.unref();
    console.log(`Recording started: ${videoPath}`);
    console.log("Run 'dtx record stop' to finish.");
    process.exit(0);
  }

  if (subAction === "stop") {
    let pid: number;
    try {
      pid = parseInt(fs.readFileSync(recordPidFile, "utf-8"));
    } catch {
      console.error("No active recording found.");
      process.exit(1);
    }

    try {
      // SIGINT tells simctl to finalize the video file
      process.kill(pid, "SIGINT");
      // Wait for process to finish writing
      for (let i = 0; i < 30; i++) {
        await Bun.sleep(200);
        try {
          process.kill(pid, 0);
        } catch {
          break; // Process exited
        }
      }
      console.log("Recording saved.");
    } catch {
      console.error("Recording process already stopped.");
    }

    try { fs.unlinkSync(recordPidFile); } catch {}
    process.exit(0);
  }

  console.error("Usage: dtx record start [name] | dtx record stop");
  process.exit(1);
}

// ── tree (uses idb directly) ──
if (action === "tree") {
  const idbArgs = ["idb", "ui", "describe-all"];
  if (sessionId) {
    const session = readSession(sessionId);
    if (session) {
      idbArgs.push("--udid", session.udid);
    }
  }
  const proc = Bun.spawn(idbArgs, { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  process.exit(code);
}

// ── All other commands go through the Detox REPL server ──

const port = resolvePort(sessionId);
const matcher = parseMatcher(rest);
const pos = positionalArgs(rest);

let cmd: Record<string, unknown>;

switch (action) {
  case "stop": {
    const stopAll = rest.includes("--all");

    if (stopAll) {
      // Stop all named sessions
      for (const { id, state } of listSessions()) {
        console.log(`Stopping session '${id}'...`);
        try { await send({ action: "quit" }, state.port); } catch {}
        try { process.kill(state.pid, "SIGTERM"); } catch {}
        // Shutdown and delete cloned sim
        Bun.spawn(["xcrun", "simctl", "shutdown", state.udid]);
        await Bun.sleep(500);
        Bun.spawn(["xcrun", "simctl", "delete", state.udid]);
        removeSession(id);
      }
      // Also stop default
      try { await send({ action: "quit" }, DEFAULT_PORT); } catch {}
      const pidFile = `${RESULTS_DIR}/.dtx.pid`;
      try {
        const pid = parseInt(await Bun.file(pidFile).text());
        if (pid) { try { process.kill(pid, "SIGTERM"); } catch {} }
        await Bun.write(pidFile, "");
      } catch {}
      console.log("All sessions stopped.");
      process.exit(0);
    }

    if (sessionId) {
      // Stop specific named session
      const session = readSession(sessionId);
      if (!session) {
        console.error(`Session not found: ${sessionId}`);
        process.exit(1);
      }
      try { await send({ action: "quit" }, session.port); } catch {}
      try { process.kill(session.pid, "SIGTERM"); } catch {}
      // Shutdown and delete cloned sim
      console.log(`Shutting down simulator ${session.deviceName}...`);
      const shutProc = Bun.spawn(["xcrun", "simctl", "shutdown", session.udid]);
      await shutProc.exited;
      const delProc = Bun.spawn(["xcrun", "simctl", "delete", session.udid]);
      await delProc.exited;
      removeSession(sessionId);
      console.log(`Session '${sessionId}' stopped.`);
      process.exit(0);
    }

    // Default stop
    try {
      await send({ action: "quit" }, DEFAULT_PORT);
      console.log("REPL session stopped.");
    } catch {
      // Server already gone
    }
    const pidFile = `${RESULTS_DIR}/.dtx.pid`;
    try {
      const pid = parseInt(await Bun.file(pidFile).text());
      if (pid) {
        try { process.kill(pid, "SIGTERM"); } catch {}
      }
      await Bun.write(pidFile, "");
    } catch {}
    process.exit(0);
  }

  case "tap":
    cmd = { action: "tap", matcher };
    break;

  case "long-press":
    cmd = { action: "longPress", matcher };
    break;

  case "multi-tap":
    cmd = { action: "multiTap", matcher, args: [parseInt(pos[0]) || 2] };
    break;

  case "type":
    if (!pos[0]) { console.error("Usage: dtx type --id <id> \"text\""); process.exit(1); }
    cmd = { action: "typeText", matcher, args: [pos[0]] };
    break;

  case "replace":
    if (!pos[0]) { console.error("Usage: dtx replace --id <id> \"text\""); process.exit(1); }
    cmd = { action: "replaceText", matcher, args: [pos[0]] };
    break;

  case "clear":
    cmd = { action: "clearText", matcher };
    break;

  case "scroll": {
    const direction = pos[0] || "down";
    const pixels = parseInt(pos[1]) || 200;
    cmd = { action: "scroll", matcher, args: [pixels, direction] };
    break;
  }

  case "scroll-to":
    cmd = { action: "scrollTo", matcher, args: [pos[0] || "bottom"] };
    break;

  case "swipe":
    cmd = { action: "swipe", matcher, args: [pos[0] || "left", pos[1] || "slow", pos[2] ? parseFloat(pos[2]) : undefined] };
    break;

  case "expect": {
    const raw = pos[0] || "visible";
    const map: Record<string, string> = {
      visible: "toBeVisible",
      exists: "toExist",
      exist: "toExist",
      focused: "toBeFocused",
      "not-visible": "not.toBeVisible",
      "not-exist": "not.toExist",
    };
    cmd = { action: "expect", matcher, args: [map[raw] || raw] };
    break;
  }

  case "wait":
    cmd = { action: "waitFor", matcher, args: [parseInt(pos[0]) || 5000] };
    break;

  case "openurl":
    if (!pos[0]) { console.error("Usage: dtx openurl <url>"); process.exit(1); }
    cmd = { action: "openURL", args: [pos[0]] };
    break;

  case "screenshot":
    cmd = { action: "screenshot", args: [pos[0]] };
    break;

  case "reload":
    cmd = { action: "reloadApp" };
    break;

  default:
    console.error(`Unknown command: ${action}. Run 'dtx help' for usage.`);
    process.exit(1);
}

try {
  const result = await send(cmd, port);
  printResult(result);
  if (result.quit) console.log("REPL session stopped.");
} catch {
  console.error("Cannot connect to REPL server. Run 'dtx start' first.");
  process.exit(1);
}
