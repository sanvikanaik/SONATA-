"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api, fmtDate, money } from "@/lib/client";

const sumBy = (rows, status) => Number(rows.find((r) => r.payment_status === status)?.total || 0);

export default function My() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/me").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="alert error">{err}</div>;
  if (!d) return <p className="muted">Loading...</p>;

  return (
    <>
      <h1>My activity</h1>
      <p className="muted">Rating: <b>{Number(d.reputation.avg_rating).toFixed(2)}</b> from {d.reputation.reviews} review(s)</p>
      <div className="grid g4" style={{ margin: "1rem 0" }}>
        <div className="card stat"><div className="n">{money(sumBy(d.earned, "released"))}</div><div className="l">Earned (released)</div></div>
        <div className="card stat"><div className="n">{money(sumBy(d.earned, "held") + sumBy(d.earned, "pending"))}</div><div className="l">Incoming (escrow)</div></div>
        <div className="card stat"><div className="n">{money(sumBy(d.spent, "released"))}</div><div className="l">Paid to musicians</div></div>
        <div className="card stat"><div className="n">{money(sumBy(d.spent, "held") + sumBy(d.spent, "pending"))}</div><div className="l">In escrow (yours)</div></div>
      </div>

      <div className="card scroll">
        <h2>Gigs I posted</h2>
        {d.posted.length === 0 ? <div className="empty">You have not posted any gigs. <Link href="/gigs/new">Post one</Link></div> : (
          <table><thead><tr><th>Gig</th><th>Date</th><th>Budget</th><th>Status</th><th>Pending applicants</th></tr></thead>
            <tbody>{d.posted.map((g) => (
              <tr key={g.gig_id}><td><Link href={`/gigs/${g.gig_id}`}>{g.title}</Link></td><td>{fmtDate(g.event_date)}</td>
                <td>{money(g.budget)}</td><td><Badge value={g.status} /></td><td>{g.pending_applications}</td></tr>
            ))}</tbody></table>
        )}
      </div>

      <div className="card scroll">
        <h2>My applications</h2>
        {d.applied.length === 0 ? <div className="empty">You have not applied to any gigs. <Link href="/gigs">Browse gigs</Link></div> : (
          <table><thead><tr><th>Gig</th><th>My quote</th><th>Application</th><th>Gig status</th></tr></thead>
            <tbody>{d.applied.map((a) => (
              <tr key={a.application_id}><td><Link href={`/gigs/${a.gig_id}`}>{a.title}</Link></td><td>{money(a.quoted_price)}</td>
                <td><Badge value={a.application_status} /></td><td><Badge value={a.gig_status} /></td></tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
