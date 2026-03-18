import { Alert } from "react-native";

/**
 * Show a destructive confirmation dialog with Cancel / Delete buttons.
 */
export function confirmDelete(
  title: string,
  onDelete: () => void | Promise<void>,
  message = "Are you sure?",
): void {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => onDelete() },
  ]);
}
