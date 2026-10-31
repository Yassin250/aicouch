import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";
import { mergeOverlappingChunks } from "@/lib/ai/retrieval";
import { summarizeMaterial } from "@/lib/ai/study-coach";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const document = await db.document.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true } },
      chunks: { orderBy: { chunkIndex: "asc" }, select: { content: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const course = await getCourseForUser(document.courseId, user);
  if (!course) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  if (!document.chunks.length) {
    return NextResponse.json(
      { error: "This material has no extracted text to summarise." },
      { status: 422 },
    );
  }

  const fullText = mergeOverlappingChunks(
    document.chunks.map((chunk) => chunk.content),
  );

  const result = await summarizeMaterial({
    title: document.title,
    courseTitle: document.course.title,
    text: fullText,
  });

  await db.document.update({
    where: { id: document.id },
    data: { summary: result.summary },
  });

  return NextResponse.json(result);
}
