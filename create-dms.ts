const API = "http://localhost:3001";
const WORKSPACE_SLUG = "stress-dms-gnhmjw";
const MY_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImRldi02ODc4QG9wZW5zbGFxLmxvY2FsIiwibmFtZSI6IkRldiBVc2VyIDY4NzgiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicHJvamVjdF9pZCI6IjkyNDU2NWM1LTYzNzctNDRiNy1hYTc1LTZiN2RlOGQzMTFmNCIsImJyYW5jaF9pZCI6Im1haW4iLCJyZWZyZXNoX3Rva2VuX2lkIjoiZGV2LXJ0LTUxMGQwYWY0LTNjMmMtNDYzOS05ZjVhLTM0YWNhMDFjNGIyYSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwic2VsZWN0ZWRfdGVhbV9pZCI6bnVsbCwiaXNfYW5vbnltb3VzIjpmYWxzZSwiaXNfcmVzdHJpY3RlZCI6ZmFsc2UsInJlc3RyaWN0ZWRfcmVhc29uIjpudWxsLCJzdWIiOiI1MTBkMGFmNC0zYzJjLTQ2MzktOWY1YS0zNGFjYTAxYzRiMmEiLCJpc3MiOiJodHRwczovL2FwaS5zdGFjay1hdXRoLmNvbS9hcGkvdjEvcHJvamVjdHMvOTI0NTY1YzUtNjM3Ny00NGI3LWFhNzUtNmI3ZGU4ZDMxMWY0IiwiYXVkIjoiOTI0NTY1YzUtNjM3Ny00NGI3LWFhNzUtNmI3ZGU4ZDMxMWY0IiwiaWF0IjoxNzczOTU2MjAwLCJleHAiOjE3NzQwNDI2MDB9.Jk_9bue1tjdIK5MabItYqaZNvODC6Jj2K4lBenDZUpk";

// Get workspace members
const membersRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/members`, {
  headers: { Authorization: `Bearer ${MY_TOKEN}` },
});
const members = await membersRes.json() as { id: string; userId?: string; displayName?: string; name?: string }[];
console.log(`Found ${members.length} workspace members`);

// Filter out the main user
const myId = "510d0af4-3c2c-4639-9f5a-34aca01c4b2a";
const otherMembers = members.filter((m) => m.id !== myId && m.userId !== myId);
console.log(`Other members: ${otherMembers.length}`);
console.log("Sample member:", JSON.stringify(otherMembers[0]).slice(0, 200));

// Get user IDs from members
for (let i = 0; i < otherMembers.length; i++) {
  const member = otherMembers[i];
  const userId = member.id || member.userId;
  const name = member.displayName || member.name || `User ${i}`;
  
  // Create DM
  const dmRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/dm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!dmRes.ok) {
    console.error(`Failed DM with ${name} (${userId}):`, dmRes.status, await dmRes.text());
    continue;
  }
  const dm = await dmRes.json() as { channel: { id: string } };
  const channelId = dm.channel.id;

  // Send a message from main user  
  const msgRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: `Hey ${name}! This is DM conversation #${i + 1}.` }),
  });
  
  if (msgRes.ok) {
    console.log(`DM ${i + 1}/${otherMembers.length}: ${name} ✓`);
  } else {
    console.error(`DM ${i + 1} msg failed:`, msgRes.status);
  }
}
console.log("Done!");
