#!/usr/bin/env bun
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 0,
});

import { run } from "./framework";
import { loginCommand } from "./commands/login";
import { logoutCommand } from "./commands/logout";
import { whoamiCommand } from "./commands/whoami";
import { channelsCommand } from "./commands/channels";
import { messagesCommand } from "./commands/messages";
import { workspacesCommand } from "./commands/workspaces";
import { uploadCommand } from "./commands/upload";
import { dmCommand } from "./commands/dm";
import { statusCommand } from "./commands/status";
import { unreadCommand } from "./commands/unread";
import { apiKeysCommand } from "./commands/api-keys";
import { emojiCommand } from "./commands/emoji";
import { filesCommand } from "./commands/files";
import { presenceCommand } from "./commands/presence";
import { updateCommand } from "./commands/update";
import { usersCommand } from "./commands/users";
import { printHelp } from "./output";
import { checkForUpdate } from "./update-check";

function rootHelp() {
  printHelp(
    "openslaq <command> [flags]",
    "OpenSlaq CLI — interact with your workspace from the terminal.",
  );
  console.log("Commands:");
  const cmds = [
    { name: "login", desc: "Log in via browser" },
    { name: "logout", desc: "Log out and clear credentials" },
    { name: "whoami", desc: "Show current user" },
    { name: "channels", desc: "Manage channels" },
    { name: "dm", desc: "Direct messages" },
    { name: "messages", desc: "Read and send messages" },
    { name: "status", desc: "Manage your status" },
    { name: "unread", desc: "Manage unread messages" },
    { name: "users", desc: "Search and list users" },
    { name: "files", desc: "Browse workspace files" },
    { name: "presence", desc: "Show who's online" },
    { name: "workspaces", desc: "Manage workspaces" },
    { name: "upload", desc: "Upload a file" },
    { name: "api-keys", desc: "Manage API keys" },
    { name: "emoji", desc: "Manage custom emoji" },
    { name: "update", desc: "Update CLI to latest version" },
  ];
  for (const cmd of cmds) {
    console.log(`  ${cmd.name.padEnd(12)}${cmd.desc}`);
  }
  console.log("\nRun `openslaq <command> --help` for more information.\n");
}

checkForUpdate();

run(rootHelp, {
  login: loginCommand,
  logout: logoutCommand,
  whoami: whoamiCommand,
  channels: channelsCommand,
  dm: dmCommand,
  messages: messagesCommand,
  status: statusCommand,
  unread: unreadCommand,
  users: usersCommand,
  files: filesCommand,
  presence: presenceCommand,
  workspaces: workspacesCommand,
  upload: uploadCommand,
  "api-keys": apiKeysCommand,
  emoji: emojiCommand,
  update: updateCommand,
});
