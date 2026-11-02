import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hashPassword, requireApiAdmin } from "@/lib/auth";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const schema = z.object({
  fullName: z.string().trim().min(3, "Enter the full name").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"),
  role: z.enum(["STUDENT", "ADMIN"]),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  programmeId: z.string().optional().nullable(),
  yearOfStudy: z.coerce.number().int().min(1).max(5).optional().nullable(),
  regNumber: z.string().trim().max(30).optional().nullable(),
});

export async function POST(request: Request) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  if (data.programmeId) {
    const programme = await db.programme.findUnique({
      where: { id: data.programmeId },
    });
    if (!programme) {
      return NextResponse.json(
        { error: "That programme could not be found." },
        { status: 400 },
      );
    }
  }

  const user = await db.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      passwordHash: await hashPassword(data.password),
      programmeId: data.programmeId || null,
      yearOfStudy:
        data.role === "STUDENT" ? (data.yearOfStudy ?? 1) : null,
      regNumber: data.regNumber || null,
    },
  });

  // Students are enrolled in the courses of their year, matching registration.
  if (data.role === "STUDENT" && data.programmeId) {
    const courses = await db.course.findMany({
      where: {
        programmeId: data.programmeId,
        yearOfStudy: { lte: data.yearOfStudy ?? 1 },
      },
      select: { id: true },
    });

    if (courses.length) {
      await db.enrollment.createMany({
        data: courses.map((course) => ({
          studentId: user.id,
          courseId: course.id,
        })),
      });
    }
  }

  await logEvent({
    category: "ADMIN",
    message: `Created ${data.role.toLowerCase()} account`,
    detail: `${user.fullName} <${user.email}>`,
    userId: admin.id,
  });

  return NextResponse.json({ ok: true, id: user.id });
}
