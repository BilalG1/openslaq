import { useMemo, useSyncExternalStore } from "react";
import { useUser } from "@stackframe/react";
import { useMockUser } from "../gallery/gallery-context";
import {
  createDevUser,
  subscribeDevSession,
  getDevSessionSnapshot,
} from "../lib/dev-auth";

/**
 * Wrapper around Stack Auth's useUser().
 * Priority: gallery mock > dev session (localStorage) > Stack Auth.
 */
export function useCurrentUser() {
  const mockUser = useMockUser();
  const realUser = useUser();

  const session = useSyncExternalStore(subscribeDevSession, getDevSessionSnapshot);
  const devUser = useMemo(() => (session ? createDevUser(session) : null), [session]);

  return mockUser ?? devUser ?? realUser;
}
