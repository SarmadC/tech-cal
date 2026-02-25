type LinearGraphQLResponse<T> = {
    data?: T;
    errors?: Array<{ message?: string }>;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function linearGraphql<T>(
    query: string,
    variables: Record<string, unknown> | undefined,
    apiKey: string
): Promise<T> {
    const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        throw new Error(`Linear API request failed (${response.status}): ${responseText || response.statusText}`);
    }

    const json = (await response.json()) as LinearGraphQLResponse<T>;

    if (json.errors?.length) {
        const message = json.errors.map((error) => error.message).filter(Boolean).join('; ');
        throw new Error(message || 'Linear API returned an error.');
    }

    if (!json.data) {
        throw new Error('Linear API returned an empty response.');
    }

    return json.data;
}

export async function getLinearTeamId(apiKey: string, explicitTeamId?: string): Promise<string> {
    const data = await linearGraphql<{
        teams: { nodes: Array<{ id: string; name: string; key: string }> };
    }>(
        `
        query Teams {
            teams {
                nodes {
                    id
                    name
                    key
                }
            }
        }
        `,
        undefined,
        apiKey
    );

    const teams = data.teams.nodes;
    if (teams.length === 0) {
        throw new Error('No Linear teams found for this API key.');
    }

    if (explicitTeamId) {
        const trimmed = explicitTeamId.trim();
        if (UUID_REGEX.test(trimmed)) return trimmed;

        const normalized = trimmed.toLowerCase();
        const matched = teams.find((team) => team.key.toLowerCase() === normalized || team.name.toLowerCase() === normalized);
        if (matched) return matched.id;

        const teamList = teams.map((team) => `${team.name} (${team.key})`).join(', ');
        throw new Error(`Unknown Linear team "${trimmed}". Available teams: ${teamList}`);
    }

    if (teams.length === 1) {
        return teams[0].id;
    }

    const teamList = teams.map((team) => `${team.name} (${team.key})`).join(', ');
    throw new Error(`Multiple Linear teams found. Set LINEAR_TEAM_ID. Teams: ${teamList}`);
}

export async function createLinearIssue(input: {
    apiKey: string;
    teamId: string;
    title: string;
    description: string;
}): Promise<{ id: string; identifier: string; url: string }> {
    const data = await linearGraphql<{
        issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } | null };
    }>(
        `
        mutation IssueCreate($input: IssueCreateInput!) {
            issueCreate(input: $input) {
                success
                issue {
                    id
                    identifier
                    url
                }
            }
        }
        `,
        {
            input: {
                teamId: input.teamId,
                title: input.title,
                description: input.description,
            },
        },
        input.apiKey
    );

    if (!data.issueCreate.success || !data.issueCreate.issue) {
        throw new Error('Linear issue creation failed.');
    }

    return data.issueCreate.issue;
}
