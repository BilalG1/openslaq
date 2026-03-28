import { Headphones } from "lucide-react";

interface HuddleIndicatorProps {
  channelId: string;
  participantCount: number;
}

export function HuddleIndicator({ channelId, participantCount }: HuddleIndicatorProps) {
  return (
    <span className="flex items-center gap-0.5 text-green-400" data-testid={`huddle-indicator-${channelId}`}>
      <Headphones className="w-3 h-3" />
      <span className="text-[10px]">{participantCount}</span>
    </span>
  );
}
