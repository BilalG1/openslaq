import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, type UserProfile } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useServer } from "@/contexts/ServerContext";

export function useCurrentUserProfile() {
  const { authProvider } = useAuth();
  const { apiClient: api } = useServer();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const deps = { api, auth: authProvider };
      const user = await getCurrentUser(deps);
      setProfile(user);
    } catch {
      // Silently fail — profile is non-critical for header display
    } finally {
      setLoading(false);
    }
  }, [authProvider]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const refresh = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, refresh };
}
