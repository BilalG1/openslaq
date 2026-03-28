import React from "react";
import { render, screen, act } from "@testing-library/react-native";
import { ConnectionStatusBanner } from "../ConnectionStatusBanner";

const mockUseSocket = jest.fn();

jest.mock("@/contexts/SocketProvider", () => ({
  useSocket: () => mockUseSocket(),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        warningBg: "#f59e0b",
        warningText: "#000000",
        dangerBg: "#fef2f2",
        dangerText: "#b91c1c",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockUseSocket.mockReturnValue({ status: "idle", isNetworkOffline: false });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ConnectionStatusBanner", () => {
  it("does not render when status is idle", () => {
    render(<ConnectionStatusBanner />);
    expect(screen.queryByTestId("connection-status-banner")).toBeNull();
  });

  it("does not render when status is connected", () => {
    mockUseSocket.mockReturnValue({ status: "connected", isNetworkOffline: false });
    render(<ConnectionStatusBanner />);
    expect(screen.queryByTestId("connection-status-banner")).toBeNull();
  });

  it("shows 'Connecting...' when status is connecting", () => {
    mockUseSocket.mockReturnValue({ status: "connecting", isNetworkOffline: false });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    expect(screen.getByText("Connecting...")).toBeTruthy();
  });

  it("shows 'Reconnecting...' when status is reconnecting", () => {
    mockUseSocket.mockReturnValue({ status: "reconnecting", isNetworkOffline: false });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    expect(screen.getByText("Reconnecting...")).toBeTruthy();
  });

  it("shows 'No connection' when status is disconnected", () => {
    mockUseSocket.mockReturnValue({ status: "disconnected", isNetworkOffline: false });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    expect(screen.getByText("No connection")).toBeTruthy();
  });

  it("shows 'Connection error' when status is error", () => {
    mockUseSocket.mockReturnValue({ status: "error", isNetworkOffline: false });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    expect(screen.getByText("Connection error")).toBeTruthy();
  });

  it("has accessibilityRole alert", () => {
    mockUseSocket.mockReturnValue({ status: "reconnecting", isNetworkOffline: false });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    const banner = screen.getByTestId("connection-status-banner");
    expect(banner.props.accessibilityRole).toBe("alert");
  });

  it("uses warning colors for connecting/reconnecting", () => {
    mockUseSocket.mockReturnValue({ status: "connecting", isNetworkOffline: false });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    const banner = screen.getByTestId("connection-status-banner");
    const flatStyle = Object.assign({}, ...([].concat(banner.props.style)));
    expect(flatStyle.backgroundColor).toBe("#f59e0b");
  });

  it("uses danger colors for error status", () => {
    mockUseSocket.mockReturnValue({ status: "error", isNetworkOffline: false });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    const banner = screen.getByTestId("connection-status-banner");
    const flatStyle = Object.assign({}, ...([].concat(banner.props.style)));
    expect(flatStyle.backgroundColor).toBe("#fef2f2");
  });

  it("shows 'No internet connection' when network is offline regardless of socket status", () => {
    mockUseSocket.mockReturnValue({ status: "connected", isNetworkOffline: true });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    expect(screen.getByText("No internet connection")).toBeTruthy();
  });

  it("network offline takes priority over socket reconnecting status", () => {
    mockUseSocket.mockReturnValue({ status: "reconnecting", isNetworkOffline: true });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    expect(screen.getByText("No internet connection")).toBeTruthy();
    expect(screen.queryByText("Reconnecting...")).toBeNull();
  });

  it("uses danger colors when network is offline", () => {
    mockUseSocket.mockReturnValue({ status: "connected", isNetworkOffline: true });
    render(<ConnectionStatusBanner />);
    act(() => jest.runAllTimers());
    const banner = screen.getByTestId("connection-status-banner");
    const flatStyle = Object.assign({}, ...([].concat(banner.props.style)));
    expect(flatStyle.backgroundColor).toBe("#fef2f2");
  });
});
