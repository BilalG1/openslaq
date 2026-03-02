import type { LinkPreview } from "@openslaq/shared";
import { LinkPreviewCard } from "../../components/message/LinkPreviewCard";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const fullPreview: LinkPreview = {
  url: "https://example.com/article",
  title: "Understanding WebSockets in 2026",
  description:
    "A comprehensive guide to real-time communication on the web, covering WebSocket APIs, Socket.IO, and modern alternatives.",
  imageUrl: "https://picsum.photos/seed/showcase/800/400",
  siteName: "Example Blog",
  faviconUrl: "https://www.google.com/favicon.ico",
};

const noImagePreview: LinkPreview = {
  url: "https://docs.example.com/api",
  title: "API Reference - Example Docs",
  description: "Complete API reference for the Example platform.",
  imageUrl: null,
  siteName: "Example Docs",
  faviconUrl: null,
};

const minimalPreview: LinkPreview = {
  url: "https://example.com/page",
  title: "Example Page",
  description: null,
  imageUrl: null,
  siteName: null,
  faviconUrl: null,
};

export const linkPreviewStory: ComponentStory = {
  id: "link-preview",
  name: "LinkPreview",
  source: "components/message/LinkPreviewCard.tsx",
  render: () => (
    <>
      <VariantGrid title="Variants">
        <VariantItem label="full">
          <LinkPreviewCard preview={fullPreview} />
        </VariantItem>
        <VariantItem label="no image">
          <LinkPreviewCard preview={noImagePreview} />
        </VariantItem>
        <VariantItem label="minimal">
          <LinkPreviewCard preview={minimalPreview} />
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
