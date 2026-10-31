import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { db } from "./db";
import { readSession } from "./session";

export const ROLES = {
  STUDENT: "STUDENT",
  LECTURER: "LECTURER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/**
 * The signed-in user, memoised for the duration of a single request.
 * Returns null when there is no valid session or the account was deactivated
 * by an administrator - deactivation takes effect on the next request.
 */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { programme: true },
  });

  if (!user || !user.isActive) return null;

  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) redirect("/dashboard");
  return user;
}

/** Route-handler friendly variant: returns null instead of redirecting. */
export async function requireApiUser() {
  return getCurrentUser();
}

/** Route-handler guard for administrator-only endpoints. */
export async function requireApiAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.ADMIN) return null;
  return user;
}
