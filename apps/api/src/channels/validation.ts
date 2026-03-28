import { z } from "@hono/zod-openapi";

export const createChannelSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().optional(),
  type: z.enum(["public", "private"]).optional().default("public"),
});

export const addChannelMemberSchema = z.object({
  userId: z.string().min(1),
});

export const addChannelMembersBulkSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
});

export const updateChannelSchema = z.object({
  description: z.string().max(500).nullable(),
});

export type CreateChannel = z.infer<typeof createChannelSchema>;
