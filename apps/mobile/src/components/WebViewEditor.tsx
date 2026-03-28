import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { View, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import { MOBILE_EDITOR_HTML } from "@openslaq/editor/mobile-html";

import { TRANSPARENT } from "@/theme/constants";

export interface FormattingState {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  blockquote: boolean;
  bulletList: boolean;
  orderedList: boolean;
}

export interface WebViewEditorRef {
  setContent(markdown: string): void;
  clearContent(): void;
  focus(position?: "end" | "start"): void;
  blur(): void;
  getMarkdown(): Promise<string>;
  toggleBold(): void;
  toggleItalic(): void;
  toggleStrike(): void;
  toggleCode(): void;
  toggleBlockquote(): void;
  toggleBulletList(): void;
  toggleOrderedList(): void;
  setLink(url: string): void;
  unsetLink(): void;
  insertLink(text: string, url: string): void;
  insertMention(id: string, label: string): void;
  insertSlashCommand(name: string): void;
}

export interface EditorThemeColors {
  "text-primary": string;
  "text-muted": string;
  "text-faint": string;
  "border-strong": string;
  "surface-tertiary": string;
  "brand-primary": string;
}

interface WebViewEditorProps {
  placeholder?: string;
  themeColors?: EditorThemeColors;
  onContentChange?: (info: {
    markdown: string;
    text: string;
    isEmpty: boolean;
  }) => void;
  onHeightChange?: (height: number) => void;
  onFormattingState?: (state: FormattingState) => void;
  onMentionQuery?: (query: string | null) => void;
  onSlashQuery?: (query: string | null) => void;
  onReady?: () => void;
}

let callbackIdCounter = 0;

export const WebViewEditor = forwardRef<WebViewEditorRef, WebViewEditorProps>(
  function WebViewEditor(
    {
      placeholder,
      themeColors,
      onContentChange,
      onHeightChange,
      onFormattingState,
      onMentionQuery,
      onSlashQuery,
      onReady,
    },
    ref,
  ) {
    const webViewRef = useRef<WebView>(null);
    const pendingCallbacks = useRef<Map<string, (markdown: string) => void>>(
      new Map(),
    );
    // Clean up pending callbacks on unmount to prevent promise leaks
    useEffect(() => {
      return () => {
        for (const cb of pendingCallbacks.current.values()) {
          cb("");
        }
        pendingCallbacks.current.clear();
      };
    }, []);

    const isReadyRef = useRef(false);

    // Send theme colors when they change (and editor is ready)
    useEffect(() => {
      if (isReadyRef.current && themeColors) {
        sendCommand({ type: "set-theme", colors: themeColors });
      }
    }, [themeColors]);

    const sendCommand = useCallback(
      (msg: Record<string, unknown>) => {
        webViewRef.current?.injectJavaScript(
          `window.__editorBridge.handleCommand(${JSON.stringify(msg)}); true;`,
        );
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        setContent(markdown: string) {
          sendCommand({ type: "set-content", content: markdown });
        },
        clearContent() {
          sendCommand({ type: "clear" });
        },
        focus(position?: "end" | "start") {
          sendCommand({ type: "focus", position: position ?? "end" });
        },
        blur() {
          sendCommand({ type: "blur" });
        },
        getMarkdown() {
          return new Promise<string>((resolve) => {
            const callbackId = `cb_${++callbackIdCounter}`;
            pendingCallbacks.current.set(callbackId, resolve);
            sendCommand({ type: "get-markdown", callbackId });
          });
        },
        toggleBold() {
          sendCommand({ type: "toggle-bold" });
        },
        toggleItalic() {
          sendCommand({ type: "toggle-italic" });
        },
        toggleStrike() {
          sendCommand({ type: "toggle-strike" });
        },
        toggleCode() {
          sendCommand({ type: "toggle-code" });
        },
        toggleBlockquote() {
          sendCommand({ type: "toggle-blockquote" });
        },
        toggleBulletList() {
          sendCommand({ type: "toggle-bullet-list" });
        },
        toggleOrderedList() {
          sendCommand({ type: "toggle-ordered-list" });
        },
        setLink(url: string) {
          sendCommand({ type: "set-link", url });
        },
        unsetLink() {
          sendCommand({ type: "unset-link" });
        },
        insertLink(text: string, url: string) {
          sendCommand({ type: "insert-link", text, url });
        },
        insertMention(id: string, label: string) {
          sendCommand({ type: "insert-mention", id, label });
        },
        insertSlashCommand(name: string) {
          sendCommand({ type: "insert-slash-command", name });
        },
      }),
      [sendCommand],
    );

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          switch (data.type) {
            case "ready":
              isReadyRef.current = true;
              if (placeholder) {
                sendCommand({ type: "set-placeholder", text: placeholder });
              }
              if (themeColors) {
                sendCommand({ type: "set-theme", colors: themeColors });
              }
              onReady?.();
              break;
            case "content-change":
              onContentChange?.({
                markdown: data.markdown,
                text: data.text,
                isEmpty: data.isEmpty,
              });
              break;
            case "height-change":
              onHeightChange?.(data.height);
              break;
            case "formatting-state":
              onFormattingState?.(data as unknown as FormattingState);
              break;
            case "mention-query":
              onMentionQuery?.(data.query);
              break;
            case "slash-query":
              onSlashQuery?.(data.query);
              break;
            case "markdown-result": {
              const cb = pendingCallbacks.current.get(data.callbackId);
              if (cb) {
                pendingCallbacks.current.delete(data.callbackId);
                cb(data.markdown);
              }
              break;
            }
          }
        } catch {
          // ignore non-JSON messages
        }
      },
      [
        placeholder,
        themeColors,
        sendCommand,
        onContentChange,
        onHeightChange,
        onFormattingState,
        onMentionQuery,
        onSlashQuery,
        onReady,
      ],
    );

    return (
      <View testID="webview-editor-container" style={staticStyles.container}>
        <WebView
          ref={webViewRef}
          testID="webview-editor"
          source={{ html: MOBILE_EDITOR_HTML }}
          style={staticStyles.webview}
          scrollEnabled={false}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView
          onMessage={handleMessage}
        />
      </View>
    );
  },
);

const staticStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: TRANSPARENT,
  },
});
