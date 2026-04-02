import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { redirectToAuth } from "../lib/auth";
import { AppLayout } from "../components/layout/AppLayout";

export function HomePage() {
  const user = useCurrentUser();

  useEffect(() => {
    if (!user) void redirectToAuth();
  }, [user]);

  if (!user) return null;

  return (
    <Routes>
      <Route path="c/:channelId/t/:messageId" element={<AppLayout />} />
      <Route path="c/:channelId" element={<AppLayout />} />
      <Route path="dm/:dmChannelId" element={<AppLayout />} />
      <Route path="*" element={<AppLayout />} />
    </Routes>
  );
}
