import { Button } from "../components/ui";
import { Link } from "react-router-dom";

const RELEASE_URL = "https://github.com/bgodil/openslaq/releases/latest";
const DOCS_URL = import.meta.env.DEV ? "http://localhost:3008" : "https://docs.openslaq.com";

export function InstallPage() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <nav className="sticky top-0 z-10 bg-surface border-b border-border-default">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary no-underline">OpenSlaq</Link>
          <div className="flex items-center gap-4">
            <a href={DOCS_URL} className="text-sm text-muted hover:text-primary transition-colors" data-testid="nav-docs">Docs</a>
            <Link to="/install" className="text-sm text-muted hover:text-primary transition-colors" data-testid="nav-install">Install</Link>
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
            <Button asChild className="w-full">
              <a href={RELEASE_URL} target="_blank" rel="noopener noreferrer">
                Download for macOS
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
