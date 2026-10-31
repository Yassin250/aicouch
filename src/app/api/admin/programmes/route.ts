import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().min(2, "Enter a programme code").max(20),
  name: z.string().trim().min(3, "Enter the programme name").max(160),
  description: z.string().trim().max(400).optional(),
  durationYears: z.coerce.number().int().min(1).max(6).default(3),
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
      { error: parsed.error.issues[0]?.message ?? "Invalid programme" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const code = data.code.toUpperCase();

  const existing = await db.programme.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json(
      { error: `Programme code ${code} is already in use.` },
      { status: 409 },
    );
  }

  const programme = await db.programme.create({
    data: {
      code,
      name: data.name,
      description: data.description || null,
      durationYears: data.durationYears,
    },
  });

  await logEvent({
    category: "ADMIN",
    message: "Created programme",
    detail: `${code} — ${data.name}`,
    userId: admin.id,
  });

  return NextResponse.json({ ok: true, id: programme.id });
}
