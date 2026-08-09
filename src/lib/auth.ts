import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const cookieName = "myshop_session";

export type SessionUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: "CUSTOMER" | "ADMIN";
};

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "change-this-development-secret");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      username: payload.username ? String(payload.username) : null,
      email: String(payload.email),
      role: payload.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== "ADMIN") redirect("/");
  return session;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function findUserByIdentifier(identifier: string) {
  const value = identifier.toLowerCase();
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: value },
        { username: value },
      ],
    },
  });
}
