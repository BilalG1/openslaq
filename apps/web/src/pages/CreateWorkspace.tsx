import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useWorkspacesApi } from "../hooks/api/useWorkspacesApi";
import { redirectToAuth } from "../lib/auth";
import { Button, Input } from "../components/ui";

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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — decorative */}
      <div className="hidden md:flex md:w-1/2 bg-slaq-blue flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Build your team's home
          </h2>
          <p className="text-white/80 text-lg">
            A workspace brings your people, conversations, and tools together in one place.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 bg-surface flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="max-w-md w-full mx-auto">
          <Link to="/" className="text-xl font-bold text-primary no-underline mb-12 inline-block">
            OpenSlaq
          </Link>

          <h1 className="text-3xl font-bold text-primary mb-2">Create a workspace</h1>
          <p className="text-secondary mb-8">Give your workspace a name to get started.</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="workspace-name" className="block text-sm font-medium text-secondary mb-2">
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

            <Button type="submit" disabled={creating || !name.trim()} data-testid="create-workspace-submit" className="w-full">
              {creating ? "Creating..." : "Create workspace"}
            </Button>
          </form>

          <div className="mt-8">
            <Link to="/" className="text-sm text-slaq-blue hover:underline no-underline" data-testid="back-to-workspaces">
              Back to workspaces
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
