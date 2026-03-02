import { db } from "../db";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";

/**
 * Get or lazily create the Slaqbot system user for a workspace.
 * Not a full bot app — just a user row for sending ephemeral/DM messages.
 */
export async function getOrCreateSlaqbot(workspaceId: string): Promise<{
  id: string;
  displayName: string;
}> {
  const slaqbotId = `slaqbot:${workspaceId}`;

  // Upsert user
  await db
    .insert(users)
    .values({
      id: slaqbotId,
      displayName: "Slaqbot",
      email: `slaqbot-${workspaceId}@system.openslaq`,
    })
    .onConflictDoNothing();

  // Upsert workspace membership
  await db
    .insert(workspaceMembers)
    .values({
      workspaceId,
      userId: slaqbotId,
      role: "member",
    })
    .onConflictDoNothing();

  return { id: slaqbotId, displayName: "Slaqbot" };
}
