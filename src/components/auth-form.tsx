"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

type Programme = { id: string; code: string; name: string };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not sign you in.");
        setBusy(false);
        return;
      }

      const target = data.role === "ADMIN" ? "/admin" : "/dashboard";
      router.replace(target);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@mku.ac.rw"
            className="field"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="field pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-rose-soft bg-rose-soft px-3 py-2 text-[12.5px] text-rose">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary w-full py-2.5"
        >
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

    </div>
  );
}

export function RegisterForm({ programmes }: { programmes: Programme[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    regNumber: "",
    programmeId: programmes[0]?.id ?? "",
    yearOfStudy: "1",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not create your account.");
        setBusy(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div>
        <label className="label" htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          value={form.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          placeholder="Alice Uwase"
          className="field"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="regEmail">
          Email address
        </label>
        <input
          id="regEmail"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          placeholder="you@mku.ac.rw"
          className="field"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="regNumber">
            Reg. number
          </label>
          <input
            id="regNumber"
            value={form.regNumber}
            onChange={(event) => update("regNumber", event.target.value)}
            placeholder="BBICT/2024/001"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="year">
            Year of study
          </label>
          <select
            id="year"
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
      </div>

      <div>
        <label className="label" htmlFor="programme">
          Programme
        </label>
        <select
          id="programme"
          value={form.programmeId}
          onChange={(event) => update("programmeId", event.target.value)}
          className="field"
          required
        >
          {programmes.length === 0 ? (
            <option value="">No programmes available</option>
          ) : null}
          {programmes.map((programme) => (
            <option key={programme.id} value={programme.id}>
              {programme.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="regPassword">
          Password
        </label>
        <div className="relative">
          <input
            id="regPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="At least 8 characters"
            className="field pr-10"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-soft bg-rose-soft px-3 py-2 text-[12.5px] text-rose">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy || !programmes.length}
        className="btn btn-primary w-full py-2.5"
      >
        {busy ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            Create account
            <ArrowRight size={15} />
          </>
        )}
      </button>

      <p className="text-[11px] leading-relaxed text-muted">
        You will be enrolled automatically in the courses for your programme and
        year of study.
      </p>
    </form>
  );
}
