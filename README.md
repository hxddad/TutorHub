# TutorHub

A tutoring platform where students can browse courses, enroll, submit assignments, message tutors, and manage study plans. Tutors can create courses, post assignments, grade submissions, and communicate with students. Admins have a dashboard for platform oversight.

## Architecture

- **System-level:** Service-based — the main Next.js app and a separate Python recommendation service communicate over HTTP/JSON
- **Internal:** Layered architecture (UI → API routes → services → repositories → database)
- **Domain:** DDD-informed decomposition across Identity, Courses, Enrollment, Assessment, Messaging, Study Planning, Recommendation, and Admin Operations

## Tech Stack

- Next.js (frontend + API routes)
- PostgreSQL + Prisma (database)
- Python FastAPI (recommendation service)
- Vitest (testing)

## Getting Started

```bash
npm install
npx prisma generate
npm run dev
```

For the recommendation service:

```bash
cd recommendation-service
pip install -r requirements.txt
uvicorn main:app --reload
```

## Team

Team 2, EECS 4312 — York University
