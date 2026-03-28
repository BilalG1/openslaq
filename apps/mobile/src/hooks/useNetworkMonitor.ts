import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

/**
 * Monitors OS-level network connectivity via NetInfo.
 * Returns current network state so consumers can react to offline/online transitions.
 */
export function useNetworkMonitor(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
  });

  useEffect(() => {
    return NetInfo.addEventListener((netState) => {
      setState({
        isConnected: netState.isConnected ?? false,
        isInternetReachable: netState.isInternetReachable ?? null,
      });
    });
  }, []);

  return state;
}
