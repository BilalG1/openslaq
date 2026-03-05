interface HuddleIndicatorProps {
  channelId: string;
  participantCount: number;
}

export function HuddleIndicator({ channelId, participantCount }: HuddleIndicatorProps) {
  return (
    <span className="flex items-center gap-0.5 text-green-400" data-testid={`huddle-indicator-${channelId}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 8.464a5 5 0 000 7.072" />
      </svg>
      <span className="text-[10px]">{participantCount}</span>
    </span>
  );
}
