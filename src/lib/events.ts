import "server-only";

import { db } from "./db";

export type EventLevel = "INFO" | "WARN" | "ERROR";
export type EventCategory = "AUTH" | "AI" | "UPLOAD" | "ADMIN" | "SYSTEM";

/**
 * Records an audit or diagnostic event for the administrator to review.
 *
 * Logging must never break the request it is recording, so failures here are
 * swallowed deliberately.
 */
export async function logEvent(input: {
  category: EventCategory;
  message: string;
  level?: EventLevel;
  detail?: string | null;
  userId?: string | null;
}) {
  try {
    await db.systemEvent.create({
      data: {
        level: input.level ?? "INFO",
        category: input.category,
        message: input.message.slice(0, 300),
        detail: input.detail ? input.detail.slice(0, 2000) : null,
        userId: input.userId ?? null,
      },
    });
  } catch {
    // Intentionally ignored.
  }
}
