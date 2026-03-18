import { VERSION } from "./version.js";

// ── Flag schema types ──────────────────────────────────────────────

export type FlagDef =
  | { type: "string"; required: true }
  | { type: "string"; required?: false; default: string }
  | { type: "string"; required?: false }
  | { type: "boolean" };

export type FlagSchema = Record<string, FlagDef>;

/** Infer typed result from a flag schema. */
export type ParsedFlags<S extends FlagSchema> = {
  [K in keyof S]: S[K] extends { type: "boolean" }
    ? boolean
    : S[K] extends { required: true }
      ? string
      : S[K] extends { default: string }
        ? string
        : string | undefined;
};

// ── Command types ──────────────────────────────────────────────────

export interface LeafCommand<S extends FlagSchema = FlagSchema> {
  help: () => void;
  flags?: S;
  action: (flags: ParsedFlags<S>) => Promise<void>;
}

export interface BranchCommand {
  help: () => void;
  subcommands: Record<string, Command>;
}

export type Command = LeafCommand<any> | BranchCommand;

function isBranch(cmd: Command): cmd is BranchCommand {
  return "subcommands" in cmd;
}

// ── defineCommand (identity helper for type inference) ─────────────

export function defineCommand<S extends FlagSchema>(def: LeafCommand<S>): LeafCommand<S>;
export function defineCommand(def: BranchCommand): BranchCommand;
export function defineCommand(def: Command): Command {
  return def;
}

// ── Flag parsing ───────────────────────────────────────────────────

function parseFlags<S extends FlagSchema>(schema: S, argv: string[]): ParsedFlags<S> {
  const result: Record<string, string | boolean | undefined> = {};

  for (const [key, def] of Object.entries(schema)) {
    const flag = `--${key}`;
    if (def.type === "boolean") {
      result[key] = argv.includes(flag);
    } else {
      const idx = argv.indexOf(flag);
      if (idx !== -1 && idx + 1 < argv.length) {
        result[key] = argv[idx + 1];
      } else if (def.type === "string" && "default" in def && def.default !== undefined) {
        result[key] = def.default;
      } else if (def.type === "string" && def.required) {
        console.error(`Missing required flag: ${flag}`);
        process.exit(1);
      } else {
        result[key] = undefined;
      }
    }
  }

  return result as ParsedFlags<S>;
}

// ── Dispatch ───────────────────────────────────────────────────────

function dispatch(cmd: Command, argv: string[]): Promise<void> {
  if (isBranch(cmd)) {
    const sub = argv[0];
    // If no subcommand or first arg is --help/-h, show branch help
    if (!sub || sub === "--help" || sub === "-h") {
      cmd.help();
      return Promise.resolve();
    }
    const child = cmd.subcommands[sub];
    if (!child) {
      console.error(`Unknown subcommand: ${sub}`);
      process.exit(1);
    }
    return dispatch(child, argv.slice(1));
  }

  // Leaf command: check --help/-h
  if (argv.includes("--help") || argv.includes("-h")) {
    cmd.help();
    return Promise.resolve();
  }

  const flags = cmd.flags ? parseFlags(cmd.flags, argv) : ({} as any);
  return cmd.action(flags);
}

// ── run (entry point) ──────────────────────────────────────────────

export function run(
  rootHelp: () => void,
  commands: Record<string, Command>,
): void {
  const argv = process.argv.slice(2);
  const name = argv[0];

  if (!name || name === "--help" || name === "-h") {
    rootHelp();
    return;
  }

  if (name === "--version" || name === "-V") {
    console.log(VERSION);
    return;
  }

  const cmd = commands[name];
  if (!cmd) {
    console.error(`Unknown command: ${name}`);
    console.error('Run `openslaq --help` for available commands.');
    process.exit(1);
  }

  dispatch(cmd, argv.slice(1)).catch(async (err: Error) => {
    const Sentry = await import("@sentry/node");
    Sentry.captureException(err);
    await Sentry.flush(2000);
    console.error(err.message);
    process.exit(1);
  });
}
