import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MessageInput } from "../MessageInput";

describe("MessageInput", () => {
  it("send button is disabled when empty", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const sendButton = screen.getByText("↑");
    fireEvent.press(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("typing enables send button", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "hello");
    fireEvent.press(screen.getByText("↑"));

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("calls onSend with trimmed text and clears input", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "  hello world  ");
    fireEvent.press(screen.getByText("↑"));

    expect(onSend).toHaveBeenCalledWith("hello world");
    expect(input.props.value).toBe("");
  });

  it("whitespace-only does not trigger onSend", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "   ");
    fireEvent.press(screen.getByText("↑"));

    expect(onSend).not.toHaveBeenCalled();
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

  it("pre-fills input with message content in edit mode", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={{ id: "msg-1", content: "original text" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    const input = screen.getByTestId("message-input");
    expect(input.props.value).toBe("original text");
  });

  it("calls onSaveEdit in edit mode when content changed", () => {
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

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "updated text");
    fireEvent.press(screen.getByText("↑"));

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

  it("calls onTyping when text changes", () => {
    const onTyping = jest.fn();
    render(<MessageInput onSend={jest.fn()} onTyping={onTyping} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "h");
    fireEvent.changeText(input, "he");

    expect(onTyping).toHaveBeenCalledTimes(2);
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

  it("enables send button when files are pending even with empty text", () => {
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

    fireEvent.press(screen.getByTestId("message-send"));

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

  it("triggers light haptic on send", () => {
    const { impactAsync, ImpactFeedbackStyle } = require("expo-haptics");
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "hello");
    fireEvent.press(screen.getByText("↑"));

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
  });

  it("shows mention suggestion list when @ triggers autocomplete", () => {
    const members = [
      { id: "user-1", displayName: "Alice" },
      { id: "user-2", displayName: "Bob" },
    ];
    render(<MessageInput onSend={jest.fn()} members={members} />);

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "@a");
    // Simulate cursor position after the typed text
    fireEvent(input, "selectionChange", {
      nativeEvent: { selection: { start: 2, end: 2 } },
    });

    expect(screen.getByTestId("mention-suggestion-list")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("shows slash command suggestion list when / is typed at start", () => {
    const commands = [
      { name: "remind", description: "Set a reminder", usage: "/remind", source: "builtin" as const },
      { name: "mute", description: "Mute channel", usage: "/mute", source: "builtin" as const },
    ];
    render(<MessageInput onSend={jest.fn()} slashCommands={commands} onSlashCommand={jest.fn()} />);

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "/");

    expect(screen.getByTestId("slash-command-suggestion-list")).toBeTruthy();
    expect(screen.getByText("/remind")).toBeTruthy();
  });

  it("calls onSlashCommand instead of onSend when text starts with /", () => {
    const onSend = jest.fn();
    const onSlashCommand = jest.fn();
    render(<MessageInput onSend={onSend} onSlashCommand={onSlashCommand} />);

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "/remind me at 3pm");
    fireEvent.press(screen.getByTestId("message-send"));

    expect(onSlashCommand).toHaveBeenCalledWith("remind", "me at 3pm");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("calls onSlashCommand with empty args for command-only input", () => {
    const onSlashCommand = jest.fn();
    render(<MessageInput onSend={jest.fn()} onSlashCommand={onSlashCommand} />);

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "/mute");
    fireEvent.press(screen.getByTestId("message-send"));

    expect(onSlashCommand).toHaveBeenCalledWith("mute", "");
  });

  it("falls through to onSend when / text but no onSlashCommand handler", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "/remind test");
    fireEvent.press(screen.getByTestId("message-send"));

    expect(onSend).toHaveBeenCalledWith("/remind test");
  });

  it("clears input after slash command is sent", () => {
    const onSlashCommand = jest.fn();
    render(<MessageInput onSend={jest.fn()} onSlashCommand={onSlashCommand} />);

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "/remind test");
    fireEvent.press(screen.getByTestId("message-send"));

    expect(input.props.value).toBe("");
  });

  it("opens schedule sheet on long-press of send button", () => {
    const onScheduleSend = jest.fn();
    render(
      <MessageInput onSend={jest.fn()} onScheduleSend={onScheduleSend} />,
    );

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "scheduled message");
    fireEvent(screen.getByTestId("message-send"), "longPress");

    expect(screen.getByTestId("schedule-sheet-content")).toBeTruthy();
  });

  it("does not show schedule sheet in edit mode", () => {
    const onScheduleSend = jest.fn();
    render(
      <MessageInput
        onSend={jest.fn()}
        onScheduleSend={onScheduleSend}
        editingMessage={{ id: "msg-1", content: "editing" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    // onLongPress should be undefined when editing, so longPress is a no-op
    fireEvent(screen.getByTestId("message-send"), "longPress");
    expect(screen.queryByTestId("schedule-sheet-content")).toBeNull();
  });

  it("restores draft on mount when draftKey is set", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("saved draft text");

    render(<MessageInput onSend={jest.fn()} draftKey="ch-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("message-input").props.value).toBe("saved draft text");
    });
  });

  it("saves draft when typing with draftKey", async () => {
    jest.useFakeTimers();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    render(<MessageInput onSend={jest.fn()} draftKey="ch-1" />);

    await act(async () => {});

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "hello draft");

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith("openslaq-draft-ch-1", "hello draft");
    jest.useRealTimers();
  });

  it("clears draft on send", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("old draft");

    render(<MessageInput onSend={jest.fn()} draftKey="ch-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("message-input").props.value).toBe("old draft");
    });

    fireEvent.press(screen.getByTestId("message-send"));

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("openslaq-draft-ch-1");
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

  it("bold format button wraps text with **", () => {
    render(<MessageInput onSend={jest.fn()} />);

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "hello");

    // Open toolbar
    fireEvent.press(screen.getByTestId("formatting-toggle"));

    // Simulate selecting all text
    fireEvent(input, "selectionChange", {
      nativeEvent: { selection: { start: 0, end: 5 } },
    });

    fireEvent.press(screen.getByTestId("format-btn-bold"));

    expect(input.props.value).toBe("**hello**");
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

  it("hides mic button when text is non-empty", () => {
    render(
      <MessageInput onSend={jest.fn()} onSendVoiceMessage={jest.fn()} />,
    );

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "hello");

    expect(screen.queryByTestId("mic-button")).toBeNull();
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

  it("calls onScheduleSend with content and date when preset is selected", () => {
    const onScheduleSend = jest.fn();
    render(
      <MessageInput onSend={jest.fn()} onScheduleSend={onScheduleSend} />,
    );

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "hello scheduled");
    fireEvent(screen.getByTestId("message-send"), "longPress");

    // Tap the first preset
    fireEvent.press(screen.getByTestId("schedule-preset-in-20-minutes"));

    expect(onScheduleSend).toHaveBeenCalledTimes(1);
    expect(onScheduleSend.mock.calls[0][0]).toBe("hello scheduled");
    expect(onScheduleSend.mock.calls[0][1]).toBeInstanceOf(Date);
    // Input should be cleared
    expect(input.props.value).toBe("");
  });
});
