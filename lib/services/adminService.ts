// adminService.ts
// FR17 — business logic for admin platform overview
// NFR15 (separation of concerns)

import * as adminRepo from "@/lib/repositories/adminRepository";

export async function getPlatformStats() {
  const [userGroups, courses, enrollments, assignments, submissions, recentUsers] =
    await Promise.all([
      adminRepo.countUsers(),
      adminRepo.countCourses(),
      adminRepo.countEnrollments(),
      adminRepo.countAssignments(),
      adminRepo.countSubmissions(),
      adminRepo.recentUsers(5),
    ]);

  const users = {
    total: 0,
    students: 0,
    tutors: 0,
    admins: 0,
  };

  for (const group of userGroups) {
    const count = group._count.id;
    users.total += count;
    if (group.role === "STUDENT") users.students = count;
    else if (group.role === "TUTOR") users.tutors = count;
    else if (group.role === "ADMIN") users.admins = count;
  }

  return {
    users,
    courses,
    enrollments,
    assignments,
    submissions,
    recentUsers,
  };
}
