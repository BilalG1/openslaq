import { useEffect, useRef, useCallback } from "react";
import { router } from "expo-router";
import { registerVoipToken, unregisterVoipToken } from "@openslaq/client-core";
import type { ApiDeps } from "@openslaq/client-core";
import { asChannelId, type ChannelId } from "@openslaq/shared";
import { Sentry } from "@/sentry";
import { routes } from "@/lib/routes";
import {
  isVoipAvailable,
  getVoipEmitter,
  endCall as nativeEndCall,
  reportCallConnected as nativeReportCallConnected,
} from "@/lib/voip-native";

interface UseVoipCallKitOptions {
  deps: ApiDeps;
  joinHuddle: (channelId: ChannelId) => void;
  /** Current huddle channelId — null when not in a huddle */
  huddleChannelId: ChannelId | null;
  workspaceSlug: string | null;
}

export function useVoipCallKit({
  deps,
  joinHuddle,
  huddleChannelId,
  workspaceSlug,
}: UseVoipCallKitOptions) {
  const tokenRef = useRef<string | null>(null);
  const workspaceSlugRef = useRef(workspaceSlug);
  workspaceSlugRef.current = workspaceSlug;

  // Track the UUID of the call we answered via CallKit
  const activeCallUuidRef = useRef<string | null>(null);

  // When huddle channelId goes to null (left, error, ended), end the CallKit call
  useEffect(() => {
    if (!huddleChannelId && activeCallUuidRef.current) {
      nativeEndCall(activeCallUuidRef.current);
      activeCallUuidRef.current = null;
    }
  }, [huddleChannelId]);

  // Register VoIP token and listen for CallKit events
  useEffect(() => {
    if (!isVoipAvailable) return;

    const emitter = getVoipEmitter();
    if (!emitter) return;

    let cancelled = false;

    // Listen for VoIP token from PushKit
    const tokenSub = emitter.addListener("voipTokenReceived", async (event: { token: string }) => {
      if (cancelled) return;
      tokenRef.current = event.token;

      try {
        await registerVoipToken(deps, event.token, "ios");
      } catch (err) {
        Sentry.captureException(err);
        console.warn("[voip] Failed to register VoIP token:", err);
      }
    });

    // Listen for call answered (user tapped "Accept" on CallKit UI)
    const answerSub = emitter.addListener("callAnswered", (event: { uuid: string; channelId: string; workspaceSlug: string }) => {
      if (!event.channelId) return;

      const ws = event.workspaceSlug || workspaceSlugRef.current;
      if (!ws) return;

      activeCallUuidRef.current = event.uuid;
      joinHuddle(asChannelId(event.channelId));
      router.push(routes.huddle(ws) as any);
    });

    // Listen for call ended (user tapped "Decline" or call cancelled)
    const endSub = emitter.addListener("callEnded", (_event: { uuid: string }) => {
      activeCallUuidRef.current = null;
    });

    return () => {
      cancelled = true;
      tokenSub.remove();
      answerSub.remove();
      endSub.remove();
    };
  }, [deps, joinHuddle]);

  const unregisterToken = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;

    try {
      await unregisterVoipToken(deps, token);
    } catch (err) {
      Sentry.captureException(err);
      console.warn("[voip] Failed to unregister VoIP token:", err);
    }
    tokenRef.current = null;
  }, [deps]);

  const endCall = useCallback((uuid: string) => {
    nativeEndCall(uuid);
  }, []);

  const reportCallConnected = useCallback((uuid: string) => {
    nativeReportCallConnected(uuid);
  }, []);

  return { unregisterToken, endCall, reportCallConnected };
}
