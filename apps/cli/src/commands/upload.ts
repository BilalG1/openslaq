import { defineCommand, type FlagSchema } from "../framework";
import { printHelp, formatBytes } from "../output";
import { authenticatedFetch } from "../client";

const flags = {
  file: { type: "string", required: true },
  workspace: { type: "string", default: "default" },
  json: { type: "boolean" },
} as const satisfies FlagSchema;

export const uploadCommand = defineCommand({
  help() {
    printHelp("openslaq upload [flags]", "Upload a file.", [
      { name: "--file PATH", desc: "Path to file to upload (required)" },
      { name: "--workspace SLUG", desc: 'Workspace slug (default: "default")' },
      { name: "--json", desc: "Output raw JSON" },
    ]);
  },
  flags,
  async action(f) {
    const file = Bun.file(f.file);
    if (!(await file.exists())) {
      console.error(`File not found: ${f.file}`);
      process.exit(1);
    }

    const formData = new FormData();
    formData.append("files", file);

    const res = await authenticatedFetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error(`Failed to upload file: ${res.status}`);
      process.exit(1);
    }

    const data = (await res.json()) as {
      attachments: {
        filename: string;
        size: number;
        downloadUrl: string;
      }[];
    };

    if (f.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      for (const att of data.attachments) {
        const sizeStr = formatBytes(att.size);
        console.log(`Uploaded ${att.filename} (${sizeStr})`);
        console.log(`  ${att.downloadUrl}`);
      }
    }
  },
});
