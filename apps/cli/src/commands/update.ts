import { defineCommand } from "../framework";
import { printHelp } from "../output";
import { VERSION } from "../version";
import { compareSemver, fetchLatestVersion } from "../update-check";

export const updateCommand = defineCommand({
  help() {
    printHelp("openslaq update", "Update the CLI to the latest version.");
  },
  flags: {} as const,
  async action() {
    const latest = await fetchLatestVersion();
    if (!latest) {
      console.error("Failed to check for updates.");
      process.exit(1);
    }

    if (compareSemver(VERSION, latest) <= 0) {
      console.log(`Already on the latest version (${VERSION}).`);
      return;
    }

    console.log(`Update available: ${VERSION} → ${latest}`);
    console.log("Downloading...\n");

    const proc = Bun.spawn(["bash", "-c", "curl -fsSL https://openslaq.com/install.sh | bash"], {
      stdout: "inherit",
      stderr: "inherit",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      console.error("\nUpdate failed. Try manually: curl -fsSL https://openslaq.com/install.sh | bash");
      process.exit(1);
    }
  },
});
