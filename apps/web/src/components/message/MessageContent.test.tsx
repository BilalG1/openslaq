import { describe, expect, test, afterEach, jest } from "bun:test";
import { render, cleanup } from "../../test-utils";
import { MessageContent } from "./MessageContent";
import type { Mention, UserId, CustomEmoji } from "@openslaq/shared";
import { asEmojiId, asWorkspaceId, asUserId } from "@openslaq/shared";

function mention(userId: string, displayName: string): Mention {
  return { userId: userId as UserId, displayName, type: "user" };
}

describe("MessageContent", () => {
  afterEach(cleanup);

  test("renders plain text", () => {
    const { container } = render(<MessageContent content="hello world" />);
    expect(container.textContent).toContain("hello world");
  });

  test("renders bold markdown as <strong>", () => {
    const { container } = render(<MessageContent content="this is **bold** text" />);
    const strong = container.querySelector("strong");
    expect(strong).toBeTruthy();
    expect(strong!.textContent).toBe("bold");
  });

  test("renders italic markdown as <em>", () => {
    const { container } = render(<MessageContent content="this is *italic* text" />);
    const em = container.querySelector("em");
    expect(em).toBeTruthy();
    expect(em!.textContent).toBe("italic");
  });

  test("renders strikethrough markdown as <del>", () => {
    const { container } = render(<MessageContent content="this is ~~deleted~~ text" />);
    const del = container.querySelector("del");
    expect(del).toBeTruthy();
    expect(del!.textContent).toBe("deleted");
  });

  test("renders inline code as <code>", () => {
    const { container } = render(<MessageContent content="use `console.log`" />);
    const code = container.querySelector("code");
    expect(code).toBeTruthy();
    expect(code!.textContent).toBe("console.log");
  });

  test("renders code blocks as <pre>", () => {
    const { container } = render(
      <MessageContent content={"```\nconst x = 1;\n```"} />,
    );
    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre!.textContent).toContain("const x = 1;");
  });

  test("renders links as <a> with href", () => {
    const { container } = render(
      <MessageContent content="visit [Example](https://example.com)" />,
    );
    const a = container.querySelector("a");
    expect(a).toBeTruthy();
    expect(a!.getAttribute("href")).toBe("https://example.com");
    expect(a!.textContent).toBe("Example");
    expect(a!.getAttribute("target")).toBe("_blank");
  });

  test("renders unordered lists as <ul>", () => {
    const { container } = render(
      <MessageContent content={"- item one\n- item two"} />,
    );
    const ul = container.querySelector("ul");
    expect(ul).toBeTruthy();
    const items = ul!.querySelectorAll("li");
    expect(items.length).toBe(2);
  });

  test("renders ordered lists as <ol>", () => {
    const { container } = render(
      <MessageContent content={"1. first\n2. second"} />,
    );
    const ol = container.querySelector("ol");
    expect(ol).toBeTruthy();
    const items = ol!.querySelectorAll("li");
    expect(items.length).toBe(2);
  });

  test("renders blockquotes as <blockquote>", () => {
    const { container } = render(
      <MessageContent content="> quoted text" />,
    );
    const bq = container.querySelector("blockquote");
    expect(bq).toBeTruthy();
    expect(bq!.textContent).toContain("quoted text");
  });

  test("renders @here mention badge", () => {
    const { container } = render(
      <MessageContent content="<@here> please review" mentions={[]} />,
    );
    expect(container.textContent).toContain("@here");
    expect(container.textContent).toContain("please review");
  });

  test("renders @channel mention badge", () => {
    const { container } = render(
      <MessageContent content="Hey <@channel>!" mentions={[]} />,
    );
    expect(container.textContent).toContain("@channel");
  });

  test("renders user mention with display name", () => {
    const { container } = render(
      <MessageContent content="Hey <@u-1> check this" mentions={[mention("u-1", "Alice")]} />,
    );
    expect(container.textContent).toContain("@Alice");
  });

  test("renders user mention with userId when no display name found", () => {
    const { container } = render(
      <MessageContent content="Hey <@u-unknown> check this" mentions={[]} />,
    );
    expect(container.textContent).toContain("@u-unknown");
  });

  test("renders multiple mentions", () => {
    const { container } = render(
      <MessageContent
        content="<@u-1> and <@u-2> should meet"
        mentions={[mention("u-1", "Alice"), mention("u-2", "Bob")]}
      />,
    );
    expect(container.textContent).toContain("@Alice");
    expect(container.textContent).toContain("@Bob");
  });

  test("calls onOpenProfile when user mention is clicked", () => {
    const onOpenProfile = jest.fn();
    const { container } = render(
      <MessageContent
        content="Hey <@u-1>"
        mentions={[mention("u-1", "Alice")]}
        onOpenProfile={onOpenProfile}
      />,
    );

    const button = container.querySelector("button");
    expect(button).toBeTruthy();
    button!.click();
    expect(onOpenProfile).toHaveBeenCalledWith("u-1");
  });

  test("renders custom emoji as an img tag", () => {
    const emojis: CustomEmoji[] = [
      { id: asEmojiId("e1"), workspaceId: asWorkspaceId("w1"), name: "party-parrot", url: "https://example.com/party-parrot.png", uploadedBy: asUserId("u1"), createdAt: "" },
    ];
    const { container } = render(
      <MessageContent content="Check this :custom:party-parrot:" customEmojis={emojis} />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toBe("https://example.com/party-parrot.png");
    expect(img!.getAttribute("alt")).toBe(":party-parrot:");
  });

  test("renders unknown custom emoji as text fallback", () => {
    const { container } = render(
      <MessageContent content="Check this :custom:unknown-emoji:" customEmojis={[]} />,
    );
    expect(container.textContent).toContain(":unknown-emoji:");
    const img = container.querySelector("img");
    expect(img).toBeFalsy();
  });

  test("renders mentions inline within the same paragraph", () => {
    const { container } = render(
      <MessageContent
        content="Hello <@u-1> how are you"
        mentions={[mention("u-1", "Alice")]}
      />,
    );
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(1);
    const button = paragraphs[0]!.querySelector("button");
    expect(button).toBeTruthy();
    expect(button!.textContent).toBe("@Alice");
    expect(paragraphs[0]!.textContent).toContain("Hello");
    expect(paragraphs[0]!.textContent).toContain("how are you");
  });

  test("renders @here mention inline within the same paragraph", () => {
    const { container } = render(
      <MessageContent content="Hey <@here> please review" mentions={[]} />,
    );
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0]!.textContent).toContain("@here");
    expect(paragraphs[0]!.textContent).toContain("Hey");
    expect(paragraphs[0]!.textContent).toContain("please review");
  });

  test("renders custom emoji alongside mentions", () => {
    const emojis: CustomEmoji[] = [
      { id: asEmojiId("e1"), workspaceId: asWorkspaceId("w1"), name: "thumbsup", url: "https://example.com/thumbsup.png", uploadedBy: asUserId("u1"), createdAt: "" },
    ];
    const { container } = render(
      <MessageContent
        content="<@u-1> :custom:thumbsup:"
        mentions={[mention("u-1", "Alice")]}
        customEmojis={emojis}
      />,
    );
    expect(container.textContent).toContain("@Alice");
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
  });
});
