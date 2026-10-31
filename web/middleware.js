import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login", "/register"];

// Runs before every page. No valid session -> /login. /admin needs the admin role.
// (API routes check the session themselves, so they are excluded here.)
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  let payload = null;
  const token = req.cookies.get("sonata_session")?.value;
  if (token) {
    try {
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET || "")));
    } catch {}
  }
  const url = req.nextUrl.clone();
  if (!payload) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && payload.role !== "admin") {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
