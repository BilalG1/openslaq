import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "./schema";

export async function getUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function updateUser(
  id: string,
  data: {
    displayName?: string;
    avatarUrl?: string | null;
    statusEmoji?: string | null;
    statusText?: string | null;
    statusExpiresAt?: Date | null;
  },
) {
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export function isStatusExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function sanitizeUserStatus<
  T extends { statusEmoji: string | null; statusText: string | null; statusExpiresAt: Date | null },
>(user: T): { statusEmoji: string | null; statusText: string | null; statusExpiresAt: string | null } {
  if (isStatusExpired(user.statusExpiresAt)) {
    return { statusEmoji: null, statusText: null, statusExpiresAt: null };
  }
  return {
    statusEmoji: user.statusEmoji,
    statusText: user.statusText,
    statusExpiresAt: user.statusExpiresAt?.toISOString() ?? null,
  };
}

export async function upsertUser(id: string, email: string, displayName: string) {
  await db
    .insert(users)
    .values({
      id,
      email,
      displayName,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        updatedAt: new Date(),
      },
    });
}
