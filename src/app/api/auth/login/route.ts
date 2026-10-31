import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { logEvent } from "@/lib/events";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await logEvent({
      level: "WARN",
      category: "AUTH",
      message: "Failed sign-in attempt",
      detail: `Email: ${email}`,
    });

    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }

  if (!user.isActive) {
    await logEvent({
      level: "WARN",
      category: "AUTH",
      message: "Deactivated account attempted to sign in",
      detail: `Email: ${email}`,
      userId: user.id,
    });

    return NextResponse.json(
      { error: "This account has been deactivated. Contact the administrator." },
      { status: 403 },
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({ userId: user.id, role: user.role });

  await logEvent({
    category: "AUTH",
    message: "Signed in",
    detail: `Role: ${user.role}`,
    userId: user.id,
  });

  return NextResponse.json({ ok: true, role: user.role });
}
