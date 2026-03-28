import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { WebViewEditorRef, FormattingState } from "../WebViewEditor";

jest.mock("@/utils/haptics", () => ({
  haptics: { selection: jest.fn(), heavy: jest.fn() },
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surfaceTertiary: "#eee",
        textPrimary: "#000",
        textSecondary: "#666",
        borderDefault: "#ddd",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

import { RichTextToolbar } from "../RichTextToolbar";
import { haptics } from "@/utils/haptics";

const mockHaptics = haptics as jest.Mocked<typeof haptics>;

function makeEditor(): WebViewEditorRef {
  return {
    setContent: jest.fn(),
    clearContent: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    getMarkdown: jest.fn(),
    toggleBold: jest.fn(),
    toggleItalic: jest.fn(),
    toggleStrike: jest.fn(),
    toggleCode: jest.fn(),
    toggleBlockquote: jest.fn(),
    toggleBulletList: jest.fn(),
    toggleOrderedList: jest.fn(),
    setLink: jest.fn(),
    unsetLink: jest.fn(),
    insertMention: jest.fn(),
    insertSlashCommand: jest.fn(),
    insertLink: jest.fn(),
  };
}

const defaultFormattingState: FormattingState = {
  bold: false,
  italic: false,
  strike: false,
  code: false,
  blockquote: false,
  bulletList: false,
  orderedList: false,
};

describe("RichTextToolbar", () => {
  let editor: WebViewEditorRef;
  let onLinkPress: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    editor = makeEditor();
    onLinkPress = jest.fn();
  });

  it("renders with testID", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    expect(screen.getByTestId("formatting-toolbar")).toBeTruthy();
  });

  it("renders all 7 format buttons plus link button", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    expect(screen.getByTestId("format-btn-bold")).toBeTruthy();
    expect(screen.getByTestId("format-btn-italic")).toBeTruthy();
    expect(screen.getByTestId("format-btn-strikethrough")).toBeTruthy();
    expect(screen.getByTestId("format-btn-code")).toBeTruthy();
    expect(screen.getByTestId("format-btn-blockquote")).toBeTruthy();
    expect(screen.getByTestId("format-btn-bulletList")).toBeTruthy();
    expect(screen.getByTestId("format-btn-orderedList")).toBeTruthy();
    expect(screen.getByTestId("format-btn-link")).toBeTruthy();
  });

  it("bold button calls editor.toggleBold", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-bold"));
    expect(editor.toggleBold).toHaveBeenCalled();
  });

  it("italic button calls editor.toggleItalic", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-italic"));
    expect(editor.toggleItalic).toHaveBeenCalled();
  });

  it("strikethrough button calls editor.toggleStrike", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-strikethrough"));
    expect(editor.toggleStrike).toHaveBeenCalled();
  });

  it("code button calls editor.toggleCode", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-code"));
    expect(editor.toggleCode).toHaveBeenCalled();
  });

  it("blockquote button calls editor.toggleBlockquote", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-blockquote"));
    expect(editor.toggleBlockquote).toHaveBeenCalled();
  });

  it("bulletList button calls editor.toggleBulletList", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-bulletList"));
    expect(editor.toggleBulletList).toHaveBeenCalled();
  });

  it("orderedList button calls editor.toggleOrderedList", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-orderedList"));
    expect(editor.toggleOrderedList).toHaveBeenCalled();
  });

  it("link button calls onLinkPress", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-link"));
    expect(onLinkPress).toHaveBeenCalled();
  });

  it("each button press triggers haptic feedback", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    fireEvent.press(screen.getByTestId("format-btn-bold"));
    fireEvent.press(screen.getByTestId("format-btn-link"));
    expect(mockHaptics.selection).toHaveBeenCalledTimes(2);
  });

  it("buttons have accessibilityRole button", () => {
    render(
      <RichTextToolbar editor={editor} formattingState={defaultFormattingState} onLinkPress={onLinkPress} />,
    );
    const boldBtn = screen.getByTestId("format-btn-bold");
    expect(boldBtn.props.accessibilityRole).toBe("button");
    const linkBtn = screen.getByTestId("format-btn-link");
    expect(linkBtn.props.accessibilityRole).toBe("button");
  });
});
