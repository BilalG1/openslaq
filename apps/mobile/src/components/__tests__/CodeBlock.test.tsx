import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CodeBlock } from "../CodeBlock";

let mockMode = "light";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    mode: mockMode,
    theme: {
      colors: {
        borderDefault: "#ddd",
        textFaint: "#999",
      },
    },
  }),
}));

jest.mock("react-native-syntax-highlighter", () => {
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, style, language }: any) => (
      <Text testID="syntax-highlighter" accessibilityHint={JSON.stringify({ style: Object.keys(style || {}), language })}>
        {children}
      </Text>
    ),
  };
});

jest.mock("react-syntax-highlighter/styles/hljs", () => ({
  atomOneDark: { darkStyle: true },
  atomOneLight: { lightStyle: true },
}));

describe("CodeBlock", () => {
  beforeEach(() => {
    mockMode = "light";
  });

  it("renders language label when language prop provided", () => {
    render(<CodeBlock language="typescript">const x = 1;</CodeBlock>);

    expect(screen.getByText("typescript")).toBeTruthy();
  });

  it("no language label when prop omitted", () => {
    render(<CodeBlock>some code</CodeBlock>);

    expect(screen.queryByText("text")).toBeNull();
    expect(screen.getByTestId("code-block")).toBeTruthy();
  });

  it("renders code content", () => {
    render(<CodeBlock language="js">console.log("hello")</CodeBlock>);

    expect(screen.getByText('console.log("hello")')).toBeTruthy();
  });

  it("uses dark style when mode is dark", () => {
    mockMode = "dark";

    render(<CodeBlock language="js">code</CodeBlock>);

    const highlighter = screen.getByTestId("syntax-highlighter");
    const hint = JSON.parse(highlighter.props.accessibilityHint);
    expect(hint.style).toContain("darkStyle");
  });

  it("uses light style when mode is light", () => {
    mockMode = "light";

    render(<CodeBlock language="js">code</CodeBlock>);

    const highlighter = screen.getByTestId("syntax-highlighter");
    const hint = JSON.parse(highlighter.props.accessibilityHint);
    expect(hint.style).toContain("lightStyle");
  });
});
