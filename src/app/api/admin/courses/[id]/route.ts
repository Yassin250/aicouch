import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const schema = z
  .object({
    code: z.string().trim().min(3).max(20),
    title: z.string().trim().min(3).max(120),
    programmeId: z.string().min(1),
    yearOfStudy: z.coerce.number().int().min(1).max(5),
    semester: z.coerce.number().int().min(1).max(2),
    credits: z.coerce.number().int().min(1).max(60),
    lecturerId: z.string().nullable(),
    description: z.string().trim().max(400).nullable(),
  })
  .partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;

  const course = await db.course.findUnique({ where: { id } });
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid course" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.code) {
    const code = data.code.toUpperCase();
    const clash = await db.course.findFirst({
      where: { code, id: { not: id } },
    });
    if (clash) {
      return NextResponse.json(
        { error: `Course code ${code} is already in use.` },
        { status: 409 },
      );
    }
    data.code = code;
  }

  await db.course.update({
    where: { id },
    data: {
      ...data,
      lecturerId:
        data.lecturerId === undefined ? undefined : data.lecturerId || null,
      description:
        data.description === undefined ? undefined : data.description || null,
    },
  });

  await logEvent({
    category: "ADMIN",
    message: "Updated course",
    detail: `${data.code ?? course.code} — ${data.title ?? course.title}`,
    userId: admin.id,
  });

  return NextResponse.json({ ok: true });
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

  const course = await db.course.findUnique({
    where: { id },
    include: { _count: { select: { documents: true, quizzes: true } } },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  // Materials and quizzes are real academic content: never remove them as a
  // side effect of deleting a course.
  if (course._count.documents > 0 || course._count.quizzes > 0) {
    return NextResponse.json(
      {
        error: `This course still has ${course._count.documents} material(s) and ${course._count.quizzes} quiz(zes). Delete those first, or keep the course.`,
      },
      { status: 409 },
    );
  }

  await db.course.delete({ where: { id } });

  await logEvent({
    level: "WARN",
    category: "ADMIN",
    message: "Deleted course",
    detail: `${course.code} — ${course.title}`,
    userId: admin.id,
  });

  return NextResponse.json({ ok: true });
}
