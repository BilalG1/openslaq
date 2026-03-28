import React from "react";
import { render, screen } from "@testing-library/react-native";
import { HeadlineRenderer } from "../search/HeadlineRenderer";

describe("HeadlineRenderer", () => {
  it("renders plain text (no marks) as-is", () => {
    render(<HeadlineRenderer headline="hello world" />);

    const text = screen.getByTestId("headline-text");
    expect(text).toBeTruthy();
    expect(screen.queryAllByTestId("headline-mark")).toHaveLength(0);
  });

  it("renders <mark> content with highlight style", () => {
    render(<HeadlineRenderer headline="hello <mark>world</mark>" />);

    const marks = screen.getAllByTestId("headline-mark");
    expect(marks).toHaveLength(1);
    expect(marks[0].props.children).toBe("world");
  });

  it("renders multiple mark segments correctly", () => {
    render(
      <HeadlineRenderer headline="<mark>hello</mark> there <mark>world</mark>" />,
    );

    const marks = screen.getAllByTestId("headline-mark");
    expect(marks).toHaveLength(2);
    expect(marks[0].props.children).toBe("hello");
    expect(marks[1].props.children).toBe("world");
  });

  it("renders empty string without crash", () => {
    const { toJSON } = render(<HeadlineRenderer headline="" />);
    expect(toJSON()).toBeTruthy();
  });

  it("decodes HTML entities in headline text", () => {
    render(<HeadlineRenderer headline="a &amp; b &lt;c&gt; <mark>d &amp; e</mark>" />);

    const marks = screen.getAllByTestId("headline-mark");
    expect(marks[0].props.children).toBe("d & e");

    const text = screen.getByTestId("headline-text");
    // The full rendered text should contain decoded entities
    const allText = text.props.children
      .map((c: { props?: { children?: string } } | string) =>
        typeof c === "string" ? c : c?.props?.children ?? "",
      )
      .join("");
    expect(allText).toContain("a & b <c>");
    expect(allText).toContain("d & e");
  });

});
