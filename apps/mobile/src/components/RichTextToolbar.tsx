import { Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/utils/haptics";
import type { WebViewEditorRef, FormattingState } from "./WebViewEditor";

interface Props {
  editor: WebViewEditorRef;
  formattingState: FormattingState;
  onLinkPress: () => void;
}

interface ButtonDef {
  label: string;
  testID: string;
  group: number;
  action: () => void;
  active: boolean;
  style?: {
    fontWeight?: "400" | "600" | "700";
    fontStyle?: "normal" | "italic";
    textDecorationLine?: "none" | "line-through";
  };
}

export function RichTextToolbar({ editor, formattingState, onLinkPress }: Props) {
  const { theme } = useMobileTheme();

  const buttons: ButtonDef[] = [
    {
      label: "B", testID: "format-btn-bold", group: 0,
      action: () => editor.toggleBold(),
      active: formattingState.bold,
      style: { fontWeight: "700" },
    },
    {
      label: "I", testID: "format-btn-italic", group: 0,
      action: () => editor.toggleItalic(),
      active: formattingState.italic,
      style: { fontStyle: "italic" },
    },
    {
      label: "S", testID: "format-btn-strikethrough", group: 0,
      action: () => editor.toggleStrike(),
      active: formattingState.strike,
      style: { textDecorationLine: "line-through" },
    },
    {
      label: "<>", testID: "format-btn-code", group: 1,
      action: () => editor.toggleCode(),
      active: formattingState.code,
    },
    {
      label: ">", testID: "format-btn-blockquote", group: 2,
      action: () => editor.toggleBlockquote(),
      active: formattingState.blockquote,
    },
    {
      label: "\u2022", testID: "format-btn-bulletList", group: 2,
      action: () => editor.toggleBulletList(),
      active: formattingState.bulletList,
    },
    {
      label: "1.", testID: "format-btn-orderedList", group: 2,
      action: () => editor.toggleOrderedList(),
      active: formattingState.orderedList,
    },
  ];

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

  for (const btn of buttons) {
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
          btn.action();
        }}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: btn.active
            ? theme.brand.primary + "20"
            : pressed
              ? theme.colors.surfaceTertiary
              : "transparent",
        })}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: btn.style?.fontWeight ?? "600",
            fontStyle: btn.style?.fontStyle ?? "normal",
            color: btn.active ? theme.brand.primary : theme.colors.textPrimary,
            textDecorationLine: btn.style?.textDecorationLine ?? "none",
          }}
        >
          {btn.label}
        </Text>
      </Pressable>,
    );
  }

  // Link button
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
