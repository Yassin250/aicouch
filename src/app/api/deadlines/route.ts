import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().trim().min(2, "Give the deadline a title").max(120),
  courseId: z.string().optional().nullable(),
  type: z.enum(["ASSIGNMENT", "TEST", "EXAM", "OTHER"]).default("ASSIGNMENT"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a due date"),
  notes: z.string().trim().max(300).optional(),
});

/** Dates are stored at the end of the due day, so "due today" stays valid all day. */
function parseDueDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 0, 0);
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid deadline" },
      { status: 400 },
    );
  }

  const { title, courseId, type, dueDate, notes } = parsed.data;

  if (courseId) {
    const course = await getCourseForUser(courseId, user);
    if (!course) {
      return NextResponse.json(
        { error: "You do not have access to that course." },
        { status: 403 },
      );
    }
  }

  const deadline = await db.deadline.create({
    data: {
      studentId: user.id,
      courseId: courseId || null,
      title,
      type,
      dueDate: parseDueDate(dueDate),
      notes: notes || null,
    },
  });

  return NextResponse.json({ ok: true, id: deadline.id });
}
