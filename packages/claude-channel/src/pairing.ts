import { randomBytes } from "node:crypto";

export interface PairingRequest {
  code: string;
  userId: string;
  displayName: string;
  channelId: string;
  expiresAt: number;
}

const PAIRING_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class PairingManager {
  private pendingRequests = new Map<string, PairingRequest>();
  private pairedUsers = new Map<
    string,
    { displayName: string; channelId: string }
  >();

  constructor(preApprovedUserIds: Set<string>) {
    for (const userId of preApprovedUserIds) {
      // Pre-approved users start paired but without channel info yet.
      // channelId is populated on first message.
      this.pairedUsers.set(userId, { displayName: userId, channelId: "" });
    }
  }

  isPaired(userId: string): boolean {
    return this.pairedUsers.has(userId);
  }

  /** Update channel info for a paired user (on first message). */
  updatePairedUser(
    userId: string,
    displayName: string,
    channelId: string,
  ): void {
    const existing = this.pairedUsers.get(userId);
    if (existing) {
      this.pairedUsers.set(userId, { displayName, channelId });
    }
  }

  getChannelId(userId: string): string | undefined {
    return this.pairedUsers.get(userId)?.channelId;
  }

  createPairingRequest(
    userId: string,
    displayName: string,
    channelId: string,
  ): PairingRequest {
    // Clean up expired requests
    const now = Date.now();
    for (const [code, req] of this.pendingRequests) {
      if (req.expiresAt < now) this.pendingRequests.delete(code);
    }

    // Check if there's already a pending request for this user
    for (const [, req] of this.pendingRequests) {
      if (req.userId === userId && req.expiresAt > now) {
        return req;
      }
    }

    const code = randomBytes(4).toString("hex").toUpperCase();
    const request: PairingRequest = {
      code,
      userId,
      displayName,
      channelId,
      expiresAt: now + PAIRING_TTL_MS,
    };
    this.pendingRequests.set(code, request);
    return request;
  }

  approvePairing(code: string): PairingRequest | null {
    const request = this.pendingRequests.get(code);
    if (!request || request.expiresAt < Date.now()) {
      this.pendingRequests.delete(code);
      return null;
    }
    this.pendingRequests.delete(code);
    this.pairedUsers.set(request.userId, {
      displayName: request.displayName,
      channelId: request.channelId,
    });
    return request;
  }

  rejectPairing(code: string): PairingRequest | null {
    const request = this.pendingRequests.get(code);
    this.pendingRequests.delete(code);
    return request ?? null;
  }

  listPairedUsers(): Array<{ userId: string; displayName: string }> {
    return [...this.pairedUsers.entries()].map(([userId, info]) => ({
      userId,
      displayName: info.displayName,
    }));
  }
}
