# NoteWise — intelligent study & flashcards

NoteWise is a full-featured flashcard and study platform implemented with the Next.js App Router. It includes client UI, server API routes, Mongoose models, AI helpers for generating flashcards/summaries, Cloudinary image uploads, and email verification support.

Summary
-------
NoteWise helps students create and study flashcards with modern features like AI-assisted flashcard generation, multiple study modes, and support for spaced repetition (planned). The repository you have contains the complete app based on Next.js (App Router), server API routes and MongoDB models.

Quick facts
-----------

🔧 API endpoints (representative)
---------------------------------
The project organizes API routes under `src/app/api`. Representative endpoints (path names may vary slightly):

Authentication

- POST   /api/auth/register      # Register a new user
- POST   /api/auth/login         # Login
- POST   /api/auth/logout        # Logout / revoke tokens
- POST   /api/auth/refresh-token # Refresh access token

Flashcards & Study

- GET/POST   /api/flashcard                 # List or create flashcards
- POST       /api/flashcard/generate-from-text  # Generate flashcards from text (AI)
- POST       /api/flashcard/generate-from-file  # Generate flashcards from uploaded file
- GET        /api/flashcard/public/:id      # Public shared decks

Users

- GET    /api/v1/users/current      # Get current user profile (auth required)
- PUT    /api/v1/users/current      # Update current user profile
- GET    /api/v1/users              # Admin: list users

(See `src/app/api` to explore full route implementations.)

🚀 Getting started (local development)
-------------------------------------
Prerequisites

- Node.js 18+ (recommended)
- npm (or yarn / pnpm)
- MongoDB (local or remote)

Environment setup

1. Clone the repository

```powershell
git clone <repository-url>
cd "GC Quest" # or your repo folder name
```

2. Create a `.env` file at project root and set the essential variables (example values):

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/gc-quest-db
LOG_LEVEL=info
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=1w
AUTH_SECRET=your-nextauth-secret
AUTH_GOOGLE_ID=...        # optional (Google OAuth)
AUTH_GOOGLE_SECRET=...    # optional
CLOUDINARY_URL=...        # optional (image uploads)
EMAIL_USER=...            # optional (SMTP)
EMAIL_PASSWORD=...        # optional
```

3. Install dependencies and run

```powershell
npm install
npm run dev
```

The frontend is served by Next.js at http://localhost:3000 by default. API routes are available under `/api`.

🔒 Authentication flow (high level)
---------------------------------

- Registration: user signs up using an email/password (or OAuth). A verification email flow is implemented.
- Login: user signs in via NextAuth. JWT tokens are used to manage sessions.
- Protected routes: API calls that require authentication expect a valid session or access token.
- Refresh tokens: long-lived refresh tokens are stored and rotated for safety.

🎯 Current features
-------------------
✅ Implemented

- Modern flashcard-focused UI and student dashboard
- User registration and authentication (NextAuth + JWT)
- MongoDB integration via Mongoose
- AI helper utilities for generating flashcards/summaries (in `src/lib/ai`)
- Cloudinary integration for image uploads

📄 License
-----------
This project uses source files containing Apache 2.0 headers in several files. Treat the code as Apache-2.0 licensed unless otherwise specified by file headers or a LICENSE file.

🔁 Contributing
----------------

1. Create a branch off `main`.
2. Run the app locally and add tests where applicable.
3. Open a PR with a clear description and testing steps.

If you'd like, I can also add:

- a `CONTRIBUTING.md` with PR/checklist templates
- a `run-local.ps1` PowerShell helper for Windows dev setup
- a `docker-compose.yml` for local MongoDB + app

- a `docker-compose.yml` for local MongoDB + app

---

Windows (PowerShell) quickstart — tailored for your system
---------------------------------------------------------

The instructions below are written for Windows using PowerShell (your environment). They assume you have Node.js and npm installed and access to a MongoDB instance (local or hosted). These steps will get the project running locally on your machine.

Prerequisites
- Node.js 18+ (recommended)
- npm (or yarn / pnpm)
- MongoDB (local or remote)

1) Clone the repository

```powershell
git clone <repository-url>
cd NoteWise
```

2) Create a `.env` file

Create a `.env` file at the project root and add the variables listed below. Do NOT commit this file — it contains secrets. The repository's `.gitignore` ignores `.env*` by default.

Minimal example for local development (replace with real secrets):

```text
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
MONGO_URI=mongodb://localhost:27017/notewise
JWT_ACCESS_SECRET=change_this_to_a_secure_secret
JWT_REFRESH_SECRET=change_this_to_a_secure_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=1w
AUTH_SECRET=change_nextauth_secret
# Optional / Integrations
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
CLOUDINARY_URL=
CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_API_SECRET=
EMAIL_USER=
EMAIL_PASSWORD=
GOOGLE_AI_API_KEY_FLASHCARD=
```

- Email: See `EMAIL_SETUP.md` for Gmail App Password instructions (recommended for testing email verification).
- Cloudinary: if you use image uploads, set `CLOUD_*` variables. The app will skip image uploads if not configured.
- OAuth / AI keys: optional unless you integrate Google OAuth or the AI helpers.

3) Install dependencies

```powershell
npm install
```

4) Start the development server

```powershell
npm run dev
```

Open http://localhost:3000 in your browser. The Next.js dev server runs by default on port 3000.

Production build & start
------------------------
Create an optimized build and run the server (useful for testing production behavior locally):

```powershell
npm run build
npm start
```

If you use a remote MongoDB instance (Atlas), ensure `MONGO_URI` in `.env` points to it. If you run a local MongoDB via Docker, a simple `docker run` example:

```powershell
docker run --name notewise-mongo -p 27017:27017 -d mongo:6
```

Common environment notes
- Keep secrets out of source control. Use `.env` or an external secret manager.
- The project already lists many environment variables at the top of this README — add the ones you need.

Email verification
------------------
- Follow `EMAIL_SETUP.md` to configure Gmail App Passwords or use a dedicated provider (SendGrid/AWS SES) for production.

Cloudinary (image uploads)
---------------------------
- If you plan to upload and host images, configure `CLOUD_NAME`, `CLOUD_API_KEY`, and `CLOUD_API_SECRET`. Without these, image upload endpoints will either reject uploads or return errors.

Auth & third-party keys
-----------------------
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` enable Google OAuth sign-in (optional).
- `AUTH_SECRET` is required by NextAuth for session security.
- `GOOGLE_AI_API_KEY_FLASHCARD` (or other AI keys) are optional and only required for AI-generation features.

Troubleshooting tips
--------------------
- If the app cannot connect to MongoDB: double-check `MONGO_URI`, ensure the MongoDB server is reachable, and check firewall rules.
- If you see server-side module errors during development (related to native modules), ensure those imports only happen in server-side code. The project already sets `serverExternalPackages` in `next.config.ts` for server-only native packages like `mongoose`, `mammoth`, `pdf-parse`, `iconv-lite`, and `bcrypt`.
- If verification emails are not sending, verify SMTP credentials and review `EMAIL_SETUP.md`.

Where to look next
------------------
- Routes & API: Inspect `src/app/api/` for implemented endpoints (auth, flashcards, summaries, uploads).
- Models: `src/models/` contains the Mongoose schemas used by the API routes.
- AI helpers: `src/lib/ai/` contains the internal generators for flashcards and summaries.

Need helpers added
------------------
If you want, I can add small developer aids:

- `run-local.ps1` — a PowerShell script to automate `.env` creation, start MongoDB (Docker), install dependencies, and launch the dev server
- `CONTRIBUTING.md` — contributor guidelines and PR checklist
- `docker-compose.yml` — local dev compose file for MongoDB + app

License & acknowledgements
--------------------------
Several source files in this repository include Apache 2.0 headers. Treat the repository as Apache-2.0 where file headers indicate that license.

Enjoy exploring NoteWise — open an issue or PR if you'd like help adding the PowerShell helper or Docker compose file.

— NoteWise team

