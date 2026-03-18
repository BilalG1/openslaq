import { useState, useCallback, useMemo } from "react";
import { Clock } from "lucide-react";
import { useScheduledMessages } from "../../hooks/chat/useScheduledMessages";
import { updateScheduledMessageOp, deleteScheduledMessageOp } from "@openslaq/client-core";
import type { ScheduledMessageItem } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { ScheduleMessageDialog } from "../message/ScheduleMessageDialog";
import { EmptyState, LoadingState, ErrorState } from "../ui";

interface ScheduledTabProps {
  workspaceSlug: string;
}

type TimeGroup = "Today" | "Tomorrow" | "This Week" | "Later";

function getTimeGroup(scheduledFor: string): TimeGroup {
  const now = new Date();
  const date = new Date(scheduledFor);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  // End of this week (Sunday)
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

  if (date >= today && date < tomorrow) return "Today";
  if (date >= tomorrow && date < dayAfterTomorrow) return "Tomorrow";
  if (date >= dayAfterTomorrow && date < endOfWeek) return "This Week";
  return "Later";
}

const GROUP_ORDER: TimeGroup[] = ["Today", "Tomorrow", "This Week", "Later"];

function StatusDot({ status }: { status: string }) {
  const color = status === "failed" ? "bg-red-500" : "bg-yellow-500";
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color}`}
      data-testid={`status-${status}`}
    />
  );
}

export function ScheduledTab({ workspaceSlug }: ScheduledTabProps) {
  const { data, loading, error, removeItem, updateItem, refresh } = useScheduledMessages(workspaceSlug);
  const auth = useAuthProvider();
  const { state, dispatch } = useChatStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const deps = { api, auth, dispatch, getState: () => state };

  // Filter to pending + failed only
  const items = data?.filter((item) => item.status === "pending" || item.status === "failed") ?? null;

  const grouped = useMemo(() => {
    if (!items) return null;
    const groups: Record<TimeGroup, ScheduledMessageItem[]> = {
      Today: [],
      Tomorrow: [],
      "This Week": [],
      Later: [],
    };
    for (const item of items) {
      groups[getTimeGroup(item.scheduledFor)].push(item);
    }
    return groups;
  }, [items]);

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

  if (loading && !data) {
    return <LoadingState label="Loading scheduled messages..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (items && items.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="w-full h-full" strokeWidth={1.5} />}
        title="No scheduled messages"
        subtitle="Schedule a message to send later"
        data-testid="scheduled-empty-state"
      />
    );
  }

  return (
    <>
      <div data-testid="scheduled-list" className="space-y-6 p-4">
        {grouped &&
          GROUP_ORDER.map((group) => {
            const groupItems = grouped[group];
            if (groupItems.length === 0) return null;
            return (
              <div key={group}>
                <div className="sticky top-0 z-10 bg-surface py-2 mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">
                    {group}
                  </h3>
                </div>
                <div className="space-y-3">
                  {groupItems.map((item) => {
                    const scheduledTime = new Date(item.scheduledFor).toLocaleString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const scheduledDate = new Date(item.scheduledFor).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border-default bg-surface-raised p-4"
                        data-testid={`scheduled-message-${item.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-[13px]">
                            <span className="font-semibold text-secondary">#{item.channelName}</span>
                            <StatusDot status={item.status} />
                          </div>
                          <div className="flex items-center gap-1.5 text-[13px] text-secondary font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{group === "Today" || group === "Tomorrow" ? scheduledTime : scheduledDate}</span>
                          </div>
                        </div>

                        {editingId === item.id ? (
                          <div>
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-border-default rounded bg-surface text-primary resize-none"
                              rows={3}
                              data-testid="edit-scheduled-content"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.id)}
                                className="px-3 py-1 text-xs rounded bg-slaq-blue text-white border-none cursor-pointer"
                                data-testid="save-edit-scheduled"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
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

                        <div className="flex gap-3 mt-3">
                          {item.status === "pending" && editingId !== item.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="text-[12px] text-link hover:underline bg-transparent border-none cursor-pointer"
                                data-testid={`edit-scheduled-${item.id}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setRescheduleId(item.id)}
                                className="text-[12px] text-link hover:underline bg-transparent border-none cursor-pointer"
                                data-testid={`reschedule-${item.id}`}
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="text-[12px] text-danger-text hover:underline bg-transparent border-none cursor-pointer"
                                data-testid={`delete-scheduled-${item.id}`}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      <ScheduleMessageDialog
        open={rescheduleId !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleId(null);
        }}
        onSchedule={handleReschedule}
      />
    </>
  );
}
