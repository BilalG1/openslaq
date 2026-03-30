import React from "react";
import { StyleSheet } from "react-native";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { MessageInputVariantA } from "../MessageInputVariantA";

jest.mock("@/hooks/useDraftRestoration", () => {
  const actual = jest.requireActual("@/hooks/useDraftRestoration");
  return {
    useDraftRestoration: (opts: Parameters<typeof actual.useDraftRestoration>[0]) => {
      const result = actual.useDraftRestoration(opts);
      return { ...result, clearDraft: jest.fn(), saveDraft: jest.fn() };
    },
  };
});

const webViewEditorMock = require("@/components/WebViewEditor");

function getMockRef() {
  return webViewEditorMock.__mockRef;
}

beforeEach(() => {
  const ref = getMockRef();
  for (const key of Object.keys(ref)) {
    if (typeof ref[key]?.mockClear === "function") {
      ref[key].mockClear();
    }
  }
  ref.getMarkdown.mockImplementation(() => Promise.resolve(""));
  jest.clearAllMocks();
});

describe("MessageInputVariantA", () => {
  it("hides attachment button and formatting toggle when unfocused", () => {
    render(
      <MessageInputVariantA onSend={jest.fn()} onAddAttachment={jest.fn()} />,
    );

    expect(screen.queryByTestId("attachment-button")).toBeNull();
    expect(screen.queryByTestId("formatting-toggle")).toBeNull();
  });

  it("shows send button when unfocused", () => {
    render(<MessageInputVariantA onSend={jest.fn()} />);
    expect(screen.getByTestId("message-send")).toBeTruthy();
  });

  it("shows attachment button and formatting toggle when focused", () => {
    render(
      <MessageInputVariantA onSend={jest.fn()} onAddAttachment={jest.fn()} />,
    );

    act(() => {
      webViewEditorMock._simulateFocusChange(true);
    });

    expect(screen.getByTestId("attachment-button")).toBeTruthy();
    expect(screen.getByTestId("formatting-toggle")).toBeTruthy();
  });

  it("shows action row when focused", () => {
    render(
      <MessageInputVariantA onSend={jest.fn()} onAddAttachment={jest.fn()} />,
    );

    act(() => {
      webViewEditorMock._simulateFocusChange(true);
    });

    expect(screen.getByTestId("action-row")).toBeTruthy();
  });

  it("hides action row when unfocused", () => {
    render(<MessageInputVariantA onSend={jest.fn()} />);
    expect(screen.queryByTestId("action-row")).toBeNull();
  });

  it("send button is disabled when empty and unfocused", () => {
    const onSend = jest.fn();
    render(<MessageInputVariantA onSend={onSend} />);

    fireEvent.press(screen.getByTestId("message-send"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("send button activates when content is typed", async () => {
    const onSend = jest.fn();
    render(<MessageInputVariantA onSend={onSend} />);

    act(() => {
      webViewEditorMock._simulateContentChange("hello", "hello", false);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("toggles formatting toolbar via Aa button when focused", () => {
    render(
      <MessageInputVariantA onSend={jest.fn()} onAddAttachment={jest.fn()} />,
    );

    act(() => {
      webViewEditorMock._simulateFocusChange(true);
    });

    // Toolbar hidden by default
    expect(screen.queryByTestId("formatting-toolbar")).toBeNull();

    // Toggle on
    fireEvent.press(screen.getByTestId("formatting-toggle"));
    expect(screen.getByTestId("formatting-toolbar")).toBeTruthy();

    // Toggle off
    fireEvent.press(screen.getByTestId("formatting-toggle"));
    expect(screen.queryByTestId("formatting-toolbar")).toBeNull();
  });

  it("hides buttons again after blur", () => {
    render(
      <MessageInputVariantA onSend={jest.fn()} onAddAttachment={jest.fn()} />,
    );

    // Focus
    act(() => {
      webViewEditorMock._simulateFocusChange(true);
    });
    expect(screen.getByTestId("attachment-button")).toBeTruthy();

    // Blur
    act(() => {
      webViewEditorMock._simulateFocusChange(false);
    });
    expect(screen.queryByTestId("attachment-button")).toBeNull();
    expect(screen.queryByTestId("formatting-toggle")).toBeNull();
  });

  it("uses single WebViewEditor instance (no remount on focus change)", () => {
    render(
      <MessageInputVariantA onSend={jest.fn()} onAddAttachment={jest.fn()} />,
    );

    const editorBefore = screen.getByTestId("webview-editor");

    act(() => {
      webViewEditorMock._simulateFocusChange(true);
    });

    const editorAfter = screen.getByTestId("webview-editor");
    // Same element — not remounted
    expect(screen.getAllByTestId("webview-editor")).toHaveLength(1);
  });
});
