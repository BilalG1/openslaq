import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.openslaq.com",
  server: { port: 3008 },
  integrations: [
    starlight({
      title: "OpenSlaq Docs",
      social: {
        github: "https://github.com/openslaq/openslaq",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "getting-started/introduction" },
            { label: "Quickstart", slug: "getting-started/quickstart" },
          ],
        },
        {
          label: "CLI",
          items: [
            { label: "Installation", slug: "cli/installation" },
            { label: "Usage", slug: "cli/usage" },
          ],
        },
        {
          label: "TypeScript SDK",
          items: [
            { label: "Installation", slug: "sdk/installation" },
            { label: "Authentication", slug: "sdk/authentication" },
            { label: "API Reference", slug: "sdk/api-reference" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Create a Bot", slug: "guides/create-a-bot" },
            { label: "API Keys", slug: "guides/api-keys" },
            { label: "Webhooks", slug: "guides/webhooks" },
          ],
        },
      ],
    }),
  ],
});
