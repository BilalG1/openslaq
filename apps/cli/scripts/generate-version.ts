import { join } from "node:path";

const pkgPath = join(import.meta.dir, "..", "package.json");
const pkg = await Bun.file(pkgPath).json();
const versionFile = join(import.meta.dir, "..", "src", "version.ts");

await Bun.write(versionFile, `export const VERSION = ${JSON.stringify(pkg.version)};\n`);
