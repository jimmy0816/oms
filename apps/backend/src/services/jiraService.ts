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

export interface JiraIssueComment {
  id: string;
  bodyText: string;
  authorName: string;
  authorAccountId: string | null;
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
  user?: {
    accountId?: string;
    displayName?: string;
  };
  issue?: {
    id?: string;
    key?: string;
    fields?: {
      status?: {
        name?: string;
      };
      description?: unknown;
      priority?: {
        name?: string;
      };
    };
  };
  comment?: {
    id?: string;
    body?: unknown;
    author?: {
      accountId?: string;
      displayName?: string;
    };
    updateAuthor?: {
      accountId?: string;
      displayName?: string;
    };
  };
  changelog?: {
    items?: Array<{
      field?: string;
      fromString?: string;
      toString?: string;
    }>;
  };
}

interface JiraCreateFieldMetadata {
  required?: boolean;
  allowedValues?: Array<{
    id?: string;
    name?: string;
    value?: string;
  }>;
}

interface JiraCreateIssueTypeMetadata {
  id?: string;
  name?: string;
  fields?: Record<string, JiraCreateFieldMetadata>;
}

interface JiraCreateProjectMetadata {
  id?: string;
  key?: string;
  issuetypes?: JiraCreateIssueTypeMetadata[];
}

interface JiraCreateMetadataResponse {
  projects?: JiraCreateProjectMetadata[];
}

// ---------------------------------------------------------------------------
// OMS status → Jira target status name 對應
// UNCONFIRMED 不主動 transition，使用 Jira 預設初始狀態
// ---------------------------------------------------------------------------

const OMS_STATUS_TO_JIRA_STATUS: Partial<Record<ReportStatus, string>> = {
  [ReportStatus.PROCESSING]: 'OMS_PROCESSING',
  [ReportStatus.REJECTED]: 'OMS_REJECTED',
  [ReportStatus.PENDING_REVIEW]: 'OMS_PENDING_REVIEW',
  [ReportStatus.REVIEWED]: 'OMS_REVIEWED',
  [ReportStatus.RETURNED]: 'OMS_RETURNED',
};

const JIRA_UNLINK_TARGET_STATUS = 'OMS_BACKLOG';

// ---------------------------------------------------------------------------
// Priority mapping
// ---------------------------------------------------------------------------

const PRIORITY_MAP: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Highest',
};

const JIRA_PRIORITY_TO_OMS: Record<string, string> = Object.entries(PRIORITY_MAP).reduce(
  (acc, [oms, jira]) => {
    acc[jira.toUpperCase()] = oms;
    return acc;
  },
  {} as Record<string, string>
);

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

function extractTextFromAdf(node: unknown): string {
  if (typeof node === 'string') {
    return node;
  }

  if (!node || typeof node !== 'object') {
    return '';
  }

  const typedNode = node as {
    type?: string;
    text?: string;
    attrs?: {
      text?: string;
      shortName?: string;
      url?: string;
    };
    content?: unknown[];
  };

  if (typedNode.type === 'text') {
    return typedNode.text || '';
  }

  if (typedNode.type === 'hardBreak') {
    return '\n';
  }

   if (typedNode.type === 'mention' || typedNode.type === 'status') {
    return typedNode.attrs?.text || '';
  }

  if (typedNode.type === 'emoji') {
    return typedNode.attrs?.shortName || '';
  }

  if (typedNode.type === 'inlineCard') {
    return typedNode.attrs?.url || '';
  }

  if (!Array.isArray(typedNode.content)) {
    return '';
  }

  if (typedNode.type === 'paragraph') {
    return typedNode.content.map(extractTextFromAdf).join('');
  }

  return typedNode.content
    .map(extractTextFromAdf)
    .filter((part) => part.length > 0)
    .join('\n');
}

function isAdfEffectivelyEmpty(node: unknown): boolean {
  if (typeof node === 'string') {
    return node.trim().length === 0;
  }

  if (!node || typeof node !== 'object') {
    return true;
  }

  const typedNode = node as {
    type?: string;
    text?: string;
    attrs?: {
      text?: string;
      shortName?: string;
      url?: string;
    };
    content?: unknown[];
  };

  if (typedNode.type === 'text') {
    return (typedNode.text || '').trim().length === 0;
  }

  if (typedNode.type === 'hardBreak') {
    return false;
  }

  if (typedNode.type === 'mention' || typedNode.type === 'status') {
    return (typedNode.attrs?.text || '').trim().length === 0;
  }

  if (typedNode.type === 'emoji') {
    return (typedNode.attrs?.shortName || '').trim().length === 0;
  }

  if (typedNode.type === 'inlineCard') {
    return (typedNode.attrs?.url || '').trim().length === 0;
  }

  if (!Array.isArray(typedNode.content)) {
    return true;
  }

  return typedNode.content.every(isAdfEffectivelyEmpty);
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
   * 取得 Jira issue 建立 metadata（PRD Phase 0/2 要求）
   * 使用 createmeta 驗證 project / issue type / fields / allowedValues
   */
  async getCreateMetadata(): Promise<JiraCreateIssueTypeMetadata | null> {
    this.ensureConfig();

    const query = new URLSearchParams({
      projectIds: JIRA_PROJECT_ID,
      issuetypeIds: JIRA_ISSUE_TYPE_ID,
      expand: 'projects.issuetypes.fields',
    });

    try {
      const metadata = await jiraFetch<JiraCreateMetadataResponse>(
        `/issue/createmeta?${query.toString()}`
      );

      const project = (metadata.projects || []).find(
        (p) => p.id === JIRA_PROJECT_ID || p.key === JIRA_PROJECT_KEY
      );

      if (!project) {
        console.error(
          `[Jira] issue type 或欄位驗證失敗：找不到 project (projectId=${JIRA_PROJECT_ID}, projectKey=${JIRA_PROJECT_KEY})`
        );
        return null;
      }

      const issueType = (project.issuetypes || []).find(
        (it) => it.id === JIRA_ISSUE_TYPE_ID
      );

      if (!issueType) {
        console.error(
          `[Jira] issue type 或欄位驗證失敗：找不到 issueType (issueTypeId=${JIRA_ISSUE_TYPE_ID})`
        );
        return null;
      }

      return issueType;
    } catch (error: any) {
      console.error('[Jira] create metadata 驗證失敗:', error.message);
      return null;
    }
  },

  /**
   * 建立 Jira issue
   * summary = "{reportId} - {categoryName}" 或 "{reportId}"
   */
  async createIssue(input: CreateJiraIssueInput): Promise<JiraIssue | null> {
    this.ensureConfig();

    const createMetadata = await this.getCreateMetadata();
    if (!createMetadata) {
      return null;
    }

    const summary = input.categoryName
      ? `${input.reportId} - ${input.categoryName}`
      : input.reportId;

    const metadataFields = createMetadata.fields || {};
    const summaryField = metadataFields.summary;
    const descriptionField = metadataFields.description;
    const priorityField = metadataFields.priority;

    if (summaryField?.required && !summary.trim()) {
      console.error('[Jira] issue type 或欄位驗證失敗：summary 為必填但值為空');
      return null;
    }

    if (descriptionField?.required && !(input.description || '').trim()) {
      console.error('[Jira] issue type 或欄位驗證失敗：description 為必填但值為空');
      return null;
    }

    const priorityName = input.priority ? PRIORITY_MAP[input.priority] : undefined;

    const fields: Record<string, unknown> = {
      project: { id: JIRA_PROJECT_ID },
      issuetype: { id: JIRA_ISSUE_TYPE_ID },
      summary,
      description: buildAdfDocument(input.description),
    };

    if (priorityName) {
      const allowedPriorityValues = priorityField?.allowedValues || [];
      const isPriorityAllowed =
        allowedPriorityValues.length === 0 ||
        allowedPriorityValues.some((value) => {
          const allowedName = value.name || value.value || '';
          return allowedName.toUpperCase() === priorityName.toUpperCase();
        });

      if (isPriorityAllowed) {
        fields.priority = { name: priorityName };
      } else {
        console.warn(
          `[Jira] priority ${priorityName} 不在 allowedValues，已略過`
        );
      }
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

  /** 解析 Jira webhook payload，回傳 issue 資訊與欄位變更 */
  extractIssueFromWebhook(payload: JiraWebhookPayload): {
    issueId: string;
    issueKey: string;
    statusName: string;
    statusChanged: boolean;
    descriptionChanged: boolean;
    priorityChanged: boolean;
    descriptionText?: string;
    priority?: string;
  } | null {
    const issue = payload?.issue;
    if (!issue?.id || !issue?.key) {
      console.warn('[Jira Webhook] payload 解析失敗：缺少 issue id/key');
      return null;
    }

    const statusName = issue.fields?.status?.name || '';

    // 依 changelog 判斷此次 webhook 是否真的有 status 欄位變更
    // 若 changelog 不存在（如舊版 Jira 或手動觸發），則退回至「有 statusName 即視為變更」
    const changelogItems = payload?.changelog?.items ?? null;
    const statusChangeItem = changelogItems?.find((item) => item.field === 'status');
    const statusChanged = changelogItems
      ? Boolean(statusChangeItem)
      : statusName !== '';

    const descriptionChangeItem = changelogItems?.find(
      (item) => item.field === 'description'
    );
    const descriptionChanged = changelogItems
      ? Boolean(descriptionChangeItem)
      : false;

    const priorityChanged = changelogItems
      ? changelogItems.some((item) => item.field === 'priority')
      : false;

    let descriptionText: string | undefined;
    let shouldSyncDescription = false;
    if (descriptionChanged) {
      const changeToString =
        descriptionChangeItem && descriptionChangeItem.toString !== undefined
          ? descriptionChangeItem.toString
          : undefined;

      // changelog 的 toString 最能反映此次變更後值，優先採用
      if (changeToString !== undefined) {
        descriptionText = changeToString;
        shouldSyncDescription = true;
      }

      // null 代表 Jira 端明確清空描述
      if (!shouldSyncDescription && issue.fields?.description === null) {
        descriptionText = '';
        shouldSyncDescription = true;
      } else if (!shouldSyncDescription && issue.fields?.description !== undefined) {
        const extractedDescription = extractTextFromAdf(issue.fields.description);

        if (
          extractedDescription.length > 0 ||
          isAdfEffectivelyEmpty(issue.fields.description)
        ) {
          descriptionText = extractedDescription;
          shouldSyncDescription = true;
        } else {
          console.warn(
            `[Jira Webhook] description 解析為空字串，疑似 payload 不完整，略過 OMS description 同步 (issueKey=${issue.key})`
          );
        }
      } else {
        console.warn(
          `[Jira Webhook] description 有變更但 payload 未提供可同步內容，略過 OMS description 同步 (issueKey=${issue.key})`
        );
      }
    }

    const jiraPriorityName = issue.fields?.priority?.name;
    const priority = priorityChanged && jiraPriorityName
      ? JIRA_PRIORITY_TO_OMS[jiraPriorityName.toUpperCase()]
      : undefined;

    return {
      issueId: issue.id,
      issueKey: issue.key,
      statusName,
      statusChanged,
      descriptionChanged: shouldSyncDescription,
      priorityChanged,
      descriptionText,
      priority,
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
    const hasSummaryUpdate = updates.summary !== undefined && updates.summary !== null;
    const hasDescriptionUpdate =
      updates.description !== undefined && updates.description !== null;
    const hasPriorityUpdate = updates.priority !== undefined && updates.priority !== null;

    if (!hasSummaryUpdate && !hasDescriptionUpdate && !hasPriorityUpdate) {
      return true; // 沒有更新就回傳 true
    }

    const fields: Record<string, unknown> = {};

    if (hasSummaryUpdate) {
      fields.summary = updates.summary;
    }

    if (hasDescriptionUpdate) {
      fields.description = buildAdfDocument(updates.description);
    }

    if (hasPriorityUpdate) {
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

  async createIssueComment(
    issueKey: string,
    content: string
  ): Promise<JiraIssueComment | null> {
    try {
      const result = await jiraFetch<{
        id: string;
        body?: unknown;
        author?: { displayName?: string; accountId?: string };
      }>(`/issue/${encodeURIComponent(issueKey)}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          body: buildAdfDocument(content),
        }),
      });

      return {
        id: result.id,
        bodyText: extractTextFromAdf(result.body),
        authorName: result.author?.displayName || 'Jira User',
        authorAccountId: result.author?.accountId || null,
      };
    } catch (error: any) {
      console.error(`[Jira] create comment 失敗 (${issueKey}):`, error.message);
      return null;
    }
  },

  async deleteIssueComment(issueKey: string, commentId: string): Promise<boolean> {
    try {
      await jiraFetch(
        `/issue/${encodeURIComponent(issueKey)}/comment/${encodeURIComponent(commentId)}`,
        {
          method: 'DELETE',
        }
      );
      return true;
    } catch (error: any) {
      console.error(
        `[Jira] delete comment 失敗 (${issueKey}/${commentId}):`,
        error.message
      );
      return false;
    }
  },

  extractCommentFromWebhook(payload: JiraWebhookPayload): {
    eventType: 'created' | 'updated' | 'deleted';
    issueId: string;
    issueKey: string;
    commentId: string;
    content: string;
    actorName: string;
    actorAccountId: string | null;
  } | null {
    const webhookEvent = payload?.webhookEvent;
    const issue = payload?.issue;
    const comment = payload?.comment;

    if (!webhookEvent || !issue?.id || !issue?.key || !comment?.id) {
      return null;
    }

    let eventType: 'created' | 'updated' | 'deleted' | null = null;
    if (webhookEvent === 'comment_created') eventType = 'created';
    if (webhookEvent === 'comment_updated') eventType = 'updated';
    if (webhookEvent === 'comment_deleted') eventType = 'deleted';

    if (!eventType) {
      return null;
    }

    const actor = comment.author || comment.updateAuthor || payload.user;

    return {
      eventType,
      issueId: issue.id,
      issueKey: issue.key,
      commentId: comment.id,
      content: extractTextFromAdf(comment.body).trim(),
      actorName: actor?.displayName || 'Jira User',
      actorAccountId: actor?.accountId || null,
    };
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
