import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(600).nullable().optional(),
  week: z.coerce.number().int().min(0).max(52).nullable().optional(),
  topic: z.string().trim().max(80).nullable().optional(),
  sessionNumber: z.coerce.number().int().min(0).max(99).nullable().optional(),
  publishState: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

/** Lecturers update the teaching metadata or move material through its lifecycle. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const document = await db.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const course = await getCourseForUser(document.courseId, user);
  if (!course) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const isOwner = document.uploadedById === user.id;
  const isStaff = user.role === "LECTURER" || user.role === "ADMIN";

  if (!isOwner && !isStaff) {
    return NextResponse.json(
      { error: "Only the person who uploaded this, or a lecturer, can edit it." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid changes" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  await db.document.update({
    where: { id },
    data: {
      title: data.title ?? undefined,
      description:
        data.description === undefined ? undefined : data.description || null,
      week: data.week === undefined ? undefined : data.week,
      topic: data.topic === undefined ? undefined : data.topic || null,
      sessionNumber:
        data.sessionNumber === undefined ? undefined : data.sessionNumber,
      publishState: data.publishState ?? undefined,
    },
  });

  if (data.publishState && data.publishState !== document.publishState) {
    await logEvent({
      category: "ADMIN",
      message: `Material moved to ${data.publishState.toLowerCase()}`,
      detail: `${document.title} (${course.code})`,
      userId: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const document = await db.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const course = await getCourseForUser(document.courseId, user);
  if (!course) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const isOwner = document.uploadedById === user.id;
  const isStaff = user.role === "LECTURER" || user.role === "ADMIN";

  if (!isOwner && !isStaff) {
    return NextResponse.json(
      { error: "Only the person who uploaded this, or a lecturer, can remove it." },
      { status: 403 },
    );
  }

  await db.document.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
