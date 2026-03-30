export interface AuthProvider {
  getAccessToken(): Promise<string | null>;
  requireAccessToken(): Promise<string>;
  /** Attempt to refresh the access token. Returns the new token or null if refresh failed. */
  refreshAccessToken?: () => Promise<string | null>;
  onAuthRequired(): void;
}

export interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
