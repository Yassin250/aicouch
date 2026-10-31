import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";

export const runtime = "nodejs";

const schema = z.object({
  answers: z.array(z.coerce.number().int().min(-1).max(3)),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  const course = await getCourseForUser(quiz.courseId, user);
  if (!course) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answers." }, { status: 400 });
  }

  const answers = parsed.data.answers;
  if (answers.length !== quiz.questions.length) {
    return NextResponse.json(
      { error: "Answer every question before submitting." },
      { status: 400 },
    );
  }

  let score = 0;
  const wrongByTopic = new Map<string, number>();
  const rightTopics = new Set<string>();

  quiz.questions.forEach((question, index) => {
    const topic = question.topic ?? "General";

    if (answers[index] === question.correctIndex) {
      score += 1;
      rightTopics.add(topic);
    } else {
      wrongByTopic.set(topic, (wrongByTopic.get(topic) ?? 0) + 1);
    }
  });

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: quiz.id,
      studentId: user.id,
      score,
      total: quiz.questions.length,
      answers: JSON.stringify(answers),
      completedAt: new Date(),
    },
  });

  // Topics the student got wrong become revision recommendations; topics they
  // have now answered correctly clear any outstanding recommendation.
  for (const [topic, missed] of wrongByTopic) {
    const existing = await db.recommendation.findFirst({
      where: {
        studentId: user.id,
        courseId: quiz.courseId,
        topic,
        status: "NEW",
      },
    });

    const reason = `You missed ${missed} question${missed === 1 ? "" : "s"} on "${topic}" in the quiz "${quiz.title}". Revise this topic and try again.`;

    if (existing) {
      await db.recommendation.update({
        where: { id: existing.id },
        data: { priority: existing.priority + missed, reason },
      });
    } else {
      await db.recommendation.create({
        data: {
          studentId: user.id,
          courseId: quiz.courseId,
          topic,
          reason,
          priority: missed,
          status: "NEW",
        },
      });
    }
  }

  for (const topic of rightTopics) {
    if (wrongByTopic.has(topic)) continue;

    await db.recommendation.updateMany({
      where: {
        studentId: user.id,
        courseId: quiz.courseId,
        topic,
        status: "NEW",
      },
      data: { status: "DONE" },
    });
  }

  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    score,
    total: quiz.questions.length,
  });
}
