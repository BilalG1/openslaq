import type { ApiKey } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatApiKeyTable } from "../output";
import { getAuthenticatedClient } from "../client";

const createFlags = {
  name: { type: "string", required: true },
  scopes: { type: "string", required: true },
  expires: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const listFlags = {
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const getFlags = {
  id: { type: "string", required: true },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const updateFlags = {
  id: { type: "string", required: true },
  name: { type: "string" },
  scopes: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const deleteFlags = {
  id: { type: "string", required: true },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const apiKeysCommand = defineCommand({
  help() {
    printHelp("openslaq api-keys <subcommand>", "Manage API keys.");
    console.log("Subcommands:");
    console.log(`  ${"create".padEnd(12)}Create a new API key`);
    console.log(`  ${"list".padEnd(12)}List API keys`);
    console.log(`  ${"get".padEnd(12)}Get API key details`);
    console.log(`  ${"update".padEnd(12)}Update an API key`);
    console.log(`  ${"delete".padEnd(12)}Delete an API key`);
    console.log();
  },
  subcommands: {
    create: defineCommand({
      help() {
        printHelp("openslaq api-keys create [flags]", "Create a new API key.", [
          { name: "--name NAME", desc: "Key name (required)" },
          { name: "--scopes SCOPES", desc: "Comma-separated scopes (required)" },
          { name: "--expires DATETIME", desc: "Expiration ISO datetime (optional)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: createFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const scopes = f.scopes.split(",").map((s) => s.trim());
        const res = await client.api["api-keys"].$post({
          json: {
            name: f.name,
            scopes: scopes as any,
            ...(f.expires ? { expiresAt: f.expires } : {}),
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg = (body as { error?: string })?.error ?? `Failed to create API key: ${res.status}`;
          console.error(msg);
          process.exit(1);
        }
        const key = (await res.json()) as ApiKey & { token: string };

        if (f.json) {
          console.log(JSON.stringify(key, null, 2));
        } else {
          console.log(`API key created: ${key.name}`);
          console.log(`Token: ${key.token}`);
          console.log(`Prefix: ${key.tokenPrefix}`);
          console.log(`Scopes: ${key.scopes.join(", ")}`);
          console.log("\nSave this token — it won't be shown again.");
        }
      },
    }),
    list: defineCommand({
      help() {
        printHelp("openslaq api-keys list [flags]", "List API keys.", [
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api["api-keys"].$get();
        if (!res.ok) {
          console.error(`Failed to list API keys: ${res.status}`);
          process.exit(1);
        }
        const data = (await res.json()) as { keys: ApiKey[] };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(formatApiKeyTable(data.keys));
        }
      },
    }),
    get: defineCommand({
      help() {
        printHelp("openslaq api-keys get [flags]", "Get API key details.", [
          { name: "--id ID", desc: "API key ID (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: getFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api["api-keys"][":id"].$get({
          param: { id: f.id },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg = (body as { error?: string })?.error ?? `Failed to get API key: ${res.status}`;
          console.error(msg);
          process.exit(1);
        }
        const key = (await res.json()) as ApiKey;

        if (f.json) {
          console.log(JSON.stringify(key, null, 2));
        } else {
          console.log(`Name: ${key.name}`);
          console.log(`Prefix: ${key.tokenPrefix}`);
          console.log(`Scopes: ${key.scopes.join(", ")}`);
          console.log(`Expires: ${key.expiresAt ?? "never"}`);
          console.log(`Last used: ${key.lastUsedAt ?? "never"}`);
          console.log(`Created: ${key.createdAt}`);
        }
      },
    }),
    update: defineCommand({
      help() {
        printHelp("openslaq api-keys update [flags]", "Update an API key.", [
          { name: "--id ID", desc: "API key ID (required)" },
          { name: "--name NAME", desc: "New name (optional)" },
          { name: "--scopes SCOPES", desc: "New comma-separated scopes (optional)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: updateFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const body: Record<string, any> = {};
        if (f.name) body.name = f.name;
        if (f.scopes) body.scopes = f.scopes.split(",").map((s) => s.trim());

        const res = await client.api["api-keys"][":id"].$patch({
          param: { id: f.id },
          json: body as any,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const msg = (data as { error?: string })?.error ?? `Failed to update API key: ${res.status}`;
          console.error(msg);
          process.exit(1);
        }
        const key = await res.json();

        if (f.json) {
          console.log(JSON.stringify(key, null, 2));
        } else {
          console.log("API key updated.");
        }
      },
    }),
    delete: defineCommand({
      help() {
        printHelp("openslaq api-keys delete [flags]", "Delete an API key.", [
          { name: "--id ID", desc: "API key ID (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: deleteFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api["api-keys"][":id"].$delete({
          param: { id: f.id },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg = (body as { error?: string })?.error ?? `Failed to delete API key: ${res.status}`;
          console.error(msg);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("API key deleted.");
        }
      },
    }),
  },
});
