# WhatsApp Business Platform (Meta Cloud API & Embedded Signup)

A production-ready, multi-tenant SaaS messaging platform built on **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM (PostgreSQL)**, featuring **Meta Embedded Signup with WhatsApp Business App Onboarding / Coexistence**.

---

## Key Features & Highlights

1. **Meta Embedded Signup (v4 / SessionInfo v3)**
   - Uses the official Meta JavaScript SDK (`v26.0`) and `FB.login` integration.
   - Centralized feature flag: `whatsapp_business_app_onboarding` (Meta WhatsApp Business App Coexistence).
   - Validated `postMessage` listener capturing WABA ID and Phone Number ID from origin `https://www.facebook.com`.
   - Direct server-to-server OAuth authorization code exchange (`GET/POST /oauth/access_token`).

2. **WhatsApp Business App Coexistence**
   - Retains the user's existing WhatsApp Business mobile app connection while simultaneously connecting the number to the WhatsApp Cloud API.
   - Dual-mode support for in-app replies and automated platform broadcast campaigns.

3. **Security & Token Protection**
   - Sensitive Meta credentials (`META_APP_SECRET`, `META_SYSTEM_USER_TOKEN`, customer access tokens) **never leak to the frontend**.
   - Customer WhatsApp access tokens are encrypted at rest using **AES-256-GCM authenticated encryption**.
   - Strict multi-tenant data isolation on all queries scoped by `organizationId`.

4. **Message Template Management**
   - Interactive template creator supporting Header (Text / Media: Image, Video, Document), Body variables (`{{1}}`, `{{2}}`), Footer, and Buttons (Quick Reply, Website URL, Call Phone).
   - Real-time smartphone WhatsApp chat bubble preview with dynamic variable interpolation.
   - Submits directly to Meta Graph API `POST /{WABA_ID}/message_templates` and synchronizes status (`APPROVED`, `REJECTED`, `PENDING`, `PAUSED`).

5. **Meta Webhook System**
   - Webhook verification endpoint (`GET /api/v1/whatsapp/webhook`) matching `hub.verify_token`.
   - Real-time webhook event processor (`POST /api/v1/whatsapp/webhook`) for `messages`, `statuses` (sent, delivered, read, failed), `message_template_status_update`, `phone_number_quality_update`, `smb_message_echoes`, and `history`.
   - Idempotent event handling and audit trail logging.

6. **Broadcast Campaigns & Queue Dispatcher**
   - CSV file upload and live column-to-variable mapping matrix.
   - Mandatory WhatsApp Opt-in policy compliance confirmation.
   - Paced queue batch dispatcher with retry handling and rate limiting.

7. **Live WhatsApp Inbox & 24-Hour Customer Service Window**
   - Real-time conversation threads with live message status ticks (grey tick, double tick, blue double tick, failed badge).
   - Dynamic 24-hour service window countdown timer.
   - Automatic template picker fallback when the 24-hour window expires according to Meta WhatsApp policy.

---

## 1. Environment Variables Configuration

Copy `.env.example` to `.env` and fill in your real credentials:

```bash
cp .env.example .env
```

### Environment Variables Reference Table

| Variable | Scope | Description | Where to find |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_META_APP_ID` | Public / Frontend | Meta App ID | Meta Developer Dashboard -> App Settings |
| `META_APP_ID` | Server | Meta App ID | Meta Developer Dashboard -> App Settings |
| `META_APP_SECRET` | **Server Only** | Meta App Secret | Meta Developer Dashboard -> App Settings -> Basic -> App Secret |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Public / Frontend | Embedded Signup Config ID (`1084755870646567`) | Meta Developer Dashboard -> WhatsApp -> Quickstart / Embedded Signup |
| `META_GRAPH_API_VERSION` | Server | Meta Graph API Version (`v26.0`) | Set to `v26.0` |
| `META_SYSTEM_USER_TOKEN` | **Server Only** | Permanent System User Token | Meta Business Manager -> System Users |
| `META_WEBHOOK_VERIFY_TOKEN` | **Server Only** | Webhook Verification Secret | Configured by you in Meta Webhook Settings |
| `WHATSAPP_WEBHOOK_URL` | Public / Server | Webhook Callback URL | `https://aiwh.infiplus.in/api/v1/whatsapp/webhook` |
| `APP_URL` | Server | Application URL | `https://aiwh.infiplus.in` |
| `DATABASE_URL` | **Server Only** | PostgreSQL Connection String | `postgresql://user:pass@host:5432/whatsapp_db?schema=public` |
| `ENCRYPTION_KEY` | **Server Only** | 32-byte hex string (64 chars) for AES-256-GCM | Generate with `openssl rand -hex 32` |
| `JWT_SECRET` | **Server Only** | Session JWT signing key (32+ chars) | Generate with `openssl rand -base64 32` |

---

## 2. Meta App Dashboard Configuration Guide

To enable Meta Embedded Signup and Webhooks on your domain (`aiwh.infiplus.in`), configure the following in the [Meta Developer Portal](https://developers.facebook.com/apps/3457567954401110/):

### A. Basic Settings (App Domains & Allowlist)
1. Go to **App Settings → Basic**.
2. Add `aiwh.infiplus.in` to **App Domains**.
3. Add `https://aiwh.infiplus.in/privacy` to **Privacy Policy URL**.
4. Set **Website Site URL** under Website platform to: `https://aiwh.infiplus.in`.
5. Save Changes.

### B. Facebook Login for Business
1. In the sidebar, click **Facebook Login for Business → Settings**.
2. Add the following to **Valid OAuth Redirect URIs**:
   ```text
   https://aiwh.infiplus.in/dashboard/whatsapp/connect
   ```
3. Ensure **Login with the JavaScript SDK** is set to **Yes**.
4. Add `https://aiwh.infiplus.in` to **Allowed Domains for the JavaScript SDK**.

### C. WhatsApp Webhook Configuration
1. In the sidebar, click **WhatsApp → Configuration**.
2. Click **Edit** under Webhook.
3. Set **Callback URL** to:
   ```text
   https://aiwh.infiplus.in/api/v1/whatsapp/webhook
   ```
4. Set **Verify Token** to the exact value of your `META_WEBHOOK_VERIFY_TOKEN`.
5. Click **Verify and Save**.
6. Under Webhook fields, click **Manage** and subscribe to:
   - `messages`
   - `message_template_status_update`
   - `message_template_quality_update`
   - `phone_number_quality_update`
   - `phone_number_name_update`
   - `smb_message_echoes` (Coexistence)
   - `smb_app_state_sync` (Coexistence)
   - `history`

---

## 3. Local Development Setup

### Prerequisites
- Node.js `v20.x` or `v22.x`
- PostgreSQL `v14+` or Docker

### Installation Steps

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Push Prisma database schema:
   ```bash
   npx prisma db push
   ```

3. Seed demo accounts, coexistence connections, and templates:
   ```bash
   node scripts/seed.js
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.
   - Demo Login: `admin@enterprise.com`
   - Password: `Password123!`

---

## 4. Production Build & Deployment

### Build the production bundle:
```bash
npm run build
```

### Start the production server:
```bash
npm start
```

### Deploying to Ubuntu / VPS with Nginx & PM2:
```bash
# 1. Start application with PM2
pm2 start npm --name "whatsapp-portal" -- start -- -p 3000

# 2. Configure Nginx Reverse Proxy
server {
    server_name aiwh.infiplus.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Security & Architecture Checklist

- [x] Zero client exposure of `META_APP_SECRET`, `META_SYSTEM_USER_TOKEN`, or DB credentials.
- [x] Customer access tokens encrypted with AES-256-GCM.
- [x] Multi-tenant data isolation on all Prisma queries (`organizationId`).
- [x] Meta Embedded Signup `postMessage` origin validation (`https://www.facebook.com`).
- [x] Webhook challenge verification with `hub.verify_token`.
- [x] 24-hour WhatsApp messaging window policy guard.
- [x] WhatsApp opt-in compliance enforcement before bulk sending.
# whatapp-api-app
