import React from "react";
import { render, screen } from "@testing-library/react-native";
import { MessageContent } from "../MessageContent";
import type { Mention, CustomEmoji } from "@openslaq/shared";
import { asUserId, asEmojiId, asWorkspaceId } from "@openslaq/shared";

// Mock the markdown renderer to render plain text for testability
jest.mock("@ronradtke/react-native-markdown-display", () => {
  const { Text } = require("react-native");
  // Simple mock: render children as Text, apply custom rules for links and images
  return {
    __esModule: true,
    default: ({ children, rules }: { children: string; rules?: Record<string, Function> }) => {
      // Handle mention links and image syntax
      const tokenRegex = /\[@([^\]]+)\]\(mention:([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\)/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let key = 0;

      tokenRegex.lastIndex = 0;
      while ((match = tokenRegex.exec(children)) !== null) {
        if (match.index > lastIndex) {
          parts.push(<Text key={key++}>{children.slice(lastIndex, match.index)}</Text>);
        }
        if (match[1] != null) {
          // Mention link
          if (rules?.link) {
            const node = {
              key: `link-${key}`,
              attributes: { href: `mention:${match[2]}` },
              children: [{ content: match[1] }],
            };
            parts.push(rules.link(node, [], null, {}));
          }
        } else if (match[3] != null) {
          // Image syntax
          if (rules?.image) {
            const node = {
              key: `image-${key}`,
              attributes: { src: match[4], alt: match[3] },
            };
            parts.push(rules.image(node));
          }
        }
        lastIndex = match.index + match[0].length;
        key++;
      }
      if (lastIndex < children.length) {
        parts.push(<Text key={key++}>{children.slice(lastIndex)}</Text>);
      }

      // Also handle code fences
      const fenceRegex = /```(\w+)?\n([\s\S]*?)```/g;
      if (fenceRegex.test(children) && rules?.fence) {
        fenceRegex.lastIndex = 0;
        const fenceMatch = fenceRegex.exec(children);
        if (fenceMatch) {
          const node = {
            key: "fence-0",
            sourceInfo: fenceMatch[1] ?? null,
            content: fenceMatch[2],
          };
          return <>{rules.fence(node)}</>;
        }
      }

      return <>{parts.length > 0 ? parts : <Text>{children}</Text>}</>;
    },
  };
});

// Mock CodeBlock
jest.mock("../CodeBlock", () => {
  const { Text } = require("react-native");
  return {
    CodeBlock: ({ children, language }: { children: string; language?: string }) => (
      <Text testID="code-block">{`[${language ?? "text"}] ${children}`}</Text>
    ),
  };
});

describe("MessageContent", () => {
  it("renders plain text content", () => {
    render(<MessageContent content="Hello world" />);

    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it("renders user mention as MentionBadge", () => {
    const mentions: Mention[] = [
      { userId: asUserId("user-1"), displayName: "Alice", type: "user" },
    ];

    render(
      <MessageContent content="Hey <@user-1> check this" mentions={mentions} />,
    );

    expect(screen.getByTestId("mention-badge-user-1")).toBeTruthy();
    expect(screen.getByText("@Alice")).toBeTruthy();
  });

  it("renders @here mention as group badge", () => {
    render(<MessageContent content="<@here> alert!" mentions={[]} />);

    expect(screen.getByTestId("mention-badge-here")).toBeTruthy();
    expect(screen.getByText("@here")).toBeTruthy();
  });

  it("renders @channel mention as group badge", () => {
    render(<MessageContent content="<@channel> update" mentions={[]} />);

    expect(screen.getByTestId("mention-badge-channel")).toBeTruthy();
    expect(screen.getByText("@channel")).toBeTruthy();
  });

  it("renders multiple mentions", () => {
    const mentions: Mention[] = [
      { userId: asUserId("user-1"), displayName: "Alice", type: "user" },
      { userId: asUserId("user-2"), displayName: "Bob", type: "user" },
    ];

    render(
      <MessageContent
        content="Hey <@user-1> and <@user-2>"
        mentions={mentions}
      />,
    );

    expect(screen.getByTestId("mention-badge-user-1")).toBeTruthy();
    expect(screen.getByTestId("mention-badge-user-2")).toBeTruthy();
  });

  it("falls back to token when mention not in mentions array", () => {
    render(
      <MessageContent content="Hey <@unknown-user>" mentions={[]} />,
    );

    expect(screen.getByText("@unknown-user")).toBeTruthy();
  });

  describe("custom emoji", () => {
    const customEmojis: CustomEmoji[] = [
      {
        id: asEmojiId("emoji-1"),
        workspaceId: asWorkspaceId("ws-1"),
        name: "party-parrot",
        url: "https://cdn.test/party-parrot.png",
        uploadedBy: asUserId("user-1"),
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    it("renders custom emoji inline as Image", () => {
      render(
        <MessageContent
          content="Check this out :custom:party-parrot: cool!"
          customEmojis={customEmojis}
        />,
      );

      expect(screen.getByTestId("custom-emoji-inline-party-parrot")).toBeTruthy();
    });

    it("renders unknown custom emoji as text fallback", () => {
      render(
        <MessageContent
          content="Look :custom:unknown-thing: here"
          customEmojis={customEmojis}
        />,
      );

      expect(screen.queryByTestId("custom-emoji-inline-unknown-thing")).toBeNull();
      expect(screen.getByText(":unknown-thing:")).toBeTruthy();
    });

    it("renders multiple custom emoji in same message", () => {
      const emojis: CustomEmoji[] = [
        ...customEmojis,
        {
          id: asEmojiId("emoji-2"),
          workspaceId: asWorkspaceId("ws-1"),
          name: "pepe",
          url: "https://cdn.test/pepe.png",
          uploadedBy: asUserId("user-1"),
          createdAt: "2025-01-01T00:00:00Z",
        },
      ];

      render(
        <MessageContent
          content=":custom:party-parrot: and :custom:pepe:"
          customEmojis={emojis}
        />,
      );

      expect(screen.getByTestId("custom-emoji-inline-party-parrot")).toBeTruthy();
      expect(screen.getByTestId("custom-emoji-inline-pepe")).toBeTruthy();
    });
  });
});
