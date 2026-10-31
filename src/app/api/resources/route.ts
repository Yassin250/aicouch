import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const createSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  url: z.string().trim().min(4).max(500),
  kind: z.enum(["LINK", "VIDEO", "ARTICLE", "TOOL"]).default("LINK"),
  description: z.string().trim().max(300).optional(),
});

/** Lecturers and admins add supplementary resources to a course. */
export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const isStaff = user.role === "LECTURER" || user.role === "ADMIN";
  if (!isStaff) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const course = await getCourseForUser(data.courseId, user);
  if (!course) {
    return NextResponse.json(
      { error: "You do not have access to that course." },
      { status: 403 },
    );
  }

  const resource = await db.resource.create({
    data: {
      courseId: data.courseId,
      title: data.title,
      url: data.url,
      kind: data.kind,
      description: data.description || null,
      createdById: user.id,
    },
  });

  await logEvent({
    category: "ADMIN",
    message: `Supplementary resource added to ${course.code}`,
    detail: data.title,
    userId: user.id,
  });

  return NextResponse.json({ ok: true, resource });
}
