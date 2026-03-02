import { useMemo } from "react";
import { useUser } from "@stackframe/react";
import { useMockUser } from "../gallery/gallery-context";
import { getDevSession, createDevUser } from "../lib/dev-auth";

/**
 * Wrapper around Stack Auth's useUser().
 * Priority: gallery mock > dev session (localStorage) > Stack Auth.
 */
export function useCurrentUser() {
  const mockUser = useMockUser();
  const realUser = useUser();

  const devUser = useMemo(() => {
    const session = getDevSession();
    return session ? createDevUser(session) : null;
  }, []);

  return mockUser ?? devUser ?? realUser;
}
