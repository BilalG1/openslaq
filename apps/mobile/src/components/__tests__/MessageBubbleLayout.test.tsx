import React from "react";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { MessageBubble } from "../MessageBubble";
import type { Message } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      mode: "light",
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f5f5f5",
        surfaceTertiary: "#e0e0e0",
        surfaceSelected: "#e3f2fd",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        textMuted: "#888",
        borderDefault: "#ddd",
        borderStrong: "#aaa",
        headerText: "#fff",
        avatarFallbackBg: "#ccc",
        avatarFallbackText: "#333",
      },
      brand: { primary: "#1264a3", danger: "#dc2626" },
      interaction: {},
    },
  }),
}));

jest.mock("@/utils/haptics", () => ({
  haptics: { heavy: jest.fn(), medium: jest.fn(), light: jest.fn(), selection: jest.fn() },
}));

jest.mock("@/components/MessageContent", () => {
  const { Text } = require("react-native");
  return {
    MessageContent: ({ content }: { content: string }) =>
      require("react").createElement(Text, {}, content),
  };
});

jest.mock("@/components/MessageAttachments", () => ({
  MessageAttachments: () => null,
}));

jest.mock("@/components/LinkPreviewCard", () => ({
  LinkPreviewCard: () => null,
}));

jest.mock("@/components/SharedMessageCard", () => ({
  SharedMessageCard: () => null,
}));

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-1"),
    content: "Hello world",
    senderDisplayName: "Alice",
    senderAvatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parentMessageId: null,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    replyCount: 0,
    mentions: [],
    isPinned: false,
    linkPreviews: [],
    sharedMessage: null,
    ...overrides,
  } as Message;
}

const SCREEN_W = 390;

describe("MessageBubble layout", () => {
  it("ungrouped message has avatar + content in a horizontal row", async () => {
    const { toJSON } = render(
      <MessageBubble message={makeMessage()} isGrouped={false} />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 200 });
    const bubble = layout.byTestID.get("message-bubble-msg-1");
    expect(bubble).toBeDefined();

    // Content should occupy most of the width after avatar (36px) + margin (10px)
    const content = layout.byTestID.get("message-content-msg-1");
    expect(content).toBeDefined();
    // Content area should start after avatar region
    expect(content!.left).toBeGreaterThanOrEqual(36 + 10);
  });

  it("grouped message uses spacer instead of avatar, same content alignment", async () => {
    const ungrouped = render(
      <MessageBubble message={makeMessage()} isGrouped={false} />,
    );
    const ungroupedLayout = await computeLayout(ungrouped.toJSON(), {
      width: SCREEN_W,
      height: 200,
    });

    const grouped = render(
      <MessageBubble message={makeMessage()} isGrouped={true} />,
    );
    const groupedLayout = await computeLayout(grouped.toJSON(), {
      width: SCREEN_W,
      height: 200,
    });

    const ungroupedContent = ungroupedLayout.byTestID.get("message-content-msg-1")!;
    const groupedContent = groupedLayout.byTestID.get("message-content-msg-1")!;

    // Content left position should be the same whether grouped or ungrouped
    // (spacer width matches avatar width)
    expect(groupedContent.left).toBe(ungroupedContent.left);
    // Content width should also match
    expect(groupedContent.width).toBe(ungroupedContent.width);
  });

  it("ungrouped message has sender row, grouped does not", async () => {
    const ungrouped = render(
      <MessageBubble
        message={makeMessage({ id: asMessageId("msg-u") })}
        isGrouped={false}
      />,
    );
    const ungroupedLayout = await computeLayout(ungrouped.toJSON(), {
      width: SCREEN_W,
      height: 400,
    });

    const grouped = render(
      <MessageBubble
        message={makeMessage({ id: asMessageId("msg-g") })}
        isGrouped={true}
      />,
    );
    const groupedLayout = await computeLayout(grouped.toJSON(), {
      width: SCREEN_W,
      height: 400,
    });

    // Ungrouped has sender name testID; grouped does not
    const senderUngrouped = ungroupedLayout.byTestID.get("sender-name-msg-u");
    const senderGrouped = groupedLayout.byTestID.get("sender-name-msg-g");
    expect(senderUngrouped).toBeDefined();
    expect(senderGrouped).toBeUndefined();

    // Grouped content top should be closer to the bubble top (less padding, no sender row)
    const ungroupedContent = ungroupedLayout.byTestID.get("message-content-msg-u")!;
    const ungroupedBubble = ungroupedLayout.byTestID.get("message-bubble-msg-u")!;
    const groupedContent = groupedLayout.byTestID.get("message-content-msg-g")!;
    const groupedBubble = groupedLayout.byTestID.get("message-bubble-msg-g")!;

    const ungroupedOffset = ungroupedContent.top - ungroupedBubble.top;
    const groupedOffset = groupedContent.top - groupedBubble.top;
    expect(groupedOffset).toBeLessThan(ungroupedOffset);
  });

  it("content container uses flex:1 to fill remaining width", async () => {
    const { toJSON } = render(
      <MessageBubble message={makeMessage()} isGrouped={false} />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: 200 });
    const content = layout.byTestID.get("message-content-msg-1")!;

    // Content should stretch to fill available width (screen - padding - avatar - margin)
    // paddingHorizontal: 16 (both sides) = 32, avatarSpacer: 36, marginRight: 10
    const expectedMinWidth = SCREEN_W - 32 - 36 - 10 - 10; // some tolerance
    expect(content.width).toBeGreaterThan(expectedMinWidth);
  });
});
