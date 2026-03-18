import { useMemo, useRef } from "react";
import type { OperationDeps, ApiDeps } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { api } from "@/lib/api";

export function useOperationDeps(): OperationDeps {
  const { authProvider } = useAuth();
  const { state, dispatch } = useChatStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  return useMemo(
    () => ({ api, auth: authProvider, dispatch, getState: () => stateRef.current }),
    [authProvider, dispatch],
  );
}

export function useApiDeps(): ApiDeps {
  const { authProvider } = useAuth();
  return useMemo(() => ({ api, auth: authProvider }), [authProvider]);
}
