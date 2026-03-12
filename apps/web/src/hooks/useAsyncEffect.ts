import { useEffect, type DependencyList } from "react";

export function useAsyncEffect(
  effect: (signal: { cancelled: boolean }) => Promise<void>,
  deps: DependencyList,
): void {
  useEffect(() => {
    const signal = { cancelled: false };
    void effect(signal);
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
