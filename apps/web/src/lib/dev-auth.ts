import * as jose from "jose";
import { env } from "../env";

const STORAGE_KEY = "openslaq-dev-session";

const STACK_AUTH_BASE = "https://api.stack-auth.com/api/v1";

export interface DevSession {
  userId: string;
  displayName: string;
  email: string;
  accessToken: string;
}

export function hasDevSession(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function getDevSession(): DevSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DevSession;
  } catch {
    return null;
  }
}

export function clearDevSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function saveDevSession(session: DevSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function signDevJwt(userId: string, email: string, displayName: string): Promise<string> {
  const testSecret = env.VITE_E2E_TEST_SECRET;
  if (!testSecret) throw new Error("VITE_E2E_TEST_SECRET is not set");

  const projectId = env.VITE_STACK_PROJECT_ID;
  const issuer = `${STACK_AUTH_BASE}/projects/${projectId}`;
  const secret = new TextEncoder().encode(testSecret);

  return await new jose.SignJWT({
    email,
    name: displayName,
    email_verified: true,
    project_id: projectId,
    branch_id: "main",
    refresh_token_id: `dev-rt-${userId}`,
    role: "authenticated",
    selected_team_id: null,
    is_anonymous: false,
    is_restricted: false,
    restricted_reason: null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(projectId)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export async function performDevQuickSignIn(): Promise<void> {
  const n = Math.floor(Math.random() * 10000);
  const userId = crypto.randomUUID();
  const displayName = `Dev User ${n}`;
  const email = `dev-${n}@openslaq.local`;

  const accessToken = await signDevJwt(userId, email, displayName);
  saveDevSession({ userId, displayName, email, accessToken });
  window.location.assign("/");
}

export interface DevUser {
  id: string;
  displayName: string;
  primaryEmail: string;
  profileImageUrl: string | null;
  getAuthJson: () => Promise<{ accessToken: string }>;
  update: (data: { displayName?: string; profileImageUrl?: string }) => Promise<void>;
}

export function createDevUser(session: DevSession): DevUser {
  return {
    id: session.userId,
    displayName: session.displayName,
    primaryEmail: session.email,
    profileImageUrl: null,
    getAuthJson: async () => ({ accessToken: session.accessToken }),
    update: async (data) => {
      const current = getDevSession();
      if (!current) return;
      if (data.displayName) current.displayName = data.displayName;
      saveDevSession(current);
    },
  };
}
