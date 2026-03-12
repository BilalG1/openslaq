import * as http2 from "node:http2";
import * as fs from "node:fs";
import { SignJWT, importPKCS8 } from "jose";
import { env } from "../env";

const SANDBOX_URL = "https://api.sandbox.push.apple.com";
const PRODUCTION_URL = "https://api.push.apple.com";

let cachedKey: CryptoKey | null = null;
let cachedJwt: string | null = null;
let jwtIssuedAt = 0;
const JWT_TTL_MS = 55 * 60 * 1000; // 55 minutes (APNs tokens valid for 1 hour)

let session: http2.ClientHttp2Session | null = null;
let sessionConnecting = false;

// Injectable APNS sender for testing
type ApnsSendFn = (token: string, payload: ApnsPayload) => Promise<ApnsResult>;
let customSender: ApnsSendFn | null = null;
let fakeApnsEnabled = false;
const sentLog: Array<{ token: string; payload: ApnsPayload; result: ApnsResult }> = [];

export function setApnsSender(fn: ApnsSendFn): void {
  customSender = fn;
  fakeApnsEnabled = true;
}

export function resetApnsSender(): void {
  customSender = null;
  fakeApnsEnabled = false;
}

export function getApnsSentLog() {
  return sentLog;
}

export function clearApnsSentLog() {
  sentLog.length = 0;
}

export function isApnsConfigured(): boolean {
  return fakeApnsEnabled || !!(env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_KEY_PATH);
}

async function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const keyData = fs.readFileSync(env.APNS_KEY_PATH!, "utf-8");
  cachedKey = await importPKCS8(keyData, "ES256");
  return cachedKey;
}

async function getJwt(): Promise<string> {
  const now = Date.now();
  if (cachedJwt && now - jwtIssuedAt < JWT_TTL_MS) {
    return cachedJwt;
  }

  const key = await getSigningKey();
  const issuedAtSec = Math.floor(now / 1000);

  cachedJwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APNS_KEY_ID! })
    .setIssuer(env.APNS_TEAM_ID!)
    .setIssuedAt(issuedAtSec)
    .sign(key);

  jwtIssuedAt = now;
  return cachedJwt;
}

function getApnsUrl(): string {
  return env.APNS_ENVIRONMENT === "production" ? PRODUCTION_URL : SANDBOX_URL;
}

function getSession(): Promise<http2.ClientHttp2Session> {
  if (session && !session.closed && !session.destroyed) {
    return Promise.resolve(session);
  }

  if (sessionConnecting) {
    return new Promise((resolve, reject) => {
      const check = () => {
        if (session && !session.closed && !session.destroyed) {
          resolve(session);
        } else if (!sessionConnecting) {
          reject(new Error("APNs session failed to connect"));
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  sessionConnecting = true;

  return new Promise((resolve, reject) => {
    const s = http2.connect(getApnsUrl());

    s.on("connect", () => {
      session = s;
      sessionConnecting = false;
      resolve(s);
    });

    s.on("error", (err) => {
      console.error("[APNs] HTTP/2 session error:", err.message);
      sessionConnecting = false;
      session = null;
      reject(err);
    });

    s.on("close", () => {
      session = null;
    });
  });
}

export interface ApnsPayload {
  aps: {
    alert: {
      title: string;
      subtitle?: string;
      body: string;
    };
    badge?: number;
    sound?: string;
    "thread-id"?: string;
  };
  [key: string]: unknown;
}

export interface ApnsResult {
  success: boolean;
  statusCode: number;
  reason?: string;
}

async function sendApnsNotificationReal(
  deviceToken: string,
  payload: ApnsPayload,
): Promise<ApnsResult> {
  const jwt = await getJwt();
  const s = await getSession();

  return new Promise((resolve) => {
    const req = s.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": env.APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    const body = JSON.stringify(payload);
    let responseData = "";

    req.on("response", (headers) => {
      const statusCode = headers[":status"] as number;

      req.on("data", (chunk: Buffer) => {
        responseData += chunk.toString();
      });

      req.on("end", () => {
        if (statusCode === 200) {
          resolve({ success: true, statusCode });
        } else {
          let reason = "Unknown";
          try {
            const parsed = JSON.parse(responseData) as { reason?: string };
            reason = parsed.reason ?? "Unknown";
          } catch {
            // ignore parse error
          }
          resolve({ success: false, statusCode, reason });
        }
      });
    });

    req.on("error", (err) => {
      console.error("[APNs] Request error:", err.message);
      resolve({ success: false, statusCode: 0, reason: err.message });
    });

    req.end(body);
  });
}

export async function sendApnsNotification(
  deviceToken: string,
  payload: ApnsPayload,
): Promise<ApnsResult> {
  const sender = customSender ?? sendApnsNotificationReal;
  const result = await sender(deviceToken, payload);
  sentLog.push({ token: deviceToken, payload, result });
  return result;
}

/** Clean up the HTTP/2 session (for graceful shutdown) */
export function closeApnsSession(): void {
  if (session && !session.closed) {
    session.close();
  }
  session = null;
}
