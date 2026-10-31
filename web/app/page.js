"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api, fmtDate, money } from "@/lib/client";

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/dashboard").then(setD).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="alert error">{err}</div>;
  if (!d) return <p className="muted">Loading...</p>;
  const max = Math.max(1, ...d.byStatus.map((s) => s.total));

  return (
    <>
      <h1>Welcome back, {d.viewer.name.split(" ")[0]}</h1>
      <p className="muted">Here is what is happening on Sonata.</p>

      <div className="grid g4" style={{ margin: "1rem 0" }}>
        <div className="card stat"><div className="n">{d.totals.gigs}</div><div className="l">Gigs posted</div></div>
        <div className="card stat"><div className="n">{d.totals.users}</div><div className="l">Members</div></div>
        <div className="card stat"><div className="n">{money(d.totals.paid_out)}</div><div className="l">Paid out to musicians</div></div>
        <div className="card stat"><div className="n">{d.totals.avg_rating}</div><div className="l">Average rating</div></div>
      </div>
      {d.viewer.role === "admin" && d.totals.open_disputes > 0 && (
        <div className="alert error">{d.totals.open_disputes} dispute(s) waiting for review. <Link href="/admin">Open admin</Link></div>
      )}

      <div className="grid g2">
        <div className="card">
          <h2>Gigs by status</h2>
          {d.byStatus.map((s) => (
            <div className="barrow" key={s.status}>
              <Badge value={s.status} />
              <div><div className="bar" style={{ width: `${(s.total / max) * 100}%` }} /></div>
              <b>{s.total}</b>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Top rated musicians</h2>
          {d.leaderboard.length === 0 && <div className="empty">No ratings yet.</div>}
          <table><tbody>
            {d.leaderboard.map((p) => (
              <tr key={p.user_id}>
                <td><b>{p.name}</b></td>
                <td>{Number(p.avg_rating).toFixed(2)} ({p.review_count})</td>
                <td className="muted">{p.gigs_completed} gigs</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h2>Upcoming open gigs</h2>
          {d.upcoming.length === 0 && <div className="empty">No open gigs right now.</div>}
          {d.upcoming.map((g) => (
            <div key={g.gig_id} className="row between" style={{ padding: ".4rem 0", borderBottom: "1px solid var(--line)" }}>
              <div><Link href={`/gigs/${g.gig_id}`}><b>{g.title}</b></Link><div className="small muted">{fmtDate(g.event_date)} · {g.venue_name || "Venue TBD"}</div></div>
              <div style={{ textAlign: "right" }}>{money(g.budget)}<div className="small muted">{g.pending_applications} applicant(s)</div></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Recent activity</h2>
          <ul className="timeline">
            {d.activity.map((a, i) => (
              <li key={i}><Link href={`/gigs/${a.gig_id}`}>{a.title}</Link> <Badge value={a.new_status} />
                <div className="small muted">{a.changed_at}</div></li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
