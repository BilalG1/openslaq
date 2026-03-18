import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
} from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (fromDate?: string, toDate?: string) => void;
  initialFrom?: string;
  initialTo?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const date = new Date(value + "T00:00:00");
  return !isNaN(date.getTime());
}

export function DatePickerModal({ visible, onClose, onApply, initialFrom, initialTo }: Props) {
  const { theme } = useMobileTheme();
  const [fromDate, setFromDate] = useState(initialFrom ?? "");
  const [toDate, setToDate] = useState(initialTo ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    if (fromDate && !isValidDate(fromDate)) {
      setError("Invalid 'From' date. Use YYYY-MM-DD format.");
      return;
    }
    if (toDate && !isValidDate(toDate)) {
      setError("Invalid 'To' date. Use YYYY-MM-DD format.");
      return;
    }
    if (fromDate && toDate && fromDate > toDate) {
      setError("'From' date must be before 'To' date.");
      return;
    }
    setError(null);
    onApply(fromDate || undefined, toDate || undefined);
  };

  const handleClose = () => {
    setFromDate(initialFrom ?? "");
    setToDate(initialTo ?? "");
    setError(null);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Date Range" testID="date-picker-modal">
      <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 }}>
        From (YYYY-MM-DD)
      </Text>
      <TextInput
        testID="date-picker-from"
        placeholder="2025-01-01"
        placeholderTextColor={theme.colors.textFaint}
        value={fromDate}
        onChangeText={setFromDate}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        style={{
          borderWidth: 1,
          borderColor: theme.colors.borderDefault,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surfaceSecondary,
          marginBottom: 12,
        }}
      />

      <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 }}>
        To (YYYY-MM-DD)
      </Text>
      <TextInput
        testID="date-picker-to"
        placeholder="2025-12-31"
        placeholderTextColor={theme.colors.textFaint}
        value={toDate}
        onChangeText={setToDate}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        style={{
          borderWidth: 1,
          borderColor: theme.colors.borderDefault,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surfaceSecondary,
          marginBottom: 12,
        }}
      />

      {error && (
        <Text
          testID="date-picker-error"
          style={{ color: theme.colors.dangerText, marginBottom: 12, fontSize: 14 }}
        >
          {error}
        </Text>
      )}

      <Pressable
        testID="date-picker-apply"
        onPress={handleApply}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          backgroundColor: theme.brand.primary,
          borderRadius: 8,
          paddingVertical: 12,
          alignItems: "center",
        })}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Apply</Text>
      </Pressable>
    </BottomSheet>
  );
}
