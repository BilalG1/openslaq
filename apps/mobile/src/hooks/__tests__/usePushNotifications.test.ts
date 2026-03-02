import { renderHook, act, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import type { ChannelId } from "@openslaq/shared";
import { usePushNotifications } from "../usePushNotifications";

// Mock dependencies
jest.mock("@openslaq/client-core", () => ({
  registerPushToken: jest.fn().mockResolvedValue(undefined),
  unregisterPushToken: jest.fn().mockResolvedValue(undefined),
}));

const mockRegisterPushToken =
  jest.requireMock("@openslaq/client-core").registerPushToken;
const mockUnregisterPushToken =
  jest.requireMock("@openslaq/client-core").unregisterPushToken;

const mockDeps = {
  api: {} as any,
  auth: {
    requireAccessToken: jest.fn(),
    getAccessToken: jest.fn(),
    onAuthRequired: jest.fn(),
  },
};

// Track registered listeners
let notificationReceivedCallback: ((n: any) => void) | null = null;
let notificationResponseCallback: ((r: any) => void) | null = null;
let appStateCallback: ((state: string) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  notificationReceivedCallback = null;
  notificationResponseCallback = null;
  appStateCallback = null;

  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
    status: "granted",
    granted: true,
    canAskAgain: true,
    expires: "never",
  });

  (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValue({
    data: "test-apns-token-123",
    type: "ios",
  });

  (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);
  (Notifications.dismissNotificationAsync as jest.Mock).mockResolvedValue(
    undefined,
  );

  (
    Notifications.addNotificationReceivedListener as jest.Mock
  ).mockImplementation((cb: (n: any) => void) => {
    notificationReceivedCallback = cb;
    return { remove: jest.fn() };
  });

  (
    Notifications.addNotificationResponseReceivedListener as jest.Mock
  ).mockImplementation((cb: (r: any) => void) => {
    notificationResponseCallback = cb;
    return { remove: jest.fn() };
  });

  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, cb) => {
    appStateCallback = cb as (state: string) => void;
    return { remove: jest.fn() } as any;
  });
});

describe("usePushNotifications", () => {
  it("registers token when permission granted", async () => {
    renderHook(() =>
      usePushNotifications({
        deps: mockDeps,
        activeChannelId: null,
        workspaceSlug: "default",
      }),
    );

    await waitFor(() => {
      expect(mockRegisterPushToken).toHaveBeenCalledWith(
        mockDeps,
        "test-apns-token-123",
        "ios",
      );
    });
  });

  it("skips registration when permission denied", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
      granted: false,
      canAskAgain: false,
      expires: "never",
    });

    renderHook(() =>
      usePushNotifications({
        deps: mockDeps,
        activeChannelId: null,
        workspaceSlug: "default",
      }),
    );

    // Give time for the async effect to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRegisterPushToken).not.toHaveBeenCalled();
  });

  it("clears badge on app foreground", () => {
    renderHook(() =>
      usePushNotifications({
        deps: mockDeps,
        activeChannelId: null,
        workspaceSlug: "default",
      }),
    );

    expect(appStateCallback).toBeTruthy();
    act(() => {
      appStateCallback!("active");
    });

    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it("deep links to channel on notification tap", () => {
    renderHook(() =>
      usePushNotifications({
        deps: mockDeps,
        activeChannelId: null,
        workspaceSlug: "default",
      }),
    );

    expect(notificationResponseCallback).toBeTruthy();
    act(() => {
      notificationResponseCallback!({
        notification: {
          request: {
            content: {
              data: {
                workspaceSlug: "my-workspace",
                channelId: "channel-123",
              },
            },
          },
        },
      });
    });

    expect(router.push).toHaveBeenCalledWith(
      expect.stringContaining("channel-123"),
    );
  });

  it("deep links to thread when parentMessageId present", () => {
    renderHook(() =>
      usePushNotifications({
        deps: mockDeps,
        activeChannelId: null,
        workspaceSlug: "default",
      }),
    );

    act(() => {
      notificationResponseCallback!({
        notification: {
          request: {
            content: {
              data: {
                workspaceSlug: "my-workspace",
                channelId: "channel-123",
                parentMessageId: "msg-456",
              },
            },
          },
        },
      });
    });

    expect(router.push).toHaveBeenCalledWith(
      expect.stringContaining("channel-123"),
    );
  });

  it("suppresses foreground notification when in same channel", () => {
    renderHook(() =>
      usePushNotifications({
        deps: mockDeps,
        activeChannelId: "channel-abc" as ChannelId,
        workspaceSlug: "default",
      }),
    );

    expect(notificationReceivedCallback).toBeTruthy();
    act(() => {
      notificationReceivedCallback!({
        request: {
          identifier: "notif-1",
          content: {
            data: { channelId: "channel-abc" },
          },
        },
      });
    });

    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(
      "notif-1",
    );
  });

  it("unregisters token on cleanup call", async () => {
    const { result } = renderHook(() =>
      usePushNotifications({
        deps: mockDeps,
        activeChannelId: null,
        workspaceSlug: "default",
      }),
    );

    // Wait for registration
    await waitFor(() => {
      expect(mockRegisterPushToken).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.unregisterToken();
    });

    expect(mockUnregisterPushToken).toHaveBeenCalledWith(
      mockDeps,
      "test-apns-token-123",
    );
  });
});
