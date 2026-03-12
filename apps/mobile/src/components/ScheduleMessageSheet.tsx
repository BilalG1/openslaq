import { useMemo, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

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

  const presets = useMemo(() => {
    const now = new Date();
    const in20 = roundToNext5Min(new Date(now.getTime() + 20 * 60_000));
    const in1h = roundToNext5Min(new Date(now.getTime() + 60 * 60_000));
    const in3h = roundToNext5Min(new Date(now.getTime() + 3 * 60 * 60_000));

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const nextMonday = new Date(now);
    const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);

    return [
      { label: "In 20 minutes", time: in20 },
      { label: "In 1 hour", time: in1h },
      { label: "In 3 hours", time: in3h },
      { label: "Tomorrow at 9:00 AM", time: tomorrow },
      { label: "Next Monday at 9:00 AM", time: nextMonday },
    ];
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreset = (time: Date) => {
    onSchedule(time);
    setShowCustom(false);
  };

  const handleCustomSubmit = () => {
    if (!customDate || !customTime) return;
    const date = new Date(`${customDate}T${customTime}`);
    if (date.getTime() <= Date.now() + 60_000) return;
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        testID="schedule-sheet-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <Pressable
          testID="schedule-sheet-content"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 34,
            paddingTop: 12,
            paddingHorizontal: 16,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{ fontSize: 17, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 12 }}>
            Schedule message
          </Text>
          <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginBottom: 4 }} />

          {presets.map((preset) => (
            <Pressable
              key={preset.label}
              testID={`schedule-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
              onPress={() => handlePreset(preset.time)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
              })}
            >
              <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>{preset.label}</Text>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
                {formatPresetTime(preset.time)}
              </Text>
            </Pressable>
          ))}

          <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginVertical: 4 }} />

          {!showCustom ? (
            <Pressable
              testID="schedule-custom-toggle"
              onPress={() => setShowCustom(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
              })}
            >
              <Text style={{ fontSize: 16, color: theme.brand.primary }}>Custom time</Text>
            </Pressable>
          ) : (
            <View testID="schedule-custom-section" style={{ paddingHorizontal: 8, paddingTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: theme.colors.textPrimary, marginBottom: 8 }}>
                Custom time
              </Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  testID="schedule-custom-date"
                  placeholder="YYYY-MM-DD"
                  value={customDate}
                  onChangeText={setCustomDate}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.colors.borderDefault,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 14,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.surfaceTertiary,
                  }}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TextInput
                  testID="schedule-custom-time"
                  placeholder="HH:MM"
                  value={customTime}
                  onChangeText={setCustomTime}
                  style={{
                    width: 80,
                    borderWidth: 1,
                    borderColor: theme.colors.borderDefault,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 14,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.surfaceTertiary,
                  }}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <Pressable
                  testID="schedule-custom-submit"
                  onPress={handleCustomSubmit}
                  style={{
                    backgroundColor: customDate && customTime ? theme.brand.primary : theme.colors.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Schedule</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
