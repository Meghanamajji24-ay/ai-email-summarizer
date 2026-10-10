# Production Deployment Guide — AI Email Summarizer 🚀

This document outlines the step-by-step procedure for deploying **AI Email Summarizer** to production using **MongoDB Atlas**, **Render** (Backend), and **Vercel** (Frontend).

---

## Architecture Overview

```
+--------------------------+          HTTPS / CORS          +--------------------------+
|      Vercel (Frontend)   | <============================> |   Render (FastAPI Backend)|
|    React 18 + Vite SPA   |                                |     Python 3.12+ Uvicorn  |
+--------------------------+                                +--------------------------+
                                                                         ||
                                        +--------------------------------++--------------------------------+
                                        |                                                                  |
                                        v                                                                  v
                             +----------------------+                                           +----------------------+
                             |   MongoDB Atlas DB   |                                           |   Google Gmail API   |
                             |  Encrypted DB Clust  |                                           |     OAuth 2.0 Auth   |
                             +----------------------+                                           +----------------------+
```

---

## 1. Database Deployment (MongoDB Atlas)

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create Cluster** (Free M0 Tier is supported).
3. **Database Access**:
   - Create a database user (e.g. `app_user`).
   - Generate a secure password and save it.
4. **Network Access**:
   - Add IP Access List entry: `0.0.0.0/0` (Allow Access from Anywhere) or Render's outbound IP ranges.
5. **Connection String**:
   - Click **Connect** -> **Drivers** -> **Python** (version 3.12 or later).
   - Copy the connection URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/ai_email_summarizer?retryWrites=true&w=majority
     ```

---

## 2. Google OAuth 2.0 Setup (Gmail API)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project: `AI-Email-Summarizer-Prod`.
3. Enable the **Gmail API**:
   - Navigate to **APIs & Services** > **Library** > Search for "Gmail API" > Click **Enable**.
4. Configure **OAuth Consent Screen**:
   - User Type: **External**.
   - App Name: `AI Email Summarizer`.
   - User support email & Developer contact info.
   - Scopes to add:
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/gmail.readonly` (Read-only access).
   - If in **Testing mode**, add your test email accounts under **Test users**.
5. Create **OAuth 2.0 Client Credentials**:
   - Navigate to **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**.
   - Application Type: **Web application**.
   - Name: `AI Email Summarizer Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local development)
     - `https://your-frontend-app.vercel.app` (your production frontend URL)
   - **Authorized redirect URIs**:
     - `http://localhost:8000/api/gmail/callback` (for local development)
     - `https://your-backend-api.onrender.com/api/gmail/callback` (your production backend URL)
6. Copy the **Client ID** and **Client Secret**.

---

## 3. Backend Deployment (Render)

1. Sign in to [Render](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   - **Name**: `ai-email-summarizer-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
5. Configure **Environment Variables** on Render:
   | Key | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `DATABASE_NAME` | `ai_email_summarizer` |
   | `MONGODB_URI` | `mongodb+srv://app_user:<pwd>@cluster0.abcde.mongodb.net/ai_email_summarizer?retryWrites=true&w=majority` |
   | `JWT_SECRET_KEY` | *(Generate a 32+ character random string)* |
   | `ENCRYPTION_KEY` | *(32 url-safe base64 characters or leave blank to derive)* |
   | `FRONTEND_URL` | `https://your-frontend-app.vercel.app` |
   | `BACKEND_URL` | `https://your-backend-api.onrender.com` |
   | `GOOGLE_CLIENT_ID` | `your-google-client-id.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | `your-google-client-secret` |
   | `GOOGLE_REDIRECT_URI` | `https://your-backend-api.onrender.com/api/gmail/callback` |
   | `LLM_PROVIDER` | `openai` (or `gemini`, `anthropic`, `groq`, `demo`) |
   | `LLM_API_KEY` | `sk-...` (your LLM API key) |
   | `LLM_MODEL` | `gpt-4o-mini` |
6. Click **Deploy Web Service**.
7. Once deployment finishes, verify health at `https://your-backend-api.onrender.com/health`.

---

## 4. Frontend Deployment (Vercel)

1. Sign in to [Vercel](https://vercel.com).
2. Click **Add New...** > **Project** and import your repository.
3. In the project configuration:
   - **Root Directory**: Click *Edit* and select `frontend`.
   - **Framework Preset**: `Vite`.
   - **Build Command**: `npm run build` (or leave default).
   - **Output Directory**: `dist` (or leave default).
4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://your-backend-api.onrender.com/api` |
5. Click **Deploy**.
6. Once deployed, verify your live URL `https://your-frontend-app.vercel.app`.

---

## 5. Post-Deployment Verification Checklist

1. [ ] Navigate to your live frontend URL.
2. [ ] Register a new account at `/signup`.
3. [ ] Verify that you are redirected to `/dashboard`.
4. [ ] Test 1-click **Demo Mode** / **Sync Gmail**.
5. [ ] Open an email in `/inbox` and verify the AI summary, key points, and action items.
6. [ ] Add or complete a task in `/actions`.
7. [ ] Go to `/settings` and test exporting data JSON.
8. [ ] Check `/health` endpoint on your backend to ensure database connectivity is active.

---

## 6. Troubleshooting

- **CORS Errors**: Verify that `FRONTEND_URL` in your backend environment variables matches your exact Vercel deployment URL (including `https://` and without trailing slash).
- **Google OAuth `redirect_uri_mismatch`**: Ensure that the exact URL `https://your-backend-api.onrender.com/api/gmail/callback` is added to your Google Cloud Console Authorized Redirect URIs.
- **Vercel 404 on Refresh**: The `frontend/vercel.json` rewrite configuration automatically handles SPA routing so deep links work on reload.
