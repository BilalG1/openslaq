import type { WorkspaceId, UserId } from "./ids";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  slug: string;
  createdAt: string;
  memberCount?: number;
}

export interface WorkspaceFeatureFlags {
  integrationGithub: boolean;
  integrationLinear: boolean;
  integrationSentry: boolean;
  integrationVercel: boolean;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: WorkspaceId;
  code: string;
  createdBy: UserId;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
