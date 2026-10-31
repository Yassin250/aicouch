import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const isStaff = user.role === "LECTURER" || user.role === "ADMIN";
  if (!isStaff) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;

  const resource = await db.resource.findUnique({
    where: { id },
    include: { course: { select: { id: true, code: true } } },
  });

  if (!resource) {
    return NextResponse.json(
      { error: "Resource not found." },
      { status: 404 },
    );
  }

  const course = await getCourseForUser(resource.courseId, user);
  if (!course) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  await db.resource.delete({ where: { id } });

  await logEvent({
    category: "ADMIN",
    message: `Supplementary resource removed from ${course.code}`,
    detail: resource.title,
    userId: user.id,
  });

  return NextResponse.json({ ok: true });
}
