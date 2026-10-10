# AI Email Summarizer 🚀
> Full-Stack AI-Powered SaaS Web Application that summarizes email threads, detects urgency, and converts inbox communications into actionable tasks.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Ready-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

- ✉️ **Unified Inbox & Gmail OAuth 2.0**: Read-only synchronization directly from Gmail API with OAuth 2.0 PKCE and AES-256 (Fernet) token encryption.
- ⚡ **Instant 3-Sentence Summaries**: Executive summaries distinguishing core background, decisions, commitments, and deadlines.
- 🎯 **Automated Action Items Extraction**: AI detects explicit requests, tasks, and deadlines (e.g., "Friday at 5:00 PM EST") and extracts them into an interactive Action Center.
- 🔥 **Urgency & Priority Scoring**: Smart multi-level priority scoring (High, Medium, Low) based on genuine urgency and blockers.
- 💬 **Tone-Aware Draft Reply Generator**: Generate ready-to-send draft replies in Professional, Friendly, Concise, or Direct tones.
- 🛡️ **Security & Prompt Injection Defenses**: Untrusted email bodies are sanitized with DOMPurify and BeautifulSoup, isolated in strict prompt data boundaries.
- 🧪 **Zero-Config Demo Mode**: Complete sandbox mode preloaded with realistic workplace scenarios (Engineering Reviews, Job Offers, Coursework, Cloud Invoices) to test without credentials.
- 🌓 **Dark & Light Mode**: Curated color palette (Warm white, lavender, violet, indigo, sky blue, dark slate).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, JavaScript, Tailwind CSS, React Router, Lucide React, Axios, Recharts, React Hook Form, Zod |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, Motor, PyMongo, PyJWT, Bcrypt, Cryptography (Fernet), HTTPX, BeautifulSoup4, Pytest |
| **Database** | MongoDB Atlas (Production) / High-Performance Async Document Store Fallback (Zero-Config Development) |
| **Authentication** | JWT stored in HTTP-only, Secure SameSite Cookies + Bearer Token Header Fallback, Password Hashing via Bcrypt, Expiring Reset Tokens |
| **Deployment** | Vercel (Frontend), Render / Railway / Docker (Backend), MongoDB Atlas (Database) |

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** v18+ and `npm`
- **Python** 3.12+ (Python 3.14 compatible)
- (Optional) **MongoDB** local instance or free **MongoDB Atlas** cluster URI

---

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env

# Run FastAPI dev server
uvicorn app.main:app --reload --port 8000
```

The backend server will run at `http://localhost:8000`.
- API Documentation: `http://localhost:8000/api/docs`
- Health Check: `http://localhost:8000/health`

---

### 3. Frontend Setup

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run Vite dev server
npm run dev
```

The frontend application will run at `http://localhost:5173`.

---

## 🧪 Running Tests

### Backend Test Suite (Pytest)
```bash
cd backend
.\venv\Scripts\pytest -v
```

### Frontend Production Build Test
```bash
cd frontend
npm run build
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description | Default |
|---|---|---|---|
| `ENVIRONMENT` | No | `development` or `production` | `development` |
| `MONGODB_URI` | No | MongoDB Atlas or local connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | No | Database name | `ai_email_summarizer` |
| `JWT_SECRET_KEY` | **Yes in Prod** | 32+ character secret for signing JWTs | `secret` |
| `ENCRYPTION_KEY` | **Yes in Prod** | 32-byte Fernet base64 key | Generated automatically |
| `FRONTEND_URL` | Yes | Allowed frontend origin for CORS & OAuth redirects | `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID (for real Gmail sync) | `""` |
| `GOOGLE_CLIENT_SECRET`| Optional | Google OAuth 2.0 Client Secret | `""` |
| `GOOGLE_REDIRECT_URI` | Optional | OAuth callback URL | `http://localhost:8000/api/gmail/callback` |
| `LLM_PROVIDER` | Optional | `openai`, `gemini`, `anthropic`, `groq`, or `demo` | `demo` |
| `LLM_API_KEY` | Optional | API Key for LLM provider | `""` |
| `LLM_MODEL` | Optional | Model identifier (e.g. `gpt-4o-mini`, `gemini-1.5-flash`) | `gpt-4o-mini` |

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Public base URL for the backend API | `http://localhost:8000/api` |

---

## 📖 Production Deployment

For complete, step-by-step production deployment instructions for **Vercel**, **Render**, and **MongoDB Atlas**, please see [DEPLOYMENT.md](file:///c:/ai-email-summarizer/DEPLOYMENT.md).

---

## 🔒 Security & Compliance

- **Google API Limited Use**: AI Email Summarizer's use of information received from Gmail APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).
- **Zero Plaintext Passwords**: Passwords hashed with bcrypt and salted.
- **Encrypted Credentials**: Stored OAuth tokens encrypted using AES-256.
- **Strict User Isolation**: Every database query is strictly scoped to the authenticated user ID (`user_id`).
