import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hashPassword, verifyPassword, requireApiUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Use at least 8 characters").max(72),
});

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not permitted." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({ where: { id: user.id } });
  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const ok = await verifyPassword(parsed.data.currentPassword, target.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  await logEvent({
    category: "AUTH",
    message: "Changed password",
    userId: user.id,
  });

  return NextResponse.json({ ok: true });
}
