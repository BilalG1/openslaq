import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import istanbul from "vite-plugin-istanbul";

const portPrefix = process.env.PORT_PREFIX || "30";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.VITE_COVERAGE === "true"
      ? [istanbul({ include: "src/**/*", extension: [".ts", ".tsx"] })]
      : []),
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
      external: [/^@tauri-apps\//],
    },
  },
});
