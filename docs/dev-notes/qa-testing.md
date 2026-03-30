# QA Testing with Agent Teammates

Spawn agent teammates that each test a different flow in parallel using isolated sessions.

## Tools

- **Mobile**: `dtx` CLI (`scripts/mobile/dtx.ts`) — run `bun scripts/mobile/dtx.ts --help` for commands
- **Web**: `agent-browser` CLI (preinstalled) — run `agent-browser --help` for commands

## Approach

1. Break the feature area into independent test flows (e.g. for messages: sending, editing, deleting, scheduling).
2. Spawn one agent per flow, each with its own isolated session.
3. Once all agents complete, compile a table of bugs from their findings.

## Mobile QA (dtx)

Each agent uses a named dtx session (`dtx start --name <name>`) which clones the simulator for isolation.

**Stagger session creation** — at most 2 dtx sessions starting at a time. If you need 5 agents, spawn 2, wait for their sessions to be running, spawn 2 more, wait, then the last one.

### Prompt template

```
You are QA-testing the mobile app via the dtx CLI. Run `bun scripts/mobile/dtx.ts --help` to see available commands.

Your test flow: [DESCRIBE THE SPECIFIC FLOW]

Setup:
1. Start an isolated session: `bun scripts/mobile/dtx.ts start --name [unique-session-name]`
2. Use `-s <session-id>` on all subsequent dtx commands.

For any bugs found, take a screenshot or screen recording and describe what you did, what you expected, and what happened.

Cleanup: `bun scripts/mobile/dtx.ts stop -s <id>`

Return a list of bugs found (or "no bugs found") with screenshots/recordings attached.
```

## Web QA (agent-browser)

Each agent uses `--session <name>` for isolation. Sessions are lightweight — no staggering needed.

### Prompt template

```
You are QA-testing the web app via the agent-browser CLI. Run `agent-browser --help` to see available commands.

Your test flow: [DESCRIBE THE SPECIFIC FLOW]

Setup:
1. Open the app: `agent-browser --session [unique-session-name] open http://localhost:3000`
2. Use `--session [unique-session-name]` on ALL subsequent commands.

For any bugs found, take a screenshot or screen recording and describe what you did, what you expected, and what happened.

Cleanup: `agent-browser --session <name> close`

Return a list of bugs found (or "no bugs found") with screenshot paths attached.
```

## Compiling Results

After all agents complete, compile a table of bugs they found.

## Tips

- Dev servers must be running (`bun run dev` or `bun run dev:bg`) before starting QA.
- For mobile, dtx sessions use dev auth (auto-injected). For web, use the dev login flow at localhost:3000.
- Keep flows independent — agents should set up their own test data, not depend on other agents' state.
- Clean up sessions when done. For mobile: `dtx stop --all`. For web: agents close their own sessions.
