import React from "react";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { LinkPreviewCard } from "../LinkPreviewCard";
import type { LinkPreview } from "@openslaq/shared";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        borderDefault: "#ddd",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

jest.mock("@/utils/url-validation", () => ({
  openSafeUrl: jest.fn(),
}));

const SCREEN_W = 390;

function makePreview(overrides: Partial<LinkPreview> = {}): LinkPreview {
  return {
    url: "https://example.com",
    title: "Example Title",
    description: "A short description of the page.",
    imageUrl: "https://example.com/image.jpg",
    faviconUrl: "https://example.com/favicon.ico",
    siteName: "Example",
    ...overrides,
  };
}

describe("LinkPreviewCard layout", () => {
  it("image takes fixed 160px height", async () => {
    const { toJSON } = render(<LinkPreviewCard preview={makePreview()} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 400 });

    const image = layout.byTestID.get("link-preview-image");
    expect(image).toBeDefined();
    expect(image!.height).toBe(160);
    // Image should be full width of the card (minus 1px border on each side)
    expect(image!.width).toBe(SCREEN_W - 2);
  });

  it("content section is below the image", async () => {
    const { toJSON } = render(<LinkPreviewCard preview={makePreview()} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 400 });

    const image = layout.byTestID.get("link-preview-image")!;
    const title = layout.byTestID.get("link-preview-title")!;

    // Title should be below the image
    expect(title.top).toBeGreaterThan(image.top + image.height - 1);
  });

  it("site name and favicon are on the same row", async () => {
    const { toJSON } = render(<LinkPreviewCard preview={makePreview()} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 400 });

    const favicon = layout.byTestID.get("link-preview-favicon");
    const siteName = layout.byTestID.get("link-preview-site-name");
    expect(favicon).toBeDefined();
    expect(siteName).toBeDefined();

    // Favicon and site name should be vertically aligned (same row)
    // Their vertical centers should be close
    const faviconCenter = favicon!.top + favicon!.height / 2;
    const siteNameCenter = siteName!.top + siteName!.height / 2;
    expect(Math.abs(faviconCenter - siteNameCenter)).toBeLessThan(5);

    // Site name should be to the right of favicon
    expect(siteName!.left).toBeGreaterThan(favicon!.left);
  });

  it("card without image has no image element in layout", async () => {
    const { toJSON } = render(
      <LinkPreviewCard preview={makePreview({ imageUrl: undefined })} />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 400 });

    const image = layout.byTestID.get("link-preview-image");
    expect(image).toBeUndefined();

    // Title should still be present
    const title = layout.byTestID.get("link-preview-title");
    expect(title).toBeDefined();
  });

  it("description is below the title", async () => {
    const { toJSON } = render(<LinkPreviewCard preview={makePreview()} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 400 });

    const title = layout.byTestID.get("link-preview-title")!;
    const desc = layout.byTestID.get("link-preview-description")!;

    expect(desc.top).toBeGreaterThanOrEqual(title.top + title.height);
  });
});
