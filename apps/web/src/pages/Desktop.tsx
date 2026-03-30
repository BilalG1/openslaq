import { useEffect, useState } from "react";
import { Button } from "../components/ui";

const REPO = "bilalg1/openslaq";

function useLatestDesktopRelease() {
  const [dmgUrl, setDmgUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}/releases/tags/desktop-latest`)
      .then((r) => r.json())
      .then((release) => {
        const latestJson = release.assets?.find(
          (a: { name: string }) => a.name === "latest.json",
        );
        if (!latestJson) return;
        return fetch(latestJson.browser_download_url);
      })
      .then((r) => r?.json())
      .then((latest) => {
        if (!latest?.version) return;
        const version = latest.version;
        setDmgUrl(
          `https://github.com/${REPO}/releases/download/desktop-v${version}/OpenSlaq_${version}_aarch64.dmg`,
        );
      })
      .catch(() => {});
  }, []);

  return dmgUrl;
}

export function DesktopPage() {
  const dmgUrl = useLatestDesktopRelease();

  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-primary mb-3">OpenSlaq Desktop</h1>
        <p className="text-muted mb-10">
          Download the desktop app. macOS is available now, Windows and Linux are coming soon.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border-default bg-surface p-5">
            <h2 className="text-lg font-semibold text-primary mb-4">macOS</h2>
            <Button asChild className="w-full" disabled={!dmgUrl} data-testid="desktop-download-macos">
              <a href={dmgUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                {dmgUrl ? "Download for macOS" : "Loading..."}
              </a>
            </Button>
          </div>

          <div className="rounded-xl border border-border-default bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Windows</h2>
              <span className="text-xs text-muted">Coming soon</span>
            </div>
            <Button className="w-full" disabled data-testid="desktop-download-windows">
              Download for Windows
            </Button>
          </div>

          <div className="rounded-xl border border-border-default bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Linux</h2>
              <span className="text-xs text-muted">Coming soon</span>
            </div>
            <Button className="w-full" disabled data-testid="desktop-download-linux">
              Download for Linux
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
