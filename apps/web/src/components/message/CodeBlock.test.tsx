import { describe, test, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import React from "react";
import { CodeBlock } from "./CodeBlock";

describe("CodeBlock", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextMock = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
  });

  afterEach(cleanup);

  test("renders language label from className", () => {
    render(
      <CodeBlock>
        <code className="language-typescript">const x = 1;</code>
      </CodeBlock>,
    );
    expect(screen.getByTestId("code-language").textContent).toBe("typescript");
  });

  test("maps short language codes", () => {
    render(
      <CodeBlock>
        <code className="language-ts">const x = 1;</code>
      </CodeBlock>,
    );
    expect(screen.getByTestId("code-language").textContent).toBe("typescript");

    cleanup();

    render(
      <CodeBlock>
        <code className="language-py">print("hi")</code>
      </CodeBlock>,
    );
    expect(screen.getByTestId("code-language").textContent).toBe("python");
  });

  test("no language label when no className", () => {
    render(
      <CodeBlock>
        <code>plain code</code>
      </CodeBlock>,
    );
    expect(screen.queryByTestId("code-language")).toBeNull();
  });

  test("copy button calls clipboard.writeText and shows Copied!", async () => {
    render(
      <CodeBlock>
        <code className="language-js">hello world</code>
      </CodeBlock>,
    );

    const copyButton = screen.getByText("Copy");
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeTextMock).toHaveBeenCalledWith("hello world");
    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  test("extracts text from nested elements", () => {
    render(
      <CodeBlock>
        <code className="language-js">
          <span>hello</span>
          <span> world</span>
        </code>
      </CodeBlock>,
    );

    // Verify copy button works with nested text
    fireEvent.click(screen.getByText("Copy"));
    expect(writeTextMock).toHaveBeenCalledWith("hello world");
  });

  test("passes className and style to pre element", () => {
    const { container } = render(
      <CodeBlock className="custom-class" style={{ color: "red" }}>
        <code>test</code>
      </CodeBlock>,
    );

    const pre = container.querySelector("pre");
    expect(pre?.className).toContain("custom-class");
    expect(pre?.style.color).toBe("red");
  });

  test("no language label for plain children without props", () => {
    render(<CodeBlock>just text</CodeBlock>);
    expect(screen.queryByTestId("code-language")).toBeNull();
  });
});
