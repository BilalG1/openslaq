import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { WorkspaceFeatureFlags } from "@openslaq/shared";
import { getFeatureFlagDefaults } from "@openslaq/shared";
import { getFeatureFlags } from "@openslaq/client-core";
import { useApiDeps } from "@/hooks/useOperationDeps";
import { useWorkspaceSlug } from "./WorkspaceBootstrapProvider";

const FeatureFlagsContext = createContext<WorkspaceFeatureFlags>(getFeatureFlagDefaults());

export function useFeatureFlags(): WorkspaceFeatureFlags {
  return useContext(FeatureFlagsContext);
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const workspaceSlug = useWorkspaceSlug();
  const deps = useApiDeps();
  const [flags, setFlags] = useState<WorkspaceFeatureFlags>(getFeatureFlagDefaults);

  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    getFeatureFlags(deps, workspaceSlug).then((result) => {
      if (!cancelled) setFlags(result);
    }).catch(() => {
      // Keep defaults on error
    });
    return () => { cancelled = true; };
  }, [deps, workspaceSlug]);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}
