import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  avoidKeyboard?: boolean;
  scrollable?: boolean;
  maxHeight?: number | string;
  testID?: string;
  children: ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  avoidKeyboard,
  scrollable,
  maxHeight,
  testID,
  children,
}: BottomSheetProps) {
  const { theme } = useMobileTheme();

  const content = (
    <Pressable
      testID={testID}
      style={{
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 34,
        paddingTop: title ? 16 : 12,
        paddingHorizontal: 16,
        ...(maxHeight ? { maxHeight: maxHeight as number } : {}),
      }}
      onPress={(e) => e.stopPropagation()}
    >
      {title && (
        <Text
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: theme.colors.textPrimary,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
      )}
      {scrollable ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </Pressable>
  );

  const backdrop = (
    <Pressable
      testID={testID ? `${testID}-backdrop` : undefined}
      style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      onPress={onClose}
    >
      {content}
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {backdrop}
        </KeyboardAvoidingView>
      ) : (
        backdrop
      )}
    </Modal>
  );
}
