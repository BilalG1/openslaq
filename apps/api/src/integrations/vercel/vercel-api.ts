const VERCEL_API_URL = "https://api.vercel.com";

export async function getProjectByName(
  accessToken: string,
  teamId: string,
  projectName: string,
): Promise<{ id: string; name: string } | null> {
  const res = await fetch(`${VERCEL_API_URL}/v9/projects/${encodeURIComponent(projectName)}?teamId=${encodeURIComponent(teamId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { id: string; name: string };
  return data;
}
