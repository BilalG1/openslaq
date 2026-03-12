import { randomBytes } from "node:crypto";
import { hashToken } from "../bots/token";

const TOKEN_PREFIX = "osk_";

export function generateUserApiKey() {
  const raw = randomBytes(32).toString("base64url");
  const token = `${TOKEN_PREFIX}${raw}`;
  const hash = hashToken(token);
  const prefix = token.slice(0, TOKEN_PREFIX.length + 8);
  return { token, hash, prefix };
}

export { hashToken };
