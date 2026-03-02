import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { redirectToAuth } from "../lib/auth";
import { useInvitesApi } from "../hooks/api/useInvitesApi";
import { getErrorMessage } from "../lib/errors";
import { Button } from "../components/ui";

export function InviteAcceptPage() {
  const user = useCurrentUser();

  useEffect(() => {
    if (!user) void redirectToAuth();
  }, [user]);
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const { getInvite, acceptInvite } = useInvitesApi();

  useEffect(() => {
    if (!user || !code) return;
    const inviteCode = code;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const invite = await getInvite(inviteCode);
        if (!cancelled) {
          setWorkspaceName(invite.workspaceName);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load invite"));
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
  }, [code, getInvite, user]);

  const handleAccept = async () => {
    if (!user || !code) return;
    setAccepting(true);
    setError(null);

    try {
      const data = await acceptInvite(code);
      navigate(`/w/${data.slug}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to accept invite"));
      setAccepting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface rounded-xl shadow-sm border border-border-default p-8 text-center">
        {loading ? (
          <p className="text-muted">Loading invite...</p>
        ) : error ? (
          <>
            <h1 className="text-2xl font-bold text-primary mb-2">Invalid Invite</h1>
            <p className="text-muted mb-8">{error}</p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate("/")}
            >
              Go to Workspaces
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-primary mb-2">You've been invited!</h1>
            <p className="text-muted mb-8">
              You've been invited to join <strong>{workspaceName}</strong>
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? "Joining..." : "Accept Invite"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
