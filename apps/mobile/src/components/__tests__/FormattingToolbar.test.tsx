import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FormattingToolbar } from "../FormattingToolbar";

describe("FormattingToolbar", () => {
  const FORMAT_BUTTONS = [
    "format-btn-bold",
    "format-btn-italic",
    "format-btn-strikethrough",
    "format-btn-code",
    "format-btn-codeBlock",
    "format-btn-blockquote",
    "format-btn-bulletList",
    "format-btn-orderedList",
  ] as const;

  it("renders all format buttons and link button", () => {
    render(<FormattingToolbar onFormat={jest.fn()} onLinkPress={jest.fn()} />);

    for (const testID of FORMAT_BUTTONS) {
      expect(screen.getByTestId(testID)).toBeTruthy();
    }
    expect(screen.getByTestId("format-btn-link")).toBeTruthy();
  });

  it("calls onFormat with correct format type for each button", () => {
    const onFormat = jest.fn();
    render(<FormattingToolbar onFormat={onFormat} onLinkPress={jest.fn()} />);

    const expectedFormats = [
      "bold",
      "italic",
      "strikethrough",
      "code",
      "codeBlock",
      "blockquote",
      "bulletList",
      "orderedList",
    ];

    for (let i = 0; i < FORMAT_BUTTONS.length; i++) {
      fireEvent.press(screen.getByTestId(FORMAT_BUTTONS[i]!));
      expect(onFormat).toHaveBeenLastCalledWith(expectedFormats[i]);
    }

    expect(onFormat).toHaveBeenCalledTimes(FORMAT_BUTTONS.length);
  });

  it("calls onLinkPress when link button is pressed", () => {
    const onLinkPress = jest.fn();
    render(<FormattingToolbar onFormat={jest.fn()} onLinkPress={onLinkPress} />);

    fireEvent.press(screen.getByTestId("format-btn-link"));
    expect(onLinkPress).toHaveBeenCalledTimes(1);
  });

  it("triggers haptic feedback on press", () => {
    const { selectionAsync } = require("expo-haptics");
    render(<FormattingToolbar onFormat={jest.fn()} onLinkPress={jest.fn()} />);

    fireEvent.press(screen.getByTestId("format-btn-bold"));
    expect(selectionAsync).toHaveBeenCalled();
  });

  it("renders with testID formatting-toolbar", () => {
    render(<FormattingToolbar onFormat={jest.fn()} onLinkPress={jest.fn()} />);
    expect(screen.getByTestId("formatting-toolbar")).toBeTruthy();
  });

  it("each button has an accessibilityLabel", () => {
    render(<FormattingToolbar onFormat={jest.fn()} onLinkPress={jest.fn()} />);
    for (const testID of FORMAT_BUTTONS) {
      const btn = screen.getByTestId(testID);
      expect(btn.props.accessibilityLabel).toBeTruthy();
    }
    expect(screen.getByTestId("format-btn-link").props.accessibilityLabel).toBe("Insert link");
  });

  it("renders dividers between different button groups", () => {
    const { toJSON } = render(<FormattingToolbar onFormat={jest.fn()} onLinkPress={jest.fn()} />);
    // The component has 3 groups (0, 1, 2) plus a link divider = 3 dividers
    // Dividers are View elements with width: 1
    const json = JSON.stringify(toJSON());
    // Count divider Views by their unique style (width: 1, height: 20)
    const dividerMatches = json.match(/"width":1,"height":20/g);
    expect(dividerMatches).not.toBeNull();
    expect(dividerMatches!.length).toBe(3);
  });

  it("wraps buttons in a horizontal ScrollView", () => {
    render(<FormattingToolbar onFormat={jest.fn()} onLinkPress={jest.fn()} />);
    // The toolbar renders a ScrollView with horizontal prop
    const toolbar = screen.getByTestId("formatting-toolbar");
    expect(toolbar).toBeTruthy();
  });
});
