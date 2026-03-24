# RTM ↔ tests

**RTM table:** requirement id → test file → what we check → inputs/mocks.

- Pass log: `docs/testing/test-run-output.txt`
- CI: `.github/workflows/ci.yml` runs `npm test` on push/PR
- Coverage: `npm run test:coverage` → `docs/testing/coverage-summary.txt`

API tests mock Prisma (`vi.mock("@/lib/prisma")`) so tests don’t need a live DB. JWT tests use `JWT_SECRET` from `vitest.config.ts`. Random-looking UUIDs in tests are fake data.

## Requirement IDs

| ID | Requirement |
|----|-------------|
| FR-AUTH-1 | Login returns JWT + user on valid credentials |
| FR-AUTH-2 | Login rejects bad credentials / missing user |
| FR-AUTH-3 | API accepts token via Bearer or cookie (`lib/api-auth`) |
| FR-REG-1 | Register validates name, email, password, role |
| FR-REG-2 | Register rejects duplicate email |
| FR-COURSE-1 | List published courses (optional subject filter) |
| FR-COURSE-2 | Tutor creates course with tutorId |
| FR-COURSE-3 | Tutor lists own courses (`/api/courses/mine`) |
| FR-COURSE-4 | Student lists enrolled courses (`/api/courses/enrolled`) |
| FR-ENR-1 | Student enrolls in published course with capacity |
| FR-ASGN-1 | List/create assignments with role + enrollment checks |
| FR-ASGN-2 | Get assignment by id with enrollment / ownership |
| FR-SUB-1 | List submissions with role-based filtering |
| FR-SUB-2 | Student submits / resubmits with enrollment check |
| FR-SUB-3 | Tutor reviews submission (grade + feedback) |
| FR-MSG-1 | Message threads, conversation, send, user search |
| FR-STUDY-1 | Study plans GET/POST/PUT |
| NFR-SEC-1 | JWT sign/verify and `requireAuth` guard APIs |

---

## Traceability matrix

| Req ID | Test file | What is tested | Test data |
|--------|-----------|----------------|-----------|
| FR-AUTH-1, FR-AUTH-2 | `app/api/auth/login/route.test.ts` | Missing email, bad password, user not found, success | Mock `prisma.user`, `bcrypt.compare` |
| FR-AUTH-3 | `lib/api-auth.test.ts` | Bearer, cookie, 401, 401 invalid | `tests/fixtures/auth.ts`, signed tokens |
| NFR-SEC-1 | `lib/jwt.test.ts` | Sign/verify roundtrip, invalid token | `JWT_SECRET` in vitest config |
| FR-REG-1 | `app/api/auth/register/route.test.ts` | Short name, bad email, short password, bad role | JSON bodies |
| FR-REG-2 | `app/api/auth/register/route.test.ts` | 409 when email exists | Mock `findUnique` returns user |
| FR-COURSE-1 | `app/api/courses/route.test.ts` | GET published, subject filter | Mock `course.findMany` |
| FR-COURSE-2 | `app/api/courses/route.test.ts` | POST 400 without tutorId, POST create | Body `tutorId`, `title`, `subject` |
| FR-COURSE-3 | `app/api/courses/mine/route.test.ts` | 401, 403 student, tutor list | Mock `course.findMany`, JWT |
| FR-COURSE-4 | `app/api/courses/enrolled/route.test.ts` | 403 tutor, student flatten | Mock `enrollment.findMany` |
| FR-ENR-1 | `app/api/enrollments/route.test.ts` | 401, 403 non-student, 404, 201 create | Mock `course`, `enrollment`, `count` |
| FR-ASGN-1 | `app/api/assignments/route.test.ts` | GET/POST role checks, enrollment, tutor owns course | Mock `enrollment`, `course`, `assignment` |
| FR-ASGN-2 | `app/api/assignments/[id]/route.test.ts` | Bad id, 404, 403 not enrolled, 200 student, 403 wrong tutor | Mock `assignment`, `enrollment` |
| FR-SUB-1 | `app/api/submissions/route.test.ts` | GET 400, student filter, tutor ownership 403 | Mock `submission`, `assignment`, `course` |
| FR-SUB-2 | `app/api/submissions/route.test.ts` | POST 403 non-student, empty content, 201 create | Mock `assignment`, `enrollment`, `submission` |
| FR-SUB-3 | `app/api/submissions/[id]/review/route.test.ts` | PATCH non-tutor, 404, 403 wrong tutor, 200 update | Mock `submission.findUnique`, `update` |
| FR-MSG-1 | `lib/messages.test.ts` | DB helpers + `listThreadsForUser` | Mock `prisma.message` |
| FR-MSG-1 | `app/api/messages/route.test.ts` | GET threads, self 400, GET with peer, POST validation, send | Mock `user`, `message` |
| FR-MSG-1 | `app/api/messages/users/route.test.ts` | 401, search users | Mock `user.findMany` |
| FR-STUDY-1 | `app/api/study-plans/route.test.ts` | GET 400, GET list, POST student missing, POST create, PUT | Mock `studyPlan`, `user` |

---

## Not in automated tests

- React `components/` and `page.tsx` files
- `middleware.ts` (would need integration/e2e)
- Password reset (page is placeholder only)

---

## Refresh the log

```bash
npm test
```

Copy output into `docs/testing/test-run-output.txt` if you want it committed.
