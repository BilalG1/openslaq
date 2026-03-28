import type { ZodType } from "zod";

export const BEARER_SECURITY: { Bearer: string[] }[] = [{ Bearer: [] }];

export function jsonBody<T extends ZodType>(schema: T) {
  return { content: { "application/json": { schema } } };
}

export function jsonContent<T extends ZodType>(schema: T, description: string) {
  return {
    content: { "application/json": { schema } },
    description,
  };
}
