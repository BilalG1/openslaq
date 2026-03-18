import { Home, MessageCircle, Bell, MoreHorizontal } from "lucide-react-native";

interface IconProps {
  color: string;
  size?: number;
}

export function HomeIcon({ color, size = 24 }: IconProps) {
  return <Home size={size} color={color} strokeWidth={2} />;
}

export function DmsIcon({ color, size = 24 }: IconProps) {
  return <MessageCircle size={size} color={color} strokeWidth={2} />;
}

export function ActivityIcon({ color, size = 24 }: IconProps) {
  return <Bell size={size} color={color} strokeWidth={2} />;
}

export function MoreIcon({ color, size = 24 }: IconProps) {
  return <MoreHorizontal size={size} color={color} strokeWidth={2} />;
}
