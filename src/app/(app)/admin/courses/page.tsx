import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { CoursesManager } from "@/components/admin/courses";

export const metadata = { title: "Programmes & Courses" };

export default async function AdminCoursesPage() {
  await requireRole("ADMIN");

  const [programmes, courses, lecturers] = await Promise.all([
    db.programme.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { code: "asc" },
    }),
    db.course.findMany({
      include: {
        programme: { select: { code: true } },
        lecturer: { select: { fullName: true } },
        _count: { select: { documents: true, quizzes: true } },
      },
      orderBy: [{ yearOfStudy: "asc" }, { code: "asc" }],
    }),
    db.user.findMany({
      where: { role: "LECTURER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="animate-rise">
        <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-ink">
          Programmes &amp; courses
        </h1>
        <p className="mt-1 text-[13.5px] text-muted">
          The academic structure every course, material and quiz is attached to.
        </p>
      </div>

      <CoursesManager
        programmes={programmes.map((programme) => ({
          id: programme.id,
          code: programme.code,
          name: programme.name,
          description: programme.description,
          durationYears: programme.durationYears,
          courseCount: programme._count.courses,
        }))}
        courses={courses.map((course) => ({
          id: course.id,
          code: course.code,
          title: course.title,
          programmeId: course.programmeId,
          programmeCode: course.programme.code,
          yearOfStudy: course.yearOfStudy,
          semester: course.semester,
          credits: course.credits,
          lecturerId: course.lecturerId,
          lecturerName: course.lecturer?.fullName ?? null,
          description: course.description,
          documentCount: course._count.documents,
          quizCount: course._count.quizzes,
        }))}
        lecturers={lecturers}
      />
    </div>
  );
}
