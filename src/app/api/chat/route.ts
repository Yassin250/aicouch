import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getAccessibleCourseIds, getAccessibleCourses } from "@/lib/courses";
import { answerStudyQuestion } from "@/lib/ai/study-coach";

export const runtime = "nodejs";
export const maxDuration = 120;

const chatSchema = z.object({
  sessionId: z.string().optional(),
  courseId: z.string().optional().nullable(),
  message: z.string().trim().min(2, "Ask a question first").max(2000),
});

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid message" },
      { status: 400 },
    );
  }

  const { sessionId, courseId, message } = parsed.data;

  const courses = await getAccessibleCourses(user);
  if (!courses.length) {
    return NextResponse.json(
      {
        error:
          "You are not enrolled in any course yet. Contact the administrator.",
      },
      { status: 403 },
    );
  }

  const accessibleIds = await getAccessibleCourseIds(user);
  const scopedCourse = courseId
    ? courses.find((course) => course.id === courseId)
    : null;

  if (courseId && !scopedCourse) {
    return NextResponse.json(
      { error: "You do not have access to that course." },
      { status: 403 },
    );
  }

  // Resolve or create the conversation.
  let session = sessionId
    ? await db.chatSession.findFirst({
        where: { id: sessionId, studentId: user.id },
      })
    : null;

  if (sessionId && !session) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  if (!session) {
    session = await db.chatSession.create({
      data: {
        studentId: user.id,
        courseId: scopedCourse?.id ?? null,
        title: message.length > 64 ? `${message.slice(0, 64)}…` : message,
      },
    });
  }

  // Earlier turns make follow-up questions ("explain that again", "why?") work.
  const previous = await db.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { role: true, content: true },
  });

  // A short follow-up carries no search terms of its own, so retrieval is
  // widened with the previous question.
  const lastUserMessage =
    previous.find((entry) => entry.role === "user")?.content ?? "";
  const searchQuery =
    lastUserMessage && message.length < 120
      ? `${lastUserMessage}\n${message}`
      : message;

  await db.chatMessage.create({
    data: { sessionId: session.id, role: "user", content: message },
  });

  const result = await answerStudyQuestion({
    question: message,
    courseIds: scopedCourse ? [scopedCourse.id] : accessibleIds,
    courseTitle: scopedCourse?.title,
    history: [...previous].reverse(),
    searchQuery,
    includeUnpublished: user.role !== "STUDENT",
  });

  const assistantMessage = await db.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: result.answer,
      sources: result.sources.length ? JSON.stringify(result.sources) : null,
    },
  });

  await db.chatSession.update({
    where: { id: session.id },
    data: { courseId: session.courseId ?? scopedCourse?.id ?? null },
  });

  return NextResponse.json({
    sessionId: session.id,
    message: {
      id: assistantMessage.id,
      role: "assistant",
      content: result.answer,
      sources: result.sources,
      createdAt: assistantMessage.createdAt,
    },
    mode: result.mode,
    warning: result.warning ?? null,
  });
}
