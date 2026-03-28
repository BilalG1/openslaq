import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

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

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

  return (
    <WorkspaceDrawerContext.Provider value={value}>
      {children}
    </WorkspaceDrawerContext.Provider>
  );
}

export function useWorkspaceDrawer(): WorkspaceDrawerContextValue {
  const ctx = useContext(WorkspaceDrawerContext);
  if (!ctx) throw new Error("useWorkspaceDrawer must be used within WorkspaceDrawerProvider");
  return ctx;
}
