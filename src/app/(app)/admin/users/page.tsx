import { Search } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateUserDialog, UsersTable } from "@/components/admin/users";
import { cn } from "@/lib/utils";

export const metadata = { title: "Users" };

const ROLE_FILTERS = [
  { value: "", label: "All" },
  { value: "STUDENT", label: "Students" },
  { value: "ADMIN", label: "Admins" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const admin = await requireRole("ADMIN");
  const { q, role } = await searchParams;

  const query = (q ?? "").trim();
  const roleFilter = ROLE_FILTERS.some((item) => item.value === role)
    ? role
    : "";

  const [users, programmes, courses] = await Promise.all([
    db.user.findMany({
      where: {
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { regNumber: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        programme: { select: { code: true } },
        enrollments: { select: { courseId: true } },
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      take: 200,
    }),
    db.programme.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    db.course.findMany({
      select: { id: true, code: true, title: true },
      orderBy: [{ yearOfStudy: "asc" }, { code: "asc" }],
    }),
  ]);

  const counts = {
    total: users.length,
    active: users.filter((user) => user.isActive).length,
    disabled: users.filter((user) => !user.isActive).length,
  };

  return (
    <div className="space-y-5">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] text-ink">
            User accounts
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {counts.total} account{counts.total === 1 ? "" : "s"} ·{" "}
            {counts.active} active · {counts.disabled} disabled
          </p>
        </div>
        <CreateUserDialog programmes={programmes} />
      </div>

      <div className="animate-rise flex flex-wrap items-center gap-2">
        <form
          method="get"
          action="/admin/users"
          className="relative min-w-[240px] flex-1"
        >
          {roleFilter ? (
            <input type="hidden" name="role" value={roleFilter} />
          ) : null}
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by name, email or registration number…"
            className="field pr-24 pl-9"
          />
          <button
            type="submit"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md bg-surface-muted px-2.5 py-1 text-[11.5px] font-medium text-ink-soft hover:bg-line"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((item) => {
            const href = `/admin/users${item.value ? `?role=${item.value}` : ""}${
              query
                ? `${item.value ? "&" : "?"}q=${encodeURIComponent(query)}`
                : ""
            }`;

            return (
              <a
                key={item.label}
                href={href}
                className={cn(
                  "chip border px-2.5 py-1.5 text-[12px] transition-colors",
                  roleFilter === item.value
                    ? "border-brand bg-brand-soft text-brand-dark"
                    : "border-line bg-surface text-ink-soft hover:border-line-strong",
                )}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </div>

      <UsersTable
        currentUserId={admin.id}
        courses={courses}
        users={users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          programmeCode: user.programme?.code ?? null,
          yearOfStudy: user.yearOfStudy,
          regNumber: user.regNumber,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
          createdAt: user.createdAt.toISOString(),
          courseIds: user.enrollments.map((enrollment) => enrollment.courseId),
        }))}
      />
    </div>
  );
}
