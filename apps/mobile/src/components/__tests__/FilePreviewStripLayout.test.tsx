import React from "react";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { FilePreviewStrip } from "../FilePreviewStrip";
import type { PendingFile } from "@/hooks/useFileUpload";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceTertiary: "#e0e0e0",
        textMuted: "#888",
        borderStrong: "#aaa",
        headerText: "#fff",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

function makeFile(id: string, isImage = false): PendingFile {
  return {
    id,
    name: isImage ? `photo-${id}.jpg` : `file-${id}.pdf`,
    uri: `file:///mock/${id}`,
    isImage,
    mimeType: isImage ? "image/jpeg" : "application/pdf",
  };
}

/**
 * Inject contentContainerStyle and horizontal flexDirection from RCTScrollView
 * into its inner content View, mirroring what React Native does at runtime.
 */
function injectScrollContentStyle(tree: any): any {
  function walk(node: any) {
    if (!node || typeof node === "string") return;
    if (node.type === "RCTScrollView") {
      const ccs = node.props?.contentContainerStyle ?? {};
      // RN's horizontal ScrollView sets flexDirection: "row" on the content container
      const horizontal = node.props?.horizontal ? { flexDirection: "row" } : {};
      if (node.children?.[0] && typeof node.children[0] !== "string") {
        node.children[0].props = {
          ...node.children[0].props,
          style: {
            ...(node.children[0].props?.style ?? {}),
            ...horizontal,
            ...ccs,
          },
        };
      }
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(walk);
    }
  }
  walk(tree);
  return tree;
}

const SCREEN_W = 390;

describe("FilePreviewStrip layout", () => {
  it("returns null when no files", () => {
    const { toJSON } = render(
      <FilePreviewStrip files={[]} onRemove={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("file thumbnails are 60x60", async () => {
    const files = [makeFile("f1"), makeFile("f2")];
    const { toJSON } = render(
      <FilePreviewStrip files={files} onRemove={jest.fn()} />,
    );
    const layout = await computeLayout(injectScrollContentStyle(toJSON()), {
      width: SCREEN_W,
      height: 80,
    });

    const preview1 = layout.byTestID.get("file-preview-f1");
    const preview2 = layout.byTestID.get("file-preview-f2");
    expect(preview1).toBeDefined();
    expect(preview2).toBeDefined();
    expect(preview1!.width).toBe(60);
    expect(preview1!.height).toBe(60);
    expect(preview2!.width).toBe(60);
    expect(preview2!.height).toBe(60);
  });

  it("file items are laid out horizontally", async () => {
    const files = [makeFile("f1"), makeFile("f2"), makeFile("f3")];
    const { toJSON } = render(
      <FilePreviewStrip files={files} onRemove={jest.fn()} />,
    );
    const layout = await computeLayout(injectScrollContentStyle(toJSON()), {
      width: SCREEN_W,
      height: 80,
    });

    const p1 = layout.byTestID.get("file-preview-f1")!;
    const p2 = layout.byTestID.get("file-preview-f2")!;
    const p3 = layout.byTestID.get("file-preview-f3")!;

    // Items should progress left-to-right
    expect(p2.left).toBeGreaterThan(p1.left);
    expect(p3.left).toBeGreaterThan(p2.left);
    // All at same vertical position
    expect(p1.top).toBe(p2.top);
    expect(p2.top).toBe(p3.top);
  });

  it("remove buttons are positioned at top-right of each file item", async () => {
    const files = [makeFile("f1")];
    const { toJSON } = render(
      <FilePreviewStrip files={files} onRemove={jest.fn()} />,
    );
    const layout = await computeLayout(injectScrollContentStyle(toJSON()), {
      width: SCREEN_W,
      height: 80,
    });

    const preview = layout.byTestID.get("file-preview-f1")!;
    const remove = layout.byTestID.get("file-remove-f1")!;

    // Remove button (20x20) should be positioned near top-right of the file item
    expect(remove.width).toBe(20);
    expect(remove.height).toBe(20);
    // The remove button should be near or above the top of the preview
    expect(remove.top).toBeLessThanOrEqual(preview.top);
  });

  it("file items have spacing between them (marginRight: 8)", async () => {
    const files = [makeFile("f1"), makeFile("f2")];
    const { toJSON } = render(
      <FilePreviewStrip files={files} onRemove={jest.fn()} />,
    );
    const layout = await computeLayout(injectScrollContentStyle(toJSON()), {
      width: SCREEN_W,
      height: 80,
    });

    const p1 = layout.byTestID.get("file-preview-f1")!;
    const p2 = layout.byTestID.get("file-preview-f2")!;

    // Gap between items: file is 60px wide + 8px marginRight on the fileItem View
    const gap = p2.left - (p1.left + p1.width);
    // There should be some spacing (at least marginRight)
    expect(gap).toBeGreaterThanOrEqual(8);
  });
});
