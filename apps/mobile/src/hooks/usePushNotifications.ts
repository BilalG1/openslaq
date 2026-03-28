import { useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import type { ChannelId } from "@openslaq/shared";
import { isValidSlug, isValidId } from "@/utils/deep-link-validation";
import { registerPushToken, unregisterPushToken } from "@openslaq/client-core";
import type { ApiDeps } from "@openslaq/client-core";
import { routes } from "@/lib/routes";

interface UsePushNotificationsOptions {
  deps: ApiDeps;
  activeChannelId: ChannelId | null;
  workspaceSlug: string | null;
}

let notificationHandlerSet = false;

function ensureNotificationHandler() {
  if (notificationHandlerSet) return;
  notificationHandlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function usePushNotifications({
  deps,
  activeChannelId,
  workspaceSlug: _workspaceSlug,
}: UsePushNotificationsOptions) {
  ensureNotificationHandler();

  const tokenRef = useRef<string | null>(null);

  // Register push token on mount
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        const result = await Notifications.requestPermissionsAsync();
        status = result.status;
      }
      if (status !== "granted") return;

      try {
        const { data: token } = await Notifications.getDevicePushTokenAsync();
        if (cancelled) return;

        tokenRef.current = token;
        await registerPushToken(deps, token, "ios");
      } catch (err) {
        console.warn("[push] Failed to get/register device token:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deps]);

  // Notification tap — deep link
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          workspaceSlug?: string;
          channelId?: string;
          parentMessageId?: string;
        } | undefined;

        if (!data?.workspaceSlug || !data?.channelId) return;

        const ws = data.workspaceSlug;
        const channelId = data.channelId;

        if (!isValidSlug(ws) || !isValidId(channelId)) return;

        if (data.parentMessageId) {
          if (!isValidId(data.parentMessageId)) return;
          router.push(routes.thread(ws, data.parentMessageId) as any);
        } else {
          router.push(routes.channel(ws, channelId) as any);
        }
      });

    return () => subscription.remove();
  }, []);

  // Clear badge on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        Notifications.setBadgeCountAsync(0).catch(() => {});
      }
    });

    return () => subscription.remove();
  }, []);

  // Expose unregister for sign-out
  const unregisterToken = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;

    try {
      await unregisterPushToken(deps, token);
    } catch (err) {
      console.warn("[push] Failed to unregister token:", err);
    }
    tokenRef.current = null;
  }, [deps]);

  return { unregisterToken };
}
