import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hashPassword, requireApiAdmin } from "@/lib/auth";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("role"),
    role: z.enum(["STUDENT", "ADMIN"]),
  }),
  z.object({ action: z.literal("status"), isActive: z.boolean() }),
  z.object({
    action: z.literal("password"),
    password: z.string().min(8, "Use at least 8 characters").max(72),
  }),
  z.object({
    action: z.literal("enrollments"),
    courseIds: z.array(z.string()),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Guard rails so an administrator cannot lock themselves out.
  if (target.id === admin.id) {
    if (input.action === "role") {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 400 },
      );
    }
    if (input.action === "status" && !input.isActive) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account." },
        { status: 400 },
      );
    }
  }

  if (input.action === "role") {
    await db.user.update({
      where: { id },
      data: {
        role: input.role,
        yearOfStudy: input.role === "STUDENT" ? (target.yearOfStudy ?? 1) : null,
      },
    });

    await logEvent({
      category: "ADMIN",
      message: "Changed account role",
      detail: `${target.email}: ${target.role} → ${input.role}`,
      userId: admin.id,
    });

    return NextResponse.json({ ok: true });
  }

  if (input.action === "status") {
    await db.user.update({
      where: { id },
      data: { isActive: input.isActive },
    });

    await logEvent({
      level: input.isActive ? "INFO" : "WARN",
      category: "ADMIN",
      message: input.isActive ? "Reactivated account" : "Deactivated account",
      detail: target.email,
      userId: admin.id,
    });

    return NextResponse.json({ ok: true });
  }

  if (input.action === "password") {
    await db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(input.password) },
    });

    await logEvent({
      category: "ADMIN",
      message: "Reset account password",
      detail: target.email,
      userId: admin.id,
    });

    return NextResponse.json({ ok: true });
  }

  // Enrolments: replace the student's course list with the submitted set.
  if (target.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only student accounts have course enrolments." },
      { status: 400 },
    );
  }

  const validCourses = await db.course.findMany({
    where: { id: { in: input.courseIds } },
    select: { id: true },
  });

  await db.$transaction([
    db.enrollment.deleteMany({ where: { studentId: id } }),
    db.enrollment.createMany({
      data: validCourses.map((course) => ({
        studentId: id,
        courseId: course.id,
      })),
    }),
  ]);

  await logEvent({
    category: "ADMIN",
    message: "Updated course enrolments",
    detail: `${target.email}: ${validCourses.length} course(s)`,
    userId: admin.id,
  });

  return NextResponse.json({ ok: true, count: validCourses.length });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({ where: { id } });

  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  // Admins may fully remove a student account, including all owned content.
  await db.$transaction([
    db.documentChunk.deleteMany({ where: { document: { uploadedById: id } } }),
    db.quiz.deleteMany({ where: { createdById: id } }),
    db.document.deleteMany({ where: { uploadedById: id } }),
    db.quizAttempt.deleteMany({ where: { studentId: id } }),
    db.chatSession.deleteMany({ where: { studentId: id } }),
    db.studyPlan.deleteMany({ where: { studentId: id } }),
    db.recommendation.deleteMany({ where: { studentId: id } }),
    db.deadline.deleteMany({ where: { studentId: id } }),
    db.enrollment.deleteMany({ where: { studentId: id } }),
    db.user.delete({ where: { id } }),
  ]);

  await logEvent({
    level: "WARN",
    category: "ADMIN",
    message: "Deleted account",
    detail: `${target.fullName} <${target.email}> (${target.role})`,
    userId: admin.id,
  });

  return NextResponse.json({ ok: true });
}
