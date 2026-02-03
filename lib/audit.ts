import { db } from "@/lib/db";

interface CreateAuditLogParams {
  processInstanceId?: string;
  action: string;
  changedById: string;
  previousValue?: unknown;
  newValue?: unknown;
  notes?: string;
}

export async function createAuditLog({
  processInstanceId,
  action,
  changedById,
  previousValue,
  newValue,
  notes,
}: CreateAuditLogParams) {
  try {
    return await db.auditLog.create({
      data: {
        processInstanceId,
        action,
        changedById,
        previousValue: previousValue as object,
        newValue: newValue as object,
        notes,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break main functionality
  }
}
