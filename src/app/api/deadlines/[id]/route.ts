import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["OPEN", "DONE"]),
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

  const deadline = await db.deadline.findFirst({
    where: { id, studentId: user.id },
  });

  if (!deadline) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  await db.deadline.update({
    where: { id },
    data: { status: parsed.data.status },
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

  const deadline = await db.deadline.findFirst({
    where: { id, studentId: user.id },
  });

  if (!deadline) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await db.deadline.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
