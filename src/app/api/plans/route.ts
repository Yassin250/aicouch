import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getCourseForUser } from "@/lib/courses";

export const runtime = "nodejs";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const schema = z.object({
  title: z.string().trim().min(3, "Give the plan a title").max(120),
  courseId: z.string().optional().nullable(),
  goal: z.string().trim().max(300).optional(),
  startDate: dateOnly,
  endDate: dateOnly,
  sessions: z.coerce.number().int().min(1).max(40).default(6),
  minutes: z.coerce.number().int().min(15).max(240).default(60),
  topics: z.array(z.string().max(80)).max(20).optional(),
});

function parseDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 18, 0, 0, 0);
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid plan" },
      { status: 400 },
    );
  }

  const { title, courseId, goal, startDate, endDate, sessions, minutes, topics } =
    parsed.data;

  const start = parseDay(startDate);
  const end = parseDay(endDate);

  if (end < start) {
    return NextResponse.json(
      { error: "The end date must be after the start date." },
      { status: 400 },
    );
  }

  let course = null;
  if (courseId) {
    course = await getCourseForUser(courseId, user);
    if (!course) {
      return NextResponse.json(
        { error: "You do not have access to that course." },
        { status: 403 },
      );
    }
  }

  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  const step = Math.max(1, Math.floor(totalDays / sessions));

  const cleanTopics = (topics ?? []).map((topic) => topic.trim()).filter(Boolean);

  const activities = Array.from({ length: sessions }, (_, index) => {
    const offset = Math.min(index * step, totalDays - 1);
    const day = new Date(start);
    day.setDate(start.getDate() + offset);

    const topic = cleanTopics.length
      ? cleanTopics[index % cleanTopics.length]
      : null;

    return {
      title: topic
        ? `Revise: ${topic}`
        : `Study session ${index + 1}${course ? ` — ${course.code}` : ""}`,
      scheduledFor: day,
      durationMinutes: minutes,
      status: "PENDING",
      courseId: course?.id ?? null,
    };
  });

  const plan = await db.studyPlan.create({
    data: {
      studentId: user.id,
      courseId: course?.id ?? null,
      title,
      goal: goal || null,
      startDate: start,
      endDate: end,
      activities: { create: activities },
    },
  });

  return NextResponse.json({ ok: true, planId: plan.id });
}
