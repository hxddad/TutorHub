// adminRepository.ts
// FR17 — data access for admin platform overview
// NFR15 (separation of concerns)

import { prisma } from "@/lib/prisma";

export async function countUsers() {
  return prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
  });
}

export async function countCourses() {
  const [total, published] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: { isPublished: true } }),
  ]);
  return { total, published, archived: total - published };
}

export async function countEnrollments() {
  return prisma.enrollment.count({ where: { status: "ACTIVE" } });
}

export async function countAssignments() {
  return prisma.assignment.count();
}

export async function countSubmissions() {
  const [total, graded] = await Promise.all([
    prisma.submission.count(),
    prisma.submission.count({ where: { grade: { not: null } } }),
  ]);
  return { total, graded, pending: total - graded };
}

export async function recentUsers(limit = 5) {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
}
