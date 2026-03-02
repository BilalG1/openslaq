import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface WorkspaceDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const WorkspaceDrawerContext = createContext<WorkspaceDrawerContextValue | null>(null);

export function WorkspaceDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <WorkspaceDrawerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </WorkspaceDrawerContext.Provider>
  );
}

export function useWorkspaceDrawer(): WorkspaceDrawerContextValue {
  const ctx = useContext(WorkspaceDrawerContext);
  if (!ctx) throw new Error("useWorkspaceDrawer must be used within WorkspaceDrawerProvider");
  return ctx;
}
