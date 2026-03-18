import { rateLimit, rateLimitByIp } from "./middleware";

// Tier 1 - Writes
export const rlMessageSend = rateLimit({ bucket: "message-send", max: 30, windowSec: 60 });
export const rlFileUpload = rateLimit({ bucket: "file-upload", max: 10, windowSec: 60 });
export const rlChannelCreate = rateLimit({ bucket: "channel-create", max: 10, windowSec: 60 });
export const rlWorkspaceCreate = rateLimit({ bucket: "workspace-create", max: 3, windowSec: 60 });

// Tier 2 - Mutations
export const rlPin = rateLimit({ bucket: "pin", max: 30, windowSec: 60 });
export const rlReaction = rateLimit({ bucket: "reaction", max: 30, windowSec: 60 });
export const rlChannelJoinLeave = rateLimit({ bucket: "channel-join-leave", max: 10, windowSec: 60 });
export const rlMarkAsRead = rateLimit({ bucket: "mark-as-read", max: 60, windowSec: 60 });
export const rlProfileUpdate = rateLimit({ bucket: "profile-update", max: 10, windowSec: 60 });
export const rlInviteAdmin = rateLimit({ bucket: "invite-admin", max: 10, windowSec: 60 });
export const rlMemberManage = rateLimit({ bucket: "member-manage", max: 20, windowSec: 60 });

// Tier 2b - Huddle
export const rlHuddleJoin = rateLimit({ bucket: "huddle-join", max: 10, windowSec: 60 });

// Tier 3 - Reads
export const rlRead = rateLimit({ bucket: "read", max: 120, windowSec: 60 });

// Tier 4 - Brute-force (IP-based)
export const rlInviteAccept = rateLimitByIp({ bucket: "invite-accept", max: 5, windowSec: 60 });
export const rlInvitePreview = rateLimitByIp({ bucket: "invite-preview", max: 20, windowSec: 60 });

// Tier 5 - Bot API
export const rlBotSend = rateLimit({ bucket: "bot-send", max: 60, windowSec: 60 });
export const rlBotRead = rateLimit({ bucket: "bot-read", max: 240, windowSec: 60 });
