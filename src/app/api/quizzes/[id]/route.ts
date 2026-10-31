import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const quiz = await db.quiz.findUnique({ where: { id } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  const course = await getCourseForUser(quiz.courseId, user);
  if (!course) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const isOwner = quiz.createdById === user.id;
  const isStaff = user.role === "LECTURER" || user.role === "ADMIN";

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  await db.quiz.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
