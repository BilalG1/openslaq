import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";

import { TRANSPARENT } from "@/theme/constants";

interface Props {
  visible: boolean;
  onSchedule: (scheduledFor: Date) => void;
  onClose: () => void;
}

function roundToNext5Min(date: Date): Date {
  const ms = date.getTime();
  const fiveMin = 5 * 60 * 1000;
  return new Date(Math.ceil(ms / fiveMin) * fiveMin);
}

function formatPresetTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScheduleMessageSheet({ visible, onSchedule, onClose }: Props) {
  const { theme } = useMobileTheme();
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("09:00");

  const presetDefs = [
    { label: "In 20 minutes", offsetMs: 20 * 60_000 },
    { label: "In 1 hour", offsetMs: 60 * 60_000 },
    { label: "In 3 hours", offsetMs: 3 * 60 * 60_000 },
    { label: "Tomorrow at 9:00 AM", offsetMs: null as null, kind: "tomorrow" as const },
    { label: "Next Monday at 9:00 AM", offsetMs: null as null, kind: "nextMonday" as const },
  ];

  function computePresetTime(def: (typeof presetDefs)[number]): Date {
    const now = new Date();
    if (def.offsetMs != null) {
      return roundToNext5Min(new Date(now.getTime() + def.offsetMs));
    }
    if (def.kind === "tomorrow") {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    }
    // nextMonday
    const d = new Date(now);
    const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    d.setHours(9, 0, 0, 0);
    return d;
  }

  // Display times for the preset labels — recalculated when the sheet opens
  const presets = useMemo(
    () => presetDefs.map((def) => ({ ...def, displayTime: computePresetTime(def) })),
    [visible],
  );

  const handlePreset = (def: (typeof presetDefs)[number]) => {
    // Compute the actual schedule time at tap time, not at render time
    onSchedule(computePresetTime(def));
    setShowCustom(false);
  };

  const handleCustomSubmit = () => {
    if (!customDate || !customTime) return;
    const date = new Date(`${customDate}T${customTime}`);
    if (Number.isNaN(date.getTime())) {
      Alert.alert("Invalid Date", "Please enter a valid date and time.");
      return;
    }
    if (date.getTime() <= Date.now() + 60_000) {
      Alert.alert("Invalid Time", "Scheduled time must be at least 1 minute in the future.");
      return;
    }
    onSchedule(date);
    setShowCustom(false);
    setCustomDate("");
    setCustomTime("09:00");
  };

  const handleClose = () => {
    setShowCustom(false);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Schedule message" testID="schedule-sheet-content">
      <View style={[styles.divider, { backgroundColor: theme.colors.borderDefault }]} />

      {presets.map((preset) => (
        <Pressable
          key={preset.label}
          testID={`schedule-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
          onPress={() => handlePreset(preset)}
          accessibilityRole="button"
          accessibilityLabel={preset.label}
          accessibilityHint={`Schedules message ${preset.label.toLowerCase()}`}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT,
          })}
        >
          <Text style={[styles.presetLabel, { color: theme.colors.textPrimary }]}>{preset.label}</Text>
          <Text style={[styles.presetTime, { color: theme.colors.textSecondary }]}>
            {formatPresetTime(preset.displayTime)}
          </Text>
        </Pressable>
      ))}

      <View style={[styles.dividerVertical, { backgroundColor: theme.colors.borderDefault }]} />

      {!showCustom ? (
        <Pressable
          testID="schedule-custom-toggle"
          onPress={() => setShowCustom(true)}
          accessibilityRole="button"
          accessibilityLabel="Custom time"
          accessibilityHint="Opens custom date and time picker"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: pressed ? theme.colors.surfaceTertiary : TRANSPARENT,
          })}
        >
          <Text style={[styles.presetLabel, { color: theme.brand.primary }]}>Custom time</Text>
        </Pressable>
      ) : (
        <View testID="schedule-custom-section" style={styles.customSection}>
          <Text style={[styles.customTitle, { color: theme.colors.textPrimary }]}>
            Custom time
          </Text>
          <View style={styles.customInputRow}>
            <TextInput
              testID="schedule-custom-date"
              placeholder="YYYY-MM-DD"
              value={customDate}
              onChangeText={setCustomDate}
              accessibilityLabel="Date"
              accessibilityHint="Enter date in YYYY-MM-DD format"
              style={[
                styles.dateInput,
                {
                  borderColor: theme.colors.borderDefault,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceTertiary,
                },
              ]}
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              testID="schedule-custom-time"
              placeholder="HH:MM"
              value={customTime}
              onChangeText={setCustomTime}
              accessibilityLabel="Time"
              accessibilityHint="Enter time in HH:MM format"
              style={[
                styles.timeInput,
                {
                  borderColor: theme.colors.borderDefault,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceTertiary,
                },
              ]}
              placeholderTextColor={theme.colors.textMuted}
            />
            <Pressable
              testID="schedule-custom-submit"
              onPress={handleCustomSubmit}
              accessibilityRole="button"
              accessibilityLabel="Schedule"
              accessibilityHint="Schedules message at the specified custom time"
              style={[styles.submitButton, {
                backgroundColor: customDate && customTime ? theme.brand.primary : theme.colors.borderStrong,
              }]}
            >
              <Text style={[styles.submitButtonText, { color: theme.colors.headerText }]}>Schedule</Text>
            </Pressable>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginBottom: 4,
  },
  dividerVertical: {
    height: 1,
    marginVertical: 4,
  },
  presetLabel: {
    fontSize: 16,
  },
  presetTime: {
    fontSize: 13,
  },
  customSection: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  customTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  timeInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  submitButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  submitButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
