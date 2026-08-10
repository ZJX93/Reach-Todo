# 多端推送（任务到期提醒）配置指南

抵达 Reach 通过 **Firebase Cloud Messaging (FCM)** 实现多端提醒：
后端在任务临近到期时，向该用户所有已注册设备（安卓 App + Web 浏览器）推送系统通知。

代码框架已就位，**只差 Firebase 项目凭证**。按以下步骤补齐即可生效。

---

## 一、在 Firebase 控制台建项目

1. 打开 https://console.firebase.google.com → 新建项目（或用现有项目）。
2. 项目内打开 **Build → Cloud Messaging**，确认 Messaging API 已启用。
3. **Android 应用**：`Project settings → 添加应用 → Android`，包名填
   `com.zjx93.reach`，按提示下载 `google-services.json`（需填入本机 SHA-1）。
4. **Web 应用**：`Project settings → 添加应用 → Web`，记下 `apiKey /
   projectId / messagingSenderId / appId`。
5. **Web 推送证书**：`Cloud Messaging → Web 推送证书 → 生成密钥对`，得到
   **VAPID 密钥**。

---

## 二、后端（server/）

后端用项目既有依赖（python-jose + httpx）直接走 FCM HTTP v1，**无需新增 pip 包**。

设置以下环境变量（二选一）：

```bash
# 方式 A：服务账号 JSON 文件路径
FCM_SERVICE_ACCOUNT_JSON=/path/to/service-account.json

# 方式 B：拆分的三要素
FCM_PROJECT_ID=your-project-id
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> 私钥里的换行若写在 `.env` 中，用字面 `\n` 转义即可（代码会统一归一为真实换行）。
> 未配置时推送自动降级为 no-op（仅打 warning），不影响其他功能。

其他可调项：

```bash
FCM_REMINDER_LEAD_MINUTES=10   # 到期前 10 分钟推送；0 = 到期时刻
FCM_REMINDER_ENABLED=1         # 后台调度器开关
```

后端启动时会自动跑 Alembic 迁移，新增 `device_tokens` 表与 `tasks.reminder_sent_at`
字段，并启动每分钟扫描的后台调度器。

接口：
- `POST /api/devices/register`  `{ token, platform: "android"|"web" }` —— 设备令牌上报（登录后自动调用）
- `POST /api/devices/unregister` 同上 —— 注销设备
- `GET  /api/devices` —— 列出当前用户已注册设备

---

## 三、安卓（android/）

1. 把下载的 `google-services.json` 放到 `android/app/google-services.json`
   （该文件已被 `.gitignore` 忽略，**请勿提交**；可参考 `google-services.example.json`）。
2. 已自动接入的依赖/代码：
   - `app/build.gradle.kts`：firebase-bom + firebase-messaging + google-services 插件
   - `ReachFirebaseMessagingService`：令牌轮换上报 + 收消息弹通知
   - `NotificationHelper`：创建 `reach_reminders` 通知渠道
   - `FcmHelper`：取 FCM token 并上报后端
   - 登录/注册成功、`ReachApplication` 启动时会自动注册设备
   - `MainActivity` 在 Android 13+ 申请 `POST_NOTIFICATIONS` 权限
3. `./gradlew assembleDebug` 构建，安装后登录即会订阅推送。

---

## 四、Web（web/）

1. 打开 `web/src/lib/fcm.js`，把 `firebaseConfig` 与 `VAPID_KEY` 替换为你的项目值。
2. 打开 `web/public/firebase-messaging-sw.js`，把其中的占位 `firebase.initializeApp({...})`
   配置同步替换为相同值。
3. 已自动接入：
   - `package.json` 新增 `firebase` 依赖（首次需 `npm install`）
   - 登录/注册成功、`main.jsx` 启动（已登录时）会自动 `initWebPush()`，请求通知权限、
     取 FCM token、上报后端
   - 前台消息由 `onMessage` 直接弹通知；后台消息由 `firebase-messaging-sw.js` 弹系统通知
4. 构建 `npm run build` 部署即可。

---

## 五、验证

1. 后端配置好后启动，`GET /api/devices` 应能看到设备列表。
2. 创建一个带 `due_date`（并早于 `FCM_REMINDER_LEAD_MINUTES` 后）的待办，
   等待调度器周期（≤60s），对应设备应收到系统通知。
3. 若未收到：检查后端日志是否仍提示 “FCM 未配置”，以及 Firebase 控制台
   `Cloud Messaging` 中该 token 的投递记录。
