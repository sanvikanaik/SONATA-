"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api, fmtDate, fmtTime, money } from "@/lib/client";

export default function Gigs() {
  const [f, setF] = useState({ q: "", status: "open", type: "", minBudget: "", maxBudget: "" });
  const [data, setData] = useState({ gigs: [], types: [] });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function load(filters = f) {
    setLoading(true); setErr("");
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "")).toString();
    try { setData(await api(`/api/gigs?${qs}`)); } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <h1>Browse gigs</h1>
      <form className="card" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <div className="inline">
          <div style={{ flex: 2 }}><label>Search (title / description)</label><input value={f.q} onChange={set("q")} placeholder="wedding live band" /></div>
          <div><label>Status</label>
            <select value={f.status} onChange={set("status")}>
              {["open", "booked", "completed", "disputed", "cancelled", "all"].map((s) => <option key={s}>{s}</option>)}
            </select></div>
          <div><label>Type</label>
            <select value={f.type} onChange={set("type")}><option value="">Any</option>{data.types.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label>Min budget</label><input type="number" min="0" value={f.minBudget} onChange={set("minBudget")} /></div>
          <div><label>Max budget</label><input type="number" min="0" value={f.maxBudget} onChange={set("maxBudget")} /></div>
          <button className="btn">Search</button>
        </div>
      </form>

      {err && <div className="alert error">{err}</div>}
      <div className="card scroll">
        {loading ? <p className="muted">Loading...</p> : data.gigs.length === 0 ? <div className="empty">No gigs match your filters.</div> : (
          <table>
            <thead><tr><th>Gig</th><th>Date</th><th>Venue</th><th>Posted by</th><th>Budget</th><th>Status</th><th>Applicants</th></tr></thead>
            <tbody>
              {data.gigs.map((g) => (
                <tr key={g.gig_id}>
                  <td><Link href={`/gigs/${g.gig_id}`}><b>{g.title}</b></Link><div className="small muted">{g.gig_type}</div></td>
                  <td>{fmtDate(g.event_date)}<div className="small muted">{fmtTime(g.start_time)}-{fmtTime(g.end_time)}</div></td>
                  <td>{g.venue_name || "TBD"}</td><td>{g.poster_name}</td><td>{money(g.budget)}</td>
                  <td><Badge value={g.status} /></td><td>{g.pending_applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
