import { createContext, useContext } from "react";

interface HomeActionsContextValue {
  openCreateChannel: () => void;
  openNewDm: () => void;
}

const HomeActionsContext = createContext<HomeActionsContextValue | null>(null);

export const HomeActionsProvider = HomeActionsContext.Provider;

export function useHomeActions(): HomeActionsContextValue {
  const ctx = useContext(HomeActionsContext);
  if (!ctx) {
    throw new Error("useHomeActions must be used within a HomeActionsProvider");
  }
  return ctx;
}
