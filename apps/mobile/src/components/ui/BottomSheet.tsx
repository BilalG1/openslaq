import { type ReactNode, useRef, useEffect, useCallback } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

import { BACKDROP_BG } from "@/theme/constants";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  avoidKeyboard?: boolean;
  scrollable?: boolean;
  maxHeight?: number | string;
  fullHeight?: boolean;
  swipeToDismiss?: boolean;
  testID?: string;
  children: ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;
const FULL_HEIGHT_RATIO = 0.92;
const SWIPE_THRESHOLD = 120;

export function BottomSheet({
  visible,
  onClose,
  title,
  avoidKeyboard,
  scrollable,
  maxHeight,
  fullHeight,
  swipeToDismiss: _swipeToDismiss,
  testID,
  children,
}: BottomSheetProps) {
  const { theme } = useMobileTheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => onCloseRef.current());
  }, [translateY, backdropOpacity]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start(() => onCloseRef.current());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 8,
          }).start();
        }
      },
    }),
  ).current;

  const sheetStyle = [
    title ? styles.sheetWithTitle : styles.sheet,
    { backgroundColor: theme.colors.surface },
    maxHeight ? { maxHeight: maxHeight as number } : undefined,
    fullHeight ? { height: SCREEN_HEIGHT * FULL_HEIGHT_RATIO } : undefined,
  ];

  const sheetContent = (
    <>
      <View testID="drag-handle" style={styles.dragHandleArea} {...panResponder.panHandlers}>
        <View style={[styles.dragHandlePill, { backgroundColor: theme.colors.textFaint }]} />
      </View>
      {title && (
        <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.textPrimary }]}>
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
    </>
  );

  const content = (
    <Animated.View
      testID={testID}
      style={[...sheetStyle, { transform: [{ translateY }] }]}
    >
      {sheetContent}
    </Animated.View>
  );

  const backdrop = (
    <Animated.View
      style={[styles.backdrop, { opacity: backdropOpacity }]}
    >
      <Pressable
        testID={testID ? `${testID}-backdrop` : undefined}
        accessible={false}
        style={styles.backdropPressable}
        onPress={animateClose}
      >
        {content}
      </Pressable>
    </Animated.View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.keyboardView}
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

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  sheetWithTitle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
  },
  dragHandleArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
  },
  dragHandlePill: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: BACKDROP_BG,
  },
  backdropPressable: {
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardView: {
    flex: 1,
  },
});
