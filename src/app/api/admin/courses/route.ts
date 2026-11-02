import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().min(3, "Enter a course code").max(20),
  title: z.string().trim().min(3, "Enter the course title").max(120),
  programmeId: z.string().min(1, "Select a programme"),
  yearOfStudy: z.coerce.number().int().min(1).max(5),
  semester: z.coerce.number().int().min(1).max(2),
  credits: z.coerce.number().int().min(1).max(60),
  description: z.string().trim().max(400).optional(),
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
      { error: parsed.error.issues[0]?.message ?? "Invalid course" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const code = data.code.toUpperCase();

  const existing = await db.course.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json(
      { error: `Course code ${code} is already in use.` },
      { status: 409 },
    );
  }

  const course = await db.course.create({
    data: {
      code,
      title: data.title,
      programmeId: data.programmeId,
      yearOfStudy: data.yearOfStudy,
      semester: data.semester,
      credits: data.credits,
      description: data.description || null,
    },
  });

  await logEvent({
    category: "ADMIN",
    message: "Created course",
    detail: `${code} — ${data.title}`,
    userId: admin.id,
  });

  return NextResponse.json({ ok: true, id: course.id });
}
