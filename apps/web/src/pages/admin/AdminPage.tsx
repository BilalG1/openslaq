import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { redirectToAuth } from "../../lib/auth";
import { useAdminApi } from "../../hooks/api/useAdminApi";
import { OverviewTab } from "./OverviewTab";
import { UsersTab } from "./UsersTab";
import { WorkspacesTab } from "./WorkspacesTab";
import { ActivityTab } from "./ActivityTab";

const TABS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users", end: false },
  { to: "/admin/workspaces", label: "Workspaces", end: false },
  { to: "/admin/activity", label: "Activity", end: false },
];

export function AdminPage() {
  const user = useCurrentUser();

  useEffect(() => {
    if (!user) void redirectToAuth();
  }, [user]);
  const { checkAdmin } = useAdminApi();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdmin().then((r) => setAuthorized(r.isAdmin));
  }, [checkAdmin]);

  if (authorized === null) return null;
  if (!authorized) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-strong bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
          <a href="/" className="text-sm text-slaq-blue hover:underline">
            Back to app
          </a>
        </div>
        <nav className="flex gap-1 mt-3" data-testid="admin-tabs">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-slaq-blue text-white"
                    : "text-muted hover:bg-surface-secondary"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="p-6">
        <Routes>
          <Route index element={<OverviewTab />} />
          <Route path="users" element={<UsersTab />} />
          <Route path="workspaces" element={<WorkspacesTab />} />
          <Route path="activity" element={<ActivityTab />} />
        </Routes>
      </main>
    </div>
  );
}
