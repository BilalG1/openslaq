import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  spyOn,
  mock,
} from "bun:test";
import { defineCommand, run } from "../src/framework";

mock.module("@sentry/node", () => ({
  captureException: () => {},
  flush: async () => true,
}));

// ── sentinel for process.exit ───────────────────────────────────────

class ExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

let savedArgv: string[];
let exitSpy: ReturnType<typeof spyOn>;
let errorSpy: ReturnType<typeof spyOn>;
let logSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  savedArgv = process.argv;
  exitSpy = spyOn(process, "exit").mockImplementation((code) => {
    throw new ExitError(code as number);
  });
  errorSpy = spyOn(console, "error").mockImplementation(() => {});
  logSpy = spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.argv = savedArgv;
  exitSpy.mockRestore();
  errorSpy.mockRestore();
  logSpy.mockRestore();
});

// ── helpers ─────────────────────────────────────────────────────────

function setArgv(...args: string[]) {
  process.argv = ["node", "openslaq", ...args];
}

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

// ── parseFlags (tested via leaf command actions) ────────────────────

describe("parseFlags", () => {
  test("boolean flag present → true", async () => {
    let captured: any;
    const cmd = defineCommand({
      help: () => {},
      flags: { verbose: { type: "boolean" } },
      action: async (flags) => {
        captured = flags;
      },
    });
    setArgv("test", "--verbose");
    run(() => {}, { test: cmd });
    await flush();
    expect(captured.verbose).toBe(true);
  });

  test("boolean flag absent → false", async () => {
    let captured: any;
    const cmd = defineCommand({
      help: () => {},
      flags: { verbose: { type: "boolean" } },
      action: async (flags) => {
        captured = flags;
      },
    });
    setArgv("test");
    run(() => {}, { test: cmd });
    await flush();
    expect(captured.verbose).toBe(false);
  });

  test("string flag --name foo → 'foo'", async () => {
    let captured: any;
    const cmd = defineCommand({
      help: () => {},
      flags: { name: { type: "string", required: true } },
      action: async (flags) => {
        captured = flags;
      },
    });
    setArgv("test", "--name", "foo");
    run(() => {}, { test: cmd });
    await flush();
    expect(captured.name).toBe("foo");
  });

  test("required flag missing → exit(1) + error", () => {
    const cmd = defineCommand({
      help: () => {},
      flags: { name: { type: "string", required: true } },
      action: async () => {},
    });
    setArgv("test");
    expect(() => run(() => {}, { test: cmd })).toThrow(ExitError);
    expect(errorSpy).toHaveBeenCalledWith("Missing required flag: --name");
  });

  test("default value applied when flag absent", async () => {
    let captured: any;
    const cmd = defineCommand({
      help: () => {},
      flags: { name: { type: "string", default: "world" } },
      action: async (flags) => {
        captured = flags;
      },
    });
    setArgv("test");
    run(() => {}, { test: cmd });
    await flush();
    expect(captured.name).toBe("world");
  });

  test("optional string flag absent → undefined", async () => {
    let captured: any;
    const cmd = defineCommand({
      help: () => {},
      flags: { name: { type: "string" } },
      action: async (flags) => {
        captured = flags;
      },
    });
    setArgv("test");
    run(() => {}, { test: cmd });
    await flush();
    expect(captured.name).toBeUndefined();
  });
});

// ── dispatch (branch commands) ──────────────────────────────────────

describe("dispatch branch", () => {
  test("valid subcommand routes to leaf action", async () => {
    let called = false;
    const branch = defineCommand({
      help: () => {},
      subcommands: {
        sub: defineCommand({
          help: () => {},
          action: async () => {
            called = true;
          },
        }),
      },
    });
    setArgv("br", "sub");
    run(() => {}, { br: branch });
    await flush();
    expect(called).toBe(true);
  });

  test("--help shows branch help", async () => {
    const helpFn = mock(() => {});
    const branch = defineCommand({
      help: helpFn,
      subcommands: {
        sub: defineCommand({ help: () => {}, action: async () => {} }),
      },
    });
    setArgv("br", "--help");
    run(() => {}, { br: branch });
    await flush();
    expect(helpFn).toHaveBeenCalled();
  });

  test("-h shows branch help", async () => {
    const helpFn = mock(() => {});
    const branch = defineCommand({
      help: helpFn,
      subcommands: {
        sub: defineCommand({ help: () => {}, action: async () => {} }),
      },
    });
    setArgv("br", "-h");
    run(() => {}, { br: branch });
    await flush();
    expect(helpFn).toHaveBeenCalled();
  });

  test("no args shows branch help", async () => {
    const helpFn = mock(() => {});
    const branch = defineCommand({
      help: helpFn,
      subcommands: {
        sub: defineCommand({ help: () => {}, action: async () => {} }),
      },
    });
    setArgv("br");
    run(() => {}, { br: branch });
    await flush();
    expect(helpFn).toHaveBeenCalled();
  });

  test("unknown subcommand → exit(1)", () => {
    const branch = defineCommand({
      help: () => {},
      subcommands: {
        sub: defineCommand({ help: () => {}, action: async () => {} }),
      },
    });
    setArgv("br", "nope");
    expect(() => run(() => {}, { br: branch })).toThrow(ExitError);
    expect(errorSpy).toHaveBeenCalledWith("Unknown subcommand: nope");
  });
});

// ── dispatch (leaf commands) ────────────────────────────────────────

describe("dispatch leaf", () => {
  test("--help calls help, action NOT called", async () => {
    let actionCalled = false;
    const helpFn = mock(() => {});
    const cmd = defineCommand({
      help: helpFn,
      action: async () => {
        actionCalled = true;
      },
    });
    setArgv("test", "--help");
    run(() => {}, { test: cmd });
    await flush();
    expect(helpFn).toHaveBeenCalled();
    expect(actionCalled).toBe(false);
  });

  test("action that throws → exit(1) + error message", async () => {
    // For this test, don't throw from process.exit — just record calls.
    // Throwing from .catch creates an unhandled rejection that leaks between tests.
    exitSpy.mockRestore();
    exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);

    const cmd = defineCommand({
      help: () => {},
      action: async () => {
        throw new Error("boom");
      },
    });
    setArgv("test");
    run(() => {}, { test: cmd });
    await flush();
    expect(errorSpy).toHaveBeenCalledWith("boom");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

// ── run (entry point) ──────────────────────────────────────────────

describe("run", () => {
  test("no args → rootHelp called", () => {
    const rootHelp = mock(() => {});
    setArgv();
    run(rootHelp, {});
    expect(rootHelp).toHaveBeenCalled();
  });

  test("--help → rootHelp called", () => {
    const rootHelp = mock(() => {});
    setArgv("--help");
    run(rootHelp, {});
    expect(rootHelp).toHaveBeenCalled();
  });

  test("unknown command → exit(1)", () => {
    setArgv("nope");
    expect(() => run(() => {}, {})).toThrow(ExitError);
    expect(errorSpy).toHaveBeenCalledWith("Unknown command: nope");
  });
});
