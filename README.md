# Post Flow

自動化 Facebook 粉絲專頁廣告貼文機器人：上傳一張圖片，Claude 會依照你預先設定的「口吻範本」看圖生成廣告文案，並自動發佈到指定的 Facebook 粉絲專頁。另外提供一個免註冊、以邀請密碼進入的上傳平台，讓其他人也能上傳圖片觸發自動發文。

## 功能

- `/upload` — 邀請密碼登入後即可上傳圖片，選擇口吻範本，AI 自動生成文案並發佈到粉專
- `/admin` — 管理員後台：貼文紀錄與重試、口吻範本管理（新增/刪除/設預設）、Facebook 粉專設定、密碼管理
- 圖片存放於 Supabase Storage（public bucket `post-images`），文案由 Claude 視覺模型依照口吻範本生成，發文透過 Facebook Graph API 完成

## 技術架構

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase（Postgres + Storage）— 已建立獨立專案 `post-flow`（project ref: `juwlknkkphsqecgilhbv`），資料表：`posts`、`tone_presets`、`settings`，皆啟用 RLS 且不開放任何 public 政策，所有存取都經由 server 端 service role key 進行
- Claude API（`claude-sonnet-5`，透過 `@anthropic-ai/sdk`）用於看圖生文
- Facebook Graph API（`/{page-id}/photos`）用於自動發文

## 環境變數設定

複製 `.env.example` 為 `.env.local` 並填入：

| 變數 | 說明 |
| --- | --- |
| `SUPABASE_URL` | Supabase 專案 URL（已預先填好 `https://juwlknkkphsqecgilhbv.supabase.co`） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 專案 → Settings → API → `service_role` secret key（**僅能在伺服器端環境變數設定，勿外流**） |
| `ANTHROPIC_API_KEY` | 於 [console.anthropic.com](https://console.anthropic.com) 建立的 API Key |
| `FB_GRAPH_API_VERSION` | 預設 `v21.0` 即可 |
| `SESSION_SECRET` | 任意隨機字串，用來簽署登入 cookie（`openssl rand -hex 32`） |
| `ADMIN_PASSWORD` / `UPLOAD_PASSWORD` | 第一次啟動用的「初始密碼」。登入管理後台後可在「設定」頁面改成正式密碼，改過之後這兩個環境變數就不會再被使用 |

## Facebook 粉專串接設定教學

要讓機器人能自動發文到你的粉專，需要一組長期有效的 **Page Access Token**：

1. 到 [Facebook Developers](https://developers.facebook.com/) 建立一個 App（類型選「Business」）
2. 在 App 內新增 **Facebook Login** 或直接用 Graph API Explorer 產品
3. 用你的粉專管理員帳號登入 [Graph API Explorer](https://developers.facebook.com/tools/explorer/)，選擇你的 App，權限（scopes）至少要勾選：
   - `pages_show_list`
   - `pages_manage_posts`
   - `pages_read_engagement`
4. 產生一組 **User Access Token**，並用它換取「長期有效的 User Token」（透過 `oauth/access_token?grant_type=fb_exchange_token`）
5. 用長期 User Token 呼叫 `GET /me/accounts`，找到你的粉專，取得該粉專的 **Page Access Token**（這組 token 只要 User Token 沒過期，理論上長期有效）與 **Page ID**
6. 若粉專有開啟「兩步驟驗證」或 App 尚未通過 Facebook 的權限審查（App Review），發文權限可能只在「開發模式」下對 App 角色（Admin/Developer/Tester）成員的粉專生效——若粉專不是你自己開發帳號底下的，需要送審 `pages_manage_posts` 權限
7. 把取得的 **Page ID** 與 **Page Access Token** 貼到 `/admin` → 設定 頁面（也可以先在 Graph API Explorer 用 `GET /{page-id}?fields=id,name` 測試 token 是否有效）

> 目前程式已預留串接位置（`src/lib/facebook.ts`），Page ID / Token 皆儲存在 Supabase 的 `settings` 資料表中，可隨時在後台更換，不需要改程式碼或重新部署。

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

- 上傳頁：http://localhost:3000/upload（預設密碼為 `.env.local` 的 `UPLOAD_PASSWORD`）
- 後台：http://localhost:3000/admin（預設密碼為 `.env.local` 的 `ADMIN_PASSWORD`）

登入後台後，請先到「口吻範本」新增至少一組口吻（貼上一段代表你們粉專平常說話語氣的範例文字），再到「設定」填入 Facebook Page ID / Access Token，即可開始使用 `/upload` 上傳圖片自動發文。

## 部署

專案可直接部署到 Vercel 或任何支援 Next.js 的平台，記得在部署平台的環境變數設定中加入上述所有變數（`SUPABASE_SERVICE_ROLE_KEY` 與 `ANTHROPIC_API_KEY` 是機密資訊，切勿提交進 git）。
