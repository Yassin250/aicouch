import "server-only";

import type { Course, Prisma } from "@prisma/client";

import { db } from "./db";

type SessionUser = {
  id: string;
  role: string;
  programmeId: string | null;
};

export type CourseWithMeta = Course & {
  programme: { id: string; code: string; name: string };
  _count?: { documents: number; enrollments: number; quizzes: number };
};

/**
 * Every query in the system is scoped through this function so that a student
 * can only ever reach the courses they are enrolled in, a lecturer the courses
 * of their own programme, and an administrator everything.
 */
export async function getAccessibleCourses(
  user: SessionUser,
  include?: Prisma.CourseInclude,
): Promise<CourseWithMeta[]> {
  const where: Prisma.CourseWhereInput = {};

  if (user.role === "STUDENT") {
    where.enrollments = { some: { studentId: user.id } };
  } else if (user.role === "LECTURER") {
    where.OR = [
      { lecturerId: user.id },
      ...(user.programmeId ? [{ programmeId: user.programmeId }] : []),
    ];
  }

  return db.course.findMany({
    where,
    include: {
      programme: { select: { id: true, code: true, name: true } },
      ...(include ?? {}),
    },
    orderBy: [{ yearOfStudy: "asc" }, { code: "asc" }],
  }) as Promise<CourseWithMeta[]>;
}

export async function getAccessibleCourseIds(user: SessionUser) {
  const courses = await getAccessibleCourses(user);
  return courses.map((course) => course.id);
}

/** Returns the course only when the user is allowed to see it. */
export async function getCourseForUser(courseId: string, user: SessionUser) {
  const courses = await getAccessibleCourses(user);
  return courses.find((course) => course.id === courseId) ?? null;
}

/** Lecturers may contribute material; students may add their own notes. */
export function canUploadToCourse(user: SessionUser) {
  return ["STUDENT", "LECTURER", "ADMIN"].includes(user.role);
}
