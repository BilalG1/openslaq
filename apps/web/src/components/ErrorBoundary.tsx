import * as Sentry from "@sentry/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error);
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f0f10",
          color: "#e4e4e7",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#a1a1aa",
              fontSize: "0.925rem",
              lineHeight: 1.6,
              marginBottom: "1.5rem",
            }}
          >
            An unexpected error occurred. Try reloading the page.
          </p>
          <details
            style={{
              textAlign: "left",
              backgroundColor: "#1a1a1e",
              borderRadius: 8,
              padding: "1rem",
              marginBottom: "1.5rem",
              border: "1px solid #27272a",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                color: "#a1a1aa",
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
              }}
            >
              Error details
            </summary>
            <pre
              style={{
                fontSize: "0.8rem",
                color: "#ef4444",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                marginTop: "0.5rem",
              }}
            >
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "0.6rem 1.5rem",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
