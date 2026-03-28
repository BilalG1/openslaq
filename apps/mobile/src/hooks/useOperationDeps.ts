import { useMemo, useRef } from "react";
import type { OperationDeps, ApiDeps } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useServer } from "@/contexts/ServerContext";

export function useOperationDeps(): OperationDeps {
  const { authProvider } = useAuth();
  const { apiClient } = useServer();
  const { state, dispatch } = useChatStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  return useMemo(
    () => ({ api: apiClient, auth: authProvider, dispatch, getState: () => stateRef.current }),
    [apiClient, authProvider, dispatch],
  );
}

export function useApiDeps(): ApiDeps {
  const { authProvider } = useAuth();
  const { apiClient } = useServer();
  return useMemo(() => ({ api: apiClient, auth: authProvider }), [apiClient, authProvider]);
}
