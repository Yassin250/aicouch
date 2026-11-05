"use client";

import { useState } from "react";

export default function ProfilePage() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setPending(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not change password.");
        return;
      }
      setOk(true);
      form.reset();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Profile</h1>
        <p className="text-sm text-muted">Manage your account and password.</p>
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-muted">
          Account
        </h2>
        <p className="text-[13px] text-ink">
          Signed in. Use the form below to update your password.
        </p>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-muted">
          Change password
        </h2>
        {error ? (
          <div className="rounded-xl border border-rose-soft bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-rose">
            {error}
          </div>
        ) : null}
        {ok ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-[12.5px] text-green-700">
            Password changed successfully.
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="label">Current password</span>
            <input
              name="currentPassword"
              type="password"
              required
              className="input"
              autoComplete="current-password"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="label">New password</span>
            <input
              name="newPassword"
              type="password"
              minLength={8}
              required
              className="input"
              autoComplete="new-password"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary disabled:opacity-60"
          >
            {pending ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>
    </main>
  );
}
