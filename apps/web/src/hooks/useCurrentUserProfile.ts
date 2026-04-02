import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, type UserProfile } from "@openslaq/client-core";
import { useAuthProvider } from "../lib/api-client";
import { api } from "../api";

export function useCurrentUserProfile() {
  const authProvider = useAuthProvider();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const user = await getCurrentUser({ api, auth: authProvider });
      setProfile(user);
    } catch {
      // Non-critical
    }
  }, [authProvider]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return { profile, refresh: fetchProfile };
}
