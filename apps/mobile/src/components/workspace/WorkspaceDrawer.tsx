import { useRef, useEffect, type ReactNode } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useWorkspaceDrawer } from "@/contexts/WorkspaceDrawerContext";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

const DRAWER_WIDTH = 72;
const EDGE_ZONE = 20;
const SWIPE_THRESHOLD = 30;

export function WorkspaceDrawer({ children }: { children: ReactNode }) {
  const { isOpen, open, close } = useWorkspaceDrawer();
  const { height } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_evt, gestureState) => {
        // Only respond to touches in the left edge zone
        return gestureState.x0 < EDGE_ZONE;
      },
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only respond to horizontal swipes from left edge
        return (
          gestureState.x0 < EDGE_ZONE &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          open();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}

      {/* Backdrop */}
      {isOpen && (
        <Pressable
          testID="drawer-backdrop"
          onPress={close}
          style={[styles.backdrop, { height }]}
        />
      )}

      {/* Drawer panel */}
      <Animated.View
        testID="workspace-drawer"
        style={[
          styles.drawer,
          { height, transform: [{ translateX }] },
        ]}
      >
        <WorkspaceSidebar />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
  },
});
