import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { sessions, users, type User } from "@/server/db/schema";
import { randomToken, sha256 } from "@/lib/crypto";

export const SESSION_COOKIE = "ar_session";

const CLIENT_SESSION_DAYS = 30;
const ADMIN_SESSION_HOURS = 8;

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "preferredLocale">;

export async function createSession(userId: string, isAdmin: boolean) {
  const token = randomToken(32);
  const tokenHash = sha256(token);
  const ttlMs = isAdmin
    ? ADMIN_SESSION_HOURS * 60 * 60 * 1000
    : CLIENT_SESSION_DAYS * 24 * 60 * 60 * 1000;

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + ttlMs),
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  });

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));

  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      preferredLocale: users.preferredLocale,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, sha256(token)),
        gt(sessions.expiresAt, new Date()),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  // `expiresAt` est écarté : il ne doit jamais quitter la couche d'accès.
  const { expiresAt, ...user } = row;
  void expiresAt;
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") throw new Error("FORBIDDEN");
  return user;
}
