import { Button, Tooltip } from "../components/ui";
import { Link } from "react-router-dom";
import { BookOpen, Download, Github } from "lucide-react";
import { useEffect, useState } from "react";

const DOCS_URL = import.meta.env.DEV ? "http://localhost:3008" : "https://docs.openslaq.com";
const RELEASES_API = "https://api.github.com/repos/bilalg1/openslaq/releases";

function useDesktopDmgUrl() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${RELEASES_API}?per_page=20`)
      .then((r) => r.json())
      .then((releases: { tag_name: string; assets: { name: string; browser_download_url: string }[] }[]) => {
        const release = releases.find((r) => r.tag_name.startsWith("desktop-v"));
        const dmg = release?.assets.find((a) => a.name.endsWith(".dmg"));
        if (dmg) setUrl(dmg.browser_download_url);
      })
      .catch(() => {});
  }, []);
  return url;
}

export function InstallPage() {
  const dmgUrl = useDesktopDmgUrl();
  return (
    <div className="min-h-screen bg-surface-secondary">
      <nav className="sticky top-0 z-10 bg-surface border-b border-border-default">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary no-underline">OpenSlaq</Link>
          <div className="flex items-center gap-3">
            <Tooltip content="Docs">
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors" data-testid="nav-docs">
                <BookOpen className="w-5 h-5" />
              </a>
            </Tooltip>
            <Tooltip content="Install">
              <Link to="/install" className="text-muted hover:text-primary transition-colors" data-testid="nav-install">
                <Download className="w-5 h-5" />
              </Link>
            </Tooltip>
            <Tooltip content="GitHub">
              <a href="https://github.com/bilalg1/openslaq" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors" data-testid="nav-github">
                <Github className="w-5 h-5" />
              </a>
            </Tooltip>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-primary mb-3">Install OpenSlaq</h1>
        <p className="text-muted mb-10">
          Get OpenSlaq on your desktop, phone, or terminal.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-xl border border-border-default bg-surface p-5" data-testid="install-desktop">
            <h2 className="text-lg font-semibold text-primary mb-2">Desktop</h2>
            <p className="text-sm text-muted mb-4">macOS app — Windows and Linux coming soon.</p>
            <Button asChild className="w-full" disabled={!dmgUrl}>
              <a href={dmgUrl ?? "#"} target="_blank" rel="noopener noreferrer" {...(dmgUrl ? {} : { onClick: (e: React.MouseEvent) => e.preventDefault() })}>
                {dmgUrl ? "Download for macOS" : "Loading…"}
              </a>
            </Button>
          </div>

          <div className="rounded-xl border border-border-default bg-surface p-5" data-testid="install-mobile">
            <h2 className="text-lg font-semibold text-primary mb-2">Mobile</h2>
            <p className="text-sm text-muted mb-4">iOS and Android apps coming soon.</p>
            <Button className="w-full" disabled>
              Coming soon
            </Button>
          </div>

          <div className="rounded-xl border border-border-default bg-surface p-5" data-testid="install-cli">
            <h2 className="text-lg font-semibold text-primary mb-2">CLI</h2>
            <p className="text-sm text-muted mb-4">Install via your terminal.</p>
            <pre className="bg-surface-secondary rounded-lg p-3 text-sm text-primary overflow-x-auto">
              <code>curl -fsSL https://openslaq.com/install.sh | sh</code>
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
