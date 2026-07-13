"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCapability, requireViewer } from "@/lib/guard";
import { audit, requestContext } from "@/lib/audit";
import { sanitizeLine } from "@/lib/sanitize";

export type TaskState = { error?: string; ok?: string };

const STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;

const taskSchema = z.object({
  title: z.string().trim().min(3, "Task title is too short").max(120),
  priority: z.enum(PRIORITIES),
});

/** Creating and assigning work requires `team.manage`. */
export async function createTaskAction(
  _prev: TaskState,
  formData: FormData,
): Promise<TaskState> {
  let viewer;
  try {
    viewer = await assertCapability("team.manage");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const parsed = taskSchema.safeParse({
    title: sanitizeLine(formData.get("title"), 120),
    priority: String(formData.get("priority") ?? "NORMAL"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const projectId = String(formData.get("projectId") ?? "") || null;
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const dueRaw = String(formData.get("dueAt") ?? "");
  const dueAt = dueRaw ? new Date(dueRaw) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) return { error: "Invalid due date." };

  if (assigneeId) {
    const assignee = await db.user.findUnique({
      where: { id: assigneeId },
      select: { role: true },
    });
    // Work is assigned to staff only — never to an external collaborator.
    if (!assignee || assignee.role === "COLLABORATOR" || assignee.role === "USER")
      return { error: "Tasks can only be assigned to staff accounts." };
  }

  const task = await db.task.create({
    data: {
      title: parsed.data.title,
      priority: parsed.data.priority,
      projectId,
      assigneeId,
      dueAt,
    },
  });

  const ctx = await requestContext();
  await audit("task.create", { actorId: viewer.id, detail: task.title, ...ctx });

  revalidatePath("/app/tasks");
  revalidatePath("/app");
  return { ok: `Task "${task.title}" created.` };
}

/**
 * Status changes: the assignee may move their own task, and anyone with
 * `team.manage` may move any task. Nobody else — an employee cannot close
 * work assigned to someone else.
 */
export async function setTaskStatusAction(
  _prev: TaskState,
  formData: FormData,
): Promise<TaskState> {
  const viewer = await requireViewer();

  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(STATUSES as readonly string[]).includes(status))
    return { error: "Invalid status." };

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, assigneeId: true },
  });
  if (!task) return { error: "Task not found." };

  const isAssignee = task.assigneeId === viewer.id;
  if (!isAssignee && !viewer.can("team.manage"))
    return { error: "You can only update tasks assigned to you." };

  await db.task.update({ where: { id: task.id }, data: { status } });

  revalidatePath("/app/tasks");
  revalidatePath("/app");
  return { ok: "Task updated." };
}
