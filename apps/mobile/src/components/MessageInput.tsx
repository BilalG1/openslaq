import { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, Text, ActivityIndicator } from "react-native";
import { Circle, Mic } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import { useDraftMessage } from "@/hooks/useDraftMessage";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { RichTextToolbar } from "./RichTextToolbar";
import { LinkInsertSheet } from "./LinkInsertSheet";
import { ScheduleMessageSheet } from "./ScheduleMessageSheet";
import { FilePreviewStrip } from "./FilePreviewStrip";
import { MentionSuggestionList } from "./MentionSuggestionList";
import type { MentionSuggestionItem } from "./MentionSuggestionList";
import { SlashCommandSuggestionList } from "./SlashCommandSuggestionList";
import { WebViewEditor } from "./WebViewEditor";
import type { WebViewEditorRef, FormattingState } from "./WebViewEditor";
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
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [editorHeight, setEditorHeight] = useState(36);
  const [isEmpty, setIsEmpty] = useState(true);
  const [formattingState, setFormattingState] = useState<FormattingState>({
    bold: false,
    italic: false,
    strike: false,
    code: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
  });
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const { theme } = useMobileTheme();

  const editorRef = useRef<WebViewEditorRef>(null);
  const latestMarkdownRef = useRef("");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorReadyRef = useRef(false);

  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  const { draft, saveDraft, clearDraft, isLoaded: draftLoaded } = useDraftMessage(
    editingMessage ? undefined : draftKey,
  );
  const draftRestoredRef = useRef(false);

  const handleReady = useCallback(() => {
    editorReadyRef.current = true;

    // Apply theme
    editorRef.current?.focus("end");

    // Editing message takes priority over draft restoration
    if (editingMessage) {
      editorRef.current?.setContent(editingMessage.content);
      editorRef.current?.focus("end");
      return;
    }

    // Restore draft
    if (draftLoaded && draft && !draftRestoredRef.current) {
      draftRestoredRef.current = true;
      editorRef.current?.setContent(draft);
    }
  }, [draftLoaded, draft, editingMessage]);

  // Restore draft when it loads after editor is ready
  useEffect(() => {
    if (draftLoaded && draft && !draftRestoredRef.current && editorReadyRef.current) {
      draftRestoredRef.current = true;
      editorRef.current?.setContent(draft);
    }
  }, [draftLoaded, draft]);

  // Load editing message content
  useEffect(() => {
    if (editingMessage && editorReadyRef.current) {
      editorRef.current?.setContent(editingMessage.content);
      editorRef.current?.focus("end");
    }
  }, [editingMessage]);

  // Clear typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const handleContentChange = useCallback(
    (info: { markdown: string; text: string; isEmpty: boolean }) => {
      latestMarkdownRef.current = info.markdown;
      setIsEmpty(info.isEmpty);

      // Draft saving
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
    setEditorHeight(Math.min(Math.max(height, 36), 120));
  }, []);

  const canSend = !isEmpty || pendingFiles.length > 0;

  // Mention suggestions
  const mentionSuggestions = mentionQuery !== null
    ? members
        .filter((m) => m.displayName.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 10)
    : [];

  // Slash suggestions
  const slashSuggestions = slashQuery !== null
    ? slashCommands
        .filter((c) => c.name.toLowerCase().startsWith(slashQuery.toLowerCase()))
        .slice(0, 10)
    : [];

  const handleMentionSelect = useCallback(
    (item: MentionSuggestionItem) => {
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

    // Handle slash commands
    if (markdown.startsWith("/") && onSlashCommand) {
      const spaceIndex = markdown.indexOf(" ");
      const command = spaceIndex > 0 ? markdown.slice(1, spaceIndex) : markdown.slice(1);
      const args = spaceIndex > 0 ? markdown.slice(spaceIndex + 1).trim() : "";
      haptics.light();
      onSlashCommand(command, args);
      editorRef.current?.clearContent();
      setEditorHeight(36);
      clearDraft();
      return;
    }

    haptics.light();
    onSend(markdown);
    editorRef.current?.clearContent();
    setEditorHeight(36);
    clearDraft();
  }, [uploading, editingMessage, onSaveEdit, onCancelEdit, pendingFiles.length, onSlashCommand, onSend, clearDraft]);

  const handleCancel = () => {
    onCancelEdit?.();
    editorRef.current?.clearContent();
    setEditorHeight(36);
    setMentionQuery(null);
    setSlashQuery(null);
  };

  const handleLinkInsert = useCallback(
    (_displayText: string, url: string) => {
      editorRef.current?.setLink(url);
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

  const showMicButton = onSendVoiceMessage && !editingMessage && !canSend && !isRecording;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <View style={{ position: "relative" }}>
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
        <RichTextToolbar
          editor={editorRef.current!}
          formattingState={formattingState}
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
          style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingVertical: 8, alignItems: 'flex-end', borderTopWidth: 1, borderColor: theme.colors.borderDefault, backgroundColor: theme.colors.surface }}
        >
          {/* Left capsule: attach + rich text editor + Aa */}
          <View
            testID="input-capsule"
            style={{ borderRadius: 24, backgroundColor: theme.colors.surfaceTertiary, flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, minHeight: editorHeight + 8 }}
          >
            {onAddAttachment && (
              <Pressable
                testID="attachment-button"
                style={{ width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' }}
                onPress={onAddAttachment}
              >
                <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>+</Text>
              </Pressable>
            )}
            <View
              testID="message-input"
              style={{ flex: 1, height: editorHeight, minHeight: 36, maxHeight: 120 }}
            >
              <WebViewEditor
                ref={editorRef}
                placeholder={placeholder}
                onContentChange={handleContentChange}
                onHeightChange={handleHeightChange}
                onFormattingState={setFormattingState}
                onMentionQuery={setMentionQuery}
                onSlashQuery={setSlashQuery}
                onReady={handleReady}
              />
            </View>
            <Pressable
              testID="formatting-toggle"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: showToolbar ? theme.brand.primary : 'transparent',
              }}
              onPress={() => setShowToolbar((v) => !v)}
            >
              <Text
                style={{ fontSize: 14, fontWeight: '600', color: showToolbar ? "#fff" : theme.colors.textMuted }}
              >
                Aa
              </Text>
            </Pressable>
          </View>
          {/* Right side: send/mic button */}
          {showMicButton ? (
            <Pressable
              testID="mic-button"
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceTertiary }}
              onPress={() => void handleStartRecording()}
            >
              <Mic size={20} color={theme.colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable
              testID="message-send"
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
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
            >
              {uploading ? (
                <ActivityIndicator testID="upload-spinner" size="small" color="#fff" />
              ) : (
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>↑</Text>
              )}
            </Pressable>
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
              setShowScheduleSheet(false);
            }
          }}
          onClose={() => setShowScheduleSheet(false)}
        />
      )}
    </View>
  );
}
