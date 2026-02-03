import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  processInstanceId?: string;
  message: string;
  type?: NotificationType;
}

export async function createNotification({
  userId,
  processInstanceId,
  message,
  type = "INFO",
}: CreateNotificationParams) {
  try {
    return await db.notification.create({
      data: {
        userId,
        processInstanceId,
        message,
        type,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    // Don't throw - notification creation should not break main functionality
  }
}

export async function notifyApprovers(
  processInstanceId: string,
  workflowName: string
) {
  try {
    // Notify all approvers about a pending approval
    const approvers = await db.user.findMany({
      where: {
        role: { in: ["ADMIN", "APPROVER"] },
      },
      select: { id: true },
    });

    await Promise.all(
      approvers.map((approver) =>
        createNotification({
          userId: approver.id,
          processInstanceId,
          message: `New approval request: ${workflowName}`,
          type: "ACTION_REQUIRED",
        })
      )
    );
  } catch (error) {
    console.error("Failed to notify approvers:", error);
  }
}

export async function notifyProcessCreator(
  processInstanceId: string,
  createdById: string,
  action: "approved" | "rejected" | "changes_requested" | "completed",
  workflowName: string,
  actorName?: string
) {
  const actionMessages = {
    approved: `Your request "${workflowName}" has been approved${actorName ? ` by ${actorName}` : ""}`,
    rejected: `Your request "${workflowName}" has been rejected${actorName ? ` by ${actorName}` : ""}`,
    changes_requested: `Changes requested for your "${workflowName}" request${actorName ? ` by ${actorName}` : ""}`,
    completed: `Your request "${workflowName}" has been completed`,
  };

  const type: NotificationType =
    action === "changes_requested" || action === "rejected"
      ? "ACTION_REQUIRED"
      : "UPDATE";

  await createNotification({
    userId: createdById,
    processInstanceId,
    message: actionMessages[action],
    type,
  });
}
