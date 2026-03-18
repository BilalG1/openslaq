/**
 * Bundles mobile-editor.html + its JS imports into a single self-contained HTML string,
 * then writes it as a TypeScript constant to src/generated/mobile-editor-html.ts.
 *
 * Usage: bun run scripts/build-mobile-editor.ts
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = dirname(import.meta.dir); // packages/editor
const htmlPath = resolve(ROOT, "src/mobile-editor.html");

const htmlSource = readFileSync(htmlPath, "utf-8");

// Extract the script content from the HTML
const scriptMatch = htmlSource.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  throw new Error("Could not find <script type=\"module\"> in mobile-editor.html");
}

// Write a temporary entry file that contains the script content
const tempEntry = resolve(ROOT, "src/.mobile-editor-entry.ts");
await Bun.write(tempEntry, scriptMatch[1]!);

// Bundle the JS as an IIFE so it runs in a regular <script> tag (no ES module exports)
const jsResult = await Bun.build({
  entrypoints: [tempEntry],
  bundle: true,
  minify: true,
  format: "iife",
  target: "browser",
});

// Clean up temp file
const { unlinkSync } = await import("node:fs");
try { unlinkSync(tempEntry); } catch {}

if (!jsResult.success) {
  console.error("JS bundle failed:");
  for (const log of jsResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

let jsBundle = await jsResult.outputs[0]!.text();

// Escape </script> inside the bundled JS to prevent the browser's HTML parser
// from treating string literals containing "</script>" as the end of the tag.
jsBundle = jsBundle.replaceAll("</script>", "<\\/script>");

// Replace the <script type="module">...</script> with the bundled JS.
// Use a function replacement to avoid $-pattern interpretation in the bundle.
const finalHtml = htmlSource.replace(
  /<script type="module">[\s\S]*?<\/script>/,
  () => `<script>${jsBundle}</script>`,
);

// Write the generated TS file
const outputPath = resolve(ROOT, "src/generated/mobile-editor-html.ts");
const tsContent = `// AUTO-GENERATED — do not edit. Run \`bun run build:mobile\` to regenerate.
export const MOBILE_EDITOR_HTML = ${JSON.stringify(finalHtml)};
`;

await Bun.write(outputPath, tsContent);
console.log(`Generated ${outputPath} (${(finalHtml.length / 1024).toFixed(1)} KB)`);
