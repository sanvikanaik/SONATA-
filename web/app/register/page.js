"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Register() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", user_type: "both", bio: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/api/auth/register", { method: "POST", body: f });
      router.push("/"); router.refresh();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="auth card">
      <h1>Join SONATA</h1>
      {err && <div className="alert error">{err}</div>}
      <form onSubmit={submit}>
        <label>Full name</label><input required value={f.name} onChange={set("name")} />
        <label>Email</label><input type="email" required value={f.email} onChange={set("email")} />
        <label>Phone (optional)</label><input value={f.phone} onChange={set("phone")} placeholder="+91 9876543210" />
        <label>Password (8+ characters)</label><input type="password" required minLength={8} value={f.password} onChange={set("password")} />
        <label>I want to...</label>
        <select value={f.user_type} onChange={set("user_type")}>
          <option value="both">Post gigs and perform</option>
          <option value="requester">Hire musicians (post gigs)</option>
          <option value="provider">Perform (apply to gigs)</option>
        </select>
        {f.user_type !== "requester" && (<>
          <label>Short musician bio (used for smart matching)</label>
          <textarea value={f.bio} onChange={set("bio")} placeholder="Jazz pianist, 5 years, weddings and corporate events..." />
        </>)}
        <p><button className="btn" disabled={busy}>{busy ? "Creating..." : "Create account"}</button></p>
      </form>
      <p className="small muted">Already registered? <Link href="/login">Log in</Link></p>
    </div>
  );
}
