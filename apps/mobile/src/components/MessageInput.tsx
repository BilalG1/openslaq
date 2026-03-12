import { useCallback, useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable, Text, ActivityIndicator, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from "react-native";
import { Circle, Mic } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { applyMarkdownFormat, type FormatType } from "@/utils/markdown-formatting";
import { useMentionAutocomplete, type MentionSuggestionItem } from "@/hooks/useMentionAutocomplete";
import { useSlashCommandAutocomplete } from "@/hooks/useSlashCommandAutocomplete";
import { useDraftMessage } from "@/hooks/useDraftMessage";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { MentionSuggestionList } from "./MentionSuggestionList";
import { SlashCommandSuggestionList } from "./SlashCommandSuggestionList";
import { FormattingToolbar } from "./FormattingToolbar";
import { LinkInsertSheet } from "./LinkInsertSheet";
import { ScheduleMessageSheet } from "./ScheduleMessageSheet";
import { FilePreviewStrip } from "./FilePreviewStrip";
import type { PendingFile } from "@/hooks/useFileUpload";
import type { SlashCommandDefinition } from "@openslaq/shared";

interface Props {
  onSend: (content: string) => void;
  placeholder?: string;
  editingMessage?: { id: string; content: string } | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, content: string) => void;
  members?: MentionSuggestionItem[];
  onTyping?: () => void;
  pendingFiles?: PendingFile[];
  onAddAttachment?: () => void;
  onRemoveFile?: (id: string) => void;
  uploading?: boolean;
  slashCommands?: SlashCommandDefinition[];
  onSlashCommand?: (command: string, args: string) => void;
  onScheduleSend?: (content: string, scheduledFor: Date) => void;
  onSendVoiceMessage?: (uri: string, durationMs: number) => void;
  draftKey?: string;
}

export function MessageInput({
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
}: Props) {
  const [text, setText] = useState("");
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const { theme } = useMobileTheme();
  const inputRef = useRef<TextInput>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  const { draft, saveDraft, clearDraft, isLoaded: draftLoaded } = useDraftMessage(
    editingMessage ? undefined : draftKey,
  );
  const draftRestoredRef = useRef(false);

  useEffect(() => {
    if (draftLoaded && draft && !draftRestoredRef.current) {
      draftRestoredRef.current = true;
      setText(draft);
    }
  }, [draftLoaded, draft]);

  const { suggestions, isActive: mentionActive, onSelectionChange, insertMention } =
    useMentionAutocomplete({ text, members });

  const {
    suggestions: slashSuggestions,
    isActive: slashActive,
    insertCommand,
  } = useSlashCommandAutocomplete({ text, commands: slashCommands });

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const canSend = text.trim().length > 0 || pendingFiles.length > 0;

  const handleSend = () => {
    if (uploading) return;

    if (editingMessage && onSaveEdit) {
      const trimmed = text.trim();
      if (trimmed && trimmed !== editingMessage.content) {
        haptics.light();
        onSaveEdit(editingMessage.id, trimmed);
      }
      onCancelEdit?.();
      setText("");
      return;
    }

    if (!canSend) return;

    const trimmed = text.trim();
    if (trimmed.startsWith("/") && onSlashCommand) {
      const spaceIndex = trimmed.indexOf(" ");
      const command = spaceIndex > 0 ? trimmed.slice(1, spaceIndex) : trimmed.slice(1);
      const args = spaceIndex > 0 ? trimmed.slice(spaceIndex + 1).trim() : "";
      haptics.light();
      onSlashCommand(command, args);
      setText("");
      clearDraft();
      return;
    }

    haptics.light();
    onSend(trimmed);
    setText("");
    clearDraft();
  };

  const handleCancel = () => {
    onCancelEdit?.();
    setText("");
  };

  const handleSelectMention = useCallback(
    (item: MentionSuggestionItem) => {
      const result = insertMention(item);
      setText(result.text);
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: result.cursorPosition, end: result.cursorPosition },
        });
      }, 0);
    },
    [insertMention],
  );

  const handleSelectSlashCommand = useCallback(
    (item: SlashCommandDefinition) => {
      const result = insertCommand(item);
      setText(result.text);
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: result.cursorPosition, end: result.cursorPosition },
        });
      }, 0);
    },
    [insertCommand],
  );

  const handleFormat = useCallback(
    (format: FormatType) => {
      const result = applyMarkdownFormat(text, selectionRef.current, format);
      setText(result.text);
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: result.selection,
        });
      }, 0);
    },
    [text],
  );

  const handleLinkInsert = useCallback(
    (displayText: string, url: string) => {
      const linkMd = `[${displayText}](${url})`;
      const { start, end } = selectionRef.current;
      const before = text.slice(0, start);
      const after = text.slice(end);
      const newText = before + linkMd + after;
      const newCursor = start + linkMd.length;
      setText(newText);
      setShowLinkSheet(false);
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: newCursor, end: newCursor },
        });
      }, 0);
    },
    [text],
  );

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      selectionRef.current = e.nativeEvent.selection;
      onSelectionChange(e);
    },
    [onSelectionChange],
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

  const showMicButton = onSendVoiceMessage && !editingMessage && !canSend && !isRecording;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <View style={{ position: "relative" }}>
      {slashActive && slashSuggestions.length > 0 && (
        <SlashCommandSuggestionList
          suggestions={slashSuggestions}
          onSelect={handleSelectSlashCommand}
        />
      )}
      {!slashActive && mentionActive && suggestions.length > 0 && (
        <MentionSuggestionList
          suggestions={suggestions}
          onSelect={handleSelectMention}
        />
      )}
      {editingMessage && (
        <View
          testID="edit-banner"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: theme.colors.borderDefault, backgroundColor: theme.colors.surfaceTertiary }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.brand.primary }}>
            Editing message
          </Text>
          <Pressable testID="edit-cancel" onPress={handleCancel} hitSlop={8}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.colors.textMuted }}>
              Cancel
            </Text>
          </Pressable>
        </View>
      )}
      {pendingFiles.length > 0 && onRemoveFile && (
        <View style={{ borderTopWidth: 1, borderColor: theme.colors.borderDefault }}>
          <FilePreviewStrip files={pendingFiles} onRemove={onRemoveFile} />
        </View>
      )}
      {showToolbar && (
        <FormattingToolbar
          onFormat={handleFormat}
          onLinkPress={() => setShowLinkSheet(true)}
        />
      )}
      {isRecording ? (
        <View
          testID="recording-bar"
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: theme.colors.borderDefault, backgroundColor: theme.colors.surface }}
        >
          <Pressable testID="recording-cancel" onPress={() => void handleCancelRecording()}>
            <Text style={{ fontSize: 14, color: theme.colors.textMuted }}>Cancel</Text>
          </Pressable>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Circle size={12} color="#E53935" fill="#E53935" style={{ marginRight: 6 }} />
            <Text testID="recording-timer" style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary }}>
              {formatDuration(duration)}
            </Text>
          </View>
          <Pressable
            testID="recording-stop-send"
            style={{ width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brand.primary }}
            onPress={() => void handleStopAndSend()}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>↑</Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: theme.colors.borderDefault, backgroundColor: theme.colors.surface }}
        >
          {onAddAttachment && (
            <Pressable
              testID="attachment-button"
              style={{ width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginRight: 4, backgroundColor: theme.colors.surfaceTertiary }}
              onPress={onAddAttachment}
            >
              <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>+</Text>
            </Pressable>
          )}
          <Pressable
            testID="formatting-toggle"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 4,
              backgroundColor: showToolbar ? theme.brand.primary : theme.colors.surfaceTertiary,
            }}
            onPress={() => setShowToolbar((v) => !v)}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: showToolbar ? "#fff" : theme.colors.textMuted }}
            >
              Aa
            </Text>
          </Pressable>
          <TextInput
            ref={inputRef}
            testID="message-input"
            style={{
              flex: 1,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 8,
              fontSize: 16,
              maxHeight: 96,
              backgroundColor: theme.colors.surfaceTertiary,
              color: theme.colors.textPrimary,
            }}
            placeholderTextColor={theme.colors.textMuted}
            placeholder={placeholder}
            value={text}
            onChangeText={(value) => {
              setText(value);
              onTyping?.();
              if (!editingMessage) saveDraft(value);
            }}
            multiline
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            onSelectionChange={handleSelectionChange}
          />
          {showMicButton && (
            <Pressable
              testID="mic-button"
              style={{ marginLeft: 4, width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceTertiary }}
              onPress={() => void handleStartRecording()}
            >
              <Mic size={18} color={theme.colors.textMuted} />
            </Pressable>
          )}
          <Pressable
            testID="message-send"
            style={({ pressed }) => ({
              marginLeft: 8,
              width: 36,
              height: 36,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: canSend && !uploading ? theme.brand.primary : theme.colors.borderStrong,
              opacity: pressed ? 0.85 : 1,
            })}
            onPress={handleSend}
            onLongPress={
              onScheduleSend && !editingMessage && canSend && !uploading
                ? () => { haptics.medium(); setShowScheduleSheet(true); }
                : undefined
            }
            disabled={!canSend || uploading}
          >
            {uploading ? (
              <ActivityIndicator testID="upload-spinner" size="small" color="#fff" />
            ) : (
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>↑</Text>
            )}
          </Pressable>
        </View>
      )}
      <LinkInsertSheet
        visible={showLinkSheet}
        initialText={text.slice(selectionRef.current.start, selectionRef.current.end)}
        onInsert={handleLinkInsert}
        onClose={() => setShowLinkSheet(false)}
      />
      {onScheduleSend && (
        <ScheduleMessageSheet
          visible={showScheduleSheet}
          onSchedule={(date) => {
            onScheduleSend(text.trim(), date);
            setText("");
            setShowScheduleSheet(false);
          }}
          onClose={() => setShowScheduleSheet(false)}
        />
      )}
    </View>
  );
}
