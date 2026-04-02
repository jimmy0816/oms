<!-- @format -->

# Jira API 溝通文件（OMS 專案）

本文件整理 OMS 與 Jira Cloud API 溝通時的最小可行流程、請求範例與常見錯誤排查。

## 1. 驗證與路徑

### 1.1 使用 Scoped API Token 的基本規則

- 驗證方式：Basic Auth
- Username：Atlassian 帳號 Email
- Password：API Token（Scoped）
- 必要 scopes：
  - `read:jira-work`
  - `write:jira-work`
  - 建議加上 `read:jira-user`

### 1.2 Base URL

若使用 Scoped Token，必須走 Atlassian API Gateway：

`https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3`

不要使用：

`https://{your-site}.atlassian.net/rest/api/3`

### 1.3 取得 cloudId

在瀏覽器（已登入 Jira）開啟：

`https://{your-site}.atlassian.net/_edge/tenant_info`

從 JSON 取 `cloudId`。

## 2. Postman 環境變數建議

- `CLOUD_ID`
- `BASE_URL` = `https://api.atlassian.com/ex/jira/{{CLOUD_ID}}/rest/api/3`
- `PROJECT_ID` = `10033`
- `PROJECT_KEY` = `ZI`
- `ISSUE_TYPE_ID` = `10040`

## 3. 最小可行流程

### 3.1 健康檢查

`GET {{BASE_URL}}/myself`

成功回應 200 代表 token、scope、base URL、cloudId 基本正確。

### 3.2 查詢可建立 Issue 的必要欄位（createmeta）

建立 Issue 前，先呼叫此 API 確認該專案可用的 issue type 與必填欄位。

`GET {{BASE_URL}}/issue/createmeta?projectIds={{PROJECT_ID}}&expand=projects.issuetypes.fields`

或指定 issue type 名稱（区分大小寫）：

`GET {{BASE_URL}}/issue/createmeta?projectIds={{PROJECT_ID}}&issuetypeIds={{ISSUE_TYPE_ID}}&expand=projects.issuetypes.fields`

回傳結構重點說明：

- `projects[].issuetypes[].id` → issue type id，建立 issue 時使用此值
- `projects[].issuetypes[].name` → issue type 名稱（中文介面可能顯示「錯誤」而非 `Bug`）
- `projects[].issuetypes[].fields` → 每個欄位的定義，包含：
  - `required: true` → 送 create issue 時**必填**
  - `schema.type` → 欄位型別（string / array / object 等）
  - `allowedValues` → 若存在，表示只能填入清單內的合法值

本專案（ZI）目前唯一可用的 issue type：

- id: `10040`
- name: `錯誤`
- 必填欄位：`summary`、`project`
- description 欄位型別：`string`（但實際傳送需為 ADF 格式）

### 3.3 建立 Issue

`POST {{BASE_URL}}/issue`

Body 範例：

```json
{
  "fields": {
    "project": {
      "id": "10033"
    },
    "issuetype": {
      "id": "10040"
    },
    "summary": "OMS-REPORT-1234",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "Report Category: 訂單流程"
            }
          ]
        },
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "Reporter: 王小明"
            }
          ]
        },
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "使用者按下送出後顯示 500，無法建立訂單。"
            }
          ]
        }
      ]
    },
    "labels": ["oms", "auto-created"]
  }
}
```

注意：`description` 在此專案需使用 ADF 格式，不可為純字串。

### 3.3 查詢可轉換狀態（Transition）

`GET {{BASE_URL}}/issue/{ISSUE_KEY}/transitions`

此 API 會回傳「當前狀態可執行的動作」。

### 3.4 變更狀態

`POST {{BASE_URL}}/issue/{ISSUE_KEY}/transitions`

Body 範例：

```json
{
  "transition": {
    "id": "11"
  }
}
```

成功通常回應 `204 No Content`。

### 3.5 驗證結果

`GET {{BASE_URL}}/issue/{ISSUE_KEY}`

檢查 `fields.status.name` 是否符合預期。

## 4. 本專案目前觀察到的 Transition 範例

以 `ZI-1` 查詢結果為例：

- `11` -> `PROCESSING`
- `21` -> `REJECTED`
- `31` -> `PENDING_REVIEW`
- `41` -> `REVIEWED`
- `51` -> `RETURNED`

注意：transition id 與名稱可能隨 workflow、專案設定、當前狀態而改變，實作時建議每次更新前先查一次 transitions。

## 5. 與 OMS 狀態同步建議

OMS 若維持以下狀態：

- `open`
- `resolved`
- `wontfix`
- `closed`

建議策略：

1. 先呼叫 transitions 取得可選動作。
2. 依目標 OMS 狀態挑選最合適 transition。
3. 執行 transition。
4. 回查 issue 狀態並同步回 OMS。

## 6. 常見錯誤與排查

### 6.1 `Client must be authenticated to access this resource`

原因：Scoped Token 但使用了錯誤 URL。

排查：確認是否使用 `api.atlassian.com/ex/jira/{cloudId}`。

### 6.2 `Unauthorized; scope does not match`

原因：scope 不足或 API 路徑錯誤。

排查：

- 確認有 `read:jira-work`、`write:jira-work`
- 確認 `BASE_URL` 包含 `/rest/api/3`
- 先測 `GET {{BASE_URL}}/myself`

### 6.3 `project: valid project is required`

原因：project key/id 錯誤、無權限、或 cloudId 指向錯誤站點。

排查：先呼叫 `GET {{BASE_URL}}/project/search` 確認可見專案。

### 6.4 `issuetype: 指定有效的議題類型`

原因：該專案不可用該 issue type。

排查：用 `createmeta` 查專案可用的 `issuetype.id`，優先使用 id 而非 name。

### 6.5 `description: 作業值必須是 Atlassian 文件`

原因：description 欄位需 ADF 格式。

排查：將純字串改為 ADF JSON。

## 7. 參考文件

- Jira Issues REST API v3:
  - https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues
- Jira Scopes:
  - https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/
- Atlassian API Tokens:
  - https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/
