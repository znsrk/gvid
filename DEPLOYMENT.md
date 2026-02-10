# Deployment Guide — gvidtech

## Architecture

```
[Vercel] → Frontend (React/Vite)
    ↓ API calls (authenticated)
[Cloud Run] → Backend (Express/Node.js)
    ↓ Data + Auth verification
[Supabase] → Database (PostgreSQL) + Auth (email/magic link)
```

---

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the SQL Editor, paste and run the contents of `supabase-schema.sql`.
3. Go to **Authentication → Providers** and ensure **Email** is enabled.
   - Enable "Confirm email" for email+password sign-up.
   - Enable "Allow magic link sign-in" for passwordless auth.
4. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Fill in:
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — same Supabase project
- `VITE_API_URL` — will be your Cloud Run URL after deployment

---

## Step 3: Deploy Backend to Google Cloud Run

### Prerequisites
- Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- Create a GCP project: `gcloud projects create my-gvidtech`
- Enable required APIs:
  ```bash
  gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com
  ```

### Build & Deploy

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy to Cloud Run (from project root)
gcloud run deploy gvidtech-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=your_key,SUPABASE_URL=https://xxx.supabase.co,SUPABASE_SERVICE_ROLE_KEY=your_key,UNSPLASH_ACCESS_KEY=your_key,ALLOWED_ORIGINS=https://your-app.vercel.app"
```

After deployment, Cloud Run gives you a URL like:
```
https://gvidtech-api-xxxxx-uc.a.run.app
```

Copy this URL — you'll need it for the frontend.

---

## Step 4: Deploy Frontend to Vercel

### Prerequisites
- Install [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- Or connect your GitHub repo to Vercel dashboard.

### Configure Environment Variables in Vercel

In the Vercel dashboard (Settings → Environment Variables), add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your_supabase_anon_key` |
| `VITE_API_URL` | `https://gvidtech-api-xxxxx-uc.a.run.app/api` |

### Deploy

```bash
# From project root
vercel

# For production
vercel --prod
```

---

## Step 5: Update Cloud Run CORS

After you know your Vercel domain, update Cloud Run's `ALLOWED_ORIGINS`:

```bash
gcloud run services update gvidtech-api \
  --region us-central1 \
  --update-env-vars "ALLOWED_ORIGINS=https://your-app.vercel.app"
```

---

## Local Development

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev:all
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001`.

---

## Authentication Flow

1. User visits the app → sees login page.
2. **Magic Link**: Enter email → receive login link via email → click to sign in.
3. **Email + Password**: Register or sign in with email and password.
4. All API calls include the Supabase JWT token in the `Authorization` header.
5. The server verifies the token and associates data with the user.

---

## Project Structure (Post-Migration)

```
├── Dockerfile              # Cloud Run container
├── .dockerignore
├── vercel.json             # Vercel configuration
├── .env.example            # Environment variable template
├── supabase-schema.sql     # Database schema with RLS
├── server/
│   └── index.js            # Express API (Supabase + auth middleware)
└── src/
    ├── contexts/
    │   └── AuthContext.tsx  # Auth state management
    ├── lib/
    │   ├── supabase.ts     # Supabase client
    │   ├── api.ts          # API base URL config
    │   └── fetch.ts        # Authenticated fetch wrapper
    ├── pages/
    │   └── AuthPage.tsx    # Login/register page
    └── ...
```
