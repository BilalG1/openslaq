import path from "node:path";
import type { CustomEmoji } from "@openslaq/shared";
import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatEmojiTable } from "../output";
import { getAuthenticatedClient, authenticatedFetch, requireWorkspace } from "../client";

const listFlags = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const uploadFlags = {
  file: { type: "string", required: true },
  name: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const bulkUploadFlags = {
  dir: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const deleteFlags = {
  id: { type: "string", required: true },
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

export const emojiCommand = defineCommand({
  help() {
    printHelp("openslaq emoji <subcommand>", "Manage custom emoji.");
    console.log("Subcommands:");
    console.log(`  ${"list".padEnd(16)}List custom emoji`);
    console.log(`  ${"upload".padEnd(16)}Upload a custom emoji`);
    console.log(`  ${"bulk-upload".padEnd(16)}Upload all emoji from a directory`);
    console.log(`  ${"delete".padEnd(16)}Delete a custom emoji`);
    console.log();
  },
  subcommands: {
    list: defineCommand({
      help() {
        printHelp("openslaq emoji list [flags]", "List custom emoji.", [
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: listFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].emoji.$get({
          param: { slug: requireWorkspace(f.workspace) },
        });
        if (!res.ok) {
          console.error(`Failed to list emoji: ${res.status}`);
          process.exit(1);
        }
        const data = (await res.json()) as { emojis: CustomEmoji[] };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(formatEmojiTable(data.emojis));
        }
      },
    }),
    upload: defineCommand({
      help() {
        printHelp("openslaq emoji upload [flags]", "Upload a custom emoji.", [
          { name: "--file PATH", desc: "Path to image file (required)" },
          { name: "--name NAME", desc: "Emoji name (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: uploadFlags,
      async action(f) {
        const file = Bun.file(f.file);
        if (!(await file.exists())) {
          console.error(`File not found: ${f.file}`);
          process.exit(1);
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", f.name);

        const res = await authenticatedFetch(
          `/api/workspaces/${encodeURIComponent(requireWorkspace(f.workspace))}/emoji`,
          { method: "POST", body: formData },
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg = (body as { error?: string })?.error ?? `Failed to upload emoji: ${res.status}`;
          console.error(msg);
          process.exit(1);
        }

        const data = (await res.json()) as { emoji: CustomEmoji };

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(`Uploaded :${data.emoji.name}:`);
        }
      },
    }),
    "bulk-upload": defineCommand({
      help() {
        printHelp("openslaq emoji bulk-upload [flags]", "Upload all emoji from a directory.", [
          { name: "--dir PATH", desc: "Directory containing image files (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: bulkUploadFlags,
      async action(f) {
        const glob = new Bun.Glob(`*.{${IMAGE_EXTENSIONS.join(",")}}`);
        const files = Array.from(glob.scanSync({ cwd: f.dir, absolute: true }));

        if (files.length === 0) {
          console.error(`No image files found in ${f.dir}`);
          process.exit(1);
        }

        let uploaded = 0;
        let skipped = 0;
        const results: { name: string; status: "ok" | "skipped" | "error"; error?: string }[] = [];

        for (let i = 0; i < files.length; i++) {
          const filePath = files[i]!;
          const ext = path.extname(filePath);
          const name = path.basename(filePath, ext).toLowerCase().replace(/[^a-z0-9_-]/g, "-");

          console.log(`[${i + 1}/${files.length}] Uploading :${name}:...`);

          const file = Bun.file(filePath);
          const formData = new FormData();
          formData.append("file", file);
          formData.append("name", name);

          const res = await authenticatedFetch(
            `/api/workspaces/${encodeURIComponent(requireWorkspace(f.workspace))}/emoji`,
            { method: "POST", body: formData },
          );

          if (res.status === 409) {
            console.log(`  Skipped :${name}: (already exists)`);
            skipped++;
            results.push({ name, status: "skipped" });
          } else if (!res.ok) {
            const body = await res.json().catch(() => null);
            const msg = (body as { error?: string })?.error ?? `HTTP ${res.status}`;
            console.error(`  Failed :${name}: ${msg}`);
            results.push({ name, status: "error", error: msg });
          } else {
            uploaded++;
            results.push({ name, status: "ok" });
          }
        }

        if (f.json) {
          console.log(JSON.stringify({ uploaded, skipped, total: files.length, results }, null, 2));
        } else {
          const parts = [`Uploaded ${uploaded}/${files.length} emoji`];
          if (skipped > 0) parts.push(`(${skipped} skipped)`);
          console.log(parts.join(" "));
        }
      },
    }),
    delete: defineCommand({
      help() {
        printHelp("openslaq emoji delete [flags]", "Delete a custom emoji.", [
          { name: "--id ID", desc: "Emoji ID (required)" },
          { name: "--workspace SLUG", desc: "Workspace slug (required)" },
          { name: "--json", desc: "Output raw JSON" },
        ]);
      },
      flags: deleteFlags,
      async action(f) {
        const client = await getAuthenticatedClient();
        const res = await client.api.workspaces[":slug"].emoji[":emojiId"].$delete({
          param: { slug: requireWorkspace(f.workspace), emojiId: f.id },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg = (body as { error?: string })?.error ?? `Failed to delete emoji: ${res.status}`;
          console.error(msg);
          process.exit(1);
        }
        const data = await res.json();

        if (f.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("Emoji deleted.");
        }
      },
    }),
  },
});
