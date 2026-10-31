import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";

const registerSchema = z.object({
  fullName: z.string().trim().min(3, "Enter your full name").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  regNumber: z.string().trim().max(30).optional(),
  programmeId: z.string().min(1, "Select your programme"),
  yearOfStudy: z.coerce.number().int().min(1).max(5),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 },
    );
  }

  const { fullName, email, password, regNumber, programmeId, yearOfStudy } =
    parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const programme = await db.programme.findUnique({
    where: { id: programmeId },
  });
  if (!programme) {
    return NextResponse.json(
      { error: "That programme could not be found." },
      { status: 400 },
    );
  }

  const user = await db.user.create({
    data: {
      fullName,
      email,
      passwordHash: await hashPassword(password),
      role: "STUDENT",
      regNumber: regNumber || null,
      programmeId,
      yearOfStudy,
    },
  });

  // Enrol the student in every course of their programme up to their year,
  // so revision material from earlier years stays accessible.
  const courses = await db.course.findMany({
    where: { programmeId, yearOfStudy: { lte: yearOfStudy } },
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

  await createSession({ userId: user.id, role: user.role });

  return NextResponse.json({ ok: true, role: user.role });
}
