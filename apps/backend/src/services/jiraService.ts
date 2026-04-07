import { ReportStatus } from 'shared-types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const JIRA_ENABLED = process.env.JIRA_ENABLED === 'true';
const JIRA_EMAIL = process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const JIRA_CLOUD_ID = process.env.JIRA_CLOUD_ID || '';
const JIRA_PROJECT_ID = process.env.JIRA_PROJECT_ID || '';
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || '';
const JIRA_ISSUE_TYPE_ID = process.env.JIRA_ISSUE_TYPE_ID || '';

const getBaseUrl = () =>
  `https://api.atlassian.com/ex/jira/${JIRA_CLOUD_ID}/rest/api/3`;

const getAuthHeader = () => {
  const encoded = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  return `Basic ${encoded}`;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateJiraIssueInput {
  reportId: string;
  description?: string | null;
  priority?: string | null;
  categoryName?: string | null;
}

export interface JiraIssue {
  id: string;
  key: string;
}

interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
  };
}

interface JiraWebhookPayload {
  webhookEvent?: string;
  issue?: {
    id?: string;
    key?: string;
    fields?: {
      status?: {
        name?: string;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// OMS status → Jira target status name 對應
// UNCONFIRMED 不主動 transition，使用 Jira 預設初始狀態
// ---------------------------------------------------------------------------

const OMS_STATUS_TO_JIRA_STATUS: Partial<Record<ReportStatus, string>> = {
  [ReportStatus.PROCESSING]: 'PROCESSING',
  [ReportStatus.REJECTED]: 'REJECTED',
  [ReportStatus.PENDING_REVIEW]: 'PENDING_REVIEW',
  [ReportStatus.REVIEWED]: 'REVIEWED',
  [ReportStatus.RETURNED]: 'RETURNED',
};

const JIRA_UNLINK_TARGET_STATUS = 'BACKLOG';

// ---------------------------------------------------------------------------
// Priority mapping
// ---------------------------------------------------------------------------

const PRIORITY_MAP: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Highest',
};

// ---------------------------------------------------------------------------
// ADF builder（plain text → Atlassian Document Format）
// ---------------------------------------------------------------------------

function buildAdfDocument(text: string | null | undefined) {
  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: text || '',
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function jiraFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[Jira] HTTP ${res.status} ${res.statusText}: ${body}`);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Exported service
// ---------------------------------------------------------------------------

export const jiraService = {
  isEnabled(): boolean {
    return JIRA_ENABLED;
  },

  ensureConfig(): void {
    const missing: string[] = [];
    if (!JIRA_EMAIL) missing.push('JIRA_EMAIL');
    if (!JIRA_API_TOKEN) missing.push('JIRA_API_TOKEN');
    if (!JIRA_CLOUD_ID) missing.push('JIRA_CLOUD_ID');
    if (!JIRA_PROJECT_ID) missing.push('JIRA_PROJECT_ID');
    if (!JIRA_PROJECT_KEY) missing.push('JIRA_PROJECT_KEY');
    if (!JIRA_ISSUE_TYPE_ID) missing.push('JIRA_ISSUE_TYPE_ID');
    if (missing.length > 0) {
      throw new Error(`[Jira] config 不完整，缺少: ${missing.join(', ')}`);
    }
  },

  /** GET /myself — health check */
  async healthCheck(): Promise<boolean> {
    try {
      await jiraFetch('/myself');
      return true;
    } catch (error: any) {
      console.error('[Jira] health check 失敗:', error.message);
      return false;
    }
  },

  /**
   * 建立 Jira issue
   * summary = "{reportId} - {categoryName}" 或 "{reportId}"
   */
  async createIssue(input: CreateJiraIssueInput): Promise<JiraIssue | null> {
    this.ensureConfig();

    const summary = input.categoryName
      ? `${input.reportId} - ${input.categoryName}`
      : input.reportId;

    const priorityName = input.priority ? PRIORITY_MAP[input.priority] : undefined;

    const fields: Record<string, unknown> = {
      project: { id: JIRA_PROJECT_ID },
      issuetype: { id: JIRA_ISSUE_TYPE_ID },
      summary,
      description: buildAdfDocument(input.description),
    };

    if (priorityName) {
      fields.priority = { name: priorityName };
    }

    try {
      const result = await jiraFetch<{ id: string; key: string }>('/issue', {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      return { id: result.id, key: result.key };
    } catch (error: any) {
      console.error(`[Jira] create issue 失敗 (${input.reportId}):`, error.message);
      return null;
    }
  },

  /** 取得指定 issue 的可用 transitions */
  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    try {
      const result = await jiraFetch<{ transitions: JiraTransition[] }>(
        `/issue/${encodeURIComponent(issueKey)}/transitions`
      );
      return result.transitions || [];
    } catch (error: any) {
      console.error(`[Jira] getTransitions 失敗 (${issueKey}):`, error.message);
      return [];
    }
  },

  /** 執行 transition */
  async transitionIssue(issueKey: string, transitionId: string): Promise<boolean> {
    try {
      await jiraFetch(`/issue/${encodeURIComponent(issueKey)}/transitions`, {
        method: 'POST',
        body: JSON.stringify({ transition: { id: transitionId } }),
      });
      return true;
    } catch (error: any) {
      console.error(`[Jira] transition 失敗 (${issueKey}):`, error.message);
      return false;
    }
  },

  /**
   * 依目標 Jira status name 自動尋找 transition 並執行
   */
  async transitionIssueToStatus(issueKey: string, targetStatusName: string): Promise<boolean> {
    const transitions = await this.getTransitions(issueKey);
    const match = transitions.find(
      (t) => t.to.name.toUpperCase() === targetStatusName.toUpperCase()
    );

    if (!match) {
      console.warn(
        `[Jira] 找不到對應 transition (${issueKey} → ${targetStatusName})，可用清單: ${transitions.map((t) => t.to.name).join(', ')}`
      );
      return false;
    }

    return this.transitionIssue(issueKey, match.id);
  },

  /**
   * 解聯時使用的 Jira 狀態回落 transition
   * 目標狀態由 jiraService 內部常數控制，外部不需要傳入狀態名稱。
   */
  async transitionIssueForUnlink(issueKey: string): Promise<boolean> {
    return this.transitionIssueToStatus(issueKey, JIRA_UNLINK_TARGET_STATUS);
  },

  /**
   * 依 OMS ReportStatus 查詢並執行對應 Jira transition
   * UNCONFIRMED 不執行任何 transition
   */
  async syncStatusByReportStatus(
    issueKey: string,
    reportStatus: ReportStatus
  ): Promise<boolean> {
    const targetJiraStatus = OMS_STATUS_TO_JIRA_STATUS[reportStatus];
    if (!targetJiraStatus) {
      // UNCONFIRMED 或無對應：不執行
      return true;
    }

    return this.transitionIssueToStatus(issueKey, targetJiraStatus);
  },

  /** 解析 Jira webhook payload，回傳 issue 資訊與最新 status */
  extractIssueFromWebhook(payload: JiraWebhookPayload): {
    issueId: string;
    issueKey: string;
    statusName: string;
  } | null {
    const issue = payload?.issue;
    if (!issue?.id || !issue?.key) {
      console.warn('[Jira Webhook] payload 解析失敗：缺少 issue id/key');
      return null;
    }

    const statusName = issue.fields?.status?.name || '';
    return {
      issueId: issue.id,
      issueKey: issue.key,
      statusName,
    };
  },

  /**
   * 更新 Jira Issue 的 summary、description 和 priority
   * 遵照 PRD 10.1 欄位映射規則
   * - summary: {reportId} - {categoryName}（若 category 為空則退化為 {reportId}）
   * - description: 必須 ADF 格式
   * - priority: 通過 PRIORITY_MAP 映射；無對應值時略過
   */
  async updateIssue(
    issueKey: string,
    updates: {
      summary?: string | null;
      description?: string | null;
      priority?: string | null;
    }
  ): Promise<boolean> {
    if (!updates.summary && !updates.description && !updates.priority) {
      return true; // 沒有更新就回傳 true
    }

    const fields: Record<string, unknown> = {};

    if (updates.summary) {
      fields.summary = updates.summary;
    }

    if (updates.description) {
      fields.description = buildAdfDocument(updates.description);
    }

    if (updates.priority) {
      const priorityName = PRIORITY_MAP[updates.priority];
      if (priorityName) {
        fields.priority = { name: priorityName };
      } else {
        console.warn(
          `[Jira] priority '${updates.priority}' 無對應映射，已略過`
        );
      }
    }

    // 若沒有任何有效欄位需要更新，則直接回傳
    if (Object.keys(fields).length === 0) {
      return true;
    }

    try {
      await jiraFetch(`/issue/${encodeURIComponent(issueKey)}`, {
        method: 'PUT',
        body: JSON.stringify({ fields }),
      });
      return true;
    } catch (error: any) {
      console.error(`[Jira] updateIssue 失敗 (${issueKey}):`, error.message);
      return false;
    }
  },

  /**
   * 將 Jira status name 反查為 OMS ReportStatus
   * 用於 webhook 回寫 OMS
   */
  mapJiraStatusToReportStatus(jiraStatusName: string): ReportStatus | null {
    const upper = jiraStatusName.toUpperCase();
    const entry = Object.entries(OMS_STATUS_TO_JIRA_STATUS).find(
      ([, v]) => v?.toUpperCase() === upper
    );
    return entry ? (entry[0] as ReportStatus) : null;
  },
};

export default jiraService;
