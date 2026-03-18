import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useWorkspacesApi, type WorkspaceInfo } from "../hooks/api/useWorkspacesApi";
import { getErrorMessage } from "../lib/errors";
import { Button, Avatar, Badge } from "../components/ui";
import { CustomUserButton } from "../components/user/CustomUserButton";
import { ChevronRight } from "lucide-react";
import { useGalleryMode, useGalleryMockData } from "../gallery/gallery-context";

const DOCS_URL = import.meta.env.DEV ? "http://localhost:3008" : "https://docs.openslaq.com";

function roleBadgeVariant(role: string): "amber" | "blue" | "gray" {
  switch (role) {
    case "owner":
      return "amber";
    case "admin":
      return "blue";
    default:
      return "gray";
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

  const isSignedOut = !isGallery && !user;
  const hasWorkspaces = !loading && workspaces.length > 0;
  const isEmpty = !loading && workspaces.length === 0 && !error;

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-surface border-b border-border-default">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">OpenSlaq</span>
          <div className="flex items-center gap-4">
            {!isGallery && !user && (
              <>
                <a href={DOCS_URL} className="text-sm text-muted hover:text-primary transition-colors" data-testid="nav-docs">Docs</a>
                <Link to="/install" className="text-sm text-muted hover:text-primary transition-colors" data-testid="nav-install">Install</Link>
              </>
            )}
            {!isGallery && (user ? <CustomUserButton /> : (
              <Button asChild size="sm" data-testid="sign-in-button">
                <Link to="/handler/sign-in">Sign in</Link>
              </Button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {!isSignedOut && loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-default border-t-slaq-blue" />
          </div>
        )}

        {error && workspaces.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-danger-text text-lg">{error}</p>
          </div>
        )}

        {isSignedOut && (
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold text-primary mb-2">Welcome to OpenSlaq</h1>
            <p className="text-muted text-lg mb-8">Sign in to get started</p>
            <Button asChild data-testid="sign-in-cta">
              <Link to="/handler/sign-in">Sign in</Link>
            </Button>
          </div>
        )}

        {!isSignedOut && isEmpty && (
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
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-primary">Workspaces</h1>
              <Link
                to="/create-workspace"
                data-testid="create-workspace-link"
                className="no-underline"
              >
                <Button variant="outline" size="sm">Create</Button>
              </Link>
            </div>

            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
              {workspaces.map((ws, i) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => navigate(`/w/${ws.slug}`)}
                  data-testid={`workspace-card-${ws.slug}`}
                  className={`w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-surface-secondary transition-colors cursor-pointer ${
                    i < workspaces.length - 1 ? "border-b border-border-default" : ""
                  }`}
                >
                  <Avatar
                    fallback={ws.name}
                    size="sm"
                    shape="circle"
                  />
                  <span className="font-medium text-primary truncate">{ws.name}</span>
                  <span className="text-sm text-faint font-mono">/{ws.slug}</span>
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    <Badge variant={roleBadgeVariant(ws.role)} size="sm">{ws.role}</Badge>
                    <span className="text-xs text-faint">{ws.memberCount}</span>
                    <ChevronRight className="w-4 h-4 text-faint" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
