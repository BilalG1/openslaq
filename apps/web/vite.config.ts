import { defineConfig } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import istanbul from "vite-plugin-istanbul";

const portPrefix = process.env.PORT_PREFIX || "30";

function aasaJson(): string {
  const teamId = process.env.VITE_APPLE_TEAM_ID;
  if (!teamId) return "";
  return JSON.stringify({
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [`${teamId}.com.openslaq.mobile`],
          components: [
            { "/": "/invite/*" },
            { "/": "/w/*/c/*/t/*" },
            { "/": "/w/*/c/*" },
            { "/": "/w/*/dm/*" },
          ],
        },
      ],
    },
  });
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.VITE_COVERAGE === "true"
      ? [istanbul({ include: "src/**/*", extension: [".ts", ".tsx"] })]
      : []),
    {
      name: "apple-app-site-association",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/.well-known/apple-app-site-association") {
            const body = aasaJson();
            if (!body) { res.statusCode = 404; res.end(); return; }
            res.setHeader("Content-Type", "application/json");
            res.end(body);
            return;
          }
          next();
        });
      },
      writeBundle(options) {
        const body = aasaJson();
        if (!body) return;
        const dir = join(options.dir!, ".well-known");
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "apple-app-site-association"), body);
      },
    },
  ],
  envDir: "../../",
  // @stackframe/stack references process.env (designed for Next.js).
  // Shim it so those references don't crash in the browser.
  define: {
    "process.env": "{}",
  },
  server: {
    port: parseInt(`${portPrefix}00`),
    strictPort: true,
  },
  build: {
    rollupOptions: {
      // @tauri-apps packages must NOT be externalized — the localhost plugin
      // serves assets over plain HTTP so dynamic imports need to be bundled.
      // The code already guards all Tauri calls behind isTauri() checks so
      // these modules are tree-shaken in regular web builds.
    },
  },
});
