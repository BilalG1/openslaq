import { useState } from "react";
import { performDevQuickSignIn } from "../../lib/dev-auth";
import { env } from "../../env";

export function DevQuickSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!env.VITE_E2E_TEST_SECRET) return null;

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await performDevQuickSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="px-3 py-1.5 rounded-md text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 border-none cursor-pointer shadow-lg"
      >
        {loading ? "Signing in..." : "Dev Quick Sign In"}
      </button>
      {error && (
        <span className="text-xs text-red-500 bg-white/90 px-2 py-1 rounded shadow">
          {error}
        </span>
      )}
    </div>
  );
}
