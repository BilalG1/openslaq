import React from "react";
import { View, Text } from "react-native";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { WorkspaceDrawer } from "../workspace/WorkspaceDrawer";

const SCREEN_W = 390;
const SCREEN_H = 844;

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: SCREEN_W, height: SCREEN_H, scale: 2, fontScale: 1 }),
}));

let mockIsOpen = false;
jest.mock("@/contexts/WorkspaceDrawerContext", () => ({
  useWorkspaceDrawer: () => ({
    isOpen: mockIsOpen,
    close: jest.fn(),
    open: jest.fn(),
    toggle: jest.fn(),
  }),
}));

jest.mock("../workspace/WorkspaceSidebar", () => {
  const { View } = require("react-native");
  return {
    WorkspaceSidebar: () =>
      require("react").createElement(View, { testID: "workspace-sidebar" }),
  };
});

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
        headerText: "#fff",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

describe("WorkspaceDrawer layout", () => {
  beforeEach(() => {
    mockIsOpen = false;
  });

  it("drawer panel width is 80% of screen width", async () => {
    mockIsOpen = true;
    const { toJSON } = render(
      <WorkspaceDrawer>
        <View testID="main-content">
          <Text>Main</Text>
        </View>
      </WorkspaceDrawer>,
    );

    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });
    const drawer = layout.byTestID.get("workspace-drawer");
    expect(drawer).toBeDefined();

    const expectedWidth = Math.round(SCREEN_W * 0.8);
    expect(drawer!.width).toBe(expectedWidth);
  });

  it("drawer panel takes full screen height", async () => {
    mockIsOpen = true;
    const { toJSON } = render(
      <WorkspaceDrawer>
        <View testID="main-content">
          <Text>Main</Text>
        </View>
      </WorkspaceDrawer>,
    );

    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });
    const drawer = layout.byTestID.get("workspace-drawer");
    expect(drawer).toBeDefined();
    expect(drawer!.height).toBe(SCREEN_H);
  });

  it("backdrop covers full screen when open", async () => {
    mockIsOpen = true;
    const { toJSON } = render(
      <WorkspaceDrawer>
        <View testID="main-content">
          <Text>Main</Text>
        </View>
      </WorkspaceDrawer>,
    );

    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });
    const backdrop = layout.byTestID.get("drawer-backdrop");
    expect(backdrop).toBeDefined();
    // Backdrop should span full width (position: absolute, left: 0, right: 0)
    expect(backdrop!.width).toBe(SCREEN_W);
    expect(backdrop!.height).toBe(SCREEN_H);
  });

  it("main content fills the container when drawer is closed", async () => {
    mockIsOpen = false;
    const { toJSON } = render(
      <WorkspaceDrawer>
        <View testID="main-content" style={{ flex: 1 }}>
          <Text>Main</Text>
        </View>
      </WorkspaceDrawer>,
    );

    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });
    const main = layout.byTestID.get("main-content");
    expect(main).toBeDefined();
    expect(main!.width).toBe(SCREEN_W);
  });
});
