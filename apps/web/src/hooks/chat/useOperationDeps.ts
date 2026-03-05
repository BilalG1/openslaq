import { useMemo, useRef } from "react";
import type { OperationDeps } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";

export function useOperationDeps(): OperationDeps {
  const auth = useAuthProvider();
  const { state, dispatch } = useChatStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  return useMemo(
    () => ({ api, auth, dispatch, getState: () => stateRef.current }),
    [auth, dispatch],
  );
}
