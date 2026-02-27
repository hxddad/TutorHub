# TutorHub

TutorHub is a full-stack tutoring management platform that connects **Students, Tutors, and Administrators** in a centralized academic support system.

The platform enables course enrollment, assignment management, study planning, messaging, and academic progress tracking.

---

##  Project Overview

TutorHub is built using a **Modular Monolith architecture** with clear separation of concerns across layers. The system follows a **Layered Architecture** while internally applying the **MVC design pattern**.

The platform ensures:

- Secure authentication and session management
- Role-based access control
- Structured tutor-student interaction
- Assignment lifecycle management
- Academic progress tracking
- Scalable database-driven architecture

---

##  Architecture

The system is divided into the following layers:

### 1️ Presentation Layer (Client)

- Implemented using **Next.js (TypeScript)**
- Responsible for rendering user interfaces
- Student, Tutor, and Admin dashboards
- Tutor browsing pages
- Course enrollment interfaces
- Assignment submission forms
- Messaging components

---

### 2️ Application Layer

- Implemented using **Next.js API Routes / tRPC**
- Handles:
  - Authentication and session management
  - Role-based access control
  - Course enrollment
  - Assignment posting and submission
  - Study plan management
  - Messaging logic

---

### 3️ Business Logic Layer

Contains service functions responsible for:

- Validating user roles and permissions
- Managing enrollment workflows
- Handling assignment lifecycle
- Tracking academic progress
- Coordinating tutor-student interactions

---

### 4️ Data Access Layer

- **Prisma ORM**
- Abstracts database operations
- Ensures clean separation between business logic and persistence

---

### 5️ Database Layer

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
| View | Next.js UI components (Client Layer) |
| Controller | API Routes / tRPC handlers |
| Model | Business logic services + Prisma data models |

---

## Data Flow

1. User interacts with the UI (View)
2. The View sends a request to the API (Controller)
3. The Controller validates the request and calls service functions (Model)
4. The Model interacts with Prisma ORM
5. Prisma communicates with PostgreSQL
6. The response travels back up to the user interface

---

## 🛠 Tech Stack

- **Frontend:** Next.js (TypeScript)
- **Backend:** Next.js API Routes / tRPC
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Architecture:** Modular Monolith + Layered Architecture
- **Design Pattern:** MVC

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

If no credentials are specified, the defeault ones will be used. For more, see /scripts/seed-admin.mjs

After this, run 
```bash
npm run seed:admin
```