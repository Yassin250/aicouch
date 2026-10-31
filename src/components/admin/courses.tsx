"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type Programme = { id: string; code: string; name: string };
type Lecturer = { id: string; fullName: string };

export type ProgrammeRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationYears: number;
  courseCount: number;
};

export type CourseRow = {
  id: string;
  code: string;
  title: string;
  programmeId: string;
  programmeCode: string;
  yearOfStudy: number;
  semester: number;
  credits: number;
  lecturerId: string | null;
  lecturerName: string | null;
  description: string | null;
  documentCount: number;
  quizCount: number;
};

export function CoursesManager({
  programmes,
  courses,
  lecturers,
}: {
  programmes: ProgrammeRow[];
  courses: CourseRow[];
  lecturers: Lecturer[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [courseDraft, setCourseDraft] = useState<CourseRow | "new" | null>(null);
  const [programmeDraft, setProgrammeDraft] = useState<
    ProgrammeRow | "new" | null
  >(null);
  const [deleting, setDeleting] = useState<CourseRow | null>(null);
  const [removingProgramme, setRemovingProgramme] =
    useState<ProgrammeRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function removeCourse(course: CourseRow) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The course could not be deleted.");
        return;
      }

      setDeleting(null);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProgramme(programme: ProgrammeRow) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/programmes/${programme.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The programme could not be deleted.");
        return;
      }

      setRemovingProgramme(null);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-rose">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-[11px] underline"
          >
            dismiss
          </button>
        </div>
      ) : null}

      {/* Programmes ---------------------------------------------------- */}
      <section className="animate-rise">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink">Programmes</h2>
          <button
            onClick={() => setProgrammeDraft("new")}
            className="btn btn-ghost text-[12.5px]"
          >
            <Plus size={13} />
            Add programme
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {programmes.map((programme) => (
            <div key={programme.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <GraduationCap size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="chip border-line bg-surface-muted font-mono text-[10px] text-ink-soft">
                        {programme.code}
                      </span>
                      <span className="text-[10.5px] text-muted">
                        {programme.durationYears} years
                      </span>
                    </div>
                    <h3 className="mt-1 text-[13px] leading-snug font-medium text-ink">
                      {programme.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {programme.courseCount} course
                      {programme.courseCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => setProgrammeDraft(programme)}
                    title="Edit programme"
                    className="rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-ink"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setRemovingProgramme(programme)}
                    title="Delete programme"
                    className="rounded-md p-1.5 text-muted hover:bg-rose-soft hover:text-rose"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Courses ------------------------------------------------------- */}
      <section className="animate-rise">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink">
            Courses
            <span className="ml-1.5 text-[11.5px] font-normal text-muted">
              {courses.length}
            </span>
          </h2>
          <button
            onClick={() => setCourseDraft("new")}
            className="btn btn-primary text-[12.5px]"
          >
            <Plus size={13} />
            Add course
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-muted">
                  {["Code", "Title", "Programme", "Year", "Lecturer", "Content", ""].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-3 py-2.5 text-[10.5px] font-semibold tracking-[0.05em] text-muted uppercase"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-surface-muted/60">
                    <td className="px-3 py-2.5">
                      <span className="chip border-line bg-surface-muted font-mono text-[10px] text-ink-soft">
                        {course.code}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="max-w-[240px] truncate text-[12.5px] font-medium text-ink">
                        {course.title}
                      </div>
                      <div className="text-[10.5px] text-muted">
                        {course.credits} credits
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[11.5px] text-ink-soft">
                      {course.programmeCode}
                    </td>
                    <td className="px-3 py-2.5 text-[11.5px] text-ink-soft">
                      Y{course.yearOfStudy} · S{course.semester}
                    </td>
                    <td className="px-3 py-2.5 text-[11.5px] text-ink-soft">
                      {course.lecturerName ?? (
                        <span className="text-muted">unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-muted">
                      {course.documentCount} material
                      {course.documentCount === 1 ? "" : "s"} ·{" "}
                      {course.quizCount} quiz
                      {course.quizCount === 1 ? "" : "zes"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-0.5">
                        <button
                          onClick={() => setCourseDraft(course)}
                          title="Edit course"
                          className="rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-ink"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleting(course)}
                          title="Delete course"
                          className="rounded-md p-1.5 text-muted hover:bg-rose-soft hover:text-rose"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CourseDialog
        draft={courseDraft}
        programmes={programmes}
        lecturers={lecturers}
        onClose={() => setCourseDraft(null)}
        onSaved={() => {
          setCourseDraft(null);
          router.refresh();
        }}
      />

      <ProgrammeDialog
        draft={programmeDraft}
        onClose={() => setProgrammeDraft(null)}
        onSaved={() => {
          setProgrammeDraft(null);
          router.refresh();
        }}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this course?"
        subtitle={deleting ? `${deleting.code} — ${deleting.title}` : undefined}
        width="max-w-[440px]"
        footer={
          <>
            <button onClick={() => setDeleting(null)} className="btn btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => deleting && removeCourse(deleting)}
              disabled={busy}
              className="btn bg-rose text-white hover:bg-[#a00d3c]"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Delete course
            </button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Enrolments are removed with the course. A course that still has
          materials or quizzes cannot be deleted, so academic content is never
          lost by accident.
        </p>
      </Modal>

      <Modal
        open={Boolean(removingProgramme)}
        onClose={() => setRemovingProgramme(null)}
        title="Delete this programme?"
        subtitle={removingProgramme?.code}
        width="max-w-[440px]"
        footer={
          <>
            <button
              onClick={() => setRemovingProgramme(null)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                removingProgramme && removeProgramme(removingProgramme)
              }
              disabled={busy}
              className="btn bg-rose text-white hover:bg-[#a00d3c]"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Delete programme
            </button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          A programme can only be removed once it has no courses and no accounts
          attached.
        </p>
      </Modal>
    </div>
  );
}

function CourseDialog({
  draft,
  programmes,
  lecturers,
  onClose,
  onSaved,
}: {
  draft: CourseRow | "new" | null;
  programmes: Programme[];
  lecturers: Lecturer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const creating = draft === "new";
  const course = draft && draft !== "new" ? draft : null;

  const [form, setForm] = useState({
    code: "",
    title: "",
    programmeId: programmes[0]?.id ?? "",
    yearOfStudy: "1",
    semester: "1",
    credits: "15",
    lecturerId: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;

    setError(null);

    if (course) {
      setForm({
        code: course.code,
        title: course.title,
        programmeId: course.programmeId,
        yearOfStudy: String(course.yearOfStudy),
        semester: String(course.semester),
        credits: String(course.credits),
        lecturerId: course.lecturerId ?? "",
        description: course.description ?? "",
      });
    } else {
      setForm({
        code: "",
        title: "",
        programmeId: programmes[0]?.id ?? "",
        yearOfStudy: "1",
        semester: "1",
        credits: "15",
        lecturerId: "",
        description: "",
      });
    }
  }, [draft, course, programmes]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);

    const payload = {
      code: form.code,
      title: form.title,
      programmeId: form.programmeId,
      yearOfStudy: Number(form.yearOfStudy),
      semester: Number(form.semester),
      credits: Number(form.credits),
      lecturerId: form.lecturerId || null,
      description: form.description || null,
    };

    try {
      const response = await fetch(
        course ? `/api/admin/courses/${course.id}` : "/api/admin/courses",
        {
          method: course ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The course could not be saved.");
        return;
      }

      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={creating ? "Add a course" : "Edit course"}
      subtitle={creating ? undefined : course?.code}
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost" disabled={busy}>
            Cancel
          </button>
          <button onClick={save} disabled={busy} className="btn btn-primary">
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Check size={13} />
            )}
            {creating ? "Create course" : "Save changes"}
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <div>
            <label className="label" htmlFor="c-code">
              Code
            </label>
            <input
              id="c-code"
              value={form.code}
              onChange={(event) => update("code", event.target.value)}
              className="field font-mono"
              placeholder="BBICT2103"
            />
          </div>
          <div>
            <label className="label" htmlFor="c-title">
              Title
            </label>
            <input
              id="c-title"
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              className="field"
              placeholder="Database Management Systems"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="c-programme">
            Programme
          </label>
          <select
            id="c-programme"
            value={form.programmeId}
            onChange={(event) => update("programmeId", event.target.value)}
            className="field"
          >
            {programmes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.code} — {programme.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="c-year">
              Year
            </label>
            <select
              id="c-year"
              value={form.yearOfStudy}
              onChange={(event) => update("yearOfStudy", event.target.value)}
              className="field"
            >
              {[1, 2, 3, 4].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="c-semester">
              Semester
            </label>
            <select
              id="c-semester"
              value={form.semester}
              onChange={(event) => update("semester", event.target.value)}
              className="field"
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="c-credits">
              Credits
            </label>
            <input
              id="c-credits"
              type="number"
              min={1}
              max={60}
              value={form.credits}
              onChange={(event) => update("credits", event.target.value)}
              className="field"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="c-lecturer">
            Lecturer
          </label>
          <select
            id="c-lecturer"
            value={form.lecturerId}
            onChange={(event) => update("lecturerId", event.target.value)}
            className="field"
          >
            <option value="">Unassigned</option>
            {lecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.id}>
                {lecturer.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="c-description">
            Description <span className="text-muted">(optional)</span>
          </label>
          <input
            id="c-description"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className="field"
            placeholder="What does this course cover?"
          />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft px-3.5 py-2.5 text-[12px] text-rose">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function ProgrammeDialog({
  draft,
  onClose,
  onSaved,
}: {
  draft: ProgrammeRow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const creating = draft === "new";
  const programme = draft && draft !== "new" ? draft : null;

  const [form, setForm] = useState({
    code: "",
    name: "",
    durationYears: "3",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    setError(null);
    setForm({
      code: programme?.code ?? "",
      name: programme?.name ?? "",
      durationYears: String(programme?.durationYears ?? 3),
      description: programme?.description ?? "",
    });
  }, [draft, programme]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        programme
          ? `/api/admin/programmes/${programme.id}`
          : "/api/admin/programmes",
        {
          method: programme ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: form.code,
            name: form.name,
            durationYears: Number(form.durationYears),
            description: form.description || null,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The programme could not be saved.");
        return;
      }

      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={creating ? "Add a programme" : "Edit programme"}
      subtitle={programme?.code}
      width="max-w-[460px]"
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost" disabled={busy}>
            Cancel
          </button>
          <button onClick={save} disabled={busy} className="btn btn-primary">
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Check size={13} />
            )}
            {creating ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <div>
            <label className="label" htmlFor="p-code">
              Code
            </label>
            <input
              id="p-code"
              value={form.code}
              onChange={(event) => update("code", event.target.value)}
              className="field font-mono"
              placeholder="BBICT"
            />
          </div>
          <div>
            <label className="label" htmlFor="p-name">
              Name
            </label>
            <input
              id="p-name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className="field"
              placeholder="Bachelor of Business ICT"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="p-years">
            Duration (years)
          </label>
          <select
            id="p-years"
            value={form.durationYears}
            onChange={(event) => update("durationYears", event.target.value)}
            className="field"
          >
            {[2, 3, 4, 5].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="p-description">
            Description <span className="text-muted">(optional)</span>
          </label>
          <input
            id="p-description"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className="field"
          />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft px-3.5 py-2.5 text-[12px] text-rose">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
