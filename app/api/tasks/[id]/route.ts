import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { completed } = await req.json();
  const taskId = Number(params.id);

  if (typeof completed !== "boolean") {
    return new Response("Invalid completed value", { status: 400 });
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { completed },
  });

  return new Response(JSON.stringify(updatedTask), { status: 200 });
}