import { useState, useCallback } from "react";
import { useScheduledMessages } from "../../hooks/chat/useScheduledMessages";
import { updateScheduledMessageOp, deleteScheduledMessageOp } from "@openslaq/client-core";
import type { ScheduledMessageItem } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { ScheduleMessageDialog } from "../message/ScheduleMessageDialog";

interface ScheduledMessagesViewProps {
  workspaceSlug: string;
  onNavigateToChannel: (channelId: string, messageId?: string) => void;
}

export function ScheduledMessagesView({
  workspaceSlug,
  onNavigateToChannel,
}: ScheduledMessagesViewProps) {
  const { data, loading, error, removeItem, updateItem, refresh } = useScheduledMessages(workspaceSlug);
  const auth = useAuthProvider();
  const { state, dispatch } = useChatStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const deps = { api, auth, dispatch, getState: () => state };

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteScheduledMessageOp(deps, { workspaceSlug, id });
        removeItem(id);
      } catch {
        // ignore
      }
    },
    [workspaceSlug, auth, dispatch, state], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleStartEdit = useCallback((item: ScheduledMessageItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  }, []);

  const handleSaveEdit = useCallback(
    async (id: string) => {
      try {
        const updated = await updateScheduledMessageOp(deps, {
          workspaceSlug,
          id,
          content: editContent,
        });
        updateItem(id, updated);
        setEditingId(null);
      } catch {
        // ignore
      }
    },
    [workspaceSlug, editContent, auth, dispatch, state], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleReschedule = useCallback(
    async (scheduledFor: Date) => {
      if (!rescheduleId) return;
      try {
        const updated = await updateScheduledMessageOp(deps, {
          workspaceSlug,
          id: rescheduleId,
          scheduledFor: scheduledFor.toISOString(),
        });
        updateItem(rescheduleId, updated);
        setRescheduleId(null);
        void refresh();
      } catch {
        // ignore
      }
    },
    [rescheduleId, workspaceSlug, auth, dispatch, state], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleViewSentMessage = useCallback(
    (item: ScheduledMessageItem) => {
      if (item.sentMessageId) {
        onNavigateToChannel(item.channelId, item.sentMessageId);
      }
    },
    [onNavigateToChannel],
  );

  return (
    <div className="flex flex-col h-full" data-testid="scheduled-messages-view">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <h2 className="text-lg font-bold text-primary">Scheduled Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && !data && (
          <div className="flex items-center justify-center py-12 text-faint">
            Loading scheduled messages...
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-danger-text">
            {error}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-faint" data-testid="scheduled-empty-state">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="text-lg font-medium">No scheduled messages</span>
            <span className="text-sm mt-1">Schedule a message to send later</span>
          </div>
        )}

        {data?.map((item) => (
          <ScheduledMessageRow
            key={item.id}
            item={item}
            isEditing={editingId === item.id}
            editContent={editContent}
            onEditContentChange={setEditContent}
            onStartEdit={() => handleStartEdit(item)}
            onSaveEdit={() => handleSaveEdit(item.id)}
            onCancelEdit={() => setEditingId(null)}
            onReschedule={() => setRescheduleId(item.id)}
            onDelete={() => handleDelete(item.id)}
            onViewSent={() => handleViewSentMessage(item)}
          />
        ))}
      </div>

      <ScheduleMessageDialog
        open={rescheduleId !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleId(null);
        }}
        onSchedule={handleReschedule}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    sent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${styles[status] ?? ""}`} data-testid={`status-${status}`}>
      {status}
    </span>
  );
}

function ScheduledMessageRow({
  item,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onReschedule,
  onDelete,
  onViewSent,
}: {
  item: ScheduledMessageItem;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onReschedule: () => void;
  onDelete: () => void;
  onViewSent: () => void;
}) {
  const scheduledDate = new Date(item.scheduledFor).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div data-testid={`scheduled-message-${item.id}`} className="border-b border-border-default">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-raised">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold text-secondary">#{item.channelName}</span>
          <StatusBadge status={item.status} />
        </div>
        <span className="text-[12px] text-faint">
          <svg className="w-3 h-3 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {scheduledDate}
        </span>
      </div>
      <div className="px-4 py-3">
        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-border-default rounded bg-surface text-primary resize-none"
              rows={3}
              data-testid="edit-scheduled-content"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={onSaveEdit}
                className="px-3 py-1 text-xs rounded bg-slaq-blue text-white border-none cursor-pointer"
                data-testid="save-edit-scheduled"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-3 py-1 text-xs rounded border border-border-default bg-transparent text-secondary cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-primary whitespace-pre-wrap">{item.content}</p>
        )}

        {item.failureReason && (
          <div className="mt-2 text-xs text-danger-text">
            Failed: {item.failureReason}
          </div>
        )}

        <div className="flex gap-3 mt-2">
          {item.status === "pending" && !isEditing && (
            <>
              <button
                type="button"
                onClick={onStartEdit}
                className="text-[12px] text-link hover:underline bg-transparent border-none cursor-pointer"
                data-testid={`edit-scheduled-${item.id}`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onReschedule}
                className="text-[12px] text-link hover:underline bg-transparent border-none cursor-pointer"
                data-testid={`reschedule-${item.id}`}
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-[12px] text-danger-text hover:underline bg-transparent border-none cursor-pointer"
                data-testid={`delete-scheduled-${item.id}`}
              >
                Delete
              </button>
            </>
          )}
          {item.status === "sent" && item.sentMessageId && (
            <button
              type="button"
              onClick={onViewSent}
              className="text-[12px] text-link hover:underline bg-transparent border-none cursor-pointer"
              data-testid={`view-sent-${item.id}`}
            >
              View message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
