const LINEAR_API_URL = "https://api.linear.app/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphql<T>(accessToken: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Linear API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Linear GraphQL error: ${json.errors[0]!.message}`);
  }

  if (!json.data) {
    throw new Error("Linear API returned no data");
  }

  return json.data;
}

export async function getTeamByKey(
  accessToken: string,
  teamKey: string,
): Promise<{ id: string; name: string; key: string } | null> {
  const data = await graphql<{
    teams: { nodes: Array<{ id: string; name: string; key: string }> };
  }>(accessToken, `
    query GetTeam($key: String!) {
      teams(filter: { key: { eq: $key } }) {
        nodes { id name key }
      }
    }
  `, { key: teamKey.toUpperCase() });

  return data.teams.nodes[0] ?? null;
}

export async function getOrganization(
  accessToken: string,
): Promise<{ id: string; name: string }> {
  const data = await graphql<{
    organization: { id: string; name: string };
  }>(accessToken, `
    query {
      organization { id name }
    }
  `);

  return data.organization;
}
