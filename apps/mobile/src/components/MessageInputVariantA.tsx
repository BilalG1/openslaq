import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { View, Pressable, Text, ActivityIndicator, Keyboard, PanResponder, StyleSheet } from "react-native";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useDraftRestoration } from "@/hooks/useDraftRestoration";
import { useMessageSuggestions } from "@/hooks/useMessageSuggestions";
import { RichTextToolbar } from "./RichTextToolbar";
import { LinkInsertSheet } from "./LinkInsertSheet";
import { ScheduleMessageSheet } from "./ScheduleMessageSheet";
import { FilePreviewStrip } from "./FilePreviewStrip";
import { MentionSuggestionList } from "./MentionSuggestionList";
import type { MentionCandidate } from "@/utils/message-input-utils";
import { SlashCommandSuggestionList } from "./SlashCommandSuggestionList";
import { WebViewEditor } from "./WebViewEditor";
import type { WebViewEditorRef, FormattingState, EditorThemeColors } from "./WebViewEditor";
import { RecordingBar } from "./RecordingBar";
import type { SlashCommandDefinition } from "@openslaq/shared";
import { parseSlashCommand } from "@/utils/message-input-utils";
import type { MessageInputProps, MessageInputRef } from "./MessageInput";

import { TRANSPARENT } from "@/theme/constants";

/**
 * Variant-A message input: two-line layout when focused.
 * - Unfocused: [editor] [send]  (no + or Aa buttons)
 * - Focused:   Row 1: [editor]
 *              Row 2: [+] [Aa]          [send]
 */
export const MessageInputVariantA = forwardRef<MessageInputRef, MessageInputProps>(function MessageInputVariantA({
  onSend,
  placeholder = "Message",
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  members = [],
  onTyping,
  pendingFiles = [],
  onAddAttachment,
  onRemoveFile,
  uploading = false,
  slashCommands = [],
  onSlashCommand,
  onScheduleSend,
  onSendVoiceMessage,
  draftKey,
  autoFocus = false,
}: MessageInputProps, ref) {
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [editorHeight, setEditorHeight] = useState(36);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [formattingState, setFormattingState] = useState<FormattingState>({
    bold: false,
    italic: false,
    strike: false,
    code: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
  });
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const editorThemeColors = useMemo<EditorThemeColors>(() => ({
    "text-primary": theme.colors.textPrimary,
    "text-muted": theme.colors.textMuted,
    "text-faint": theme.colors.textFaint,
    "border-strong": theme.colors.borderDefault,
    "surface-tertiary": theme.colors.surfaceTertiary,
    "brand-primary": theme.brand.primary,
  }), [theme]);

  const editorRef = useRef<WebViewEditorRef>(null);
  const latestMarkdownRef = useRef("");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  const { saveDraft, clearDraft, handleEditorReady } = useDraftRestoration({
    editingMessage: editingMessage ?? null,
    draftKey,
    editorRef,
  });

  const handleReady = useCallback(() => {
    handleEditorReady();
    if (autoFocus) {
      editorRef.current?.focus();
    }
  }, [handleEditorReady, autoFocus]);

  const {
    mentionQuery, setMentionQuery,
    slashQuery, setSlashQuery,
    mentionSuggestions, slashSuggestions,
    clearSuggestions,
  } = useMessageSuggestions({ members, slashCommands });

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const handleContentChange = useCallback(
    (info: { markdown: string; text: string; isEmpty: boolean }) => {
      latestMarkdownRef.current = info.markdown;
      setIsEmpty(info.isEmpty);

      if (!editingMessage) {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          saveDraft(info.text ?? "");
        }, 300);
        onTyping?.();
      }
    },
    [editingMessage, saveDraft, onTyping],
  );

  const handleHeightChange = useCallback((height: number) => {
    setEditorHeight(Math.min(Math.max(height, 36), 160));
  }, []);

  const handleFocusChange = useCallback((focused: boolean) => {
    setIsFocused(focused);
  }, []);

  const canSend = !isEmpty || pendingFiles.length > 0;

  const handleMentionSelect = useCallback(
    (item: MentionCandidate) => {
      editorRef.current?.insertMention(item.id, item.displayName);
      setMentionQuery(null);
      editorRef.current?.focus();
    },
    [],
  );

  const handleSlashSelect = useCallback(
    (command: SlashCommandDefinition) => {
      editorRef.current?.insertSlashCommand(command.name);
      setSlashQuery(null);
      editorRef.current?.focus();
    },
    [],
  );

  const handleSend = useCallback(async () => {
    if (uploading) return;

    const markdown = latestMarkdownRef.current.trim();

    if (editingMessage && onSaveEdit) {
      if (markdown && markdown !== editingMessage.content) {
        haptics.light();
        onSaveEdit(editingMessage.id, markdown);
      }
      onCancelEdit?.();
      editorRef.current?.clearContent();
      setEditorHeight(36);
      return;
    }

    if (!markdown && pendingFiles.length === 0) return;

    const parsed = parseSlashCommand(markdown);
    if (parsed && onSlashCommand) {
      haptics.light();
      onSlashCommand(parsed.command, parsed.args);
      editorRef.current?.clearContent();
      setEditorHeight(36);
      clearDraft();
      return;
    }

    haptics.light();
    const result = onSend(markdown);
    if (result && typeof result.then === "function") {
      const ok = await result;
      if (!ok) return;
    }
    editorRef.current?.clearContent();
    setEditorHeight(36);
    clearDraft();
  }, [uploading, editingMessage, onSaveEdit, onCancelEdit, pendingFiles.length, onSlashCommand, onSend, clearDraft]);

  const handleCancel = () => {
    onCancelEdit?.();
    editorRef.current?.clearContent();
    setEditorHeight(36);
    clearSuggestions();
  };

  const handleLinkInsert = useCallback(
    (displayText: string, url: string) => {
      editorRef.current?.insertLink(displayText, url);
      setShowLinkSheet(false);
      editorRef.current?.focus();
    },
    [],
  );

  const handleStartRecording = useCallback(async () => {
    haptics.medium();
    await startRecording();
  }, [startRecording]);

  const handleCancelRecording = useCallback(async () => {
    haptics.light();
    await cancelRecording();
  }, [cancelRecording]);

  const handleStopAndSend = useCallback(async () => {
    haptics.light();
    const result = await stopRecording();
    if (result && onSendVoiceMessage) {
      onSendVoiceMessage(result.uri, result.durationMs);
    }
  }, [stopRecording, onSendVoiceMessage]);

  const blurEditor = useCallback(() => {
    editorRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  useImperativeHandle(ref, () => ({
    dismissKeyboard: blurEditor,
  }));

  const dismissPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 30) {
          editorRef.current?.blur();
          Keyboard.dismiss();
        }
      },
    }),
  ).current;

  const sendButton = (
    <Pressable
      testID="message-send"
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: canSend && !uploading ? theme.brand.primary : theme.colors.borderStrong,
        opacity: pressed ? 0.85 : 1,
      })}
      onPress={() => void handleSend()}
      onLongPress={
        onScheduleSend && !editingMessage && canSend && !uploading
          ? () => { haptics.medium(); setShowScheduleSheet(true); }
          : undefined
      }
      disabled={!canSend || uploading}
      accessibilityRole="button"
      accessibilityLabel="Send message"
      accessibilityHint={canSend ? "Sends the message" : "Type a message first"}
    >
      {uploading ? (
        <ActivityIndicator testID="upload-spinner" size="small" color={theme.colors.headerText} />
      ) : (
        <Text style={styles.sendArrowText}>↑</Text>
      )}
    </Pressable>
  );

  return (
    <View style={staticStyles.wrapper}>
      {mentionSuggestions.length > 0 && (
        <MentionSuggestionList
          suggestions={mentionSuggestions}
          onSelect={(item) => void handleMentionSelect(item)}
        />
      )}
      {slashSuggestions.length > 0 && (
        <SlashCommandSuggestionList
          suggestions={slashSuggestions}
          onSelect={handleSlashSelect}
        />
      )}
      {editingMessage && (
        <View testID="edit-banner" style={styles.editBanner}>
          <Text style={styles.editBannerLabel}>Editing message</Text>
          <Pressable
            testID="edit-cancel"
            onPress={handleCancel}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            accessibilityHint="Cancels the message edit"
          >
            <Text style={styles.editCancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}
      {pendingFiles.length > 0 && onRemoveFile && (
        <View style={styles.filePreviewBorder}>
          <FilePreviewStrip files={pendingFiles} onRemove={onRemoveFile} />
        </View>
      )}
      {showToolbar && (
        <RichTextToolbar
          editor={editorRef.current!}
          formattingState={formattingState}
          onLinkPress={() => setShowLinkSheet(true)}
        />
      )}
      {isRecording ? (
        <RecordingBar
          duration={duration}
          onCancel={() => void handleCancelRecording()}
          onStopAndSend={() => void handleStopAndSend()}
        />
      ) : (
        <View testID="input-row" style={isFocused ? styles.inputArea : styles.inputRow} {...dismissPanResponder.panHandlers}>
          {/* Editor capsule — always rendered (single instance) */}
          <View
            testID="input-capsule"
            style={[styles.inputCapsule, { minHeight: editorHeight + 8 }]}
          >
            <View
              testID="message-input"
              style={[staticStyles.editorContainer, { height: editorHeight }]}
            >
              <WebViewEditor
                ref={editorRef}
                placeholder={placeholder}
                themeColors={editorThemeColors}
                onContentChange={handleContentChange}
                onHeightChange={handleHeightChange}
                onFormattingState={setFormattingState}
                onMentionQuery={setMentionQuery}
                onSlashQuery={setSlashQuery}
                onFocusChange={handleFocusChange}
                onReady={handleReady}
              />
            </View>
          </View>
          {isFocused ? (
            /* Focused: action row below editor */
            <View testID="action-row" style={styles.actionRow}>
              {onAddAttachment && (
                <Pressable
                  testID="attachment-button"
                  style={staticStyles.circleButton32}
                  onPress={onAddAttachment}
                  accessibilityRole="button"
                  accessibilityLabel="Add attachment"
                  accessibilityHint="Opens the file picker to add an attachment"
                >
                  <Text style={styles.attachmentButtonText}>+</Text>
                </Pressable>
              )}
              <Pressable
                testID="formatting-toggle"
                style={[
                  staticStyles.circleButton32,
                  showToolbar ? styles.formattingToggleActive : styles.formattingToggleInactive,
                ]}
                onPress={() => setShowToolbar((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showToolbar ? "Hide formatting toolbar" : "Show formatting toolbar"}
                accessibilityHint="Toggles the rich text formatting toolbar"
              >
                <Text
                  style={showToolbar ? styles.formattingToggleTextActive : styles.formattingToggleTextInactive}
                >
                  Aa
                </Text>
              </Pressable>
              <View style={staticStyles.actionRowSpacer} />
              {sendButton}
            </View>
          ) : (
            /* Unfocused: send button inline */
            sendButton
          )}
        </View>
      )}
      <LinkInsertSheet
        visible={showLinkSheet}
        initialText=""
        onInsert={handleLinkInsert}
        onClose={() => setShowLinkSheet(false)}
      />
      {onScheduleSend && (
        <ScheduleMessageSheet
          visible={showScheduleSheet}
          onSchedule={async (date) => {
            const markdown = latestMarkdownRef.current.trim();
            if (markdown) {
              onScheduleSend(markdown, date);
              editorRef.current?.clearContent();
              setEditorHeight(36);
              clearDraft();
              setShowScheduleSheet(false);
            }
          }}
          onClose={() => setShowScheduleSheet(false)}
        />
      )}
    </View>
  );
});

const staticStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  circleButton32: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  editorContainer: {
    flex: 1,
    minHeight: 36,
    maxHeight: 160,
  },
  actionRowSpacer: {
    flex: 1,
  },
});

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    editBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.surfaceTertiary,
    },
    editBannerLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.brand.primary,
    },
    editCancelText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textMuted,
    },
    filePreviewBorder: {
      borderTopWidth: 1,
      borderColor: theme.colors.borderDefault,
    },
    sendArrowText: {
      color: theme.colors.headerText,
      fontWeight: "bold",
      fontSize: 16,
    },
    inputRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 8,
      alignItems: "flex-end",
      backgroundColor: theme.colors.surface,
    },
    inputArea: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: theme.colors.surface,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    inputCapsule: {
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceTertiary,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    attachmentButtonText: {
      fontSize: 18,
      color: theme.colors.textMuted,
    },
    formattingToggleActive: {
      backgroundColor: theme.brand.primary,
    },
    formattingToggleInactive: {
      backgroundColor: TRANSPARENT,
    },
    formattingToggleTextActive: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.headerText,
    },
    formattingToggleTextInactive: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
  });
