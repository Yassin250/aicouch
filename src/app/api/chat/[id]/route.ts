import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";

const renameSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = renameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid title." }, { status: 400 });
  }

  const session = await db.chatSession.findFirst({
    where: { id, studentId: user.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await db.chatSession.update({
    where: { id },
    data: { title: parsed.data.title },
  });

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

  const session = await db.chatSession.findFirst({
    where: { id, studentId: user.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await db.chatSession.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
