# TutorHub

TutorHub is a full-stack tutoring management platform that connects **Students, Tutors, and Administrators** in a centralized academic support system.

The platform enables course enrollment, assignment management, study planning, messaging, and academic progress tracking.

---

## Project Overview

TutorHub is built using a **Modular Monolith architecture** with clear separation of concerns across layers. The system follows a **Layered Architecture** while internally applying the **MVC design pattern**.

### What the system does

- **Students** browse published courses, enroll, view assignments, submit work, track study plans, and message tutors/peers.
- **Tutors** create and publish courses, post assignments, review submissions, and message students.
- **Administrators** use the admin dashboard area for oversight (e.g. messaging views in this codebase).

Users sign up and log in over the web. The server stores data in **PostgreSQL** and uses **JWT-based sessions** (token returned on login; dashboard routes are protected by middleware).

### SaaS-style application

Basically a **SaaS-style** setup: one deployment, lots of users in the browser, data in one Postgres DB split by user id and roles (not a separate install per school). You could host it on something like Vercel + a managed DB (**PaaS** + **DBaaS**). Locally: `npm run dev`.

The platform ensures:

- Secure authentication and session management
- Role-based access control
- Structured tutor-student interaction
- Assignment lifecycle management
- Academic progress tracking
- Scalable database-driven architecture

---

## Architecture Design 

We use **four logical layers**. In a Next.js app some files sit “between” layers (e.g. route handlers coordinate everything), but the responsibilities are still separated.

### UI Layer (Presentation)

- **What it is:** Pages and React components the user sees and clicks.
- **Where:** `app/` (routes like `app/dashboard/...`, `app/courses/...`, `app/login/page.tsx`), and shared UI in `components/` (`DashboardFrame.tsx`, `Navbar.tsx`, forms, lists).
- **Separation of concerns:** No direct database access in components; they call `fetch()` to REST APIs or use server/client patterns provided by Next.js. Styling uses **Tailwind CSS** (`app/globals.css`, `tailwind.config.ts`).

### Application Layer

- **What it is:** HTTP API **route handlers** that receive requests, check auth, validate input, call domain/data code, and return JSON.
- **Where:** `app/api/**/route.ts` (e.g. `app/api/auth/login/route.ts`, `app/api/assignments/route.ts`, `app/api/enrollments/route.ts`, `app/api/messages/route.ts`, `app/api/study-plans/route.ts`, `app/api/submissions/route.ts`).
- **Separation of concerns:** This layer knows about **HTTP status codes**, **JSON bodies**, and **who is allowed** to do what (role checks). Heavy or reusable workflows are delegated to `lib/` (e.g. `lib/messages.ts` for messaging queries).

### Domain Layer

- **What it is:** The **business concepts** of the system: users, courses, enrollments, assignments, submissions, messages, study plans. In this project they are defined mainly as **Prisma models** in `prisma/schema.prisma` (e.g. `User`, `Course`, `Enrollment`, `Assignment`, `Submission`, `Message`, `StudyPlan`, `Task`). Rules like “only tutors create assignments” and “students must be enrolled” are enforced in the **application layer** inside the relevant `route.ts` files.
- **Note:** There isn’t a separate `domain/` folder with classes. Mainly **Prisma models** in `schema.prisma` plus checks inside the API routes.

### Infrastructure Layer

- **What it is:** Anything that talks to the **outside world**: database, crypto, env-based secrets.
- **Where:**
  - `lib/prisma.ts` — single **Prisma Client** instance (PostgreSQL adapter).
  - `lib/jwt.ts` — sign/verify JWTs with `JWT_SECRET`.
  - `middleware.ts` — protects `/dashboard/*` using **jose** (`jwtVerify`) and passes `x-user-id` / `x-user-role` headers when valid.
  - `prisma/migrations/` — schema evolution.

### Separation of concerns (summary)

| Layer            | Depends on        | Does not depend on   |
|-----------------|-------------------|----------------------|
| UI              | HTTP APIs, props  | Prisma directly      |
| Application     | Domain + Infra    | UI components        |
| Domain (models) | (types/relations) | HTTP details         |
| Infrastructure  | DB, OS, crypto    | React                |

### Integration concepts (lecture: transportation, transformation, orchestration)

Our main integration is **browser ↔ Next.js API ↔ PostgreSQL**. Everything is **synchronous HTTP** (request/response).

1. **Transportation** — **JSON over HTTP** (`Content-Type: application/json`). The client sends `fetch(url, { method, headers, body })`; the server responds with JSON. For dashboard navigation, **cookies** can carry `authToken` (see login flow and API routes that read the cookie string).

2. **Transformation** — Request **JSON** is parsed into JavaScript objects, then mapped to **Prisma `create` / `update` / `findMany`** calls. Responses map Prisma records back to **JSON** (dates as ISO strings where needed). Example: `app/api/auth/login/route.ts` reads email/password, compares with `bcrypt`, then returns `{ token, user }`.

3. **Orchestration** — A single API route can **chain steps** in order. Example: `app/api/messages/route.ts` calls `requireAuth` → loads peer user → `getConversation` / `markThreadRead` from `lib/messages.ts` → returns combined JSON. Enrollment: verify token → load course → check capacity → `prisma.enrollment.create`.

---

## Design Patterns that were used 

### MVC (Model–View–Controller)

| Piece        | In TutorHub |
|-------------|-------------|
| **View**    | React pages under `app/` and components under `components/`. |
| **Controller** | `app/api/.../route.ts` handlers (HTTP in/out). |
| **Model**   | Data shape and persistence: `prisma/schema.prisma` + operations via `prisma` in routes and `lib/messages.ts`. |

**Why:** UI vs API vs data is split like in the MVC lectures.

### Repository-style access (via Prisma)

We do **not** have a hand-written `UserRepository` class. Instead, **Prisma** is our single abstraction over SQL: all DB access goes through `import { prisma } from "@/lib/prisma"` and typed models.

**Why:** One place for DB access; Prisma does that job instead of hand-writing a Repository class.

### Middleware (cross-cutting auth)

`middleware.ts` runs before `/dashboard` routes to verify JWT and attach user context.

**Why:** Auth for `/dashboard` in one file instead of repeating it everywhere.

### Module / helper functions (`lib/messages.ts`)

Messaging **queries** (conversation, inbox, mark read) live in `lib/messages.ts` so `app/api/messages/route.ts` stays shorter.

**Why:** **Single responsibility** for “how messages are read/written in the DB” vs “HTTP shape of the API.”

### Factory

No Factory pattern here—just **`prisma.*.create`** where we need new rows.

---

## SOLID Principles

Examples tied to actual files (some are only partly there):

### Single Responsibility (SRP)

- **`lib/jwt.ts`** - only JWT sign/verify; does not query the database.
- **`lib/api-auth.ts`** - reads token from request and returns user payload or 401 (`requireAuth`).
- **`lib/prisma.ts`** - only sets up the DB client.
- **`lib/messages.ts`** — messaging DB helpers, not HTTP.
- Some routes still copy the “get token from header/cookie” code instead of using `requireAuth` only (e.g. enrollments vs messages). Messy but it works.

### Open/Closed (OCP)

- New features are often added as **new route files** or new pages without editing unrelated modules (e.g. new `app/api/foo/route.ts`). Prisma **migrations** extend the schema without rewriting all queries.

### Liskov Substitution (LSP)

- TypeScript interfaces like `JwtPayload` in `lib/jwt.ts` are implemented by decoded tokens; code that uses `verifyToken` expects that shape. Prisma-generated types for models keep queries consistent.

### Interface Segregation (ISP)

- Small, focused exports: `JwtPayload`, `requireAuth` return type, messaging functions each doing one job in `lib/messages.ts`.

### Dependency Inversion (DIP)

- Route handlers depend on **`prisma`** and **`jwt` abstractions**, not on raw SQL or ad-hoc crypto. The UI depends on **HTTP contracts** (JSON), not on Prisma.


## Non-Functional Requirements

### Performance

- Database indexes on `Message` (`@@index` in `prisma/schema.prisma`) support faster conversation queries.
- API handlers return only needed fields where Prisma `select` / `include` is used (e.g. course lists with tutor summary).
- No real load testing—fine for a demo.

### Availability (e.g. 24×7 uptime)

- The **app server** can be restarted independently; data lives in **PostgreSQL**. For true uptime you would use a managed DB and multiple app instances behind a load balancer.
- No monitoring/SLA in this repo.

### Scalability (horizontal scaling concept)

- **Stateless** JWT validation in `middleware.ts` and API routes means you can run **multiple Node processes** with the same `DATABASE_URL` (sticky sessions not required for API JWT).
- **Database** becomes the main bottleneck; read replicas or connection pooling are the next step at scale.

### Security (CIA)

- **Confidentiality** — Passwords stored as **bcrypt** hashes (`app/api/auth/login/route.ts`, registration). JWTs should use a **strong `JWT_SECRET`** in production (never commit real secrets). Dashboard routes require a valid token.
- **Integrity** — Role checks in API routes (e.g. only tutors create assignments in `app/api/assignments/route.ts` POST); enrollment checks student is **ACTIVE** before showing assignments.
- **Availability** — DoS etc. not really handled; real deploy would use a normal host + backups.

### Maintainability

- **TypeScript** across app and `lib/`.
- **Prisma migrations** track schema history under `prisma/migrations/`.
- Shared helpers (`lib/api-auth.ts`, `lib/messages.ts`) reduce copy-paste where used.


## Class Design / OOP

### Key “classes” / models and responsibilities

The closest thing to classic OOP classes here are **Prisma models** in `prisma/schema.prisma`:

- **`User`** — identity, role (`STUDENT` | `TUTOR` | `ADMIN`), credentials relation to activity.
- **`Course`**, **`Enrollment`**, **`Assignment`**, **`Submission`**, **`Progress`** — tutoring domain.
- **`Message`** — user-to-user messaging.
- **`StudyPlan`**, **`Task`** — student planning.

**TypeScript modules** (`lib/jwt.ts`, `lib/messages.ts`, `lib/api-auth.ts`) group functions with a clear role - **procedural + types**, not every file is a `class`.

### Why this mix

- Tables map to Prisma models; ids are on the entities.
- Routes are mostly functions + imports, not big inheritance trees.
- Prisma + TypeScript types cover most of what we need; no extra patterns for the sake of it.

---

## Scalability & Cloud Considerations

### SaaS model

- One application serves **many tenants** (users) with **shared infrastructure** and **logical isolation** by user id and role - **SaaS-style**, as in the overview.

### Horizontal scaling concept

- Run **more instances** of the Next.js server behind a load balancer; all share the same PostgreSQL URL. JWT auth does not require server-side session storage for basic flows.

### Cloud layering 

- **SaaS** — TutorHub as the software service users log into.
- **PaaS** — e.g. Vercel/Render/Fly.io host the Node runtime.
- **IaaS** — VMs or managed Postgres for storage.

---

## Usability & UI

- **Consistent look:** Shared **slate + emerald** theme (`app/globals.css` CSS variables), gradients, rounded cards, similar spacing across login/register/dashboard.
- **Role-based navigation:** `components/DashboardFrame.tsx` shows different links for tutor vs student vs admin so users are not lost in irrelevant menus.
- **Simple flows:** Login → dashboard → feature pages (courses, assignments, messages) with clear labels.
- Forgot-password page is **stub only** (no reset flow yet).

---

## Software Engineering Practices

- **Clean structure:** `app/` for routes, `components/` for UI, `lib/` for shared logic, `prisma/` for schema and migrations.
- **Modularity:** Messaging logic extracted to `lib/messages.ts`; auth helpers in `lib/api-auth.ts` and `lib/jwt.ts`.
- **Naming:** Files match Next.js conventions (`page.tsx`, `route.ts`); components named by purpose (`CreateAssignmentForm.tsx`, `CourseEnrollClient.tsx`).
- **Repository organization:** Single Git repo; migrations versioned; `.env` for secrets (not committed).

**Still rough:** token parsing duplicated in some routes. Tests hit **`lib/`** and **`app/api/**/route.ts`** with mocked Prisma—not React components or `middleware.ts`.

---

## Testing

RTM ↔ tests: **`docs/testing/RTM-TEST-TRACEABILITY.md`**.  
Vitest. API tests mock Prisma (`vi.mock("@/lib/prisma")`) so you don’t need Postgres running for `npm test`.

| Area | Tests |
|------|--------|
| Auth / JWT | `lib/jwt.test.ts`, `lib/api-auth.test.ts` |
| Login / register | `app/api/auth/login/route.test.ts`, `app/api/auth/register/route.test.ts` |
| Courses | `app/api/courses/...`, `mine`, `enrolled` |
| Enrollments, assignments, submissions, messages, study plans | `*.test.ts` next to each `route.ts` under `app/api/` |

Commands: **`npm test`**, **`npm run test:watch`**, **`npm run test:coverage`** (numbers in **`docs/testing/coverage-summary.txt`**).

Last run log: **`docs/testing/test-run-output.txt`**.  
**`.github/workflows/ci.yml`** runs `npm test` on push to `main`/`master` (and PRs).

No tests for React pages or `middleware.ts` right now.

---

## Architecture (original layered summary)

The system is divided into the following layers:

### 1 Presentation Layer (Client)

- Implemented using **Next.js (TypeScript)**
- Responsible for rendering user interfaces
- Student, Tutor, and Admin dashboards
- Tutor browsing pages
- Course enrollment interfaces
- Assignment submission forms
- Messaging components

### 2 Application Layer

- Implemented using **Next.js Route Handlers** (`app/api/.../route.ts`)
- Handles:
  - Authentication and session management
  - Role-based access control
  - Course enrollment
  - Assignment posting and submission
  - Study plan management
  - Messaging logic

### 3 Business Logic Layer

Contains service functions and route-level rules responsible for:

- Validating user roles and permissions
- Managing enrollment workflows
- Handling assignment lifecycle
- Tracking academic progress
- Coordinating tutor-student interactions

*(Much of this logic lives in `app/api/**` plus `lib/messages.ts`.)*

### 4 Data Access Layer

- **Prisma ORM**
- Abstracts database operations
- Ensures clean separation between business logic and persistence

### 5 Database Layer

- **PostgreSQL**
- Stores:
  - Users and roles
  - Tutor profiles
  - Courses
  - Enrollments
  - Study plans
  - Assignments
  - Submissions
  - Messages

---

## MVC Pattern Mapping

Although TutorHub uses a layered architecture, it internally follows the MVC design pattern:

| MVC Component | Implementation |
|---------------|---------------|
| View | Next.js UI components (`app/`, `components/`) |
| Controller | API Route handlers (`app/api/**/route.ts`) |
| Model | Prisma schema + `lib/` helpers + Prisma queries |

---

## Data Flow

1. User interacts with the UI (View)
2. The View sends a request to the API (Controller)
3. The Controller validates the request and calls Prisma or `lib/` helpers (Model)
4. The Model interacts with Prisma ORM
5. Prisma communicates with PostgreSQL
6. The response travels back up to the user interface

---

## Tech Stack

- **Frontend:** Next.js (TypeScript)
- **Backend:** Next.js API Routes (Route Handlers in `app/api`)
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Architecture:** Modular Monolith + Layered Architecture
- **Design Pattern:** MVC; Repository-style data access via Prisma; Middleware for auth

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or later)
- **PostgreSQL** installed and running

### PostgreSQL setup

1. Create a database for the project (e.g. `tutorhub`):

   ```sql
   CREATE DATABASE tutorhub;
   ```

2. Note your connection details: host (usually `localhost`), port (default `5432`), database name, user, and password. The app connects via the `DATABASE_URL` environment variable.

### Environment variables

Create a `.env` file in the project root with:

| Variable         | Description |
|------------------|-------------|
| `DATABASE_URL`  | PostgreSQL connection string, e.g. `postgresql://USER:PASSWORD@localhost:5432/tutorhub` |
| `JWT_SECRET`    | Secret used to sign JWT tokens (use a long random string in production; do not commit this value) |

Replace the USER and PASSWORD with your OS credentials in your personal env!

### Install and run

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Useful Prisma commands

| Command | Description |
|---------|-------------|
| `npx prisma migrate dev` | Apply migrations in development |
| `npx prisma studio` | Open Prisma Studio to view and edit data |
| `npx prisma generate` | Regenerate the Prisma client after schema changes |

### Creating an Admin user

In order to create an admin user, set up the following parameters in your local env to be used for the account:

| Variable         | Description |
|------------------|-------------|
| `ADMIN_EMAIL`  | Email to be used for the account |
| `ADMIN_PASSWORD`    | Password to be used for the newly created account |
| `ADMIN_NAME`    | Name to be set for the newly created account |

If no credentials are specified, the default ones will be used. For more, see [/scripts/seed-admin.mjs](https://github.com/kamilsft/TutorHub/blob/main/scripts/seed-admin.mjs)

After this, run:

```bash
npm run seed:admin
```

---

## Scripts (npm)

| Script | What it does |
|--------|----------------|
| `npm run dev` | Start Next.js in development |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Next.js ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Tests + coverage report (`docs/testing/coverage-summary.txt`) |
| `npm run seed:admin` | Create admin user via `scripts/seed-admin.mjs` |
