import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(600).nullable().optional(),
});

/** Students can edit their own notes. */
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

  if (document.uploadedById !== user.id) {
    return NextResponse.json(
      { error: "You can only edit your own notes." },
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
    },
  });

  return NextResponse.json({ ok: true });
}

/** Students can delete their own notes; admins can delete any note (moderation). */
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
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You can only remove your own notes." },
      { status: 403 },
    );
  }

  await db.document.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
