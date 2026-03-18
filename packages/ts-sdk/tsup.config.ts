import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    resolve: ["@openslaq/shared"],
    compilerOptions: {
      paths: {
        "@openslaq/shared": ["../shared/dist/index.d.ts"],
      },
    },
  },
  clean: true,
});
