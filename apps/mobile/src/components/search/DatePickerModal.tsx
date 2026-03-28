import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  StyleSheet,
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
import { WHITE } from "@/theme/constants";

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const date = new Date(value + "T00:00:00");
  return !isNaN(date.getTime());
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfYearISO(): string {
  return `${new Date().getFullYear()}-01-01`;
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
    <BottomSheet visible={visible} onClose={handleClose} title="Date Range" avoidKeyboard testID="date-picker-modal">
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        From (YYYY-MM-DD)
      </Text>
      <TextInput
        testID="date-picker-from"
        accessibilityLabel="From date"
        accessibilityHint="Enter start date in YYYY-MM-DD format"
        placeholder={startOfYearISO()}
        placeholderTextColor={theme.colors.textFaint}
        value={fromDate}
        onChangeText={setFromDate}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        style={[styles.dateInput, {
          borderColor: theme.colors.borderDefault,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surfaceSecondary,
        }]}
      />

      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        To (YYYY-MM-DD)
      </Text>
      <TextInput
        testID="date-picker-to"
        accessibilityLabel="To date"
        accessibilityHint="Enter end date in YYYY-MM-DD format"
        placeholder={todayISO()}
        placeholderTextColor={theme.colors.textFaint}
        value={toDate}
        onChangeText={setToDate}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        style={[styles.dateInput, {
          borderColor: theme.colors.borderDefault,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surfaceSecondary,
        }]}
      />

      {error && (
        <Text
          testID="date-picker-error"
          style={[styles.errorText, { color: theme.colors.dangerText }]}
        >
          {error}
        </Text>
      )}

      <Pressable
        testID="date-picker-apply"
        accessibilityRole="button"
        accessibilityLabel="Apply date range"
        accessibilityHint="Applies the selected date range filter"
        onPress={handleApply}
        style={[styles.applyButton, { backgroundColor: theme.brand.primary }]}
      >
        <Text style={styles.applyButtonText}>Apply</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  errorText: {
    marginBottom: 12,
    fontSize: 14,
  },
  applyButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: WHITE,
    fontWeight: "600",
    fontSize: 16,
  },
});
