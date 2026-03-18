import { useRef, useEffect, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useWorkspaceDrawer } from "@/contexts/WorkspaceDrawerContext";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

const DRAWER_WIDTH_RATIO = 0.8;

export function WorkspaceDrawer({ children }: { children: ReactNode }) {
  const { isOpen, close } = useWorkspaceDrawer();
  const { width: screenWidth, height } = useWindowDimensions();
  const drawerWidth = Math.round(screenWidth * DRAWER_WIDTH_RATIO);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -drawerWidth,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen, translateX, drawerWidth]);

  return (
    <View style={styles.container}>
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
          { height, width: drawerWidth, transform: [{ translateX }] },
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
  },
});
