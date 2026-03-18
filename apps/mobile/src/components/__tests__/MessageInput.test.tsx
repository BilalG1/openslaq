import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { MessageInput } from "../MessageInput";

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
        editingMessage={{ id: "msg-1", content: "original text" }}
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
        editingMessage={{ id: "msg-1", content: "original text" }}
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
        editingMessage={{ id: "msg-1", content: "original text" }}
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
        editingMessage={{ id: "msg-1", content: "original text" }}
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

  it("shows mic button when text is empty and onSendVoiceMessage is provided", () => {
    render(
      <MessageInput onSend={jest.fn()} onSendVoiceMessage={jest.fn()} />,
    );

    expect(screen.getByTestId("mic-button")).toBeTruthy();
  });

  it("hides mic button when editing a message", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        onSendVoiceMessage={jest.fn()}
        editingMessage={{ id: "msg-1", content: "edit" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("mic-button")).toBeNull();
  });

  it("hides mic button when onSendVoiceMessage is not provided", () => {
    render(<MessageInput onSend={jest.fn()} />);

    expect(screen.queryByTestId("mic-button")).toBeNull();
  });

  it("shows recording state after pressing mic button", async () => {
    render(
      <MessageInput onSend={jest.fn()} onSendVoiceMessage={jest.fn()} />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("mic-button"));
    });

    expect(screen.getByTestId("recording-bar")).toBeTruthy();
    expect(screen.getByTestId("recording-cancel")).toBeTruthy();
    expect(screen.getByTestId("recording-stop-send")).toBeTruthy();
    expect(screen.getByTestId("recording-timer")).toBeTruthy();
  });

  it("cancel recording returns to default state", async () => {
    render(
      <MessageInput onSend={jest.fn()} onSendVoiceMessage={jest.fn()} />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("mic-button"));
    });

    expect(screen.getByTestId("recording-bar")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("recording-cancel"));
    });

    expect(screen.queryByTestId("recording-bar")).toBeNull();
    expect(screen.getByTestId("mic-button")).toBeTruthy();
  });

  it("stop recording calls onSendVoiceMessage", async () => {
    const onSendVoiceMessage = jest.fn();
    render(
      <MessageInput onSend={jest.fn()} onSendVoiceMessage={onSendVoiceMessage} />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("mic-button"));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("recording-stop-send"));
    });

    expect(onSendVoiceMessage).toHaveBeenCalledWith(
      "file:///mock-recording.m4a",
      expect.any(Number),
    );
  });

  it("renders the WebView editor", () => {
    render(<MessageInput onSend={jest.fn()} />);
    expect(screen.getByTestId("webview-editor")).toBeTruthy();
  });

  it("sets height, minHeight, and maxHeight on input container", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const input = screen.getByTestId("message-input");
    expect(input.props.style).toEqual(
      expect.objectContaining({ height: 36, minHeight: 36, maxHeight: 120 }),
    );
  });

  it("expands capsule when height-change event fires", () => {
    render(<MessageInput onSend={jest.fn()} />);
    const capsule = screen.getByTestId("input-capsule");
    expect(capsule.props.style).toEqual(expect.objectContaining({ minHeight: 44 }));

    act(() => {
      webViewEditorMock._simulateHeightChange(80);
    });

    const input = screen.getByTestId("message-input");
    expect(input.props.style).toEqual(expect.objectContaining({ height: 80 }));
    expect(capsule.props.style).toEqual(expect.objectContaining({ minHeight: 88 }));
  });

  it("clamps height between 36 and 120", () => {
    render(<MessageInput onSend={jest.fn()} />);

    act(() => {
      webViewEditorMock._simulateHeightChange(10);
    });
    expect(screen.getByTestId("message-input").props.style).toEqual(
      expect.objectContaining({ height: 36 }),
    );

    act(() => {
      webViewEditorMock._simulateHeightChange(200);
    });
    expect(screen.getByTestId("message-input").props.style).toEqual(
      expect.objectContaining({ height: 120 }),
    );
  });

  it("resets editorHeight to 36 after sending a message", async () => {
    render(<MessageInput onSend={jest.fn()} />);

    // Expand the input
    act(() => {
      webViewEditorMock._simulateContentChange("hello", "hello", false);
      webViewEditorMock._simulateHeightChange(80);
    });
    expect(screen.getByTestId("message-input").props.style).toEqual(
      expect.objectContaining({ height: 80 }),
    );

    // Send the message
    await act(async () => {
      fireEvent.press(screen.getByTestId("message-send"));
    });

    // Height should reset to initial
    expect(screen.getByTestId("message-input").props.style).toEqual(
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
        editingMessage={{ id: "msg-1", content: "original" }}
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
});
