import { join } from "node:path";
import { homedir } from "node:os";

export const STACK_AUTH_BASE =
  process.env.OPENSLAQ_STACK_AUTH_BASE ?? "https://api.stack-auth.com";

export const STACK_PROJECT_ID =
  process.env.OPENSLAQ_STACK_PROJECT_ID ??
  "924565c5-6377-44b7-aa75-6b7de8d311f4";

export const STACK_PUBLISHABLE_KEY =
  process.env.OPENSLAQ_STACK_PUBLISHABLE_KEY ??
  "pck_mzrc4yyt8zgpzxcnysj55e7s6365ebs5rrtg6v14cfvrr";

export const API_URL =
  process.env.OPENSLAQ_API_URL ?? "https://api.openslaq.com";

export const TOKEN_DIR =
  process.env.OPENSLAQ_TOKEN_DIR ?? join(homedir(), ".openslaq");
export const TOKEN_FILE =
  process.env.OPENSLAQ_TOKEN_FILE ?? join(TOKEN_DIR, "auth.json");
