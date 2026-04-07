import { describe, expect, test, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { ReactionBar, buildReactionTooltip } from "./ReactionBar";
import { MessageActionsProvider } from "./MessageActionsContext";
import { TooltipProvider } from "../ui";
import type { ReactionGroup, UserId, CustomEmoji } from "@openslaq/shared";
import { asEmojiId, asWorkspaceId, asUserId } from "@openslaq/shared";

const noop = () => {};
const uid = (id: string) => id as UserId;

describe("ReactionBar", () => {
  afterEach(cleanup);

  test("returns null when reactions are empty and picker is hidden", () => {
    const { container } = render(
      <ReactionBar reactions={[]} currentUserId="u-1" onToggleReaction={noop} />,
    );
    expect(container.innerHTML).toBe("");
  });

  test("renders reaction pills with emoji and count", () => {
    const reactions: ReactionGroup[] = [
      { emoji: "👍", count: 3, userIds: [uid("u-1"), uid("u-2"), uid("u-3")] },
      { emoji: "🎉", count: 1, userIds: [uid("u-2")] },
    ];
    render(
      <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} />,
    );

    expect(screen.getByTestId("reaction-bar")).toBeTruthy();
    expect(screen.getByTestId("reaction-pill-👍").textContent).toContain("👍");
    expect(screen.getByTestId("reaction-pill-👍").textContent).toContain("3");
    expect(screen.getByTestId("reaction-pill-🎉").textContent).toContain("🎉");
    expect(screen.getByTestId("reaction-pill-🎉").textContent).toContain("1");
  });

  test("renders add-reaction button", () => {
    const reactions: ReactionGroup[] = [{ emoji: "👍", count: 1, userIds: [uid("u-1")] }];
    render(
      <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} />,
    );
    expect(screen.getByTestId("reaction-add-button").textContent).toBe("+");
  });

  test("active reaction has distinct styling for current user", () => {
    const reactions: ReactionGroup[] = [
      { emoji: "👍", count: 2, userIds: [uid("u-1"), uid("u-2")] },
      { emoji: "🎉", count: 1, userIds: [uid("u-2")] },
    ];
    render(
      <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} />,
    );

    const activeButton = screen.getByTestId("reaction-pill-👍");
    expect(activeButton.className).toContain("border-slaq-blue");

    const inactiveButton = screen.getByTestId("reaction-pill-🎉");
    expect(inactiveButton.className).not.toContain("border-slaq-blue");
  });

  test("calls onToggleReaction when reaction pill is clicked", () => {
    const onToggle = vi.fn();
    const reactions: ReactionGroup[] = [{ emoji: "👍", count: 1, userIds: [uid("u-1")] }];
    render(
      <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={onToggle} />,
    );

    screen.getByTestId("reaction-pill-👍").click();
    expect(onToggle).toHaveBeenCalledWith("👍");
  });

  test("renders custom emoji reaction as an img tag", () => {
    const customEmojis: CustomEmoji[] = [
      { id: asEmojiId("e1"), workspaceId: asWorkspaceId("w1"), name: "party-parrot", url: "https://example.com/party-parrot.png", uploadedBy: asUserId("u1"), createdAt: "" },
    ];
    const reactions: ReactionGroup[] = [
      { emoji: ":custom:party-parrot:", count: 2, userIds: [uid("u-1"), uid("u-2")] },
    ];
    const { container } = render(
      <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} customEmojis={customEmojis} />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toBe("https://example.com/party-parrot.png");
    expect(img!.getAttribute("alt")).toBe("party-parrot");
  });

  test("custom emoji in reaction has w-5 h-5 sizing", () => {
    const customEmojis: CustomEmoji[] = [
      { id: asEmojiId("e1"), workspaceId: asWorkspaceId("w1"), name: "tada", url: "https://example.com/tada.png", uploadedBy: asUserId("u1"), createdAt: "" },
    ];
    const reactions: ReactionGroup[] = [
      { emoji: ":custom:tada:", count: 1, userIds: [uid("u-1")] },
    ];
    const { container } = render(
      <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} customEmojis={customEmojis} />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.className).toContain("w-5");
    expect(img!.className).toContain("h-5");
  });

  test("converts shortcode to native emoji glyph", () => {
    const reactions: ReactionGroup[] = [
      { emoji: "rocket", count: 2, userIds: [uid("u-1"), uid("u-2")] },
      { emoji: "thumbsup", count: 1, userIds: [uid("u-1")] },
    ];
    render(
      <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} />,
    );
    expect(screen.getByTestId("reaction-pill-rocket").textContent).toContain("🚀");
    expect(screen.getByTestId("reaction-pill-thumbsup").textContent).toContain("👍");
  });

  test("renders unknown custom emoji as text fallback in reaction", () => {
    const reactions: ReactionGroup[] = [
      { emoji: ":custom:unknown-emoji:", count: 1, userIds: [uid("u-1")] },
    ];
    const { container } = render(
      <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} customEmojis={[]} />,
    );
    const img = container.querySelector("img");
    expect(img).toBeFalsy();
    expect(container.textContent).toContain(":unknown-emoji:");
  });

  describe("buildReactionTooltip", () => {
    const members = [
      { id: "u-1", displayName: "Alice" },
      { id: "u-2", displayName: "Bob" },
      { id: "u-3", displayName: "Carol" },
      { id: "u-4", displayName: "Dave" },
      { id: "u-5", displayName: "Eve" },
      { id: "u-6", displayName: "Frank" },
      { id: "u-7", displayName: "Grace" },
    ];

    test("single user", () => {
      expect(buildReactionTooltip(["u-2"], members, "u-1")).toBe("Bob");
    });

    test("current user shows as 'You'", () => {
      expect(buildReactionTooltip(["u-1"], members, "u-1")).toBe("You");
    });

    test("two users with current user first", () => {
      expect(buildReactionTooltip(["u-2", "u-1"], members, "u-1")).toBe("You and Bob");
    });

    test("three users", () => {
      expect(buildReactionTooltip(["u-2", "u-3", "u-4"], members, "u-1")).toBe("Bob, Carol and Dave");
    });

    test("more than 5 users truncates with 'others'", () => {
      const ids = ["u-1", "u-2", "u-3", "u-4", "u-5", "u-6", "u-7"];
      const result = buildReactionTooltip(ids, members, "u-1");
      expect(result).toBe("You, Bob, Carol, Dave, Eve, and 2 others");
    });

    test("unknown user shows as 'Someone'", () => {
      expect(buildReactionTooltip(["u-999"], members, "u-1")).toBe("Someone");
    });
  });

  test("shows tooltip with user names when workspaceMembers provided", () => {
    const members = [
      { id: "u-1", displayName: "Alice" },
      { id: "u-2", displayName: "Bob" },
      { id: "u-3", displayName: "Carol" },
    ];
    const reactions: ReactionGroup[] = [
      { emoji: "👍", count: 3, userIds: [uid("u-1"), uid("u-2"), uid("u-3")] },
    ];
    render(
      <TooltipProvider>
        <MessageActionsProvider value={{ workspaceMembers: members }}>
          <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} />
        </MessageActionsProvider>
      </TooltipProvider>,
    );
    const pill = screen.getByTestId("reaction-pill-👍");
    expect(pill).toBeTruthy();
  });

  test("tooltip puts 'You' first when current user reacted", () => {
    const members = [
      { id: "u-1", displayName: "Alice" },
      { id: "u-2", displayName: "Bob" },
    ];
    const reactions: ReactionGroup[] = [
      { emoji: "👍", count: 2, userIds: [uid("u-2"), uid("u-1")] },
    ];
    render(
      <TooltipProvider>
        <MessageActionsProvider value={{ workspaceMembers: members }}>
          <ReactionBar reactions={reactions} currentUserId="u-1" onToggleReaction={noop} />
        </MessageActionsProvider>
      </TooltipProvider>,
    );
    expect(screen.getByTestId("reaction-pill-👍")).toBeTruthy();
  });
});
