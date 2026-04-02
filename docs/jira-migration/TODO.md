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
- [x] `apps/frontend/src/services/reportService.ts`：同步移除 `bitbucketIssueId`/`bitbucketIssueUrl`，新增 jira 欄位
- [ ] 確認 backend / frontend TypeScript compile 無誤（目前專案存在既有錯誤，非本次引入）

### PR-2：Jira Service（獨立可測）

- [x] 建立 `apps/backend/src/services/jiraService.ts`（目前不存在）
- [x] 實作 `isEnabled()`、`ensureConfig()`
- [x] 實作 `GET /myself` health check
- [x] 實作 ADF builder（`buildAdfDocument`）
- [x] 實作 `createIssue()`
- [x] 實作 `getTransitions()`、`transitionIssue()`
- [x] 實作 `syncStatusByReportStatus()`
- [x] 實作 `extractIssueFromWebhook()`
- [ ] 補 `createmeta` 驗證邏輯

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

### PR-6：驗證、監控與上線開關

- [ ] 補齊 create / transition / webhook 的關鍵 log
- [ ] 驗證 `JIRA_ENABLED` / `BITBUCKET_ENABLED` 切換行為
- [ ] Jira-only 切換演練（`BITBUCKET_ENABLED=false`）

### PR-7：Jira-only 切換與 Bitbucket 退場（後續版本，非本次上線）

- [ ] 將 `BITBUCKET_ENABLED` 預設切為 `false`
- [ ] 下架 Bitbucket issue create / status sync
- [ ] Comment sync 依 Phase 7 TODO 方案補齊後再下架 `bitbucketService.ts`

---

## 歷史功能待辦

- [x] 通知系統
- [x] 空間使用 Thehapp 真實資料，對應 space id
- [x] 通報類別系統
- [x] 儀表板畫面功能完善
- [x] 權限功能程式碼整理
- [x] 建立程式初始架構（腳本,資料庫基本資料... 等）
- [x] 修改圖片上傳即時預覽畫面
- [x] 工單顯示畫面調整
- [x] 工單列表畫面功能完善
- [x] 通報列表畫面功能完善
- [x] 資料庫 id 改為流水號，或是改變列表顯示方式
- [x] 分類、空間等對應表，應考慮後續更新刪除，維護關聯等關係
- [x] 增加分類管理，針對分類項目進行 CRUD 操作
- [x] 增加空間管理，像 airtable 那樣的維護方式
- [ ] 確認 next.js 這個版本套件是否存在安全漏洞，如果存在修正它
- [ ] 研究一下 prisma 多對多關聯如何抓取比較適當
- [ ] Type 中 Attachment 與 FileInfo 資料格式不同的修正

## 第一階段初版更新修改

- [x] 問題地點載入公共區域
- [x] 通報標題直接帶入分類、不需要自行輸入標題
- [x] 工單需要一個可退回的狀態操作
- [x] 在通報顯示時，可以直接查看相關工單狀態及進度
- [x] 通報、工單需可以編輯、刪除
- [x] 角色顯示名稱更改
- [x] 工單回報完成需可以提供回報內容圖片的輸入
- [x] 通報、工單列表無法快速查看清單。提供分組？分館？ view 的紀錄呈現方式

## 1.1 修改

- [x] 在通報內建立完工單之後，不要回到工單總覽 回到該通報的頁面
- [x] 每次新增 修改之類的操作，可否取消跳出這個 alert
- [x] 視圖可以跟著帳號有個綁定的預設，不然每次跳回來都要重選
- [x] 工單沒有空間的篩選可以選
- [x] 通報、工單列表欄位可排序
- [x] 通報、工單列表篩選欄位條件可多選
- [x] 公共區的名稱是舊名，依照 airtable 資料更新
- [x] 分類類別資料更新

## 1.2 修改

- [x] 通報標題帶入level3
- [x] 空間資料更新
- [x] 登出問題
- [x] 更改密碼功能
- [x] 工單列表樣式調整
- [x] 通報與工單 id 編碼
- [x] 前端權限整理

## 1.3 修改

- [x] 更新狀態歷程顯示拿掉
- [x] 工單列表指派角色列表顯示欄位
- [x] 工單篩選可以搜尋負責人
- [x] 通報列表可以搜尋 level1 - level3
- [x] 使用者軟刪除功能
- [x] 工單「無法完成」需要填寫審核單
- [x] 通報加入追蹤日，並且追蹤日可以進行編輯
- [x] 視圖展開功能

## 1.4 功能更新

- [x] 工單頁面有編輯刪除按鈕
- [x] 個別工單頁要有地點顯示
- [x] 工單、通報可以篩選日期區間以篩選建立時間資料
- [x] 工單、通報資料可以匯出 excel
- [x] 登入 oidc-provider 串接
- [x] 列表日期顯示完整
- [x] 開始處理預設為當天日期
- [x] 篩選列表返回後需要重新篩選
- [ ] 不用登入也可以通報？
- [ ] 角色管理功能

## 9/2 討輪整理

- [] oms 資料庫串接 metabase
- [] 修改程式與角色的綁定關係，使角色可以新增與編輯
- [] 截圖複製上傳的功能優化操作行為模式
- [] 使用 oidc 帳號註冊 oms 一樣可以更改 oms 密碼
  **Version2**
- [] 整合管家使用的所有系統，集中在 line 介面上使用
- [] 通知內容、流程整理，串接通知平台規劃
- [] Dashboard 顯示資訊整理
