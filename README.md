# RecruitU Technical Assessment

An AI-assisted candidate discovery demo that turns a job description into a ranked list of matching candidates. The web app guides you through four steps: generate an ideal candidate profile, search candidate IDs, fetch and score detailed profiles, and run advanced analysis with pros/cons — then presents the top candidates.

Live demo link: https://my-web-app--recruitu-technical-assessment.us-central1.hosted.app/top-candidates 

## Features

- AI‑driven matching
  - Creates an ideal candidate profile from a job description using Gemini with structured JSON output
  - Scores each candidate 0–100 and performs a deeper pros/cons analysis on the top set

- Candidate search & data ingestion
  - Multi‑pass discovery across target companies as both current and previous employers
  - Robust pagination handling and de‑duplication of candidate IDs

- Evaluation pipeline
  - Fetches detailed candidate profiles and enriches them with AI scores
  - Re‑ranks and selects top candidates for advanced analysis

- UX
  - Automated 4‑step flow with live logs and progress indicators
  - Top candidates page with ranking, expandable experience timeline, pros/cons, pagination, and LinkedIn links

- Client‑side persistence
  - `sessionStorage`: job description
  - `localStorage`: candidate IDs and people data (auto‑cleared on new search)

## Tech Stack

- Web: Next.js 15 (App Router), React 19, TypeScript, CSS Modules
- AI: Firebase Web SDK (`firebase/ai`) with Google AI Backend (Gemini models)
- Hosting/Infra: Firebase App Hosting (configured), Firebase Functions (scaffolded)

## Repository Structure

- `web app/` — Next.js app (primary application)
  - `src/app/page.tsx` — Landing page to paste a job description
  - `src/app/candidate-flow/page.tsx` — 4-step processing flow
  - `src/app/top-candidates/page.tsx` — Ranked candidates with details
  - `src/lib/firebase.ts` — Firebase app and Gemini model helpers
  - `src/lib/storage.ts` — Local storage helpers for IDs and people map
  - `src/components/` — UI components (processing step, loading, init)
- `functions/` — Firebase Functions (currently scaffolded; no active endpoints)
- `firebase.json`, `firestore.rules` — Firebase configuration

## Prerequisites

- Node.js 18.18+ (recommended) for the web app; Node.js 22 for Firebase Functions if you choose to develop them
- npm 9+
- Optional: Firebase CLI (`npm i -g firebase-tools`) for deployment

## Running the Web App Locally

1) Install dependencies

```bash
cd "web app"
npm install
```

2) Start the dev server

```bash
npm run dev
```

3) Open the app

- Visit http://localhost:3000
- Paste a job description (or click “Try a sample”) and start the flow

Notes:
- The app uses an external staging API for candidate search and people details.
- Firebase config is embedded for this demo; no additional env variables are required for local dev.

## How It Works (Flow)

1) Profile: Uses Gemini (structured JSON schema) to produce an ideal candidate profile from your job description.
2) Discovery: Calls a search API for each target company (current and previous) to build a set of candidate IDs.
3) Evaluation: Fetches detailed candidate profiles, then scores each with Gemini (0–100).
4) Advanced Analysis: Re-evaluates the top candidates with pros/cons and updates scores.
5) Results: Displays ranked candidates with expandable experience timeline and links (when available).

Data is stored client-side:
- `sessionStorage`: job description
- `localStorage`: candidate IDs and people map (cleared automatically for a new search)

## Deployment (Optional)

Firebase App Hosting is configured to serve the Next.js app from `web app/`.

1) Install and log in to Firebase CLI

```bash
npm i -g firebase-tools
firebase login
```

2) Select your project

```bash
firebase use <your-project-id>
```

3) Deploy App Hosting (and Functions if needed)

```bash
firebase deploy
```

The default `firebase.json` is set to use `web app` as the App Hosting root directory. Functions are scaffolded with `maxInstances` only; there are no active HTTP endpoints.

## Troubleshooting

- Empty results: The external staging API may return no results for certain profiles/companies.
- Browser storage: If you see errors saving to storage, ensure your browser allows `localStorage`/`sessionStorage` for the site.
- Node version: Use Node 18.18+ for the web app. If working on Functions, use Node 22 per `functions/package.json`.

## License

This project is for technical assessment and demo purposes.
