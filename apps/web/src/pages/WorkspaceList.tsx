import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useWorkspacesApi, type WorkspaceInfo } from "../hooks/api/useWorkspacesApi";
import { getErrorMessage } from "../lib/errors";
import { redirectToAuth } from "../lib/auth";
import { Button } from "../components/ui";
import { CustomUserButton } from "../components/user/CustomUserButton";
import { useGalleryMode, useGalleryMockData } from "../gallery/gallery-context";

function roleBadgeClass(role: string): string {
  switch (role) {
    case "owner":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "admin":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  }
}

export function WorkspaceListPage() {
  const isGallery = useGalleryMode();
  const galleryMockData = useGalleryMockData();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [loading, setLoading] = useState(!isGallery);
  const [error, setError] = useState<string | null>(null);

  const { listWorkspaces } = useWorkspacesApi();

  // Redirect unauthenticated users in real mode
  useEffect(() => {
    if (!isGallery && !user) {
      void redirectToAuth();
    }
  }, [isGallery, user]);

  // Load gallery mock data immediately
  useEffect(() => {
    if (isGallery && galleryMockData?.workspaceList) {
      setWorkspaces(galleryMockData.workspaceList);
      setLoading(false);
    }
  }, [isGallery, galleryMockData]);

  useEffect(() => {
    if (isGallery || !user) return;

    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const data = await listWorkspaces();
        if (!cancelled) {
          setWorkspaces(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load workspaces"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [listWorkspaces, user, isGallery]);

  if (!isGallery && !user) return null;

  const hasWorkspaces = !loading && workspaces.length > 0;
  const isEmpty = !loading && workspaces.length === 0 && !error;

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-surface border-b border-border-default">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">OpenSlaq</span>
          {!isGallery && <CustomUserButton />}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-default border-t-slaq-blue" />
          </div>
        )}

        {error && workspaces.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-danger-text text-lg">{error}</p>
          </div>
        )}

        {isEmpty && (
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold text-primary mb-2">Welcome to OpenSlaq</h1>
            <p className="text-muted text-lg mb-8">Get started by creating a workspace</p>
            <Link
              to="/create-workspace"
              data-testid="create-workspace-link"
              className="no-underline"
            >
              <Button>Create a workspace</Button>
            </Link>
          </div>
        )}

        {hasWorkspaces && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-primary">Your Workspaces</h1>
              <Link
                to="/create-workspace"
                data-testid="create-workspace-link"
                className="no-underline"
              >
                <Button variant="outline" size="sm">Create</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => navigate(`/w/${ws.slug}`)}
                  data-testid={`workspace-card-${ws.slug}`}
                  className="text-left p-5 bg-surface rounded-xl border border-border-default hover:border-slaq-blue hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h2 className="font-semibold text-primary text-lg">{ws.name}</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${roleBadgeClass(ws.role)}`}>
                      {ws.role}
                    </span>
                  </div>
                  <p className="text-sm text-muted mb-2">/{ws.slug}</p>
                  <p className="text-xs text-faint">
                    {ws.memberCount} {ws.memberCount === 1 ? "member" : "members"}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
