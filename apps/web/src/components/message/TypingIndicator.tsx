import type { TypingUser } from "../../hooks/chat/useTypingTracking";

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

function formatTypingLabel(users: TypingUser[]): string {
  const first = users[0]!;
  if (users.length === 1) {
    return `${first.displayName} is typing`;
  }
  const second = users[1]!;
  if (users.length === 2) {
    return `${first.displayName} and ${second.displayName} are typing`;
  }
  return `${first.displayName} and ${users.length - 1} others are typing`;
}

function TypingDots() {
  return (
    <span data-testid="typing-dots" className="ml-0.5 inline-flex gap-[2px]">
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
    </span>
  );
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const hasTypers = typingUsers.length > 0;
  return (
    <div
      data-testid="typing-indicator"
      className={hasTypers ? "px-4 py-1 text-xs italic text-muted h-6" : "h-0 overflow-hidden"}
    >
      {hasTypers && (
        <>
          {formatTypingLabel(typingUsers)}
          <TypingDots />
        </>
      )}
    </div>
  );
}
