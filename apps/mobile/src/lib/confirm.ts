import { Alert } from "react-native";

export function confirmAction(
  title: string,
  onConfirm: () => void | Promise<void>,
  options?: { message?: string; confirmLabel?: string; destructive?: boolean },
): void {
  const { message = "Are you sure?", confirmLabel = "Confirm", destructive = false } = options ?? {};
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : "default",
      onPress: () => {
        void Promise.resolve(onConfirm()).catch((e: unknown) => {
          Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong");
        });
      },
    },
  ]);
}

export function confirmDelete(
  title: string,
  onDelete: () => void | Promise<void>,
  message = "Are you sure?",
): void {
  confirmAction(title, onDelete, { message, confirmLabel: "Delete", destructive: true });
}
