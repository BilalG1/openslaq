import { join } from "node:path";

const outFile = join(import.meta.dir, "..", "dist", "index.js");
const content = await Bun.file(outFile).text();
const shebang = "#!/usr/bin/env bun\n";

if (!content.startsWith("#!")) {
  await Bun.write(outFile, shebang + content);
}
