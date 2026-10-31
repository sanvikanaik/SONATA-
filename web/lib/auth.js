import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { HttpError } from "./http";

export const COOKIE = "sonata_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set in .env.local (32+ characters)");
  return new TextEncoder().encode(s);
}

// The session is a signed token in an httpOnly cookie (JavaScript in the browser cannot read it).
export async function createSession(user) {
  const token = await new SignJWT({ name: user.name, role: user.app_role, type: user.user_type })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.user_id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: Number(payload.sub), name: payload.name, role: payload.role, type: payload.type };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please log in first.");
  return s;
}

// Role-based access control: this is where "admin" is enforced on the server.
export async function requireAdmin() {
  const s = await requireUser();
  if (s.role !== "admin") throw new HttpError(403, "Admins only.");
  return s;
}
