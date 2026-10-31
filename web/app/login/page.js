"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Login() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/api/auth/login", { method: "POST", body: f });
      router.push("/"); router.refresh();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="auth card">
      <h1>SONATA</h1>
      <p className="muted">Book musicians. Find gigs.</p>
      {err && <div className="alert error">{err}</div>}
      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <label>Password</label>
        <input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <p><button className="btn" disabled={busy}>{busy ? "Signing in..." : "Log in"}</button></p>
      </form>
      <p className="small muted">New here? <Link href="/register">Create an account</Link></p>
      <p className="small muted">Demo: ananya@sonata.app / Sonata@123 (requester), rohan@sonata.app (provider), admin@sonata.app (admin)</p>
    </div>
  );
}
