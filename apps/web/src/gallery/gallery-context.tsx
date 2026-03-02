import { createContext, useContext } from "react";
import type { SearchResultItem } from "@openslaq/shared";
import type { WorkspaceInfo } from "../hooks/api/useWorkspacesApi";

/** When true, hooks skip API calls and use pre-seeded store data. */
const GalleryModeContext = createContext(false);

export const GalleryModeProvider = GalleryModeContext.Provider;

export function useGalleryMode(): boolean {
  return useContext(GalleryModeContext);
}

/** Minimal user shape that satisfies hooks (AuthJsonUser) and component usage (user?.id). */
export interface MockUser {
  id: string;
  displayName?: string | null;
  primaryEmail?: string | null;
  profileImageUrl?: string | null;
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
  update?: (data: Record<string, unknown>) => Promise<void>;
}

const MockUserContext = createContext<MockUser | null>(null);

export const MockUserProvider = MockUserContext.Provider;

export function useMockUser(): MockUser | null {
  return useContext(MockUserContext);
}

export interface MockMember {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  joinedAt: string;
}

export interface MockSearchResponse {
  results: SearchResultItem[];
  total: number;
  error?: string;
}

export interface MockSearchConfig {
  prefillQuery?: string;
  responses?: Record<string, MockSearchResponse>;
  defaultResponse?: MockSearchResponse;
}

export interface GalleryMockData {
  members?: MockMember[];
  search?: MockSearchConfig;
  workspaceList?: WorkspaceInfo[];
}

const GalleryMockDataContext = createContext<GalleryMockData | null>(null);

export const GalleryMockDataProvider = GalleryMockDataContext.Provider;

export function useGalleryMockData(): GalleryMockData | null {
  return useContext(GalleryMockDataContext);
}
