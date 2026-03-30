import { join } from "node:path";
import { homedir } from "node:os";

export const STACK_AUTH_BASE =
  process.env.OPENSLAQ_STACK_AUTH_BASE ?? "https://api.stack-auth.com";

export const STACK_PROJECT_ID =
  process.env.OPENSLAQ_STACK_PROJECT_ID ??
  "79000fc8-b4b7-4414-8eee-3e5207d2b4e4";

export const STACK_PUBLISHABLE_KEY =
  process.env.OPENSLAQ_STACK_PUBLISHABLE_KEY ??
  "pck_fmw6v8awqkbxen1cf97mxx4wxd86hdd008rrp33dg2400";

export const WEB_URL =
  process.env.OPENSLAQ_WEB_URL ?? "https://openslaq.com";

export const API_URL =
  process.env.OPENSLAQ_API_URL ?? process.env.VITE_API_URL ?? "https://api.openslaq.com";

export const TOKEN_DIR =
  process.env.OPENSLAQ_TOKEN_DIR ?? join(homedir(), ".openslaq");
export const TOKEN_FILE =
  process.env.OPENSLAQ_TOKEN_FILE ?? join(TOKEN_DIR, "auth.json");
