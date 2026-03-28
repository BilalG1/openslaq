import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useChatStore } from "../../state/chat-store";
import {
  consumePendingIntent,
  subscribePendingIntent,
  type DeepLinkIntent,
} from "../../lib/deep-link";

/**
 * Consumes deep-link intents and navigates within the bootstrapped app.
 *
 * Two behaviors:
 * A. On bootstrap complete — consume any pending intent (cold-start / auth redirect).
 * B. Live subscription — handle deep links arriving while app is running.
 */
export function useDeepLinkNavigation(workspaceSlug: string | undefined) {
  const navigate = useNavigate();
  const { dispatch, state } = useChatStore();

  // A. Consume pending intent once bootstrap finishes
  useEffect(() => {
    if (state.ui.bootstrapLoading || !workspaceSlug) return;
    const intent = consumePendingIntent();
    if (intent) {
      applyIntent(intent, workspaceSlug, dispatch, navigate);
    }
  }, [state.ui.bootstrapLoading, workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // B. Subscribe to live intents (deep link while already running)
  useEffect(() => {
    if (state.ui.bootstrapLoading || !workspaceSlug) return;
    const slug = workspaceSlug;
    return subscribePendingIntent((intent) => {
      // Consume immediately — we're handling it now
      consumePendingIntent();
      applyIntent(intent, slug, dispatch, navigate);
    });
  }, [state.ui.bootstrapLoading, workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps
}

function applyIntent(
  intent: DeepLinkIntent,
  currentSlug: string,
  dispatch: ReturnType<typeof useChatStore>["dispatch"],
  navigate: ReturnType<typeof useNavigate>,
) {
  if (intent.type === "open") return;

  if (intent.type === "invite") {
    navigate(`/invite/${intent.code}`);
    return;
  }

  // Different workspace — navigate via URL and let bootstrap handle it
  if (intent.workspaceSlug !== currentSlug) {
    switch (intent.type) {
      case "channel":
        navigate(`/w/${intent.workspaceSlug}/c/${intent.channelId}`);
        return;
      case "dm":
        navigate(`/w/${intent.workspaceSlug}/dm/${intent.dmChannelId}`);
        return;
      case "thread":
        navigate(`/w/${intent.workspaceSlug}/c/${intent.channelId}`);
        return;
    }
  }

  // Same workspace — use store dispatch for instant navigation
  switch (intent.type) {
    case "channel":
      dispatch({ type: "workspace/selectChannel", channelId: intent.channelId });
      break;
    case "dm":
      dispatch({ type: "workspace/selectDm", channelId: intent.dmChannelId });
      break;
    case "thread":
      dispatch({ type: "workspace/selectChannel", channelId: intent.channelId });
      dispatch({ type: "workspace/openThread", messageId: intent.messageId });
      break;
  }
}
