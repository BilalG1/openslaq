import { $ } from "bun";
import { stat } from "node:fs/promises";
import path from "node:path";

const apiDir = path.resolve(import.meta.dirname, "../apps/api");
const stampFile = path.join(apiDir, "dist/.types-stamp");

async function getStampTime(): Promise<number> {
  try {
    return (await stat(stampFile)).mtimeMs;
  } catch {
    return 0;
  }
}

async function hasNewerSources(stampTime: number): Promise<boolean> {
  if (stampTime === 0) return true;
  const glob = new Bun.Glob("**/*.ts");
  for await (const file of glob.scan({ cwd: path.join(apiDir, "src") })) {
    const s = await stat(path.join(apiDir, "src", file));
    if (s.mtimeMs > stampTime) return true;
  }
  return false;
}

const stampTime = await getStampTime();

if (await hasNewerSources(stampTime)) {
  console.log("pretypecheck: rebuilding API declarations...");
  await $`bun run --filter @openslaq/api build:types`;
  await Bun.write(stampFile, "");
  console.log("pretypecheck: done");
} else {
  console.log("pretypecheck: API declarations up to date");
}
