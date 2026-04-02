<!-- @format -->

# OMS Jira / Bitbucket 雙軌 Issue Integration PRD

> 版本：v1.1
> 日期：2026-04-01
> 分支：hotfix/bitbucket_to_jira

---

## 1. 文件目的

本文件定義 OMS 以 Jira 取代既有 Bitbucket issue 整合的遷移方案。**最終目標是完全轉移至 Jira**；過渡期（本 PRD 範圍）保留 Bitbucket 兼容以確保服務不中斷，並明確界定同步欄位邊界、資料模型、API 行為、驗收條件與不做事項，供後續開發拆 PR 與實作依循。

**依據來源：**

- 現有 Bitbucket 實作：`apps/backend/src/services/bitbucketService.ts`、`apps/backend/src/pages/api/webhook.ts`、`apps/backend/src/services/reportIntegrationService.ts`、`apps/backend/src/services/reportMutationService.ts`
- 現有整合策略：`apps/backend/src/services/reportIntegrationPolicyService.ts`
- 現有資料模型：`packages/prisma-client/prisma/schema.prisma`、`packages/shared-types/src/reports.ts`
- Jira API 指南：`JIRA_API_COMMUNICATION_GUIDE.md`
- Jira Cloud REST API 官方文件：https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/

---

## 2. 背景與現況

OMS 目前已具備 Bitbucket issue 整合能力，包含：

- 建立 Bitbucket issue
- OMS 狀態變更時同步更新 Bitbucket issue state
- Bitbucket webhook 回寫 OMS report status
- OMS comment 同步到 Bitbucket comment
- Bitbucket comment 回寫 OMS

現況設計重點如下：

- Bitbucket service 為 provider-specific service，集中處理 auth、payload 與 webhook payload parsing
- webhook 入口統一在 `apps/backend/src/pages/api/webhook.ts`
- Report 建立與整合入口集中在 `reportIntegrationService.ts`
- OMS 狀態同步邏輯集中在 `reportMutationService.ts`
- 現行資料模型在 Report 上保存 `bitbucketIssueId` 與 `bitbucketIssueUrl`

本次需求的**最終目標是以 Jira 取代 Bitbucket**。過渡期（本 PRD 範圍）保留 Bitbucket 原有功能以確保服務連續性，待 Jira 整合穩定驗證後，依後續計畫停用並清除 Bitbucket 整合。

---

## 3. 問題定義

現行 OMS 外部 issue 整合只有 Bitbucket provider。若直接把 Bitbucket 邏輯硬複製到 Jira，會遇到以下問題：

- Jira status 並非可任意直接 set，需遵循 workflow transition
- Jira issue type 與可編輯欄位需由 metadata 驗證，不能硬編碼假設
- 現有 Report model 對外部 issue 的儲存設計偏 Bitbucket 專用
- 使用者明確要求 Report 不保存 issue URL
- 使用者要求 Jira payload 只保留最少必要欄位
- 需保留既有 Bitbucket 行為，不能產生回歸

---

## 4. 產品目標

### 4.1 主要目標

以 Jira 取代 Bitbucket 作為 OMS 的外部 issue 整合 provider。過渡期兩者並存，待 Jira 整合穩定驗證後，停用 Bitbucket service 並列入後續清除計畫。

### 4.2 子目標

- 過渡期保留現有 Bitbucket service 與 webhook 流程（不改動）
- 新增 Jira service，設計上與 Bitbucket service 平行存在
- 不在 Report 上保存 issue URL
- 將 OMS report 以最小欄位映射建立到 Jira
- OMS status 變更時可同步至 Jira
- Jira webhook 可回寫 OMS 狀態
- 同步失敗時不可阻斷 OMS 主要流程
- OMS ↔ Jira 雙向同步欄位明確限制為：`summary`、`description`、`priority`、`status`
- 第一階段不做 comment / attachment / assignee 同步（comment 同步列為後續 TODO）
- **後續目標（非本 PRD 範圍）：** Jira 整合穩定後透過 `BITBUCKET_ENABLED=false` 停用 Bitbucket，`bitbucketService.ts` 完整移除列入技術債清單

---

## 5. 非目標（Out of Scope）

以下項目不納入本 PRD 第一階段：

| 項目                                | 理由                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Jira comment 雙向同步               | 現有 Bitbucket comment 已在 `reportCommentService.ts`，第一階段不比照新增 |
| Jira attachment 同步                | 範圍過大                                                                  |
| Jira labels 同步                    | 已明確不需要                                                              |
| Jira assignee 同步                  | 第一階段不支援                                                            |
| Jira issue URL 儲存                 | 使用者需求明確排除                                                        |
| 完全泛化的多 provider mapping table | 目前只有兩個 provider，第一階段不值得做                                   |
| 重新設計 Google Chat 整合           | 不在本次範圍                                                              |
| 歷史 report 回補 Jira issue         | 超出第一階段邊界                                                          |

---

## 6. 使用者需求整理

| 需求                             | 決策                                        |
| -------------------------------- | ------------------------------------------- |
| 保留 Bitbucket Service           | ✅ 不動既有 Bitbucket 邏輯                  |
| Jira 與 Bitbucket 同時存在       | ✅ 僅過渡期雙 provider 並存，最終 Jira-only |
| Report 不存 issue URL            | ✅ 移除 issueUrl 欄位                       |
| Jira update 需符合 workflow      | ✅ 透過 transitions 同步                    |
| 建立 issue 前驗證 issue type     | ✅ 使用 createmeta 驗證                     |
| Summary = Report ID + 分類       | ✅ 欄位映射定義                             |
| Description = Report description | ✅ 欄位映射定義                             |
| Priority = Report priority       | ✅ 欄位映射定義                             |
| Status = Report status           | ✅ 透過 transition 達成                     |
| Labels 不需要                    | ✅ 不納入 payload                           |
| Jira 狀態回寫 OMS                | ✅ 本次範圍內實作                           |
| 留言兩邊同步                     | 📝 記錄為後續 TODO                          |

---

## 7. 商業規則與邊界

### 7.1 Provider 共存規則

- 過渡期保留 Bitbucket 原有功能與 service（兼容用途）
- Jira 為目標 provider，Bitbucket 為過渡期 fallback provider
- 過渡期內單一 report 可同時建立 Bitbucket issue 與 Jira issue
- 任一 provider 同步失敗，不可讓 report 建立或 OMS 狀態更新整體失敗
- provider 間彼此獨立，Jira 故障不影響 Bitbucket，反之亦然
- 過渡期驗證完成後，切換為 Jira-only（`BITBUCKET_ENABLED=false`），並在後續版本移除 Bitbucket 實作

### 7.2 Policy 邊界

現有整合策略由 `reportIntegrationPolicyService.ts` 控制，目前以頂層分類「**軟體通報**」作為整合判斷條件。

第一階段規範：

- Jira 與 Bitbucket 採相同 category gating 規則
- 另外以 `JIRA_ENABLED` env flag 控制 Jira 是否啟用
- 不在第一階段引入新的 Jira 專屬業務判斷規則

### 7.3 狀態同步邊界

- OMS 為主資料來源
- OMS 變更 status 時，應嘗試同步到 Jira
- Jira webhook 回寫 OMS 時，必須關閉 outbound Jira sync，避免無限循環

---

## 8. Jira 整合設計原則

### 8.1 API 基本規則

依 `JIRA_API_COMMUNICATION_GUIDE.md` 與 Jira 官方文件：

- Base URL：`https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3`
- Auth：Basic auth，username = Atlassian email，password = scoped token
- Required scopes：`read:jira-work`、`write:jira-work`（建議加 `read:jira-user`）
- `description` 必須使用 ADF 格式
- issue status 需透過 transition 流程處理，**不可直接 set status 欄位**

### 8.2 已知 Project 資訊（ZI）

> 本章僅定義「欄位需求」與「來源」，**不硬寫任何固定 ID/KEY**。實際值一律由 `.env` 載入並在 Phase 0 驗證。

| 項目             | 來源                                              |
| ---------------- | ------------------------------------------------- |
| Project ID       | `JIRA_PROJECT_ID`                                 |
| Project Key      | `JIRA_PROJECT_KEY`                                |
| Issue Type ID    | `JIRA_ISSUE_TYPE_ID`                              |
| Issue Type Name  | Jira metadata 回傳                                |
| 必填欄位         | Jira metadata 回傳（至少含 `summary`、`project`） |
| Description 格式 | ADF                                               |

### 8.3 Issue Type 驗證原則

不得假設 issue type 或欄位固定正確。系統需在建立前做 metadata 驗證：

1. `GET /myself`：health check
2. `GET /issue/createmeta?projectIds={id}&issuetypeIds={id}&expand=projects.issuetypes.fields`：確認 project、issue type、必填欄位
3. 確認 priority 可用值（allowedValues）

> **備注：** 舊 createmeta endpoint 已被 Jira 標記為 deprecated，第一階段沿用 guide 已驗證流程，第二階段改用較新的 `createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}` endpoint。

### 8.4 Jira 狀態預設值與建立時行為

Jira issue 建立後會落在 workflow 的**預設起始狀態**，由 Jira workflow 決定，OMS 無法任意指派。

> **在哪裡查看 Jira 狀態設定：**
>
> - Jira 管理介面 → Project settings → Workflows → Workflow scheme
> - API 查詢：`GET /issue/{issueKey}/transitions` 查目前可用 transition 清單

**第一階段實作決策：**

- 建立 issue 時不強行設定 status
- 先以預設起始狀態建立 issue
- 若 OMS 當前 status 與 Jira 起始狀態不一致，再執行 transition

### 8.5 Transition 範例（ZI-1 實測）

| Transition ID | 目標 Status    |
| ------------- | -------------- |
| `11`          | PROCESSING     |
| `21`          | REJECTED       |
| `31`          | PENDING_REVIEW |
| `41`          | REVIEWED       |
| `51`          | RETURNED       |

> **注意：** transition id 與名稱可能隨 workflow 設定與當前 issue status 改變，**每次同步前必須先查一次 transitions**，不可硬編碼 transition id。

---

## 9. 資料模型設計

### 9.1 現況問題

目前 `Report` model 保存：

- `bitbucketIssueId`
- `bitbucketIssueUrl`

問題：

- issue URL 已被需求明確排除
- 若直接新增 Jira 欄位未整理，Report 會持續 provider-specific 膨脹

### 9.2 第一階段資料模型決策

採最小可落地調整，不引入獨立 mapping table。

**新增欄位：**

```
jiraIssueId   String?
jiraIssueKey  String?
```

**移除欄位：**

```
bitbucketIssueUrl  String?   // 移除（或先標記 deprecated）
```

**保留欄位：**

```
bitbucketIssueId  String?   // 維持不動
```

**jiraIssueKey 用途：** 可供 debug、客服查詢、後台顯示，例如 `ZI-123`。

### 9.3 不採用 mapping table 的理由

- 目前只有 Bitbucket 與 Jira 兩個 provider
- 現有程式碼大量直接依賴 Report 上的 issue id 欄位
- 若同時做 provider abstraction + dual provider 導入，風險與改動面過大

> 若未來要支援第三個外部 issue provider，再另開技術債整理項目。

---

## 10. 欄位映射規格

### 10.1 OMS → Jira 欄位對應

| Jira 欄位      | OMS 來源                             | 格式說明                                                                        |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `summary`      | `report.id` + `report.category.name` | 格式：`{REPORT_ID} - {CATEGORY_NAME}`<br>若 category 為空則退化為 `{REPORT_ID}` |
| `description`  | `report.description`                 | 必須轉為 ADF 格式                                                               |
| `priority`     | `report.priority`                    | 見 Priority 映射表；無對應時**略過**，不阻斷建立                                |
| status         | `report.status`                      | 建立後透過 transition 達成，不以 fields 直接寫入                                |
| `project.id`   | `.env`                               | 來自 env `JIRA_PROJECT_ID`，不得硬編碼                                          |
| `issuetype.id` | `.env`                               | 來自 env `JIRA_ISSUE_TYPE_ID`，不得硬編碼                                       |

### 10.2 Priority 映射

| OMS `ReportPriority` | Jira Priority |
| -------------------- | ------------- |
| `LOW`                | `Low`         |
| `MEDIUM`             | `Medium`      |
| `HIGH`               | `High`        |
| `URGENT`             | `Highest`     |

> priority 欄位必須通過 Jira metadata allowedValues 驗證；若不相容則略過 priority 並記錄 warning log，不阻斷 issue 建立。

### 10.3 OMS Status → Jira Transition 映射

| OMS `ReportStatus` | 目標 Jira Status | 說明                                      |
| ------------------ | ---------------- | ----------------------------------------- |
| `UNCONFIRMED`      | —                | 不主動 transition，使用 Jira 預設初始狀態 |
| `PROCESSING`       | `PROCESSING`     | 需查 transitions 後執行                   |
| `REJECTED`         | `REJECTED`       | 需查 transitions 後執行                   |
| `PENDING_REVIEW`   | `PENDING_REVIEW` | 需查 transitions 後執行                   |
| `REVIEWED`         | `REVIEWED`       | 需查 transitions 後執行                   |
| `RETURNED`         | `RETURNED`       | 需查 transitions 後執行                   |

> 若 transitions 清單中不存在目標 status，記錄 warning log，不阻斷主流程。

### 10.4 Labels 規則

**不使用 labels。** 不新增 `JIRA_LABELS` env，不將 labels 放入任何 payload。

### 10.5 雙向同步欄位邊界（本次範圍）

本次 OMS ↔ Jira 欄位交互**僅限以下四個欄位**：

- `summary`
- `description`
- `priority`
- `status`

除上述四項外，其他欄位（如 labels、assignee、components、resolution、custom fields）皆不納入本次範圍。

---

## 11. 系統流程設計

### 11.1 Report 建立流程

```
建立 Report
  ↓
依 category policy 判斷是否需要外部整合
  ↓ 若需要
  ├─ [Bitbucket 啟用] → 建立 Bitbucket issue → 寫回 bitbucketIssueId（失敗只 log）
  └─ [Jira 啟用]     → 建立 Jira issue → 寫回 jiraIssueId / jiraIssueKey（失敗只 log）
  ↓
回傳 Report（不含 issue URL）
```

### 11.2 OMS Status 更新流程

```
OMS status 更新（先更新本地 Report status）
  ↓
若 bitbucketIssueId 存在 && Bitbucket 啟用
  → 同步 Bitbucket state（既有邏輯不動）
若 jiraIssueId 存在 && Jira 啟用
  → GET /issue/{jiraIssueKey}/transitions
  → 找到目標 status 對應 transition
  → POST /issue/{jiraIssueKey}/transitions
  → 失敗只 log，不 rollback OMS status
```

### 11.3 Jira Webhook → OMS 流程

```
Jira webhook → POST /api/webhook?origin_platform=jira
  ↓
解析 issue key / id / status
  ↓
找到對應 report（by jiraIssueId 或 jiraIssueKey）
  ↓
Jira status → OMS ReportStatus 映射
  ↓
呼叫 updateReportStatusByJiraIssueId（options: syncJiraState=false）
```

> `syncJiraState=false` 確保回寫時不觸發反向同步，避免 status loop。

### 11.4 Bitbucket 行為保留原則

- 過渡期既有 `bitbucketService.ts` 不移除
- 過渡期既有 webhook bitbucket branch 不重寫，只做最小增量
- Jira-only 切換條件達成後，Bitbucket issue 建立/狀態同步關閉，comment sync 保留待後續完整遷移規劃

---

## 12. 技術設計

### 12.1 新增 Jira Service

**檔案：** `apps/backend/src/services/jiraService.ts`

**職責：**

- config 驗證（`ensureConfig()`）
- health check（`GET /myself`）
- create metadata 驗證（`getCreateMetadata()`）
- ADF description 組裝（`buildAdfDocument(text)`）
- issue 建立（`createIssue(input)`）
- issue 查詢（`getIssue(issueKey)`）
- transition 查詢（`getTransitions(issueKey)`）
- transition 執行（`transitionIssue(issueKey, transitionId)`）
- OMS status 映射並同步（`syncStatusByReportStatus(issueKey, reportStatus)`）
- webhook payload 解析（`extractIssueFromWebhook(payload)`）

**建議介面（TypeScript）：**

```typescript
export type JiraIssueStatus =
  'PROCESSING' | 'REJECTED' | 'PENDING_REVIEW' | 'REVIEWED' | 'RETURNED';

export const jiraService = {
  isEnabled(): boolean
  async createIssue(input: {
    reportId: string;
    title: string;          // category name
    description?: string | null;
    priority?: string;
  }): Promise<{ id: string; key: string } | null>
  async syncStatusByReportStatus(
    issueKey: string,
    reportStatus: ReportStatus
  ): Promise<void>
  extractIssueFromWebhook(payload: any): {
    id: string | null;
    key: string | null;
    status: string | null;
  } | null
}
```

### 12.2 reportIntegrationService.ts 調整

新增：

```typescript
const createJiraIssueIfNeeded = async (report: ReportIntegrationRecord) => { ... }
```

調整 `handleReportCreated` 與 `ensureIntegrations`：

```typescript
if (this.shouldEnableJira(updatedReport)) {
  try {
    updatedReport = await createJiraIssueIfNeeded(updatedReport)
  } catch (error: any) {
    console.error("[Report Created] Jira issue 建立失敗:", error.message)
  }
}
```

調整 `teardownIntegrations`：

- 若 `jiraIssueId` 存在，清除 `jiraIssueId` / `jiraIssueKey`（不關閉 Jira issue，第一階段不支援）

### 12.3 reportMutationService.ts 調整

新增參數至 `UpdateReportStatusOptions`：

```typescript
syncJiraState?: boolean;   // 預設 true
```

新增 method：

```typescript
async updateReportStatusByJiraIssueId(
  jiraIssueId: string,
  targetStatus: ReportStatus,
  options?: Omit<UpdateReportStatusOptions, 'reportId' | 'targetStatus'>
)
```

在 `updateReportStatus` 邏輯末段新增：

```typescript
if (syncJiraState && existingReport.jiraIssueKey && jiraService.isEnabled()) {
  try {
    await jiraService.syncStatusByReportStatus(
      existingReport.jiraIssueKey,
      targetStatus,
    )
  } catch (error: any) {
    console.error("[Report Status Update] Jira transition 失敗:", error.message)
  }
}
```

### 12.4 webhook.ts 調整

新增 jira branch：

```typescript
if (originPlatform === "jira") {
  const issue = jiraService.extractIssueFromWebhook(req.body)
  if (!issue?.id && !issue?.key) {
    return res
      .status(200)
      .json({ success: true, message: "Jira webhook: no issue data" })
  }

  const targetStatus = mapJiraStatusToReportStatus(issue.status)
  if (!targetStatus) {
    return res
      .status(200)
      .json({ success: true, message: "Jira webhook: unmapped status" })
  }

  await reportMutationService.updateReportStatusByJiraIssueId(
    issue.id!,
    targetStatus,
    {
      actorUserId: botUser.id,
      source: "WEBHOOK_JIRA",
      syncJiraState: false, // 避免 loop
      syncBitbucketState: false,
      sendChatNotification: true,
      createActivityLog: true,
    },
  )
}
```

本次修改範圍明確包含 **Jira 狀態異動回寫 OMS**（Jira → OMS）。

### 12.5 reportIntegrationPolicyService.ts 調整

新增：

```typescript
shouldEnableJira(report: { category?: CategoryWithAncestors | null }) {
  return isSoftwareCategory(report?.category) && JIRA_ENABLED;
},
```

### 12.6 schema.prisma 調整

```prisma
model Report {
  // ...
  bitbucketIssueId  String?
  // bitbucketIssueUrl 移除，或先標記 @deprecated 並從 API 停止回傳
  jiraIssueId       String?
  jiraIssueKey      String?

  @@index([bitbucketIssueId])
  @@index([jiraIssueId])
}
```

### 12.7 shared-types/src/reports.ts 調整

```typescript
export interface Report {
  // ... 現有欄位
  bitbucketIssueId?: string
  // bitbucketIssueUrl 移除
  jiraIssueId?: string
  jiraIssueKey?: string
}
```

### 12.8 frontend reportService.ts 調整

對應移除 `bitbucketIssueUrl`，新增 `jiraIssueId` / `jiraIssueKey`。

---

## 13. 環境變數

新增以下 env vars：

| 名稱                 | 說明                 | 範例              |
| -------------------- | -------------------- | ----------------- |
| `JIRA_ENABLED`       | 是否啟用 Jira        | `true`            |
| `JIRA_EMAIL`         | Atlassian 帳號 email | `bot@example.com` |
| `JIRA_API_TOKEN`     | Scoped API token     | `...`             |
| `JIRA_CLOUD_ID`      | 對應 cloudId         | `...`             |
| `JIRA_PROJECT_ID`    | Project ID           | `<from .env>`     |
| `JIRA_PROJECT_KEY`   | Project Key          | `<from .env>`     |
| `JIRA_ISSUE_TYPE_ID` | Issue Type ID        | `<from .env>`     |

Base URL 由 `JIRA_CLOUD_ID` 動態計算：

```
https://api.atlassian.com/ex/jira/{JIRA_CLOUD_ID}/rest/api/3
```

---

## 14. 實作步驟

### Phase 0：準備與驗證（不寫程式碼）

- [ ] 確認 Jira token scopes 正確
- [ ] 確認 cloudId
- [ ] 確認 project id / key
- [ ] 確認 issue type id
- [ ] 用 `GET /myself` 測試連線
- [ ] 驗證 `createmeta` 回傳欄位與 priority allowedValues
- [ ] 確認 Jira webhook 設定與驗證方式

**交付物：**

- Jira env 設定值
- 手動 API 驗證紀錄
- 可建立 issue 的最小 payload 範例

---

### Phase 1：資料模型與型別調整

- [ ] 修改 `packages/prisma-client/prisma/schema.prisma`
- [ ] 執行 `prisma migrate dev`
- [ ] 修改 `packages/shared-types/src/reports.ts`（移除 issueUrl，新增 jira 欄位）
- [ ] 修改 backend API response model
- [ ] 修改 `apps/frontend/src/services/reportService.ts`
- [ ] 確認 TypeScript compile 無誤

**交付物：** types 通過 compile，前後端不再依賴 issueUrl

---

### Phase 2：新增 Jira Service

- [ ] 建立 `apps/backend/src/services/jiraService.ts`
- [ ] 實作 config / auth / base URL
- [ ] 實作 health check
- [ ] 實作 ADF builder
- [ ] 實作 `createIssue`
- [ ] 實作 `getTransitions` / `transitionIssue`
- [ ] 實作 `syncStatusByReportStatus`
- [ ] 實作 `extractIssueFromWebhook`
- [ ] 補上 metadata 驗證

**交付物：** 可手動建立 issue 與執行 transition

---

### Phase 3：接入整合入口

- [ ] 擴充 `reportIntegrationPolicyService.ts`：新增 `shouldEnableJira`
- [ ] 擴充 `reportIntegrationService.ts`：新增 Jira create
- [ ] 確保 Bitbucket 原流程 try/catch 隔離不受影響
- [ ] 回寫 `jiraIssueId` / `jiraIssueKey` 至 Report

**交付物：** 建立 report 時可觸發 Jira issue 建立

---

### Phase 4：狀態同步（OMS → Jira）

- [ ] 擴充 `reportMutationService.ts`：新增 `syncJiraState` 選項
- [ ] 新增 `updateReportStatusByJiraIssueId`
- [ ] 在 OMS status update 後嘗試 Jira transition
- [ ] 補上 transition 不存在的 fallback

**交付物：** OMS status 更新可推到 Jira transition

---

### Phase 5：Jira Webhook（Jira → OMS）

- [ ] 擴充 `webhook.ts` 新增 jira branch
- [ ] 實作 Jira status → OMS ReportStatus 映射
- [ ] 關閉反向 syncJiraState，避免 loop
- [ ] 寫 webhook log

**交付物：** Jira 狀態變更可回寫 OMS，不影響 Bitbucket webhook

---

### Phase 6：驗證與上線

- [ ] 測試 report create 觸發 Jira issue 建立
- [ ] 測試 OMS → Jira status sync
- [ ] 測試 Jira → OMS webhook sync
- [ ] 測試 Bitbucket 既有流程回歸
- [ ] 上線前確認 env 與 Jira 管理設定

### Phase 7：後續待辦（記錄，不於本次實作）

- [ ] 設計 Jira comment → OMS comment 同步規格（事件來源、去重策略、權限）
- [ ] 設計 OMS comment → Jira comment 同步規格（bot 身份、引用格式、失敗重試）
- [ ] 補 comment 雙向同步的整合測試案例
- [ ] Jira-only 穩定後規劃 Bitbucket comment sync 退場路徑

**交付物：** comment sync 設計稿與後續實作 ticket 拆分。

---

## 15. 驗收條件

### 15.1 建立流程

- 當 report 符合整合條件且 Jira 已啟用時，系統可自動建立 Jira issue
- Jira issue 欄位符合本 PRD 映射規格
- report 不保存 issue URL

### 15.2 雙 provider 共存

- 同一 report 可同時保有 `bitbucketIssueId` 與 `jiraIssueId`
- Jira 同步失敗不影響 Bitbucket 同步；反之亦然
- 本階段完成後可透過設定切換 Jira-only（`BITBUCKET_ENABLED=false`）

### 15.3 狀態同步

- OMS status 變更後，若存在 `jiraIssueKey`，系統會嘗試 transition Jira issue
- transition 失敗時 OMS status 仍更新成功
- Jira webhook 可將 status 回寫 OMS
- inbound webhook 不會造成 status sync loop

### 15.4 回歸保護

- 既有 Bitbucket issue create 行為維持不變
- 既有 Bitbucket webhook 狀態回寫行為維持不變
- 既有 Bitbucket comment sync 行為維持不變

### 15.5 遷移完成判定（Jira-only）

- Jira issue 建立成功率與狀態同步成功率達標（以監控指標定義）
- Jira webhook 回寫 OMS 連續觀察期無 loop 與重大錯誤
- 關閉 `BITBUCKET_ENABLED` 後 OMS 主流程無回歸

---

## 16. 錯誤處理與觀測性

### 16.1 必要 Log 類型

| 類型                 | Log 範例                                            |
| -------------------- | --------------------------------------------------- |
| config invalid       | `[Jira] config 不完整，略過`                        |
| health check failed  | `[Jira] health check 失敗: {message}`               |
| metadata invalid     | `[Jira] issue type 或欄位驗證失敗`                  |
| create issue failed  | `[Jira] create issue 失敗 (${reportId}): {message}` |
| transition failed    | `[Jira] transition 失敗 (${issueKey}): {message}`   |
| webhook parse failed | `[Jira Webhook] payload 解析失敗`                   |
| report not found     | `[Jira Webhook] report not found for issue ${key}`  |
| transition not found | `[Jira] 找不到對應 transition，可用清單: {list}`    |
| priority skipped     | `[Jira] priority ${p} 不在 allowedValues，略過`     |

### 16.2 錯誤處理原則

- 外部 provider 錯誤不可中斷 OMS 主流程
- log 必須可定位 `reportId`、`jiraIssueKey`、`targetStatus`
- webhook payload 不完整時回 `200` 並記錄 skip 原因，避免 provider 重送噪音

---

## 17. 安全性要求

- 不得在 log 中印出 `JIRA_API_TOKEN`
- Jira webhook 來源需驗證（shared secret header 或 IP allowlist）
- API token 只賦予最小必要 scopes（`read:jira-work`、`write:jira-work`）

---

## 18. 風險與對策

| 風險                                     | 嚴重度 | 對策                                       |
| ---------------------------------------- | ------ | ------------------------------------------ |
| Jira workflow / status name 與預期不一致 | 高     | 每次同步前查 transitions，不硬編碼 id      |
| createmeta 舊 API 未來被移除             | 中     | 第一階段沿用，第二階段改用新 endpoint      |
| Priority 值不相容                        | 低     | 驗證 allowedValues，不相容則略過           |
| Webhook status sync loop                 | 高     | inbound webhook 時強制 syncJiraState=false |
| 前端仍依賴 bitbucketIssueUrl             | 中     | 一次性移除 shared-types + frontend + API   |
| Jira 服務不穩影響 OMS                    | 高     | 所有 Jira 操作包 try/catch，不阻斷主流程   |
| Bitbucket 退場時遺留流程未清理           | 中     | 切 Jira-only 後建立移除清單並逐步下架      |

---

## 19. 回滾策略

若 Jira 上線後出現問題：

1. 將 `JIRA_ENABLED=false`，Jira 同步立即停止
2. Bitbucket 流程繼續正常運作
3. 不需回滾資料庫欄位（新增欄位不影響既有功能）
4. 待排查完成後重新開啟

若已切換 Jira-only 後發生問題：

1. 暫時回復 `BITBUCKET_ENABLED=true`（僅在 Bitbucket 邏輯仍保留期間可行）
2. 透過 feature flag 降級為過渡期雙軌模式
3. 針對 Jira webhook 或 transition 問題完成修復後再切回 Jira-only

---

## 20. 實作檔案清單

| 檔案                                                          | 動作                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/prisma-client/prisma/schema.prisma`                 | 修改：移除 issueUrl，新增 jiraIssueId / jiraIssueKey |
| `packages/shared-types/src/reports.ts`                        | 修改：型別調整                                       |
| `apps/backend/src/services/jiraService.ts`                    | **新增**                                             |
| `apps/backend/src/services/reportIntegrationService.ts`       | 修改：新增 Jira create branch                        |
| `apps/backend/src/services/reportIntegrationPolicyService.ts` | 修改：新增 shouldEnableJira                          |
| `apps/backend/src/services/reportMutationService.ts`          | 修改：新增 Jira sync 選項與 method                   |
| `apps/backend/src/pages/api/webhook.ts`                       | 修改：新增 jira branch                               |
| `apps/backend/src/services/reportCommentService.ts`           | 確認不受影響（不動）                                 |
| `apps/backend/src/services/bitbucketService.ts`               | 確認不受影響（不動）                                 |
| `apps/frontend/src/services/reportService.ts`                 | 修改：型別調整                                       |

> 備註：Bitbucket service 實體移除不在本次實作，將在 Jira-only 穩定後另案執行。

---

## 21. 參考資料

- Repo API guide：[JIRA_API_COMMUNICATION_GUIDE.md](JIRA_API_COMMUNICATION_GUIDE.md)
- Jira REST API v3：https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
- Jira scopes：https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/
- Atlassian API tokens：https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/

---

## 22. 建議 PR 拆分（可直接執行）

本章提供可落地的分 PR 實作順序，目標是降低風險、方便 code review、可隨時回滾。

### PR-1：Schema 與 Shared Types 基礎調整

**目標：** 先完成資料模型與型別基線，避免後續 service 改動時型別分岔。

**修改檔案：**

- `packages/prisma-client/prisma/schema.prisma`
- `packages/shared-types/src/reports.ts`
- `apps/frontend/src/services/reportService.ts`（同步型別）

**內容：**

- 新增 `jiraIssueId`、`jiraIssueKey`
- 移除（或停止對外暴露）`bitbucketIssueUrl`
- 建立 migration 並驗證 compile

**驗收：**

- `prisma migrate` 可執行
- backend/frontend 型別檢查通過
- API 回傳不再依賴 issue URL

---

### PR-2：Jira Service（獨立可測）

**目標：** 建立可單獨驗證的 Jira API 存取層。

**修改檔案：**

- `apps/backend/src/services/jiraService.ts`（新增）

**內容：**

- `ensureConfig`、`isEnabled`
- `GET /myself` health check
- `createmeta` 驗證
- ADF builder
- `createIssue`、`getTransitions`、`transitionIssue`
- `syncStatusByReportStatus`
- `extractIssueFromWebhook`

**驗收：**

- 可用 `.env` 建立 issue
- 可對既有 issue 執行 transition
- 錯誤 log 不外洩 token

---

### PR-3：Report 建立流程接入 Jira（過渡期雙軌）

**目標：** 在不破壞 Bitbucket 的前提下，建立 report 時可同步建立 Jira issue。

**修改檔案：**

- `apps/backend/src/services/reportIntegrationPolicyService.ts`
- `apps/backend/src/services/reportIntegrationService.ts`

**內容：**

- 新增 `shouldEnableJira`
- 在 `handleReportCreated` / `ensureIntegrations` 增加 Jira create branch
- 寫回 `jiraIssueId` / `jiraIssueKey`
- 與 Bitbucket 流程分開 try/catch

**驗收：**

- report 建立後可看到 Jira issue id/key
- Jira 失敗時 Bitbucket 與主流程不受阻

---

### PR-4：OMS → Jira 狀態同步

**目標：** OMS 改狀態後可推進 Jira workflow transition。

**修改檔案：**

- `apps/backend/src/services/reportMutationService.ts`

**內容：**

- 新增 `syncJiraState?: boolean`
- 新增 `updateReportStatusByJiraIssueId`
- 在 `updateReportStatus` 中接 Jira transition 呼叫

**驗收：**

- OMS status 變更可反映到 Jira
- transition 不存在或 API 錯誤時不 rollback OMS

---

### PR-5：Jira Webhook 回寫 OMS（本次範圍）

**目標：** 將 Jira 狀態異動回寫 OMS，並確保無循環同步。

**修改檔案：**

- `apps/backend/src/pages/api/webhook.ts`

**內容：**

- 新增 `origin_platform=jira` branch
- Jira status -> OMS status 映射
- inbound 回寫時強制 `syncJiraState=false`

**驗收：**

- Jira 手動轉狀態可回寫 OMS
- 無 loop、無重複回寫

---

### PR-6：驗證、監控與上線開關

**目標：** 將功能從「可用」提升到「可上線」。

**修改檔案：**

- `apps/backend/src/services/*`（補 log 與 guard）
- `docs/jira-migration/OMS_JIRA_BITBUCKET_DUAL_INTEGRATION_PRD.md`（必要時補驗收結果）

**內容：**

- 補齊關鍵 log（create / transition / webhook）
- 驗證 `JIRA_ENABLED`、`BITBUCKET_ENABLED` 切換行為
- 壓力下確認 provider 隔離

**驗收：**

- 雙軌模式穩定
- Jira-only 切換演練成功

---

### PR-7：Jira-only 切換與 Bitbucket 退場（後續版本）

**目標：** 完成最終遷移目標。

**修改檔案：**

- `apps/backend/src/services/bitbucketService.ts`（後續移除）
- `apps/backend/src/services/reportCommentService.ts`（依 comment 遷移方案調整）
- 相關呼叫點與設定檔

**內容：**

- 將 `BITBUCKET_ENABLED` 預設切為 `false`
- 下架 Bitbucket issue create/status sync
- comment sync 依 Phase 7 TODO 方案補齊後再下架

**驗收：**

- 全流程 Jira-only 可運作
- 無 Bitbucket 相依殘留

---

### 22.1 建議執行順序（不依賴 Git 操作）

1. 依 PR-1 -> PR-6 順序執行與驗收。
2. 每個 PR 都要求最少一個可重現的驗收步驟（手動或測試）。
3. PR-7 不與本次上線綁定，待觀察期後另開。

### 22.2 建議 PR 標題格式

- `feat(jira-migration): PR-1 schema and shared-types`
- `feat(jira-migration): PR-2 jira service foundation`
- `feat(jira-migration): PR-3 report integration create path`
- `feat(jira-migration): PR-4 oms to jira status sync`
- `feat(jira-migration): PR-5 jira webhook to oms`
- `chore(jira-migration): PR-6 rollout validation and observability`
