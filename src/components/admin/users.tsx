"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  KeyRound,
  Loader2,
  Power,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { cn, formatDate, initials, relativeTime } from "@/lib/utils";

type Programme = { id: string; code: string; name: string };
type CourseOption = { id: string; code: string; title: string };

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  programmeCode: string | null;
  yearOfStudy: number | null;
  regNumber: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  courseIds: string[];
};

const ROLE_STYLE: Record<string, string> = {
  ADMIN: "border-rose-soft bg-rose-soft text-rose",
  STUDENT: "border-brand-ring bg-brand-soft text-brand-dark",
};

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function UsersTable({
  users,
  courses,
  currentUserId,
}: {
  users: AdminUser[];
  courses: CourseOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setPendingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The change could not be saved.");
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  async function remove(user: AdminUser) {
    setPendingId(user.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The account could not be deleted.");
        return;
      }

      setConfirmDelete(null);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <th className="px-4 py-2.5 text-[10.5px] font-semibold tracking-[0.05em] text-muted uppercase">
                  Account
                </th>
                <th className="px-3 py-2.5 text-[10.5px] font-semibold tracking-[0.05em] text-muted uppercase">
                  Role
                </th>
                <th className="px-3 py-2.5 text-[10.5px] font-semibold tracking-[0.05em] text-muted uppercase">
                  Programme
                </th>
                <th className="px-3 py-2.5 text-[10.5px] font-semibold tracking-[0.05em] text-muted uppercase">
                  Status
                </th>
                <th className="px-3 py-2.5 text-[10.5px] font-semibold tracking-[0.05em] text-muted uppercase">
                  Last sign-in
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user) => {
                const self = user.id === currentUserId;
                const busy = pendingId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-dark">
                          {initials(user.fullName)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[12.5px] font-medium text-ink">
                              {user.fullName}
                            </span>
                            {self ? (
                              <span className="chip border-line bg-surface-muted text-[9px] text-muted">
                                you
                              </span>
                            ) : null}
                          </div>
                          <div className="truncate text-[10.5px] text-muted">
                            {user.email}
                            {user.regNumber ? ` · ${user.regNumber}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <select
                        value={user.role}
                        disabled={self || busy}
                        onChange={(event) =>
                          patch(user.id, {
                            action: "role",
                            role: event.target.value,
                          })
                        }
                        className={cn(
                          "rounded-md border px-1.5 py-1 text-[11px] font-medium outline-none disabled:opacity-60",
                          ROLE_STYLE[user.role] ?? "border-line bg-surface",
                        )}
                      >
                        <option value="STUDENT">Student</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>

                    <td className="px-3 py-2.5 text-[11.5px] text-ink-soft">
                      {user.programmeCode ?? "—"}
                      {user.yearOfStudy ? (
                        <span className="text-muted"> · Y{user.yearOfStudy}</span>
                      ) : null}
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "chip",
                          user.isActive
                            ? "border-emerald-soft bg-emerald-soft text-emerald"
                            : "border-line bg-surface-muted text-muted",
                        )}
                      >
                        {user.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-[11px] text-muted">
                      {user.lastLoginAt ? relativeTime(user.lastLoginAt) : "never"}
                      <div className="text-[10px] text-muted/70">
                        joined {formatDate(user.createdAt)}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        {busy ? (
                          <Loader2 size={13} className="animate-spin text-muted" />
                        ) : (
                          <>
                            {user.role === "STUDENT" ? (
                              <button
                                onClick={() => setEnrolling(user)}
                                title="Manage enrolments"
                                className="rounded-md p-1.5 text-muted transition-colors hover:bg-brand-soft hover:text-brand-dark"
                              >
                                <Users size={13} />
                              </button>
                            ) : null}

                            <button
                              onClick={() => setResetting(user)}
                              title="Reset password"
                              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
                            >
                              <KeyRound size={13} />
                            </button>

                            <button
                              onClick={() =>
                                patch(user.id, {
                                  action: "status",
                                  isActive: !user.isActive,
                                })
                              }
                              disabled={self}
                              title={user.isActive ? "Deactivate" : "Reactivate"}
                              className={cn(
                                "rounded-md p-1.5 transition-colors disabled:opacity-30",
                                user.isActive
                                  ? "text-muted hover:bg-amber-soft hover:text-amber"
                                  : "text-emerald hover:bg-emerald-soft",
                              )}
                            >
                              <Power size={13} />
                            </button>

                            <button
                              onClick={() => setConfirmDelete(user)}
                              disabled={self}
                              title="Delete account"
                              className="rounded-md p-1.5 text-muted transition-colors hover:bg-rose-soft hover:text-rose disabled:opacity-30"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12.5px] text-muted">
            No accounts match this filter.
          </p>
        ) : null}
      </div>

      <EnrollDialog
        user={enrolling}
        courses={courses}
        onClose={() => setEnrolling(null)}
        onSaved={() => {
          setEnrolling(null);
          router.refresh();
        }}
      />

      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
      />

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this account?"
        subtitle={confirmDelete?.email}
        width="max-w-[420px]"
        footer={
          <>
            <button
              onClick={() => setConfirmDelete(null)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmDelete && remove(confirmDelete)}
              className="btn bg-rose text-white hover:bg-[#a00d3c]"
            >
              <Trash2 size={13} />
              Delete permanently
            </button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          This removes the account and everything it owns: enrolments,
          conversations, quiz attempts, study plans and deadlines. This cannot be
          undone. Deactivating is usually the safer choice.
        </p>
      </Modal>
    </div>
  );
}

function EnrollDialog({
  user,
  courses,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  courses: CourseOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(user?.courseIds ?? []);
    setError(null);
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enrollments", courseIds: selected }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save enrolments.");
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
      open={Boolean(user)}
      onClose={onClose}
      title="Manage enrolments"
      subtitle={user ? `${user.fullName} · ${user.email}` : undefined}
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost" disabled={busy}>
            Cancel
          </button>
          <button onClick={save} disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save enrolments
          </button>
        </>
      }
    >
      <p className="mb-3 text-[12px] text-muted">
        {selected.length} of {courses.length} courses selected.
      </p>

      <div className="space-y-1">
        {courses.map((course) => {
          const checked = selected.includes(course.id);

          return (
            <button
              key={course.id}
              onClick={() =>
                setSelected((current) =>
                  checked
                    ? current.filter((id) => id !== course.id)
                    : [...current, course.id],
                )
              }
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                checked
                  ? "border-brand-ring bg-brand-soft"
                  : "border-line bg-surface hover:bg-surface-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border",
                  checked
                    ? "border-brand bg-brand text-white"
                    : "border-line-strong bg-surface",
                )}
              >
                {checked ? <Check size={10} strokeWidth={3} /> : null}
              </span>
              <span className="font-mono text-[10.5px] text-ink-soft">
                {course.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                {course.title}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-[11.5px] text-rose">{error}</p>
      ) : null}
    </Modal>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setPassword(tempPassword());
    setError(null);
    setDone(false);
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not reset the password.");
        return;
      }

      setDone(true);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title="Reset password"
      subtitle={user ? `${user.fullName} · ${user.email}` : undefined}
      width="max-w-[420px]"
      footer={
        done ? (
          <button onClick={onClose} className="btn btn-primary">
            Done
          </button>
        ) : (
          <>
            <button onClick={onClose} className="btn btn-ghost" disabled={busy}>
              Cancel
            </button>
            <button onClick={save} disabled={busy} className="btn btn-primary">
              {busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <KeyRound size={13} />
              )}
              Set password
            </button>
          </>
        )
      }
    >
      {done ? (
        <div className="rounded-xl border border-emerald-soft bg-emerald-soft px-3.5 py-3">
          <p className="text-[12.5px] font-medium text-emerald">
            Password updated
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-emerald/90">
            Share this temporary password with the user. It is shown only once.
          </p>
          <code className="mt-2 block rounded-md bg-white/70 px-2 py-1.5 font-mono text-[13px] text-ink">
            {password}
          </code>
        </div>
      ) : (
        <>
          <label className="label" htmlFor="new-password">
            New password
          </label>
          <div className="flex gap-2">
            <input
              id="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field font-mono"
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setPassword(tempPassword())}
              className="btn btn-ghost shrink-0"
            >
              Generate
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            The user keeps their account and all their data; only the password
            changes.
          </p>
          {error ? (
            <p className="mt-2 text-[11.5px] text-rose">{error}</p>
          ) : null}
        </>
      )}
    </Modal>
  );
}

export function CreateUserDialog({ programmes }: { programmes: Programme[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "STUDENT",
    password: tempPassword(),
    programmeId: programmes[0]?.id ?? "",
    yearOfStudy: "1",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          programmeId: form.role === "ADMIN" ? null : form.programmeId || null,
          yearOfStudy:
            form.role === "STUDENT" ? Number(form.yearOfStudy) : null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The account could not be created.");
        return;
      }

      setOpen(false);
      setForm({
        fullName: "",
        email: "",
        role: "STUDENT",
        password: tempPassword(),
        programmeId: programmes[0]?.id ?? "",
        yearOfStudy: "1",
      });
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        <UserPlus size={15} />
        Add account
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create an account"
        subtitle="Students are enrolled in their year's courses automatically."
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              className="btn btn-ghost"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="btn btn-primary"
            >
              {busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <UserPlus size={13} />
              )}
              Create account
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="label" htmlFor="u-name">
              Full name
            </label>
            <input
              id="u-name"
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              className="field"
              placeholder="Alice Uwase"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="u-email">
              Email
            </label>
            <input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              className="field"
              placeholder="name@mku.ac.rw"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="u-role">
                Role
              </label>
              <select
                id="u-role"
                value={form.role}
                onChange={(event) => update("role", event.target.value)}
                className="field"
              >
                        <option value="STUDENT">Student</option>
                        <option value="ADMIN">Administrator</option>
              </select>
            </div>

            {form.role !== "ADMIN" ? (
              <div>
                <label className="label" htmlFor="u-programme">
                  Programme
                </label>
                <select
                  id="u-programme"
                  value={form.programmeId}
                  onChange={(event) => update("programmeId", event.target.value)}
                  className="field"
                >
                  {programmes.map((programme) => (
                    <option key={programme.id} value={programme.id}>
                      {programme.code}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {form.role === "STUDENT" ? (
            <div>
              <label className="label" htmlFor="u-year">
                Year of study
              </label>
              <select
                id="u-year"
                value={form.yearOfStudy}
                onChange={(event) => update("yearOfStudy", event.target.value)}
                className="field"
              >
                {[1, 2, 3, 4].map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="u-password">
              Initial password
            </label>
            <div className="flex gap-2">
              <input
                id="u-password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                className="field font-mono"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => update("password", tempPassword())}
                className="btn btn-ghost shrink-0"
              >
                Generate
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Share this with the user. They can change it later.
            </p>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft px-3.5 py-2.5 text-[12px] text-rose">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
