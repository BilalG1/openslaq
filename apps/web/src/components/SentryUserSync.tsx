import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import { useCurrentUser } from "../hooks/useCurrentUser";

export function SentryUserSync() {
  const user = useCurrentUser();

  useEffect(() => {
    if (user) {
      Sentry.setUser({ id: user.id });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return null;
}
