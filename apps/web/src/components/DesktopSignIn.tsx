import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "../lib/tauri";
import { initiateDeviceFlow, pollForToken, refreshAccessToken } from "../lib/device-flow";
import { setStackAuthCookies } from "../lib/desktop-auth";
import { getWebOrigin } from "../lib/web-url";

type Status = "idle" | "loading" | "polling" | "exchanging" | "done" | "error";

/**
 * Desktop sign-in via device flow.
 * Opens the web app in the system browser so the user can authenticate
 * with their existing browser session, then polls for the token.
 */
export function DesktopSignIn() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSignIn = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);

      const { pollingCode, loginCode } = await initiateDeviceFlow();

      // Open the web app's sign-in confirmation page in the system browser.
      const loginUrl = `${getWebOrigin()}/handler/cli-auth-confirm?login_code=${loginCode}`;

      // Use Tauri internals directly to open URL in system browser
      const tauri = (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ as
        { invoke: (cmd: string, args?: unknown) => Promise<unknown> } | undefined;
      if (tauri) {
        await tauri.invoke("plugin:opener|open_url", { url: loginUrl });
      } else {
        window.open(loginUrl, "_blank");
      }

      setStatus("polling");
      const abort = new AbortController();
      abortRef.current = abort;

      const refreshToken = await pollForToken(pollingCode, abort.signal);

      setStatus("exchanging");
      const accessToken = await refreshAccessToken(refreshToken);

      setStackAuthCookies(refreshToken, accessToken);

      setStatus("done");
      // Reload to let Stack Auth SDK pick up the cookies
      window.location.href = "/";
    } catch (e) {
      if (e instanceof Error && e.message === "Polling cancelled") return;
      setError(e instanceof Error ? e.message : "Sign in failed");
      setStatus("error");
    }
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!isTauri()) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Sign in to OpenSlaq</h1>

      {status === "idle" || status === "error" ? (
        <>
          <p style={{ color: "#666", textAlign: "center", maxWidth: 360 }}>
            Sign in using your browser where you're already logged in to your accounts.
          </p>
          <button
            onClick={handleSignIn}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Sign in with Browser
          </button>
          {error && (
            <p style={{ color: "#ef4444", fontSize: 14 }}>{error}</p>
          )}
        </>
      ) : status === "loading" ? (
        <p style={{ color: "#666" }}>Starting sign in...</p>
      ) : status === "polling" ? (
        <>
          <p style={{ color: "#666", textAlign: "center", maxWidth: 360 }}>
            Complete sign in in your browser, then return here.
          </p>
          <p style={{ color: "#999", fontSize: 14 }}>Waiting for confirmation...</p>
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              backgroundColor: "transparent",
              color: "#666",
              border: "1px solid #ddd",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </>
      ) : status === "exchanging" ? (
        <p style={{ color: "#666" }}>Completing sign in...</p>
      ) : null}
    </div>
  );
}
