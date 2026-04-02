import React from "react";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { MessageInput } from "../MessageInput";
import type { PendingFile } from "@/hooks/useFileUpload";

jest.mock("@/hooks/useDraftRestoration", () => {
  const actual = jest.requireActual("@/hooks/useDraftRestoration");
  return {
    useDraftRestoration: (opts: Parameters<typeof actual.useDraftRestoration>[0]) => {
      const result = actual.useDraftRestoration(opts);
      return { ...result, clearDraft: jest.fn(), saveDraft: jest.fn() };
    },
  };
});

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      mode: "light",
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f5f5f5",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        textMuted: "#888",
        headerText: "#fff",
        borderDefault: "#ddd",
        borderStrong: "#aaa",
      },
      brand: { primary: "#1264a3", danger: "#dc2626" },
    },
  }),
}));

function makeFile(id: string): PendingFile {
  return {
    id,
    name: `file-${id}.pdf`,
    uri: `file:///mock/${id}`,
    isImage: false,
    mimeType: "application/pdf",
  };
}

const SCREEN_W = 390;

describe("MessageInput layout", () => {
  it("input row has horizontal layout with capsule and send button", async () => {
    const { toJSON } = render(<MessageInput onSend={jest.fn()} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 200 });

    const inputRow = layout.byTestID.get("input-row");
    const capsule = layout.byTestID.get("input-capsule");
    const sendBtn = layout.byTestID.get("message-send");

    expect(inputRow).toBeDefined();
    expect(capsule).toBeDefined();
    expect(sendBtn).toBeDefined();

    // Send button should be to the right of the capsule
    expect(sendBtn!.left).toBeGreaterThan(capsule!.left);
    // Send button is 44x44
    expect(sendBtn!.width).toBe(44);
    expect(sendBtn!.height).toBe(44);
  });

  it("input capsule fills available width (flex: 1)", async () => {
    const { toJSON } = render(<MessageInput onSend={jest.fn()} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 200 });

    const capsule = layout.byTestID.get("input-capsule")!;
    const sendBtn = layout.byTestID.get("message-send")!;

    // Capsule should take most of the width
    // Screen (390) - padding (8*2) - gap (8) - send button (44) = 322
    expect(capsule.width).toBeGreaterThan(SCREEN_W * 0.7);
    // Capsule + send + gaps should roughly equal screen width minus padding
    const totalUsed = capsule.width + sendBtn.width;
    expect(totalUsed).toBeGreaterThan(SCREEN_W * 0.85);
  });

  it("file preview strip adds height above the input row", async () => {
    const withoutFiles = render(<MessageInput onSend={jest.fn()} />);
    const layoutNoFiles = await computeLayout(withoutFiles.toJSON(), {
      width: SCREEN_W,
      height: 300,
    });

    const withFiles = render(
      <MessageInput
        onSend={jest.fn()}
        pendingFiles={[makeFile("f1"), makeFile("f2")]}
        onRemoveFile={jest.fn()}
      />,
    );
    const layoutWithFiles = await computeLayout(withFiles.toJSON(), {
      width: SCREEN_W,
      height: 300,
    });

    // The input row should be at a higher top position when files are present
    // (file preview strip is rendered above the input row)
    const inputRowNoFiles = layoutNoFiles.byTestID.get("input-row")!;
    const inputRowWithFiles = layoutWithFiles.byTestID.get("input-row")!;

    expect(inputRowWithFiles.top).toBeGreaterThan(inputRowNoFiles.top);
  });

  it("total height with files stays under 50% of screen", async () => {
    const files = Array.from({ length: 3 }, (_, i) => makeFile(`f${i}`));
    const { toJSON } = render(
      <MessageInput
        onSend={jest.fn()}
        pendingFiles={files}
        onRemoveFile={jest.fn()}
      />,
    );

    const SCREEN_H = 844;
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    // Find the wrapper (root node) — it contains all MessageInput content
    const root = layout.root;
    // The wrapper has position: "relative" and no explicit height, so its height
    // is the sum of its children. Let's measure from file strip to bottom of input row.
    const inputRow = layout.byTestID.get("input-row")!;
    const fileStrip = layout.byTestID.get("file-preview-strip");

    const topEdge = fileStrip ? fileStrip.top : inputRow.top;
    const bottomEdge = inputRow.top + inputRow.height;
    const totalHeight = bottomEdge - topEdge;

    // Total input area should be reasonable — well under half the screen
    expect(totalHeight).toBeLessThan(SCREEN_H * 0.5);
  });
});
