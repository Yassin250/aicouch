import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const plan = await db.studyPlan.findFirst({
    where: { id, studentId: user.id },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  await db.studyPlan.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
