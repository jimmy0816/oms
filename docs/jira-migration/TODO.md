<!-- @format -->

# OMS TODO

## Jira 遷移（hotfix/bitbucket_to_jira）

> 規格來源：`OMS_JIRA_BITBUCKET_DUAL_INTEGRATION_PRD.md` Section 22
> 程式碼現況：PR-1 ~ PR-5 已實作，PR-6 待驗證

### PR-1：Schema 與 Shared Types 基礎調整

- [x] `packages/prisma-client/prisma/schema.prisma`：新增 `jiraIssueId String?`、`jiraIssueKey String?`、`@@index([jiraIssueId])`
- [x] `packages/prisma-client/prisma/schema.prisma`：移除（或標記 deprecated）`bitbucketIssueUrl String?`
- [x] 執行 `pnpm prisma migrate dev`
- [x] `packages/shared-types/src/reports.ts`：移除 `bitbucketIssueUrl?`，新增 `jiraIssueId?`、`jiraIssueKey?`
- [x] `apps/frontend/src/services/reportService.ts`：同步移除 `bitbucketIssueUrl`，保留 `bitbucketIssueId` 並新增 jira 欄位
- [ ] 確認 backend / frontend TypeScript compile 無誤（目前專案存在既有錯誤，非本次引入）

### PR-2：Jira Service（獨立可測）

- [x] 建立 `apps/backend/src/services/jiraService.ts`
- [x] 實作 `isEnabled()`、`ensureConfig()`
- [x] 實作 `GET /myself` health check
- [x] 實作 ADF builder（`buildAdfDocument`）
- [x] 實作 `createIssue()`
- [x] 實作 `getTransitions()`、`transitionIssue()`
- [x] 實作 `syncStatusByReportStatus()`
- [x] 實作 `extractIssueFromWebhook()`
- [x] 補 `createmeta` 驗證邏輯（含 required fields 與 priority allowedValues 驗證）

### PR-3：Report 建立流程接入 Jira（過渡期雙軌）

- [x] `apps/backend/src/services/reportIntegrationPolicyService.ts`：新增 `shouldEnableJira()`
- [x] `apps/backend/src/services/reportIntegrationService.ts`：新增 `createJiraIssueIfNeeded()`
- [x] `reportIntegrationService.ts`：在 `handleReportCreated` 增加 Jira create branch（獨立 try/catch）
- [x] 回寫 `jiraIssueId` / `jiraIssueKey` 至 Report

### PR-4：OMS → Jira 狀態同步

- [x] `apps/backend/src/services/reportMutationService.ts`：`UpdateReportStatusOptions` 新增 `syncJiraState?: boolean`
- [x] `reportMutationService.ts`：新增 `updateReportStatusByJiraIssueId()`
- [x] `reportMutationService.ts`：`updateReportStatus` 末段接 Jira transition 呼叫

### PR-5：Jira Webhook 回寫 OMS

- [x] `apps/backend/src/pages/api/webhook.ts`：新增 `origin_platform=jira` branch
- [x] 實作 Jira status → OMS ReportStatus 映射
- [x] inbound 回寫時強制 `syncJiraState: false`（避免 loop）
- [x] Jira 回寫對應 report 改為支援 `jiraIssueId` / `jiraIssueKey` 雙鍵匹配

### PR-6：驗證、監控與上線開關

- [ ] 補齊 create / transition / webhook 的關鍵 log
- [ ] 驗證 `JIRA_ENABLED` / `BITBUCKET_ENABLED` 切換行為
- [ ] Jira-only 切換演練（`BITBUCKET_ENABLED=false`）

### PR-7：Jira-only 切換與 Bitbucket 退場（後續版本，非本次上線）

- [ ] 將 `BITBUCKET_ENABLED` 預設切為 `false`
- [ ] 下架 Bitbucket issue create / status sync
- [ ] Comment sync 依 Phase 7 TODO 方案補齊後再下架 `bitbucketService.ts`
