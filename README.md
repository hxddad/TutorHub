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
