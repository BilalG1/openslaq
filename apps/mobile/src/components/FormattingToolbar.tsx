import { useMemo } from "react";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { Link } from "lucide-react-native";
import type { MobileTheme } from "@openslaq/shared";
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

import { TRANSPARENT } from "@/theme/constants";

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surfaceTertiary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderDefault,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    scrollContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    divider: {
      width: 1,
      height: 20,
      backgroundColor: theme.colors.borderDefault,
      marginHorizontal: 4,
      alignSelf: "center",
    },
    formatButtonDefault: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: TRANSPARENT,
    },
    formatButtonPressed: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceTertiary,
    },
    formatTextBold: {
      fontSize: 15,
      fontWeight: "700",
      fontStyle: "normal",
      color: theme.colors.textPrimary,
      textDecorationLine: "none",
    },
    formatTextItalic: {
      fontSize: 15,
      fontWeight: "400",
      fontStyle: "italic",
      color: theme.colors.textPrimary,
      textDecorationLine: "none",
    },
    formatTextStrikethrough: {
      fontSize: 15,
      fontWeight: "600",
      fontStyle: "normal",
      color: theme.colors.textPrimary,
      textDecorationLine: "line-through",
    },
    formatTextDefault: {
      fontSize: 15,
      fontWeight: "600",
      fontStyle: "normal",
      color: theme.colors.textPrimary,
      textDecorationLine: "none",
    },
  });

function getFormatTextStyle(styles: ReturnType<typeof makeStyles>, format: FormatType) {
  switch (format) {
    case "bold":
      return styles.formatTextBold;
    case "italic":
      return styles.formatTextItalic;
    case "strikethrough":
      return styles.formatTextStrikethrough;
    default:
      return styles.formatTextDefault;
  }
}

export function FormattingToolbar({ onFormat, onLinkPress }: Props) {
  const { theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const renderDivider = (key: string) => (
    <View key={key} style={styles.divider} />
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
        accessibilityLabel={`Format ${btn.format}`}
        accessibilityHint={`Applies ${btn.format} formatting to selected text`}
        style={({ pressed }) => pressed ? styles.formatButtonPressed : styles.formatButtonDefault}
      >
        <Text style={getFormatTextStyle(styles, btn.format)}>
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
      accessibilityLabel="Insert link"
      accessibilityHint="Opens the link insertion dialog"
      style={({ pressed }) => pressed ? styles.formatButtonPressed : styles.formatButtonDefault}
    >
      <Link size={15} color={theme.colors.textPrimary} />
    </Pressable>,
  );

  return (
    <View testID="formatting-toolbar" style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items}
      </ScrollView>
    </View>
  );
}
