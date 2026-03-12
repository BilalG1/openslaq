import { defineCommand, type FlagSchema } from "../framework";
import { printHelp } from "../output";
import { getAuthenticatedClient } from "../client";
import { parseDuration } from "../parse-duration";

const setFlags = {
  emoji: { type: "string", required: true },
  text: { type: "string", required: true },
  expires: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const clearFlags = {
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const statusCommand = defineCommand({
  help() {
    printHelp("openslaq status <subcommand>", "Manage your status.");
    console.log("Subcommands:");
    console.log(`  ${"set".padEnd(12)}Set your status`);
    console.log(`  ${"clear".padEnd(12)}Clear your status`);
    console.log();
  },
  subcommands: {
    set: defineCommand({
      help() {
        printHelp("openslaq status set [flags]", "Set your status.", [
          { name: "--emoji TEXT", desc: "Status emoji (required)" },
          { name: "--text TEXT", desc: "Status text (required)" },
          { name: "--expires DURATION", desc: 'When to expire (e.g. "30m", "2h", "1d", or ISO datetime)' },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: setFlags,
      async action(f) {
        const expiresAt = f.expires ? parseDuration(f.expires) : undefined;
        const client = await getAuthenticatedClient();
        const res = await client.api.users.me.status.$put({
          json: { emoji: f.emoji, text: f.text, expiresAt: expiresAt ?? null },
        });
        if (!res.ok) {
          console.error(`Failed to set status: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          let msg = `Status set: ${f.emoji} ${f.text}`;
          if (expiresAt) {
            msg += ` (expires ${new Date(expiresAt).toLocaleString()})`;
          }
          console.log(msg);
        }
      },
    }),
    clear: defineCommand({
      help() {
        printHelp("openslaq status clear [flags]", "Clear your status.", [
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: clearFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.users.me.status.$delete({});
        if (!res.ok) {
          console.error(`Failed to clear status: ${res.status}`);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Status cleared.");
        }
      },
    }),
  },
});
