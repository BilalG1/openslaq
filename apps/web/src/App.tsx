import { StackHandler, StackProvider, StackTheme } from "@stackframe/react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { stackApp } from "./stack";
import { HomePage } from "./pages/Home";
import { WorkspaceListPage } from "./pages/WorkspaceList";
import { CreateWorkspacePage } from "./pages/CreateWorkspace";
import { InviteAcceptPage } from "./pages/InviteAccept";
import { DemoPage } from "./pages/Demo";
import { NotFoundPage } from "./pages/NotFound";
import { DesktopPage } from "./pages/Desktop";
import { InstallPage } from "./pages/Install";
import { HuddlePage } from "./pages/HuddlePage";
import { SocketProvider } from "./socket/SocketProvider";
import { ChatStoreProvider } from "./state/chat-store";
import { ThemeProvider } from "./theme/ThemeProvider";
import { TooltipProvider } from "./components/ui";
import { DeepLinkListener } from "./hooks/useDeepLink";
import { ErrorBoundary } from "./components/ErrorBoundary";

const GalleryPage = import.meta.env.DEV
  ? lazy(() => import("./gallery/GalleryPage").then((m) => ({ default: m.GalleryPage })))
  : () => null;

const ShowcasePage = import.meta.env.DEV
  ? lazy(() => import("./showcase/ShowcasePage").then((m) => ({ default: m.ShowcasePage })))
  : () => null;

const DevQuickSignInButton = import.meta.env.DEV
  ? lazy(() => import("./components/dev/DevQuickSignInButton").then((m) => ({ default: m.DevQuickSignInButton })))
  : () => null;

const AdminPage = lazy(() =>
  import("./pages/admin/AdminPage").then((m) => ({ default: m.AdminPage })),
);

const MarketplacePage = lazy(() =>
  import("./pages/MarketplacePage").then((m) => ({ default: m.MarketplacePage })),
);

function HandlerRoutes() {
  const location = useLocation();
  return (
    <>
      {import.meta.env.DEV && location.pathname === "/handler/sign-in" && (
        <Suspense fallback={null}>
          <DevQuickSignInButton />
        </Suspense>
      )}
      <StackHandler location={location.pathname} fullPage />
    </>
  );
}

export function App() {
  // Showcase uses hash navigation — render outside BrowserRouter
  if (import.meta.env.DEV && window.location.pathname.startsWith("/dev/components")) {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <ThemeProvider>
            <TooltipProvider>
              <StackProvider app={stackApp}>
                <ShowcasePage />
              </StackProvider>
            </TooltipProvider>
          </ThemeProvider>
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Gallery has its own MemoryRouter — render outside BrowserRouter to avoid nesting
  if (import.meta.env.DEV && window.location.pathname.startsWith("/dev/gallery")) {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <ThemeProvider>
            <TooltipProvider>
              <StackProvider app={stackApp}>
                <GalleryPage />
              </StackProvider>
            </TooltipProvider>
          </ThemeProvider>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <Suspense fallback={null}>
      <BrowserRouter>
        <ThemeProvider>
          <TooltipProvider>
            <Routes>
              <Route path="/demo/*" element={<DemoPage />} />
              <Route path="/desktop" element={<DesktopPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route
                path="/huddle/:channelId"
                element={
                  <StackProvider app={stackApp}>
                    <HuddlePage />
                  </StackProvider>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <StackProvider app={stackApp}>
                    <AdminPage />
                  </StackProvider>
                }
              />
              <Route
                path="/marketplace/*"
                element={
                  <StackProvider app={stackApp}>
                    <MarketplacePage />
                  </StackProvider>
                }
              />
              <Route
                path="*"
                element={
                  <StackProvider app={stackApp}>
                    <DeepLinkListener />
                    <SocketProvider>
                      <ChatStoreProvider>
                        <StackTheme>
                          <Routes>
                            <Route path="/handler/*" element={<HandlerRoutes />} />
                            <Route path="/invite/:code" element={<InviteAcceptPage />} />
                            <Route path="/w/:workspaceSlug/*" element={<HomePage />} />
                            <Route path="/create-workspace" element={<CreateWorkspacePage />} />
                            <Route path="/" element={<WorkspaceListPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                          </Routes>
                        </StackTheme>
                      </ChatStoreProvider>
                    </SocketProvider>
                  </StackProvider>
                }
              />
            </Routes>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Suspense>
    </ErrorBoundary>
  );
}
