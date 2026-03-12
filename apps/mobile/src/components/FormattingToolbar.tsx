import { Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import type { FormatType } from "@/utils/markdown-formatting";

interface Props {
  onFormat: (format: FormatType) => void;
  onLinkPress: () => void;
}

const BUTTONS: { label: string; format: FormatType; testID: string; group: number }[] = [
  { label: "B", format: "bold", testID: "format-btn-bold", group: 0 },
  { label: "I", format: "italic", testID: "format-btn-italic", group: 0 },
  { label: "S", format: "strikethrough", testID: "format-btn-strikethrough", group: 0 },
  { label: "<>", format: "code", testID: "format-btn-code", group: 1 },
  { label: "{}", format: "codeBlock", testID: "format-btn-codeBlock", group: 1 },
  { label: ">", format: "blockquote", testID: "format-btn-blockquote", group: 2 },
  { label: "\u2022", format: "bulletList", testID: "format-btn-bulletList", group: 2 },
  { label: "1.", format: "orderedList", testID: "format-btn-orderedList", group: 2 },
];

export function FormattingToolbar({ onFormat, onLinkPress }: Props) {
  const { theme } = useMobileTheme();

  const renderDivider = (key: string) => (
    <View
      key={key}
      style={{
        width: 1,
        height: 20,
        backgroundColor: theme.colors.borderDefault,
        marginHorizontal: 4,
        alignSelf: "center",
      }}
    />
  );

  let lastGroup = 0;
  const items: React.ReactNode[] = [];

  for (const btn of BUTTONS) {
    if (btn.group !== lastGroup) {
      items.push(renderDivider(`div-${lastGroup}-${btn.group}`));
      lastGroup = btn.group;
    }
    items.push(
      <Pressable
        key={btn.testID}
        testID={btn.testID}
        onPress={() => {
          haptics.selection();
          onFormat(btn.format);
        }}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
        })}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: btn.format === "bold" ? "700" : btn.format === "italic" ? "400" : "600",
            fontStyle: btn.format === "italic" ? "italic" : "normal",
            color: theme.colors.textPrimary,
            textDecorationLine: btn.format === "strikethrough" ? "line-through" : "none",
          }}
        >
          {btn.label}
        </Text>
      </Pressable>,
    );
  }

  // Link button after final divider
  items.push(renderDivider("div-link"));
  items.push(
    <Pressable
      key="format-btn-link"
      testID="format-btn-link"
      onPress={() => {
        haptics.selection();
        onLinkPress();
      }}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
      })}
    >
      <Link size={15} color={theme.colors.textPrimary} />
    </Pressable>,
  );

  return (
    <View
      testID="formatting-toolbar"
      style={{
        backgroundColor: theme.colors.surfaceTertiary,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderDefault,
        paddingVertical: 4,
        paddingHorizontal: 8,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", alignItems: "center" }}
      >
        {items}
      </ScrollView>
    </View>
  );
}
