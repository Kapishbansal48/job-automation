# Automated Job Application Dashboard

A full-stack system that scrapes job openings from a public Greenhouse company career page,
displays them on a control-room-style dashboard, and uses headless browser automation to fill
out each application — candidate info and resume — up to, but never including, final
submission, capturing a screenshot as proof at the final stage.

> **This project never submits a real job application.** Automation always stops at the final
> review stage and only takes a screenshot. See [Safety Guarantees](#safety-guarantees).

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Features](#features)
  - [Job Scraping](#job-scraping)
  - [Dashboard](#dashboard)
  - [Candidate Profile Page](#candidate-profile-page)
  - [Application Automation](#application-automation)
  - [Apply to All + Auto Top-Up](#apply-to-all--auto-top-up)
  - [Screenshot Evidence](#screenshot-evidence)
- [Status Progression](#status-progression)
- [API Reference](#api-reference)
- [Configuring Candidate Data](#configuring-candidate-data)
- [Using PostgreSQL Instead of SQLite](#using-postgresql-instead-of-sqlite)
- [Error Handling](#error-handling)
- [Safety Guarantees](#safety-guarantees)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [Testing](#testing)
- [Assessment Checklist](#assessment-checklist)

---

## Overview

The system has three moving parts that work together:

1. **A scraper** that pulls real, structured job data from a public Greenhouse company board
   (no hardcoded jobs, no HTML scraping — it uses Greenhouse's own public JSON API).
2. **A dashboard** (job queue + candidate profile) built with React, where you can trigger
   automation per job or for the whole queue at once, and watch status update live.
3. **A browser automation engine** (Playwright) that opens each job's real application page,
   fills in what it can safely determine from a candidate profile, uploads a resume, reaches
   the final review screen, and stops — capturing a screenshot as proof instead of submitting.

---

## Tech Stack

| Layer          | Technology |
|----------------|------------|
| Frontend       | React (Vite) + TypeScript, Redux Toolkit (RTK Query), React Router, Tailwind CSS |
| Backend        | Node.js + Express + TypeScript |
| Database       | SQLite by default via Prisma ORM (swappable to PostgreSQL) |
| Automation     | Playwright (headless Chromium) |
| Job source     | Greenhouse public Job Board API (`boards-api.greenhouse.io`) |
| Candidate data | Local `data/candidate.json`, kept fully separate from application/automation logic |

Playwright and the Greenhouse API integration were added specifically because the project
requires real headless browser automation against a real, public scraping target.

---

## Architecture

```
┌──────────────────┐        ┌───────────────────┐        ┌────────────────────────┐
│   Greenhouse      │  GET   │  Backend (Express)  │        │   Frontend (React)      │
│   Public Job API  │◄───────│                    │◄──────►│   Dashboard + Profile    │
└──────────────────┘        │  scraper.service   │  HTTP  └────────────────────────┘
                             │  automation.service │
                             │  (Playwright)       │
                             └─────────┬──────────┘
                                       │ read/write
                                       ▼
                             ┌───────────────────┐
                             │  SQLite / Postgres  │
                             │  (Prisma ORM)       │
                             └───────────────────┘
                                       │
                       writes screenshots to  ▼
                             ┌───────────────────┐
                             │    /screenshots     │
                             └───────────────────┘
```

Data flow for one "Apply":
1. Frontend calls `POST /api/applications/:jobId/apply`.
2. Backend responds immediately (automation runs in the background) and launches Playwright.
3. Playwright opens the real Greenhouse application page, fills known fields, uploads the
   resume, answers a small set of safe yes/no questions, scrolls to the Submit button, and
   takes a screenshot — **without clicking Submit**.
4. Job status and screenshot path are written to the database.
5. Frontend polls `GET /api/jobs` and updates the card in place.

---

## Project Structure

```
job-automation-dashboard/
├── backend/                    # Express + TypeScript API, scraper, automation
│   ├── src/
│   │   ├── routes/             # jobs, applications, candidate routers
│   │   ├── controllers/        # request handlers
│   │   ├── services/
│   │   │   ├── scraper.service.ts       # Greenhouse scrape + auto top-up
│   │   │   └── automation.service.ts    # Playwright automation engine
│   │   ├── middleware/         # centralized error handling
│   │   ├── utils/              # Prisma client singleton, candidate loader
│   │   └── types/
│   └── prisma/schema.prisma
├── frontend/                   # React + Vite dashboard
│   └── src/
│       ├── api/                 # RTK Query slice (all backend calls)
│       ├── store/                # Redux store + UI slice (search, modal state)
│       ├── components/           # JobCard, Dashboard, Toolbar, NavBar, PipelineRail,
│       │                         # StatusBadge, ScreenshotModal, AppliedJobRow
│       ├── pages/                 # ProfilePage
│       └── types/
├── data/
│   ├── candidate.json            # Dummy candidate profile (edit this)
│   └── resume.pdf                 # Dummy resume (replace this)
├── screenshots/                    # Captured proof screenshots land here
├── tests/                           # Lightweight sanity tests
├── docker-compose.yml                # Optional PostgreSQL container
└── README.md
```

---

## Prerequisites

- Node.js 18+
- npm
- (Optional) Docker, only if you want PostgreSQL instead of the default SQLite

---

## Installation

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npx playwright install chromium

# 2. Frontend
cd ../frontend
npm install
cp .env.example .env
```

---

## Running the Application

Two terminals, both running at once:

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Visit `http://localhost:5173`.

---

## Environment Variables

**`backend/.env`**

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Backend server port | `4000` |
| `DATABASE_URL` | Prisma connection string | `file:./dev.db` (local SQLite) |
| `GREENHOUSE_BOARD_TOKEN` | Which company's Greenhouse board to scrape | `gitlab` |
| `MAX_JOBS` | Jobs pulled per scrape / per top-up | `15` |
| `CANDIDATE_PROFILE_PATH` | Path to candidate JSON | `../data/candidate.json` |
| `RESUME_PATH` | Path to resume file | `../data/resume.pdf` |
| `SCREENSHOTS_DIR` | Where proof screenshots are saved | `../screenshots` |
| `HEADLESS` | Run automation invisibly (`true`) or watch it live (`false`) | `true` |
| `AUTOMATION_TIMEOUT_MS` | Per-page timeout for automation | `45000` |
| `MAX_RETRIES` | Retry attempts on transient failure (never on CAPTCHA) | `2` |

**`frontend/.env`**

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Where the frontend finds the backend | `http://localhost:4000` |

---

## Features

### Job Scraping

Pulls real job listings from Greenhouse's public, unauthenticated Job Board API:

```
GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
```

This is the officially supported way to read a company's published Greenhouse listings — no
HTML scraping, no hardcoded job list. Jobs are upserted by their Greenhouse job ID
(`externalId`), so re-running the scrape never creates duplicates. HTML entities and tags in
the raw description are decoded and stripped into a clean, readable summary.

Trigger it from the dashboard's **Scrape jobs** button, or:
```bash
curl -X POST http://localhost:4000/api/jobs/scrape
```

### Dashboard

The main page (`/`) shows every job as a card: title, company, location, description, current
automation status, a **pipeline rail** (a small visual track showing exactly how far the job
got through `NOT_STARTED → PROCESSING → FORM_FILLED → READY_FOR_SUBMISSION →
SCREENSHOT_CAPTURED`, or a red branch if it failed), and actions to view the job, apply, or
view captured evidence. A search bar filters by title/location/description, and header stats
show live totals (total / verified / failed).

### Candidate Profile Page

A second page (`/profile`), linked from the top nav bar, shows:
- Who the candidate is: name, email, phone, location, education, skills, links to
  LinkedIn/GitHub, and a direct resume download (`GET /api/candidate/resume`)
- Live stats: applied / verified / in progress / failed
- Every job the candidate has applied to (any job past `NOT_STARTED`), most recent first, each
  with its pipeline stage, status, and a link to the evidence screenshot

The nav bar shows the candidate's initials and name at all times, pulled live from
`GET /api/candidate`.

### Application Automation

For a single job (**Apply** button, or `POST /api/applications/:jobId/apply`), Playwright:

1. Launches headless Chromium and opens the job's real Greenhouse application page.
2. Fills known fields (first/last name, email, phone, location, LinkedIn, GitHub) by matching
   input `name`/`id`/`aria-label`/`placeholder` attributes against the candidate profile.
3. Uploads the resume — handling both classic `<input type="file">` boards and newer
   Greenhouse boards that open the OS file picker via a custom "Attach" button
   (`filechooser` event).
4. Fills a small, explicit allow-list of safe yes/no questions (e.g. "Have you previously
   worked at or consulted for this company?") from `defaultAnswers` in the candidate profile.
   Dropdowns for gender, race, veteran status, disability, and any other
   EEO/self-identification question are **never** touched — they're always left blank.
5. Scrolls to the final Submit button region and takes a full-page screenshot —
   **without clicking it.**
6. Saves the screenshot to `screenshots/job_<id>.png` and updates the job's status.

CAPTCHA/bot-protection detection checks the element's real on-screen position (not just
whether it exists in the DOM), so it distinguishes an actual visible challenge from the
passive, invisible reCAPTCHA badge most sites embed by default. If a real challenge is
detected, the job is marked `FAILED` immediately — it is never retried or bypassed.

### Apply to All + Auto Top-Up

**Apply to All** processes every job in the queue **sequentially** (not in parallel) for
predictable, controlled behavior. A failure on one job is recorded and the batch continues
with the rest. Progress is polled live (`GET /api/applications/apply-all/status`) and shown in
the toolbar.

Once a batch that had jobs finishes, the backend automatically re-queries the same Greenhouse
board and pulls in the next page of jobs it hasn't seen yet (up to `MAX_JOBS` more) —
Greenhouse's API doesn't support true pagination, so this is a self-managed pagination over
already-seen job IDs. This only ever runs after a real batch (never against an empty,
unscraped board), and the toolbar shows a one-line confirmation when it happens, e.g. *"queue
topped up — 5 new jobs pulled in from the board."*

### Screenshot Evidence

Screenshots are saved to `screenshots/job_<id>.png` on success, or
`screenshots/job_<id>_failed.png` as a best-effort snapshot on failure. They're served at
`GET /api/applications/:jobId/screenshot` and statically at `/screenshots/<file>`, and viewable
from either the dashboard or profile page via the **View evidence** button, which opens a modal
showing the job title, the image, the job ID, and the capture timestamp.

---

## Status Progression

```
NOT_STARTED → PROCESSING → FORM_FILLED → READY_FOR_SUBMISSION → SCREENSHOT_CAPTURED
                                                              ↘ FAILED (from any stage)
```

---

## API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/jobs` | List jobs (supports `?search=`) |
| GET | `/api/jobs/:id` | Get one job |
| POST | `/api/jobs/scrape` | Trigger a scrape |
| POST | `/api/applications/:jobId/apply` | Start automation for one job |
| POST | `/api/applications/apply-all` | Start automation for all jobs (sequential) |
| GET | `/api/applications/apply-all/status` | Poll batch progress + last auto top-up result |
| GET | `/api/applications/:jobId/status` | Get one job's automation status |
| GET | `/api/applications/:jobId/screenshot` | Fetch the captured screenshot |
| GET | `/api/candidate` | Get the candidate profile |
| GET | `/api/candidate/resume` | Download the candidate's resume file |

---

## Configuring Candidate Data

Edit `data/candidate.json` directly — it's loaded fresh on every automation run and kept
completely separate from the automation code:

```json
{
  "firstName": "Rahul",
  "lastName": "Sharma",
  "email": "rahul.sharma@example.com",
  "phone": "+91 9000000000",
  "location": "Bangalore, India",
  "linkedin": "https://linkedin.com/in/example",
  "github": "https://github.com/example",
  "education": "B.E. Computer Science",
  "experience": "Fresher",
  "skills": ["JavaScript", "React", "Node.js", "Python"],
  "resumePath": "./resume.pdf",
  "coverLetter": "...",
  "defaultAnswers": {
    "work authorization": "Yes",
    "employment agreements": "No",
    "previously worked at": "No"
  }
}
```

`defaultAnswers` keys are matched against nearby label text on the application form — only
add entries you're confident are safe, unambiguous defaults. Replace `data/resume.pdf` with
your own dummy/test resume (keep the filename, or update `resumePath`).

---

## Using PostgreSQL Instead of SQLite

By default the project uses SQLite for zero-setup local development.

```bash
docker compose up -d
```

Then in `backend/prisma/schema.prisma`, change `provider = "sqlite"` to
`provider = "postgresql"`, and in `backend/.env` set:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/job_automation?schema=public"
```

Then re-run `npx prisma generate && npx prisma migrate dev`.

---

## Error Handling

Handled explicitly, without stopping the rest of an Apply to All run:

- Job page timeout / navigation failure
- Missing/unsupported form fields (skipped, never guessed)
- Resume upload failure (logged, run continues)
- CAPTCHA / bot-protection detection — automation stops immediately, is never retried or
  bypassed; the job is marked `FAILED` with the reason recorded
- Automatic retry (`MAX_RETRIES`, default 2) for transient failures only — CAPTCHA failures
  are never retried

---

## Safety Guarantees

This project **never submits a real job application to any employer.** Specifically:

- Automation always stops at the final review/submit stage and only captures a screenshot —
  it does not click "Submit Application" under any circumstance.
- It does not attempt to bypass CAPTCHA, MFA, or any other bot-protection mechanism; if one is
  detected, the job is simply marked `FAILED`.
- Only dummy candidate data and a dummy/test resume are used.
- Dropdowns for gender, race, ethnicity, veteran status, and disability status are never
  touched by automation, regardless of any configured default answers.

---

## Troubleshooting

**`Cannot find module '@prisma/client/runtime/library.js'`**
Prisma Client was never generated. Run `npx prisma generate` inside `backend/`, then
`npx prisma migrate dev --name init`.

**Prisma schema validation error mentioning `datasource property url is no longer supported`**
You're running a mismatched Prisma CLI version (likely Prisma 7 against a 5.x-pinned project).
Force the pinned version locally:
```bash
npm install prisma@5.19.1 @prisma/client@5.19.1 --save-exact
node_modules/.bin/prisma generate
node_modules/.bin/prisma migrate dev --name init
```

**Job descriptions show raw text like `&lt;div class=&quot;content-intro&quot;&gt;`**
This is HTML-entity-encoded markup that wasn't decoded. Entity decoding must happen *before*
tag stripping in `toPlainSummary` (in `scraper.service.ts`) — decoding after stripping leaves
the now-real tags visible as text. Re-scrape (or clear `backend/prisma/dev.db` and re-migrate)
after fixing, since old records won't retroactively fix themselves.

**Resume upload fails with `Cannot read properties of undefined (reading 'uploadFile')`**
Some Greenhouse boards use a custom "Attach" button that opens the OS file picker via a
`filechooser` event instead of a plain file input. `uploadResume()` in
`automation.service.ts` handles both patterns — the filechooser event first, falling back to a
raw `<input type="file">` if that fails.

**Every job fails with "CAPTCHA challenge widget detected and visible" even though the
screenshot looks clean**
Most sites embed a small, passive, invisible reCAPTCHA v3 "badge" by default — this is not an
actual challenge and should never block automation. The detector checks the element's real
on-screen bounding box and computed CSS (not just whether it exists in the DOM or Playwright's
looser `isVisible()`), and only reacts to the actual challenge popup (`iframe[src*='bframe']`),
not the corner badge.

**`del: command not found` / path errors in a bash-style terminal**
You're in Git Bash/WSL, not Windows CMD — use `rm` instead of `del`, and forward slashes
(`/d/Projects/...`) instead of backslashes.

**Dashboard shows "Could not reach the backend"**
The backend isn't running, crashed, or the frontend's `VITE_API_BASE_URL` doesn't match the
backend's actual port. Check the backend terminal for errors first.

---

## Known Limitations

- Field-matching is heuristic (attribute/label substring matching), so unusually structured
  Greenhouse forms may leave some fields blank rather than risk filling them incorrectly.
- Multi-step (paginated) Greenhouse applications are supported as far as fields are reachable
  on the currently loaded page/iframe; forms requiring multiple "Next" clicks before reaching
  review may need additional per-step navigation logic.
- Dropdown/select and checkbox questions outside the explicit safe allow-list are intentionally
  left untouched rather than guessed — this means some jobs will legitimately stop at
  `FORM_FILLED` instead of reaching `SCREENSHOT_CAPTURED`, which is correct behavior, not a bug.
- Country/location dropdowns are not auto-filled, since option text varies by board and a wrong
  guess there is more consequential than leaving it blank.
- Greenhouse board layouts vary slightly by company; a board that embeds the form in a
  cross-origin iframe the browser blocks introspecting will report a failure for that job
  rather than silently skipping it.

---

## Testing

Lightweight sanity tests using Node's built-in test runner:

```bash
cd backend
npx tsc --module commonjs --moduleResolution node --target ES2020 --esModuleInterop \
  --outDir /tmp/testbuild --skipLibCheck ../tests/status-flow.test.ts src/types/index.ts
node /tmp/testbuild/tests/status-flow.test.js
```

These check the cheapest-to-get-wrong pieces (status enum completeness, terminal-state
correctness) rather than mocking full Playwright/browser behavior — automation correctness is
better verified by actually running it against a real Greenhouse board with `HEADLESS=false`
during development.

---

## Assessment Checklist

- [x] 10–15 jobs collected from a public Greenhouse board (no hardcoding, deduped by ID)
- [x] Dashboard displays the jobs with search, status, and screenshot preview
- [x] Individual Apply workflow
- [x] Apply to All workflow (sequential, with progress + auto top-up)
- [x] Candidate profile loaded from structured local JSON, separate from automation logic
- [x] Resume uploaded automatically
- [x] Automation reaches final review/submission stage
- [x] Actual submission is never performed
- [x] Screenshot captured and linked to the job
- [x] Failure states recorded with reasons, visible on the dashboard
- [x] README complete with setup, configuration, and troubleshooting
