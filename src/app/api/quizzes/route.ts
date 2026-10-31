import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";
import { generateQuiz } from "@/lib/ai/quiz";
import { mergeOverlappingChunks } from "@/lib/ai/retrieval";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  courseId: z.string().min(1, "Select a course"),
  documentId: z.string().optional().nullable(),
  count: z.coerce.number().int().min(3).max(10).default(5),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  title: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { courseId, documentId, count, difficulty, title } = parsed.data;

  const course = await getCourseForUser(courseId, user);
  if (!course) {
    return NextResponse.json(
      { error: "You do not have access to that course." },
      { status: 403 },
    );
  }

  let document = null;
  if (documentId) {
    document = await db.document.findFirst({
      where: { id: documentId, courseId: course.id },
      include: {
        chunks: { orderBy: { chunkIndex: "asc" }, select: { content: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "That material is not part of this course." },
        { status: 404 },
      );
    }
  }

  let text = "";

  if (document) {
    text = mergeOverlappingChunks(document.chunks.map((chunk) => chunk.content));
  } else {
    const documents = await db.document.findMany({
      where: { courseId: course.id, status: "READY" },
      include: {
        chunks: { orderBy: { chunkIndex: "asc" }, select: { content: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    text = documents
      .map((item) =>
        mergeOverlappingChunks(item.chunks.map((chunk) => chunk.content)),
      )
      .join("\n\n");
  }

  if (text.trim().length < 400) {
    return NextResponse.json(
      {
        error: document
          ? "There is not enough readable text in this material to build a quiz."
          : "This course has no indexed material yet. Upload lecture notes first.",
      },
      { status: 422 },
    );
  }

  const generated = await generateQuiz({
    courseTitle: course.title,
    text,
    count,
    difficulty,
  });

  if (generated.questions.length < 3) {
    return NextResponse.json(
      {
        error:
          "Not enough distinct concepts could be extracted from this material. Try a longer document or a different one.",
      },
      { status: 422 },
    );
  }

  const source = document ? document.title : `${course.code} materials`;

  const quiz = await db.quiz.create({
    data: {
      courseId: course.id,
      documentId: document?.id ?? null,
      createdById: user.id,
      title:
        title ||
        (document
          ? `${document.title} — practice quiz`
          : `${course.code} — practice quiz`),
      description: `${generated.questions.length} questions · from ${source}`,
      difficulty,
      questions: {
        create: generated.questions.map((question, index) => ({
          prompt: question.prompt,
          options: JSON.stringify(question.options),
          correctIndex: question.correctIndex,
          explanation: question.explanation || null,
          topic: question.topic || null,
          order: index,
        })),
      },
    },
  });

  return NextResponse.json({
    ok: true,
    quiz: { id: quiz.id, title: quiz.title },
    mode: generated.mode,
    warning: generated.warning ?? null,
  });
}
