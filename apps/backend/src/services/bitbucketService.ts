import { ReportPriority } from 'shared-types';

export type BitbucketIssueState = 'open' | 'resolved' | 'wontfix' | 'closed';

export const normalizeBitbucketIssueState = (
  state: unknown
): BitbucketIssueState | null => {
  if (typeof state !== 'string') return null;

  const normalized = state.toLowerCase();
  if (normalized === 'open') return 'open';
  if (normalized === 'resolved') return 'resolved';
  if (normalized === 'wontfix') return 'wontfix';
  if (normalized === 'closed') return 'closed';
  return null;
};

interface BitbucketIssueResponse {
  id: number;
  title: string;
  state: string;
  links?: {
    html?: { href?: string };
  };
}

interface BitbucketIssuePayload {
  title: string;
  content?: { raw: string };
  kind?: string;
  priority?: string;
}

interface BitbucketIssueCommentResponse {
  id: number;
  content?: {
    raw?: string;
  };
  user?: {
    display_name?: string;
    nickname?: string;
    account_id?: string;
  };
}

const BITBUCKET_BASE_URL = process.env.BITBUCKET_BASE_URL || 'https://api.bitbucket.org/2.0';
const BITBUCKET_WORKSPACE = process.env.BITBUCKET_WORKSPACE || '';
const BITBUCKET_REPO_SLUG = process.env.BITBUCKET_REPO_SLUG || '';
const BITBUCKET_USERNAME = process.env.BITBUCKET_USERNAME || '';
const BITBUCKET_APP_PASSWORD = process.env.BITBUCKET_APP_PASSWORD || '';
const BITBUCKET_TOKEN = process.env.BITBUCKET_TOKEN || '';
const BITBUCKET_ENABLED = process.env.BITBUCKET_ENABLED === 'true';

const getAuthHeader = () => {
  if (BITBUCKET_TOKEN) {
    return `Bearer ${BITBUCKET_TOKEN}`;
  }
  if (BITBUCKET_USERNAME && BITBUCKET_APP_PASSWORD) {
    const encoded = Buffer.from(
      `${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}`
    ).toString('base64');
    return `Basic ${encoded}`;
  }
  return '';
};

const getRepoIssuesUrl = () => {
  return `${BITBUCKET_BASE_URL}/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/issues`;
};

const ensureConfig = () => {
  if (!BITBUCKET_ENABLED) return false;
  if (!BITBUCKET_WORKSPACE || !BITBUCKET_REPO_SLUG) return false;
  if (!getAuthHeader()) return false;
  return true;
};

const mapPriority = (priority?: string) => {
  switch (priority) {
    case ReportPriority.URGENT:
      return 'critical';
    case ReportPriority.HIGH:
      return 'major';
    case ReportPriority.MEDIUM:
      return 'minor';
    case ReportPriority.LOW:
      return 'trivial';
    default:
      return 'minor';
  }
};

export const bitbucketService = {
  isEnabled() {
    return ensureConfig();
  },

  async updateIssueState(issueId: string, state: BitbucketIssueState) {
    if (!ensureConfig()) return null;

    const response = await fetch(`${getRepoIssuesUrl()}/${issueId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({ state }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitbucket update issue state failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as BitbucketIssueResponse;
    return {
      id: String(data.id),
      url: data.links?.html?.href || null,
      state: data.state,
      title: data.title,
    };
  },

  async createIssue(input: {
    reportId: string;
    title: string;
    description?: string | null;
    priority?: string;
    reporterName?: string | null;
  }) {
    if (!ensureConfig()) return null;

    const payload: BitbucketIssuePayload = {
      title: `${input.reportId}`,
      content: {
        raw: [
          `Report Category: ${input.title}`,
          input.reporterName ? `Reporter: ${input.reporterName}` : undefined,
          input.description ? `\n${input.description}` : undefined,
        ]
          .filter(Boolean)
          .join('\n'),
      },
      kind: 'bug',
      priority: mapPriority(input.priority),
    };

    const response = await fetch(getRepoIssuesUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitbucket create issue failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as BitbucketIssueResponse;
    return {
      id: String(data.id),
      url: data.links?.html?.href || null,
      state: data.state,
      title: data.title,
    };
  },

  async createIssueComment(issueId: string, content: string) {
    if (!ensureConfig()) return null;

    const response = await fetch(`${getRepoIssuesUrl()}/${issueId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        content: {
          raw: content,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitbucket create issue comment failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as BitbucketIssueCommentResponse;
    return {
      id: String(data.id),
      content: data.content?.raw || '',
      authorName: data.user?.display_name || data.user?.nickname || 'Bitbucket User',
      authorAccountId: data.user?.account_id || null,
    };
  },

  extractIssueFromWebhook(payload: any) {
    const issue = payload?.issue;
    if (!issue) return null;
    return {
      id: issue?.id ? String(issue.id) : null,
      state: normalizeBitbucketIssueState(issue?.state),
      title: issue?.title ? String(issue.title) : null,
    };
  },

  extractIssueCommentFromWebhook(payload: any) {
    const issue = payload?.issue;
    const comment = payload?.comment;
    const actor = payload?.actor;

    if (!issue || !comment) return null;

    const issueId = issue?.id ? String(issue.id) : null;
    const commentId = comment?.id ? String(comment.id) : null;
    const commentContent =
      typeof comment?.content?.raw === 'string'
        ? comment.content.raw
        : typeof comment?.content === 'string'
          ? comment.content
          : null;

    if (!issueId || !commentId || !commentContent) return null;

    return {
      issueId,
      commentId,
      content: commentContent,
      actorName:
        actor?.display_name || actor?.nickname || actor?.username || 'Bitbucket User',
      actorAccountId: actor?.account_id || null,
    };
  },
};
