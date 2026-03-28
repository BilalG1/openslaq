const API = "http://localhost:3001";
const WORKSPACE_SLUG = "stress-dms-gnhmjw";
const BROWSER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImRldi03MTFAb3BlbnNsYXEubG9jYWwiLCJuYW1lIjoiRGV2IFVzZXIgNzExIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInByb2plY3RfaWQiOiI5MjQ1NjVjNS02Mzc3LTQ0YjctYWE3NS02YjdkZThkMzExZjQiLCJicmFuY2hfaWQiOiJtYWluIiwicmVmcmVzaF90b2tlbl9pZCI6ImRldi1ydC0yMjdmZGNmZi03NGU1LTRmZTMtYjRkNi00NTRjZmIyNzhhYTUiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsInNlbGVjdGVkX3RlYW1faWQiOm51bGwsImlzX2Fub255bW91cyI6ZmFsc2UsImlzX3Jlc3RyaWN0ZWQiOmZhbHNlLCJyZXN0cmljdGVkX3JlYXNvbiI6bnVsbCwic3ViIjoiMjI3ZmRjZmYtNzRlNS00ZmUzLWI0ZDYtNDU0Y2ZiMjc4YWE1IiwiaXNzIjoiaHR0cHM6Ly9hcGkuc3RhY2stYXV0aC5jb20vYXBpL3YxL3Byb2plY3RzLzkyNDU2NWM1LTYzNzctNDRiNy1hYTc1LTZiN2RlOGQzMTFmNCIsImF1ZCI6IjkyNDU2NWM1LTYzNzctNDRiNy1hYTc1LTZiN2RlOGQzMTFmNCIsImlhdCI6MTc3Mzk1NjY3OSwiZXhwIjoxNzc0MDQzMDc5fQ.Jdy7_mZZbY5YI7Oaj_7zgFUbvZqYbdeRpWmnC4vY_RM";
const BROWSER_USER_ID = "227fdcff-74e5-4fe3-b4d6-454cfb278aa5";

// Get workspace members
const membersRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/members`, {
  headers: { Authorization: `Bearer ${BROWSER_TOKEN}` },
});
const members = await membersRes.json() as { id: string; displayName: string }[];
console.log(`Found ${members.length} workspace members`);

const otherMembers = members.filter((m) => m.id !== BROWSER_USER_ID);
console.log(`Other members: ${otherMembers.length}`);

for (let i = 0; i < otherMembers.length; i++) {
  const member = otherMembers[i];
  const userId = member.id;
  const name = member.displayName;

  const dmRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/dm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${BROWSER_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!dmRes.ok) {
    console.error(`Failed DM with ${name}:`, dmRes.status, await dmRes.text());
    continue;
  }
  const dm = await dmRes.json() as { channel: { id: string } };
  const channelId = dm.channel.id;

  const msgRes = await fetch(`${API}/api/workspaces/${WORKSPACE_SLUG}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${BROWSER_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: `Hey ${name}! This is DM #${i + 1} from the stress test.` }),
  });

  if (msgRes.ok) {
    console.log(`DM ${i + 1}/${otherMembers.length}: ${name}`);
  } else {
    console.error(`DM ${i + 1} msg failed:`, msgRes.status);
  }
}
console.log("Done!");
