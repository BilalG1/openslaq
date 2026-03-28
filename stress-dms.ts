import * as jose from "jose";

const SECRET = "openslaq-e2e-test-secret-do-not-use-in-prod";
const PROJECT_ID = "924565c5-6377-44b7-aa75-6b7de8d311f4";
const ISSUER = `https://api.stack-auth.com/api/v1/projects/${PROJECT_ID}`;
const API = "http://localhost:3001";
const WORKSPACE_SLUG = "stress-dms-gnhmjw";
const MY_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImRldi02ODc4QG9wZW5zbGFxLmxvY2FsIiwibmFtZSI6IkRldiBVc2VyIDY4NzgiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicHJvamVjdF9pZCI6IjkyNDU2NWM1LTYzNzctNDRiNy1hYTc1LTZiN2RlOGQzMTFmNCIsImJyYW5jaF9pZCI6Im1haW4iLCJyZWZyZXNoX3Rva2VuX2lkIjoiZGV2LXJ0LTUxMGQwYWY0LTNjMmMtNDYzOS05ZjVhLTM0YWNhMDFjNGIyYSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwic2VsZWN0ZWRfdGVhbV9pZCI6bnVsbCwiaXNfYW5vbnltb3VzIjpmYWxzZSwiaXNfcmVzdHJpY3RlZCI6ZmFsc2UsInJlc3RyaWN0ZWRfcmVhc29uIjpudWxsLCJzdWIiOiI1MTBkMGFmNC0zYzJjLTQ2MzktOWY1YS0zNGFjYTAxYzRiMmEiLCJpc3MiOiJodHRwczovL2FwaS5zdGFjay1hdXRoLmNvbS9hcGkvdjEvcHJvamVjdHMvOTI0NTY1YzUtNjM3Ny00NGI3LWFhNzUtNmI3ZGU4ZDMxMWY0IiwiYXVkIjoiOTI0NTY1YzUtNjM3Ny00NGI3LWFhNzUtNmI3ZGU4ZDMxMWY0IiwiaWF0IjoxNzczOTU2MjAwLCJleHAiOjE3NzQwNDI2MDB9.Jk_9bue1tjdIK5MabItYqaZNvODC6Jj2K4lBenDZUpk";

const FIRST_NAMES = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy",
  "Karl", "Laura", "Mike", "Nancy", "Oscar", "Peggy", "Quinn", "Rita", "Steve", "Tina",
  "Uma", "Victor", "Wendy", "Xander", "Yuki", "Zara", "Amit", "Bella", "Chris", "Diana"];

async function signJwt(userId: string, email: string, displayName: string): Promise<string> {
  const secret = new TextEncoder().encode(SECRET);
  return await new jose.SignJWT({
    email,
    name: displayName,
    email_verified: true,
    project_id: PROJECT_ID,
    branch_id: "main",
    refresh_token_id: `stress-rt-${userId}`,
    role: "authenticated",
    selected_team_id: null,
    is_anonymous: false,
    is_restricted: false,
    restricted_reason: null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(PROJECT_ID)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

async function main() {
  // Step 1: Create an invite link with the main user
  console.log("Creating invite...");
  const inviteRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/invites`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!inviteRes.ok) {
    console.error("Failed to create invite:", inviteRes.status, await inviteRes.text());
    return;
  }
  const invite = await inviteRes.json() as { code: string };
  console.log("Invite code:", invite.code);

  // Step 2: Create 30 fake users, upsert them, join workspace
  const fakeUsers: { id: string; token: string; name: string }[] = [];
  
  for (let i = 0; i < 30; i++) {
    const userId = crypto.randomUUID();
    const name = `${FIRST_NAMES[i]} Testuser`;
    const email = `${FIRST_NAMES[i].toLowerCase()}-stress@openslaq.local`;
    const token = await signJwt(userId, email, name);

    // Upsert user by calling /api/users/me
    const meRes = await fetch(`${API}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) {
      console.error(`Failed to upsert user ${name}:`, meRes.status);
      continue;
    }

    // Accept invite to join workspace
    const acceptRes = await fetch(`${API}/api/invites/${invite.code}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!acceptRes.ok) {
      console.error(`Failed to join workspace for ${name}:`, acceptRes.status, await acceptRes.text());
      continue;
    }

    fakeUsers.push({ id: userId, token, name });
    console.log(`Created user ${i + 1}/30: ${name} (${userId})`);
  }

  console.log(`\nCreated ${fakeUsers.length} users. Creating DMs...`);

  // Step 3: Create DM channels with each fake user and send messages
  for (let i = 0; i < fakeUsers.length; i++) {
    const user = fakeUsers[i];
    
    // Create DM from main user to fake user
    const dmRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/dms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MY_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    if (!dmRes.ok) {
      console.error(`Failed to create DM with ${user.name}:`, dmRes.status, await dmRes.text());
      continue;
    }
    const dm = await dmRes.json() as { channel: { id: string } };
    const channelId = dm.channel.id;

    // Send a message from main user
    const msgRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MY_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: `Hey ${user.name}! This is DM #${i + 1}. How are you doing?` }),
    });
    if (!msgRes.ok) {
      console.error(`Failed to send message in DM with ${user.name}:`, msgRes.status);
      continue;
    }

    // Send a reply from the fake user
    const replyRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: `Hey! I'm ${user.name}, doing great! Thanks for reaching out in DM #${i + 1}.` }),
    });
    if (!replyRes.ok) {
      console.error(`Failed to send reply from ${user.name}:`, replyRes.status);
    }

    console.log(`DM ${i + 1}/30 created with ${user.name} (channel: ${channelId})`);
  }

  console.log("\nDone! All DMs created.");
}

main().catch(console.error);
