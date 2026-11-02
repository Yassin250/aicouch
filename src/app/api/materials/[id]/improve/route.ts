import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";
import { mergeOverlappingChunks } from "@/lib/ai/retrieval";
import { generateText, isAiConfigured } from "@/lib/ai/gemini";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 120;

const IMPROVE_SYSTEM = `You are a study coach helping a university student rewrite and improve their personal study notes.

Your task: take the student's raw notes and produce a well-organised, clearer version.

Guidelines:
- Fix grammar and spelling mistakes.
- Rewrite unclear or awkward sentences.
- Organise the content into logical headings and subheadings using Markdown (# ## ###).
- Expand brief bullet points into complete sentences where helpful.
- Explain difficult concepts in simpler terms.
- Keep all factual content — do not remove topics.
- Add a short "Key takeaways" list at the end.
- Preserve the original language (English).

Output ONLY the improved notes. No preamble, no "Here is the improved version". Start directly with the content.`;

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
    include: { chunks: { orderBy: { chunkIndex: "asc" }, select: { content: true } } },
  });

  if (!document) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const course = await getCourseForUser(document.courseId, user);
  if (!course) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  if (document.uploadedById !== user.id) {
    return NextResponse.json(
      { error: "You can only improve your own notes." },
      { status: 403 },
    );
  }

  const fullText = mergeOverlappingChunks(
    document.chunks.map((chunk) => chunk.content),
  );

  // Truncate if extremely long to stay within token limits
  const textToImprove = fullText.slice(0, 12000);

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI improvement requires a Gemini API key." },
      { status: 503 },
    );
  }

  try {
    const improved = await generateText({
      system: IMPROVE_SYSTEM,
      prompt: `Course: ${course.title}\n\nOriginal notes:\n\n${textToImprove}`,
      temperature: 0.3,
      maxOutputTokens: 4000,
    });

    await db.document.update({
      where: { id },
      data: { improvedNotes: improved },
    });

    return NextResponse.json({ ok: true, improved });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI service unavailable";

    await logEvent({
      level: "WARN",
      category: "AI",
      message: "Note improvement failed",
      detail: message,
      userId: user.id,
    });

    return NextResponse.json(
      { error: `Could not improve notes: ${message}` },
      { status: 503 },
    );
  }
}
