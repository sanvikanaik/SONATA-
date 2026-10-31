"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api, fmtDate, money } from "@/lib/client";

export default function Admin() {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("disputes");
  const [notes, setNotes] = useState({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api("/api/admin/overview").then(setD).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function resolve(id, refund) {
    setErr(""); setMsg("");
    try {
      const r = await api(`/api/admin/disputes/${id}`, { method: "POST", body: { resolution: notes[id] || "", refund } });
      setMsg(r.message); await load();
    } catch (e) { setErr(e.message); }
  }
  if (!d) return err ? <div className="alert error">{err}</div> : <p className="muted">Loading...</p>;

  return (
    <>
      <h1>Admin</h1>
      <div className="tabs">
        {["disputes", "finance", "users"].map((t) => <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {msg && <div className="alert success">{msg}</div>}
      {err && <div className="alert error">{err}</div>}

      {tab === "disputes" && (d.disputes.length === 0 ? <div className="card empty">No disputes.</div> : d.disputes.map((x) => {
        const live = ["open", "under_review"].includes(x.dispute_status);
        return (
          <div className="card" key={x.dispute_id}>
            <div className="row between"><div><b>{x.reason}</b> on <Link href={`/gigs/${x.gig_id}`}>{x.gig_title}</Link></div><Badge value={x.dispute_status} /></div>
            <div className="small muted">Raised by {x.raised_by} · {x.days_open} day(s) ago</div>
            {x.description && <p>{x.description}</p>}
            {x.resolution && <p className="small"><b>Resolution:</b> {x.resolution}</p>}
            {live && (<>
              <label>Resolution note</label>
              <input value={notes[x.dispute_id] || ""} onChange={(e) => setNotes({ ...notes, [x.dispute_id]: e.target.value })} placeholder="Explain your decision" />
              <div className="row" style={{ marginTop: ".6rem" }}>
                <button className="btn ok" onClick={() => resolve(x.dispute_id, false)}>Pay the musicians</button>
                <button className="btn danger" onClick={() => resolve(x.dispute_id, true)}>Refund the requester</button>
              </div>
            </>)}
          </div>
        );
      }))}

      {tab === "finance" && (
        <div className="card scroll"><table>
          <thead><tr><th>Gig</th><th>Status</th><th>Budget</th><th>Pending</th><th>Held</th><th>Released</th><th>Refunded</th></tr></thead>
          <tbody>{d.finance.map((f) => (
            <tr key={f.gig_id}><td><Link href={`/gigs/${f.gig_id}`}>{f.title}</Link></td><td><Badge value={f.status} /></td><td>{money(f.budget)}</td>
              <td>{money(f.pending_amount)}</td><td>{money(f.held_amount)}</td><td>{money(f.released_amount)}</td><td>{money(f.refunded_amount)}</td></tr>
          ))}</tbody></table></div>
      )}

      {tab === "users" && (
        <div className="card scroll"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody>{d.users.map((u) => (
            <tr key={u.user_id}><td>{u.name}</td><td>{u.email}</td><td>{u.user_type}</td><td><Badge value={u.app_role === "admin" ? "accepted" : "pending"} /> {u.app_role}</td><td>{fmtDate(u.created_at)}</td></tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
