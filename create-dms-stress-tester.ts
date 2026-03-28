const API = "http://localhost:3001";
const WORKSPACE_SLUG = "stress-dms-gnhmjw";
const STRESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InN0cmVzcy10ZXN0QG9wZW5zbGFxLmxvY2FsIiwibmFtZSI6IlN0cmVzcyBUZXN0ZXIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicHJvamVjdF9pZCI6IjkyNDU2NWM1LTYzNzctNDRiNy1hYTc1LTZiN2RlOGQzMTFmNCIsImJyYW5jaF9pZCI6Im1haW4iLCJyZWZyZXNoX3Rva2VuX2lkIjoiZGV2LXJ0LTE5OTVkOTFlLTRmZjYtNDM3Mi05ZWRiLTFhYzBhODJjNDZmOCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwic2VsZWN0ZWRfdGVhbV9pZCI6bnVsbCwiaXNfYW5vbnltb3VzIjpmYWxzZSwiaXNfcmVzdHJpY3RlZCI6ZmFsc2UsInJlc3RyaWN0ZWRfcmVhc29uIjpudWxsLCJzdWIiOiIxOTk1ZDkxZS00ZmY2LTQzNzItOWVkYi0xYWMwYTgyYzQ2ZjgiLCJpc3MiOiJodHRwczovL2FwaS5zdGFjay1hdXRoLmNvbS9hcGkvdjEvcHJvamVjdHMvOTI0NTY1YzUtNjM3Ny00NGI3LWFhNzUtNmI3ZGU4ZDMxMWY0IiwiYXVkIjoiOTI0NTY1YzUtNjM3Ny00NGI3LWFhNzUtNmI3ZGU4ZDMxMWY0IiwiaWF0IjoxNzczOTU2Njg2LCJleHAiOjE3NzQwNDMwODZ9.LSTOu0MPQ6m5kiG49XEeibKEPXr_C97b37NMmLXWQjE";
const STRESS_USER_ID = "1995d91e-4ff6-4372-9edb-1ac0a82c46f8";

const membersRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/members`, {
  headers: { Authorization: `Bearer ${STRESS_TOKEN}` },
});
const members = await membersRes.json() as { id: string; displayName: string }[];
const otherMembers = members.filter((m) => m.id !== STRESS_USER_ID);
console.log(`Creating DMs with ${otherMembers.length} members...`);

let success = 0;
for (let i = 0; i < otherMembers.length; i++) {
  const member = otherMembers[i];
  const dmRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/dm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ userId: member.id }),
  });
  if (!dmRes.ok) { console.error(`Failed: ${member.displayName}`); continue; }
  const dm = await dmRes.json() as { channel: { id: string } };
  
  await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/channels/${dm.channel.id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: `Hi ${member.displayName}! DM #${i + 1} stress test.` }),
  });
  success++;
  if (success % 10 === 0) console.log(`${success}/${otherMembers.length}...`);
}
console.log(`Done! Created ${success} DMs.`);
