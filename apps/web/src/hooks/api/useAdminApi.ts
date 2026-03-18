import { useCallback } from "react";
import {
  checkAdmin as coreCheckAdmin,
  getStats as coreGetStats,
  getActivity as coreGetActivity,
  getUsers as coreGetUsers,
  getAdminWorkspaces,
  impersonate as coreImpersonate,
  getAdminFeatureFlags as coreGetAdminFeatureFlags,
  updateAdminFeatureFlags as coreUpdateAdminFeatureFlags,
  bulkUpdateFeatureFlag as coreBulkUpdateFeatureFlag,
} from "@openslaq/client-core";
import type { WorkspaceFeatureFlags } from "@openslaq/shared";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export function useAdminApi() {
  const auth = useAuthProvider();

  const checkAdmin = useCallback(() => coreCheckAdmin({ api, auth }), [auth]);
  const getStats = useCallback(() => coreGetStats({ api, auth }), [auth]);
  const getActivity = useCallback((days = 30) => coreGetActivity({ api, auth }, days), [auth]);
  const getUsers = useCallback(
    (page = 1, pageSize = 20, search?: string) => coreGetUsers({ api, auth }, page, pageSize, search),
    [auth],
  );
  const getWorkspaces = useCallback(
    (page = 1, pageSize = 20, search?: string) => getAdminWorkspaces({ api, auth }, page, pageSize, search),
    [auth],
  );
  const impersonate = useCallback((userId: string) => coreImpersonate({ api, auth }, userId), [auth]);

  const getAdminFeatureFlags = useCallback(
    (workspaceId: string) => coreGetAdminFeatureFlags({ api, auth }, workspaceId),
    [auth],
  );
  const updateAdminFeatureFlags = useCallback(
    (workspaceId: string, flags: Partial<WorkspaceFeatureFlags>) =>
      coreUpdateAdminFeatureFlags({ api, auth }, workspaceId, flags),
    [auth],
  );
  const bulkUpdateFeatureFlag = useCallback(
    (flag: keyof WorkspaceFeatureFlags, enabled: boolean) =>
      coreBulkUpdateFeatureFlag({ api, auth }, flag, enabled),
    [auth],
  );

  return {
    checkAdmin,
    getStats,
    getActivity,
    getUsers,
    getWorkspaces,
    impersonate,
    getAdminFeatureFlags,
    updateAdminFeatureFlags,
    bulkUpdateFeatureFlag,
  };
}
