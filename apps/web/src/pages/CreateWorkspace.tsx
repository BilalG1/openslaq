import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useWorkspacesApi } from "../hooks/api/useWorkspacesApi";
import { redirectToAuth } from "../lib/auth";
import { Button, Input } from "../components/ui";
import { CustomUserButton } from "../components/user/CustomUserButton";

export function CreateWorkspacePage() {
  const user = useCurrentUser();

  useEffect(() => {
    if (!user) void redirectToAuth();
  }, [user]);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { createWorkspace } = useWorkspacesApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setError(null);
    setCreating(true);
    try {
      const result = await createWorkspace(name.trim());
      if (result.ok) {
        navigate(`/w/${result.slug}`);
      } else {
        setError(result.error);
      }
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-surface border-b border-border-default">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary no-underline">OpenSlaq</Link>
          <CustomUserButton />
        </div>
      </nav>

      <main className="max-w-md mx-auto px-6 py-16">
        <Link to="/" className="text-sm text-slaq-blue hover:underline mb-6 inline-block no-underline" data-testid="back-to-workspaces">
          &larr; Back to workspaces
        </Link>

        <h1 className="text-2xl font-bold text-primary mb-6">Create a workspace</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="workspace-name" className="block text-sm font-medium text-secondary mb-1">
              Workspace name
            </label>
            <Input
              id="workspace-name"
              type="text"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="workspace-name-input"
              className="w-full"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-danger-text text-sm mb-4" data-testid="create-workspace-error">{error}</p>
          )}

          <Button type="submit" disabled={creating || !name.trim()} data-testid="create-workspace-submit">
            {creating ? "Creating..." : "Create workspace"}
          </Button>
        </form>
      </main>
    </div>
  );
}
