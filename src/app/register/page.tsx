import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-form";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const programmes = await db.programme.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="For BBICT and Computer Science students at Mount Kigali University."
      footer={
        <>
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-brand hover:text-brand-dark"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm programmes={programmes} />
    </AuthShell>
  );
}
