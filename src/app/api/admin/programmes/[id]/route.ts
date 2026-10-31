import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const schema = z
  .object({
    code: z.string().trim().min(2).max(20),
    name: z.string().trim().min(3).max(160),
    description: z.string().trim().max(400).nullable(),
    durationYears: z.coerce.number().int().min(1).max(6),
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

  const programme = await db.programme.findUnique({ where: { id } });
  if (!programme) {
    return NextResponse.json({ error: "Programme not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid programme" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.code) {
    const code = data.code.toUpperCase();
    const clash = await db.programme.findFirst({
      where: { code, id: { not: id } },
    });
    if (clash) {
      return NextResponse.json(
        { error: `Programme code ${code} is already in use.` },
        { status: 409 },
      );
    }
    data.code = code;
  }

  await db.programme.update({
    where: { id },
    data: {
      ...data,
      description:
        data.description === undefined ? undefined : data.description || null,
    },
  });

  await logEvent({
    category: "ADMIN",
    message: "Updated programme",
    detail: `${data.code ?? programme.code}`,
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

  const programme = await db.programme.findUnique({
    where: { id },
    include: { _count: { select: { courses: true, users: true } } },
  });

  if (!programme) {
    return NextResponse.json({ error: "Programme not found." }, { status: 404 });
  }

  if (programme._count.courses > 0 || programme._count.users > 0) {
    return NextResponse.json(
      {
        error: `This programme still has ${programme._count.courses} course(s) and ${programme._count.users} account(s) attached.`,
      },
      { status: 409 },
    );
  }

  await db.programme.delete({ where: { id } });

  await logEvent({
    level: "WARN",
    category: "ADMIN",
    message: "Deleted programme",
    detail: `${programme.code} — ${programme.name}`,
    userId: admin.id,
  });

  return NextResponse.json({ ok: true });
}
