import { useCallback } from "react";
import { getFeatureFlags as coreGetFlags } from "@openslaq/client-core";
import type { WorkspaceFeatureFlags } from "@openslaq/shared";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export function useFeatureFlagsApi() {
  const auth = useAuthProvider();

  const getFeatureFlags = useCallback(
    async (workspaceSlug: string): Promise<WorkspaceFeatureFlags> => {
      return coreGetFlags({ api, auth }, workspaceSlug);
    },
    [auth],
  );

  return { getFeatureFlags };
}
