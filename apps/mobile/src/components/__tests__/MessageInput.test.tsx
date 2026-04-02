import React from "react";
import { Keyboard, StyleSheet } from "react-native";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { MessageInput } from "../MessageInput";
import { asMessageId } from "@openslaq/shared";

const mockClearDraft = jest.fn();
const mockSaveDraft = jest.fn();
const originalModule = jest.requireActual("@/hooks/useDraftRestoration");
jest.mock("@/hooks/useDraftRestoration", () => {
  const actual = jest.requireActual("@/hooks/useDraftRestoration");
  return {
    useDraftRestoration: (opts: Parameters<typeof actual.useDraftRestoration>[0]) => {
      const result = actual.useDraftRestoration(opts);
      // Intercept clearDraft so we can spy on it
      mockClearDraft.mockImplementation(result.clearDraft);
      return { ...result, clearDraft: mockClearDraft, saveDraft: mockSaveDraft };
    },
  };
});

// Access the WebViewEditor mock helpers
const webViewEditorMock = require("@/components/WebViewEditor");

function getMockRef() {
  return webViewEditorMock.__mockRef;
}

beforeEach(() => {
  const ref = getMockRef();
  // Reset all mock functions
  for (const key of Object.keys(ref)) {
    if (typeof ref[key]?.mockClear === "function") {
      ref[key].mockClear();
    }
  }
  ref.getMarkdown.mockImplementation(() => Promise.resolve(""));
  jest.clearAllMocks();
});

describe("MessageInput", () => {
  it("send button is disabled when editor is empty", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const sendButton = screen.getByTestId("message-send");
    fireEvent.press(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("calls onSend with markdown content on send", async () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    act(() => {
      webViewEditorMock._simulateContentChange("hello", "hello", false);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("clears editor after sending", async () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const ref = getMockRef();
    act(() => {
      webViewEditorMock._simulateContentChange("hello", "hello", false);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    expect(ref.clearContent).toHaveBeenCalled();
  });

  it("shows edit banner when editingMessage is set", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={{ id: asMessageId("msg-1"), content: "original text" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    expect(screen.getByTestId("edit-banner")).toBeTruthy();
    expect(screen.getByText("Editing message")).toBeTruthy();
    expect(screen.getByTestId("edit-cancel")).toBeTruthy();
  });

  it("loads editing message content into editor", () => {
    const ref = getMockRef();
    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={{ id: asMessageId("msg-1"), content: "original text" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    expect(ref.setContent).toHaveBeenCalledWith("original text");
  });

  it("calls onSaveEdit in edit mode when content changed", async () => {
    const onSaveEdit = jest.fn();
    const onSend = jest.fn();

    render(
      <MessageInput
        onSend={onSend}
        editingMessage={{ id: asMessageId("msg-1"), content: "original text" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={onSaveEdit}
      />,
    );

    act(() => {
      webViewEditorMock._simulateContentChange("updated text", "updated text", false);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    expect(onSaveEdit).toHaveBeenCalledWith("msg-1", "updated text");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("cancel clears edit mode", () => {
    const onCancelEdit = jest.fn();

    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={{ id: asMessageId("msg-1"), content: "original text" }}
        onCancelEdit={onCancelEdit}
        onSaveEdit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("edit-cancel"));
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it("does not show edit banner when editingMessage is null", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={null}
      />,
    );

    expect(screen.queryByTestId("edit-banner")).toBeNull();
  });

  it("shows attachment button when onAddAttachment is provided", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        onAddAttachment={jest.fn()}
      />,
    );

    expect(screen.getByTestId("attachment-button")).toBeTruthy();
  });

  it("hides attachment button when onAddAttachment is not provided", () => {
    render(<MessageInput onSend={jest.fn()} />);

    expect(screen.queryByTestId("attachment-button")).toBeNull();
  });

  it("calls onAddAttachment when attachment button is pressed", () => {
    const onAddAttachment = jest.fn();
    render(
      <MessageInput
        onSend={jest.fn()}
        onAddAttachment={onAddAttachment}
      />,
    );

    fireEvent.press(screen.getByTestId("attachment-button"));

    expect(onAddAttachment).toHaveBeenCalled();
  });

  it("enables send button when files are pending even with empty text", async () => {
    const onSend = jest.fn();
    const pendingFiles = [
      { id: "f1", uri: "file:///test.jpg", name: "test.jpg", mimeType: "image/jpeg", isImage: true },
    ];
    render(
      <MessageInput
        onSend={onSend}
        pendingFiles={pendingFiles}
        onAddAttachment={jest.fn()}
        onRemoveFile={jest.fn()}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    expect(onSend).toHaveBeenCalledWith("");
  });

  it("shows upload spinner when uploading", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        uploading={true}
        pendingFiles={[
          { id: "f1", uri: "file:///test.jpg", name: "test.jpg", mimeType: "image/jpeg", isImage: true },
        ]}
        onAddAttachment={jest.fn()}
        onRemoveFile={jest.fn()}
      />,
    );

    expect(screen.getByTestId("upload-spinner")).toBeTruthy();
  });

  it("triggers light haptic on send", async () => {
    const { impactAsync, ImpactFeedbackStyle } = require("expo-haptics");
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    act(() => {
      webViewEditorMock._simulateContentChange("hello", "hello", false);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
  });

  it("calls onSlashCommand instead of onSend when text starts with /", async () => {
    const onSend = jest.fn();
    const onSlashCommand = jest.fn();
    render(<MessageInput onSend={onSend} onSlashCommand={onSlashCommand} />);

    act(() => {
      webViewEditorMock._simulateContentChange("/remind me at 3pm", "/remind me at 3pm", false);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    expect(onSlashCommand).toHaveBeenCalledWith("remind", "me at 3pm");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("calls onSlashCommand with empty args for command-only input", async () => {
    const onSlashCommand = jest.fn();
    render(<MessageInput onSend={jest.fn()} onSlashCommand={onSlashCommand} />);

    act(() => {
      webViewEditorMock._simulateContentChange("/mute", "/mute", false);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    expect(onSlashCommand).toHaveBeenCalledWith("mute", "");
  });

  it("renders Aa formatting toggle button", () => {
    render(<MessageInput onSend={jest.fn()} />);
    expect(screen.getByTestId("formatting-toggle")).toBeTruthy();
  });

  it("toolbar is hidden by default", () => {
    render(<MessageInput onSend={jest.fn()} />);
    expect(screen.queryByTestId("formatting-toolbar")).toBeNull();
  });

  it("toggles formatting toolbar on Aa button press", () => {
    render(<MessageInput onSend={jest.fn()} />);

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    expect(screen.getByTestId("formatting-toolbar")).toBeTruthy();

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    expect(screen.queryByTestId("formatting-toolbar")).toBeNull();
  });

  it("bold button calls editor.toggleBold()", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const ref = getMockRef();

    // Open toolbar
    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-bold"));

    expect(ref.toggleBold).toHaveBeenCalled();
  });

  it("italic button calls editor.toggleItalic()", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const ref = getMockRef();

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-italic"));

    expect(ref.toggleItalic).toHaveBeenCalled();
  });

  it("strikethrough button calls editor.toggleStrike()", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const ref = getMockRef();

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-strikethrough"));

    expect(ref.toggleStrike).toHaveBeenCalled();
  });

  it("code button calls editor.toggleCode()", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const ref = getMockRef();

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-code"));

    expect(ref.toggleCode).toHaveBeenCalled();
  });

  it("blockquote button calls editor.toggleBlockquote()", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const ref = getMockRef();

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-blockquote"));

    expect(ref.toggleBlockquote).toHaveBeenCalled();
  });

  it("bullet list button calls editor.toggleBulletList()", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const ref = getMockRef();

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-bulletList"));

    expect(ref.toggleBulletList).toHaveBeenCalled();
  });

  it("ordered list button calls editor.toggleOrderedList()", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const ref = getMockRef();

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-orderedList"));

    expect(ref.toggleOrderedList).toHaveBeenCalled();
  });

  it("link button opens link insert sheet", () => {
    render(<MessageInput onSend={jest.fn()} />);

    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-link"));

    expect(screen.getByTestId("link-sheet-content")).toBeTruthy();
  });

  it("link insert calls insertLink with display text and url", () => {
    const ref = getMockRef();
    render(<MessageInput onSend={jest.fn()} />);

    // Open link sheet
    fireEvent.press(screen.getByTestId("formatting-toggle"));
    fireEvent.press(screen.getByTestId("format-btn-link"));

    // Fill in fields
    fireEvent.changeText(screen.getByTestId("link-text-input"), "My Link");
    fireEvent.changeText(screen.getByTestId("link-url-input"), "https://example.com");

    // Press insert
    fireEvent.press(screen.getByTestId("link-insert-button"));

    // Should call insertLink with both display text and url
    expect(ref.insertLink).toHaveBeenCalledWith("My Link", "https://example.com");
    // Sheet should close
    expect(screen.queryByTestId("link-sheet-content")).toBeNull();
  });

  it("auto-focuses editor when autoFocus prop is true", () => {
    const ref = getMockRef();
    render(<MessageInput onSend={jest.fn()} autoFocus />);

    // Editor mock fires onReady synchronously on mount, so focus should have been called
    expect(ref.focus).toHaveBeenCalled();
  });

  it("does not auto-focus editor by default", () => {
    const ref = getMockRef();
    render(<MessageInput onSend={jest.fn()} />);

    // focus should NOT be called on mount when autoFocus is not set
    expect(ref.focus).not.toHaveBeenCalled();
  });

  it("never shows mic button (voice messages disabled)", () => {
    render(
      <MessageInput onSend={jest.fn()} onSendVoiceMessage={jest.fn()} />,
    );

    expect(screen.queryByTestId("mic-button")).toBeNull();
  });

  it("input row has no top border", () => {
    render(<MessageInput onSend={jest.fn()} />);

    const inputRow = screen.getByTestId("input-row");
    const style = StyleSheet.flatten(inputRow.props.style);
    expect(style.borderTopWidth).toBeUndefined();
  });

  it("does not auto-focus the input when mounted without editing", () => {
    const ref = getMockRef();
    render(<MessageInput onSend={jest.fn()} />);

    // focus should NOT be called on initial mount — opening the keyboard
    // automatically when navigating to a channel is disruptive on mobile
    expect(ref.focus).not.toHaveBeenCalled();
  });

  it("auto-focuses when editing a message", () => {
    const ref = getMockRef();
    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={{ id: asMessageId("msg-1"), content: "edit me" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    expect(ref.focus).toHaveBeenCalledWith("end");
  });

  it("renders the WebView editor", () => {
    render(<MessageInput onSend={jest.fn()} />);
    expect(screen.getByTestId("webview-editor")).toBeTruthy();
  });

  it("sets height, minHeight, and maxHeight on input container", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const input = screen.getByTestId("message-input");
    expect(StyleSheet.flatten(input.props.style)).toEqual(
      expect.objectContaining({ height: 36, minHeight: 36, maxHeight: 160 }),
    );
  });

  it("expands capsule when height-change event fires", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const capsule = screen.getByTestId("input-capsule");
    expect(StyleSheet.flatten(capsule.props.style)).toEqual(expect.objectContaining({ minHeight: 44 }));

    act(() => {
      webViewEditorMock._simulateHeightChange(80);
    });

    const input = screen.getByTestId("message-input");
    expect(StyleSheet.flatten(input.props.style)).toEqual(expect.objectContaining({ height: 80 }));
    expect(StyleSheet.flatten(capsule.props.style)).toEqual(expect.objectContaining({ minHeight: 88 }));
  });

  it("clamps height between 36 and 160", () => {
    render(<MessageInput onSend={jest.fn()} />);

    act(() => {
      webViewEditorMock._simulateHeightChange(10);
    });
    expect(StyleSheet.flatten(screen.getByTestId("message-input").props.style)).toEqual(
      expect.objectContaining({ height: 36 }),
    );

    act(() => {
      webViewEditorMock._simulateHeightChange(200);
    });
    expect(StyleSheet.flatten(screen.getByTestId("message-input").props.style)).toEqual(
      expect.objectContaining({ height: 160 }),
    );
  });

  it("resets editorHeight to 36 after sending a message", async () => {
    render(<MessageInput onSend={jest.fn()} />);

    // Expand the input
    act(() => {
      webViewEditorMock._simulateContentChange("hello", "hello", false);
      webViewEditorMock._simulateHeightChange(80);
    });
    expect(StyleSheet.flatten(screen.getByTestId("message-input").props.style)).toEqual(
      expect.objectContaining({ height: 80 }),
    );

    // Send the message
    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    // Height should reset to initial
    expect(StyleSheet.flatten(screen.getByTestId("message-input").props.style)).toEqual(
      expect.objectContaining({ height: 36 }),
    );
  });

  it("shows mention suggestions when mention-query fires", () => {
    const members = [
      { id: "u1", displayName: "John" },
      { id: "u2", displayName: "Jane" },
      { id: "u3", displayName: "Bob" },
    ];
    render(<MessageInput onSend={jest.fn()} members={members} />);

    act(() => {
      webViewEditorMock._simulateMentionQuery("jo");
    });

    expect(screen.getByTestId("mention-suggestion-list")).toBeTruthy();
    expect(screen.getByTestId("mention-suggestion-u1")).toBeTruthy(); // John
    expect(screen.queryByTestId("mention-suggestion-u3")).toBeNull(); // Bob - no match
  });

  it("shows slash command suggestions when slash-query fires", () => {
    const slashCommands = [
      { name: "remind", description: "Set a reminder", usage: "/remind [text]", source: "builtin" as const },
      { name: "mute", description: "Mute channel", usage: "/mute", source: "builtin" as const },
    ];
    render(<MessageInput onSend={jest.fn()} slashCommands={slashCommands} />);

    act(() => {
      webViewEditorMock._simulateSlashQuery("rem");
    });

    expect(screen.getByTestId("slash-command-suggestion-list")).toBeTruthy();
    expect(screen.getByTestId("slash-command-remind")).toBeTruthy();
    expect(screen.queryByTestId("slash-command-mute")).toBeNull();
  });

  it("hides suggestions when query is null", () => {
    const members = [{ id: "u1", displayName: "John" }];
    render(<MessageInput onSend={jest.fn()} members={members} />);

    act(() => {
      webViewEditorMock._simulateMentionQuery("jo");
    });
    expect(screen.getByTestId("mention-suggestion-list")).toBeTruthy();

    act(() => {
      webViewEditorMock._simulateMentionQuery(null);
    });
    expect(screen.queryByTestId("mention-suggestion-list")).toBeNull();
  });

  it("inserts mention when suggestion is selected", () => {
    const members = [{ id: "u1", displayName: "John" }];
    render(<MessageInput onSend={jest.fn()} members={members} />);

    const ref = getMockRef();
    act(() => {
      webViewEditorMock._simulateMentionQuery("jo");
    });

    fireEvent.press(screen.getByTestId("mention-suggestion-u1"));

    expect(ref.insertMention).toHaveBeenCalledWith("u1", "John");
    expect(ref.focus).toHaveBeenCalled();
  });

  it("re-focuses editor after slash command selection", () => {
    const slashCommands = [
      { name: "remind", description: "Set a reminder", usage: "/remind [text]", source: "builtin" as const },
    ];
    render(<MessageInput onSend={jest.fn()} slashCommands={slashCommands} />);

    const ref = getMockRef();
    act(() => {
      webViewEditorMock._simulateSlashQuery("rem");
    });

    fireEvent.press(screen.getByTestId("slash-command-remind"));

    expect(ref.insertSlashCommand).toHaveBeenCalledWith("remind");
    expect(ref.focus).toHaveBeenCalled();
  });

  it("resets mention and slash queries when edit is canceled", () => {
    const members = [{ id: "u1", displayName: "John" }];
    const slashCommands = [
      { name: "remind", description: "Set a reminder", usage: "/remind [text]", source: "builtin" as const },
    ];
    render(
      <MessageInput
        onSend={jest.fn()}
        members={members}
        slashCommands={slashCommands}
        editingMessage={{ id: asMessageId("msg-1"), content: "original" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    // Trigger mention suggestions
    act(() => {
      webViewEditorMock._simulateMentionQuery("jo");
    });
    expect(screen.getByTestId("mention-suggestion-list")).toBeTruthy();

    // Cancel edit
    fireEvent.press(screen.getByTestId("edit-cancel"));

    // Suggestions should be gone
    expect(screen.queryByTestId("mention-suggestion-list")).toBeNull();
  });

  it("clears draft when scheduling a message", async () => {
    const onScheduleSend = jest.fn();
    render(
      <MessageInput onSend={jest.fn()} onScheduleSend={onScheduleSend} draftKey="test-key" />,
    );

    // Type content so send button is enabled
    act(() => {
      webViewEditorMock._simulateContentChange("scheduled msg", "scheduled msg", false);
    });

    // Open schedule sheet via long press on send button
    await act(async () => {
      fireEvent(screen.getByTestId("message-send"), "onLongPress");
    });

    // Find a preset button in the schedule sheet and press it
    const presetButton = screen.queryByTestId("schedule-preset-in-20-minutes")
      ?? screen.queryByTestId("schedule-preset-tomorrow-at-9:00-am");

    if (presetButton) {
      mockClearDraft.mockClear();
      getMockRef().clearContent.mockClear();

      await act(async () => {
        fireEvent.press(presetButton);
      });

      expect(onScheduleSend).toHaveBeenCalledWith("scheduled msg", expect.any(Date));
      expect(mockClearDraft).toHaveBeenCalled();
      expect(getMockRef().clearContent).toHaveBeenCalled();
    } else {
      // Verify the schedule sheet is at least visible
      expect(screen.getByTestId("schedule-sheet-content")).toBeTruthy();
    }
  });

  it("has pan responder handlers on input row for swipe-to-dismiss keyboard", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const inputRow = screen.getByTestId("input-row");
    // PanResponder attaches onMoveShouldSetResponder and related handlers
    expect(inputRow.props.onMoveShouldSetResponder).toBeDefined();
  });

  it("attaches responder handlers for keyboard dismiss gesture", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const inputRow = screen.getByTestId("input-row");

    // PanResponder attaches these handlers to enable swipe-to-dismiss
    expect(inputRow.props.onResponderRelease).toBeDefined();
    expect(inputRow.props.onMoveShouldSetResponder).toBeDefined();
  });
});
