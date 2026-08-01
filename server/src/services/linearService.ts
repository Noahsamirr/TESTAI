import axios, { AxiosError } from 'axios';

const LINEAR_API = 'https://api.linear.app/graphql';

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearIssueResult {
  id: string;
  identifier: string;
  url: string;
  title: string;
}

export interface CreateLinearIssueInput {
  title: string;
  description: string;
  teamId?: string;
  priority?: number;
  labelIds?: string[];
}

function getApiKey(): string | undefined {
  const key = process.env.LINEAR_API_KEY?.replace(/^["']|["']$/g, '').trim();
  if (!key || key.includes('your_') || key.includes('_here')) return undefined;
  return key;
}

function getDefaultTeamId(): string | undefined {
  return process.env.LINEAR_TEAM_ID?.replace(/^["']|["']$/g, '').trim() || undefined;
}

async function linearQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('LINEAR_API_KEY is not configured. Add it to .env — create one at https://linear.app/settings/api');
  }

  try {
    const { data } = await axios.post(
      LINEAR_API,
      { query, variables },
      {
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      }
    );

    if (data.errors?.length) {
      throw new Error(data.errors.map((e: { message: string }) => e.message).join('; '));
    }
    return data.data as T;
  } catch (err) {
    const axiosErr = err as AxiosError<{ errors?: { message: string }[] }>;
    const msg =
      axiosErr.response?.data?.errors?.map((e) => e.message).join('; ') ||
      (err instanceof Error ? err.message : 'Linear API request failed');
    throw new Error(msg);
  }
}

export function isLinearConfigured(): boolean {
  return !!getApiKey();
}

export function severityToPriority(severity: string): number {
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'p1') return 1;
  if (s === 'high' || s === 'p2') return 2;
  if (s === 'medium' || s === 'p3') return 3;
  return 4;
}

export async function checkConnection(): Promise<{
  connected: boolean;
  viewer?: { name: string; email: string };
  defaultTeamId?: string;
  message?: string;
}> {
  if (!isLinearConfigured()) {
    return {
      connected: false,
      message: 'Set LINEAR_API_KEY in .env. Create an API key at linear.app → Settings → API.',
    };
  }

  const data = await linearQuery<{
    viewer: { name: string; email: string };
  }>(`query { viewer { name email } }`);

  return {
    connected: true,
    viewer: data.viewer,
    defaultTeamId: getDefaultTeamId(),
  };
}

export async function listTeams(): Promise<LinearTeam[]> {
  const data = await linearQuery<{ teams: { nodes: LinearTeam[] } }>(`
    query {
      teams {
        nodes { id name key }
      }
    }
  `);
  return data.teams.nodes;
}

export async function createIssue(input: CreateLinearIssueInput): Promise<LinearIssueResult> {
  const teamId = input.teamId || getDefaultTeamId();
  if (!teamId) {
    const teams = await listTeams();
    if (teams.length === 0) throw new Error('No Linear teams found for this API key');
    if (teams.length === 1) {
      return createIssue({ ...input, teamId: teams[0].id });
    }
    throw new Error('LINEAR_TEAM_ID is required when your workspace has multiple teams');
  }

  const data = await linearQuery<{
    issueCreate: {
      success: boolean;
      issue: LinearIssueResult;
    };
  }>(
    `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url title }
      }
    }
  `,
    {
      input: {
        title: input.title.slice(0, 255),
        description: input.description,
        teamId,
        priority: input.priority ?? 3,
        labelIds: input.labelIds?.length ? input.labelIds : undefined,
      },
    }
  );

  if (!data.issueCreate.success) {
    throw new Error('Linear rejected issue creation');
  }
  return data.issueCreate.issue;
}

export function formatIssueDescription(fields: {
  summary?: string;
  severity?: string;
  source?: string;
  url?: string;
  steps?: string[];
  expected?: string;
  actual?: string;
  remediation?: string;
  evidence?: string;
  module?: string;
}): string {
  const lines: string[] = ['## QualityForge Finding', ''];
  if (fields.module) lines.push(`**Module:** ${fields.module}`);
  if (fields.severity) lines.push(`**Severity:** ${fields.severity}`);
  if (fields.source) lines.push(`**Source:** ${fields.source}`);
  if (fields.url) lines.push(`**URL:** ${fields.url}`);
  lines.push('');
  if (fields.summary) {
    lines.push('### Summary', fields.summary, '');
  }
  if (fields.steps?.length) {
    lines.push('### Steps to Reproduce');
    fields.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }
  if (fields.expected) lines.push(`**Expected:** ${fields.expected}`, '');
  if (fields.actual) lines.push(`**Actual:** ${fields.actual}`, '');
  if (fields.evidence) lines.push('### Evidence', '```', fields.evidence, '```', '');
  if (fields.remediation) lines.push('### Remediation', fields.remediation, '');
  lines.push('---', '_Created via QualityForge AI_');
  return lines.join('\n');
}
