/**
 * One-time script to generate all icon assets from the canonical SVG.
 * Run: bun scripts/generate-icons.ts
 */
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(import.meta.dir, "..");
const SVG = readFileSync(join(ROOT, "apps/web/public/icon.svg"));

async function render(size: number): Promise<Buffer> {
  return sharp(SVG, { density: Math.round((72 * size) / 80) })
    .resize(size, size)
    .png()
    .toBuffer();
}

/** Render the foreground hash on transparent background with padding for adaptive icons */
async function renderForeground(size: number): Promise<Buffer> {
  // Adaptive icon foreground needs ~30% padding around the icon content
  const padding = Math.round(size * 0.2);
  const innerSize = size - padding * 2;

  const fg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
  <g transform="translate(${padding} ${padding})">
    <svg viewBox="0 0 80 80" width="${innerSize}" height="${innerSize}" fill="none">
      <rect width="80" height="80" rx="18" fill="#1264a3"/>
      <g transform="rotate(-12 40 40)">
        <path d="M26 32h28M26 48h28M34 20v40M46 20v40" stroke="white" stroke-width="5" stroke-linecap="round"/>
      </g>
    </svg>
  </g>
</svg>`);

  return sharp(fg, { density: Math.round((72 * size) / 80) })
    .resize(size, size)
    .png()
    .toBuffer();
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

async function main() {
  console.log("Generating icon assets from canonical SVG...\n");

  // ---- Web ----
  const webPublic = join(ROOT, "apps/web/public");
  ensureDir(webPublic);

  // favicon.ico (32x32 single-size)
  const ico32 = await render(32);
  // Use sharp to create a PNG, then wrap in ICO container
  const icoBuffer = createIco([ico32], [32]);
  writeFileSync(join(webPublic, "favicon.ico"), icoBuffer);
  console.log("  apps/web/public/favicon.ico (32x32)");

  // apple-touch-icon.png (180x180)
  writeFileSync(join(webPublic, "apple-touch-icon.png"), await render(180));
  console.log("  apps/web/public/apple-touch-icon.png (180x180)");

  // ---- Desktop (Tauri) ----
  const desktopIcons = join(ROOT, "apps/desktop/src-tauri/icons");
  ensureDir(desktopIcons);

  const desktopSizes: Record<string, number> = {
    "32x32.png": 32,
    "64x64.png": 64,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "icon.png": 512,
  };
  for (const [name, size] of Object.entries(desktopSizes)) {
    writeFileSync(join(desktopIcons, name), await render(size));
    console.log(`  apps/desktop/src-tauri/icons/${name} (${size}x${size})`);
  }

  // Windows Square logos
  const squareSizes: Record<string, number> = {
    "Square30x30Logo.png": 30,
    "Square44x44Logo.png": 44,
    "Square71x71Logo.png": 71,
    "Square89x89Logo.png": 89,
    "Square107x107Logo.png": 107,
    "Square142x142Logo.png": 142,
    "Square150x150Logo.png": 150,
    "Square284x284Logo.png": 284,
    "Square310x310Logo.png": 310,
    "StoreLogo.png": 50,
  };
  for (const [name, size] of Object.entries(squareSizes)) {
    writeFileSync(join(desktopIcons, name), await render(size));
    console.log(`  apps/desktop/src-tauri/icons/${name} (${size}x${size})`);
  }

  // Desktop icon.ico (multi-size: 16, 32, 48, 256)
  const icoSizes = [16, 32, 48, 256];
  const icoBuffers = await Promise.all(icoSizes.map((s) => render(s)));
  writeFileSync(join(desktopIcons, "icon.ico"), createIco(icoBuffers, icoSizes));
  console.log("  apps/desktop/src-tauri/icons/icon.ico (multi-size)");

  // Desktop icon.icns (macOS) — use iconutil
  const iconsetDir = join(desktopIcons, "icon.iconset");
  ensureDir(iconsetDir);
  const icnsSizes: Record<string, number> = {
    "icon_16x16.png": 16,
    "icon_16x16@2x.png": 32,
    "icon_32x32.png": 32,
    "icon_32x32@2x.png": 64,
    "icon_128x128.png": 128,
    "icon_128x128@2x.png": 256,
    "icon_256x256.png": 256,
    "icon_256x256@2x.png": 512,
    "icon_512x512.png": 512,
    "icon_512x512@2x.png": 1024,
  };
  for (const [name, size] of Object.entries(icnsSizes)) {
    writeFileSync(join(iconsetDir, name), await render(size));
  }
  execSync(`iconutil -c icns "${iconsetDir}" -o "${join(desktopIcons, "icon.icns")}"`);
  // Clean up iconset folder
  execSync(`rm -rf "${iconsetDir}"`);
  console.log("  apps/desktop/src-tauri/icons/icon.icns");

  // ---- iOS icons (Tauri) ----
  const iosDir = join(desktopIcons, "ios");
  ensureDir(iosDir);
  const iosIcons: Record<string, number> = {
    "AppIcon-20x20@1x.png": 20,
    "AppIcon-20x20@2x.png": 40,
    "AppIcon-20x20@2x-1.png": 40,
    "AppIcon-20x20@3x.png": 60,
    "AppIcon-29x29@1x.png": 29,
    "AppIcon-29x29@2x.png": 58,
    "AppIcon-29x29@2x-1.png": 58,
    "AppIcon-29x29@3x.png": 87,
    "AppIcon-40x40@1x.png": 40,
    "AppIcon-40x40@2x.png": 80,
    "AppIcon-40x40@2x-1.png": 80,
    "AppIcon-40x40@3x.png": 120,
    "AppIcon-60x60@2x.png": 120,
    "AppIcon-60x60@3x.png": 180,
    "AppIcon-76x76@1x.png": 76,
    "AppIcon-76x76@2x.png": 152,
    "AppIcon-83.5x83.5@2x.png": 167,
    "AppIcon-512@2x.png": 1024,
  };
  for (const [name, size] of Object.entries(iosIcons)) {
    writeFileSync(join(iosDir, name), await render(size));
    console.log(`  apps/desktop/src-tauri/icons/ios/${name} (${size}x${size})`);
  }

  // ---- Android icons (Tauri) ----
  const androidDir = join(desktopIcons, "android");
  const mipmapSizes: Record<string, number> = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
  };
  for (const [dir, size] of Object.entries(mipmapSizes)) {
    const d = join(androidDir, dir);
    ensureDir(d);
    writeFileSync(join(d, "ic_launcher.png"), await render(size));
    writeFileSync(join(d, "ic_launcher_round.png"), await render(size));
    writeFileSync(join(d, "ic_launcher_foreground.png"), await renderForeground(size));
    console.log(`  android/${dir}/ (${size}x${size})`);
  }

  // ---- Mobile (Expo) ----
  const mobileAssets = join(ROOT, "apps/mobile/assets");
  ensureDir(mobileAssets);
  writeFileSync(join(mobileAssets, "icon.png"), await render(1024));
  console.log("  apps/mobile/assets/icon.png (1024x1024)");
  writeFileSync(join(mobileAssets, "adaptive-icon.png"), await renderForeground(1024));
  console.log("  apps/mobile/assets/adaptive-icon.png (1024x1024)");

  console.log("\nDone! All icon assets generated.");
}

/**
 * Minimal ICO file builder.
 * Each entry is a PNG image at the specified size.
 */
function createIco(pngBuffers: Buffer[], sizes: number[]): Buffer {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * count;
  let dataOffset = headerSize + dirSize;

  // ICO header: reserved(2) + type(2) + count(2)
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    const entry = Buffer.alloc(dirEntrySize);
    const s = sizes[i] >= 256 ? 0 : sizes[i]; // 0 means 256+
    entry.writeUInt8(s, 0); // width
    entry.writeUInt8(s, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8); // size of image data
    entry.writeUInt32LE(dataOffset, 12); // offset to image data
    dirEntries.push(entry);
    dataOffset += pngBuffers[i].length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
