import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";
import { uploadPath } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
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

  try {
    const bytes = await readFile(uploadPath(document.fileName));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.fileType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${document.fileName}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The original file is no longer on the server." },
      { status: 410 },
    );
  }
}
