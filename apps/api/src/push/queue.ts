interface PendingPush {
  timer: ReturnType<typeof setTimeout>;
  channelId: string;
}

const pending = new Map<string, PendingPush>();

function key(messageId: string, userId: string): string {
  return `${messageId}:${userId}`;
}

export function schedulePush(
  messageId: string,
  userId: string,
  channelId: string,
  delayMs: number,
  task: () => Promise<void>,
): void {
  const k = key(messageId, userId);

  // Don't double-schedule
  if (pending.has(k)) return;

  const timer = setTimeout(() => {
    pending.delete(k);
    task().catch((err) => console.error("[push-queue] delivery failed:", err));
  }, delayMs);

  pending.set(k, { timer, channelId });
}

export function cancelPushesForUser(userId: string, channelId: string): void {
  for (const [k, entry] of pending) {
    if (k.endsWith(`:${userId}`) && entry.channelId === channelId) {
      clearTimeout(entry.timer);
      pending.delete(k);
    }
  }
}

/** Number of pending pushes (for testing) */
export function pendingCount(): number {
  return pending.size;
}
