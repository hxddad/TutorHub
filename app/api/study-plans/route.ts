// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// type TaskInput = { title: string; dueDate: string };

// export async function GET(req: Request) {
//   const url = new URL(req.url);
//   const studentId = url.searchParams.get("studentId");

//   if (!studentId) return NextResponse.json([], { status: 400 });

//   const plans = await prisma.studyPlan.findMany({
//     where: { studentId }, // use string
//     include: { tasks: true },
//   });

//   return NextResponse.json(plans);
// }

// export async function POST(req: Request) {
//   const body = await req.json();
//   const { studentId, tasks } = body as { studentId: string; tasks: TaskInput[] };

//   const newPlan = await prisma.studyPlan.create({
//     data: {
//       studentId,
//       tasks: {
//         create: tasks.map((t) => ({
//           title: t.title,
//           dueDate: new Date(t.dueDate), // convert string -> Date
//         })),
//       },
//     },
//     include: { tasks: true },
//   });

//   return NextResponse.json(newPlan);
// }

// export async function PUT(req: Request) {
//   const body = await req.json();
//   const { planId, tasks } = body as { planId: number; tasks: TaskInput[] };

//   const updated = await prisma.studyPlan.update({
//     where: { id: planId },
//     data: {
//       tasks: {
//         deleteMany: {}, // remove old tasks
//         create: tasks.map((t) => ({
//           title: t.title,
//           dueDate: new Date(t.dueDate),
//         })),
//       },
//     },
//     include: { tasks: true },
//   });

//   return NextResponse.json(updated);
// }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TaskInput = { title: string; dueDate: string; courseId: string | number };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");

  if (!studentId) return NextResponse.json([], { status: 400 });

  const plans = await prisma.studyPlan.findMany({
    where: { studentId },
    include: { tasks: true },
  });

  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { studentId, tasks } = body as { studentId: string; tasks: TaskInput[] };

  // validate student exists
  const studentExists = await prisma.user.findUnique({ where: { id: studentId } });
  if (!studentExists) {
    return NextResponse.json({ error: "Student not found" }, { status: 400 });
  }

  // create study plan with tasks
  const newPlan = await prisma.studyPlan.create({
    data: {
      studentId,
      tasks: {
        create: tasks.map((t) => ({
          title: t.title,
          dueDate: new Date(t.dueDate),
          courseId: Number(t.courseId), // <-- must provide a valid courseId
        })),
      },
    },
    include: { tasks: true },
  });

  return NextResponse.json(newPlan);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { planId, tasks } = body as { planId: number; tasks: TaskInput[] };

  const updated = await prisma.studyPlan.update({
    where: { id: planId },
    data: {
      tasks: {
        deleteMany: {}, // remove old tasks
        create: tasks.map((t) => ({
          title: t.title,
          dueDate: new Date(t.dueDate),
          courseId: Number(t.courseId),
        })),
      },
    },
    include: { tasks: true },
  });

  return NextResponse.json(updated);
}