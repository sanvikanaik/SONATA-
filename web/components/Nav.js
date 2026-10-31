"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api("/api/auth/me").then((d) => setUser(d.user)).catch(() => setUser(null));
  }, [path]);

  if (path === "/login" || path === "/register") return null;

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  const link = (href, label) => (
    <Link href={href} className={path === href ? "active" : ""}>{label}</Link>
  );

  return (
    <nav className="top">
      <div className="inner">
        <Link href="/" className="brand">SONATA</Link>
        {link("/", "Dashboard")}
        {link("/gigs", "Browse gigs")}
        {user?.type !== "provider" && link("/gigs/new", "Post a gig")}
        {link("/search", "Smart search")}
        {link("/my", "My activity")}
        {user?.role === "admin" && link("/admin", "Admin")}
        <span className="spacer" />
        {user && <span className="who">{user.name} ({user.role})</span>}
        {user && <button className="btn secondary sm" onClick={logout}>Log out</button>}
      </div>
    </nav>
  );
}
