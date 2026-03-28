import { stackApp } from "../stack";
import { AuthError } from "@openslaq/client-core";
import { clearDevSession } from "./dev-auth";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

type AuthUser = AuthJsonUser | null | undefined;

export async function getAccessToken(user: AuthUser): Promise<string | null> {
  if (!user) return null;
  const authJson = await user.getAuthJson();
  return authJson.accessToken ?? null;
}

export async function requireAccessToken(user: AuthUser): Promise<string> {
  const token = await getAccessToken(user);
  if (!token) {
    throw new AuthError();
  }
  return token;
}

export async function redirectToAuth(): Promise<void> {
  clearDevSession();
  await stackApp.signOut();
  window.location.assign("/handler/sign-in");
}
