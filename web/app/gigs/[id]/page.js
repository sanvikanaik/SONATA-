"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api, fmtDate, fmtTime, money } from "@/lib/client";

export default function GigPage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [recs, setRecs] = useState(null);
  const [apply, setApply] = useState({ quoted_price: "", proposal: "" });
  const [dispute, setDispute] = useState({ reason: "", description: "" });
  const [rate, setRate] = useState({ ratee_id: "", rating: 5, review: "" });

  const load = useCallback(() => api(`/api/gigs/${id}`).then(setD).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);

  // run any action, show the server's message (or its business-rule error), then refresh
  async function act(fn) {
    setErr(""); setMsg("");
    try { const r = await fn(); setMsg(r?.message || "Done."); await load(); } catch (e) { setErr(e.message); }
  }
  const post = (path, body = {}) => api(path, { method: "POST", body });

  if (!d) return err ? <div className="alert error">{err}</div> : <p className="muted">Loading...</p>;
  const { gig, viewer, applications, participants, payments, history, disputes, ratings } = d;
  const canApply = !viewer.isPoster && viewer.type !== "requester" && gig.status === "open" && applications.length === 0;
  const pendingPay = payments.some((p) => p.payment_status === "pending");
  const heldPay = payments.some((p) => p.payment_status === "held");
  const canDispute = viewer.isParticipant && ["booked", "completed"].includes(gig.status);
  const rateOptions = participants.filter((p) => p.user_id !== viewer.id);

  async function recommend() {
    setErr("");
    try { setRecs((await api(`/api/search?mode=forGig&gig_id=${id}`)).results); } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <div className="row between">
        <div><h1>{gig.title}</h1><span className="muted">{gig.gig_type} · posted by {gig.poster_name}</span></div>
        <Badge value={gig.status} />
      </div>
      {msg && <div className="alert success" style={{ marginTop: "1rem" }}>{msg}</div>}
      {err && <div className="alert error" style={{ marginTop: "1rem" }}>{err}</div>}

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="grid g4">
          <div><div className="small muted">Date</div><b>{fmtDate(gig.event_date)}</b></div>
          <div><div className="small muted">Time</div><b>{fmtTime(gig.start_time)} - {fmtTime(gig.end_time)}</b></div>
          <div><div className="small muted">Venue</div><b>{gig.venue_name || "To be decided"}</b><div className="small muted">{gig.location}</div></div>
          <div><div className="small muted">Budget</div><b>{money(gig.budget)}</b></div>
        </div>
        {gig.description && <p style={{ marginBottom: 0 }}>{gig.description}</p>}
      </div>

      {(viewer.isPoster) && (
        <div className="card">
          <h2>Manage this gig</h2>
          <div className="row">
            <button className="btn" disabled={!(gig.status === "booked" && pendingPay)} onClick={() => act(() => post(`/api/gigs/${id}/fund`))}>Fund escrow</button>
            <button className="btn ok" disabled={!(gig.status === "booked" && heldPay && !pendingPay)} onClick={() => act(() => post(`/api/gigs/${id}/complete`))}>Mark completed and pay</button>
            {["open", "booked"].includes(gig.status) && <button className="btn secondary" onClick={recommend}>Suggest musicians (AI)</button>}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Flow: accept applicants, fund the escrow (money is held), then mark completed to release payment.</p>
          {recs && (
            <div style={{ marginTop: ".8rem" }}>
              <h3>Best matches by meaning</h3>
              {recs.length === 0 ? <div className="empty">No matches yet.</div> : (
                <table><tbody>{recs.map((r) => (
                  <tr key={r.user_id}><td><b>{r.name}</b></td><td>{r.experience_level}</td><td>{r.instruments}</td>
                    <td>rating {Number(r.avg_rating).toFixed(1)}</td><td className="muted">match {(r.similarity * 100).toFixed(0)}%</td></tr>
                ))}</tbody></table>
              )}
            </div>
          )}
        </div>
      )}

      {canApply && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); act(() => post(`/api/gigs/${id}/apply`, apply)); }}>
          <h2>Apply for this gig</h2>
          <div className="inline">
            <div style={{ maxWidth: 200 }}><label>Your price (Rs)</label><input type="number" min="1" required value={apply.quoted_price} onChange={(e) => setApply({ ...apply, quoted_price: e.target.value })} /></div>
            <div style={{ flex: 3 }}><label>Why you are a great fit</label><input value={apply.proposal} onChange={(e) => setApply({ ...apply, proposal: e.target.value })} /></div>
            <button className="btn">Send application</button>
          </div>
        </form>
      )}

      <div className="card scroll">
        <h2>{viewer.isPoster || viewer.isAdmin ? "Applications" : "My application"}</h2>
        {applications.length === 0 ? <div className="empty">No applications.</div> : (
          <table>
            <thead><tr><th>Musician</th><th>Rating</th><th>Quote</th><th>Proposal</th><th>Status</th><th></th></tr></thead>
            <tbody>{applications.map((a) => (
              <tr key={a.application_id}>
                <td><b>{a.provider_name}</b></td><td>{Number(a.provider_rating).toFixed(1)}</td><td>{money(a.quoted_price)}</td>
                <td>{a.proposal}</td><td><Badge value={a.application_status} /></td>
                <td className="row">
                  {viewer.isPoster && a.application_status === "pending" && ["open", "booked"].includes(gig.status) && (<>
                    <button className="btn sm ok" onClick={() => act(() => post(`/api/applications/${a.application_id}`, { action: "accept" }))}>Accept</button>
                    <button className="btn sm danger" onClick={() => act(() => post(`/api/applications/${a.application_id}`, { action: "reject" }))}>Reject</button>
                  </>)}
                  {a.provider_id === viewer.id && a.application_status === "pending" && (
                    <button className="btn sm secondary" onClick={() => act(() => post(`/api/applications/${a.application_id}`, { action: "withdraw" }))}>Withdraw</button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {participants.length > 0 && (
        <div className="grid g2">
          <div className="card"><h2>Who is playing</h2>
            <table><tbody>{participants.map((p) => (
              <tr key={p.user_id}><td><b>{p.name}</b></td><td className="muted">{p.role}</td><td>{money(p.agreed_amount)}</td></tr>
            ))}</tbody></table></div>
          <div className="card"><h2>Payments</h2>
            {payments.length === 0 ? <div className="empty">No payments yet.</div> : (
              <table><tbody>{payments.map((p) => (
                <tr key={p.payment_id}><td>to {p.payee_name}</td><td>{money(p.amount)}</td><td><Badge value={p.payment_status} /></td></tr>
              ))}</tbody></table>)}</div>
        </div>
      )}

      {(canDispute || disputes.length > 0) && (
        <div className="card">
          <h2>Disputes</h2>
          {disputes.map((x) => (
            <div key={x.dispute_id} style={{ marginBottom: ".6rem" }}>
              <b>{x.reason}</b> <Badge value={x.dispute_status} /> <span className="small muted">raised by {x.raised_by_name}</span>
              {x.description && <div>{x.description}</div>}
              {x.resolution && <div className="small"><b>Resolution:</b> {x.resolution}</div>}
            </div>
          ))}
          {canDispute && (
            <form onSubmit={(e) => { e.preventDefault(); act(() => post(`/api/gigs/${id}/dispute`, dispute)); }}>
              <div className="inline">
                <div><label>Reason</label><input required value={dispute.reason} onChange={(e) => setDispute({ ...dispute, reason: e.target.value })} /></div>
                <div style={{ flex: 3 }}><label>Details</label><input value={dispute.description} onChange={(e) => setDispute({ ...dispute, description: e.target.value })} /></div>
                <button className="btn danger">Raise dispute</button>
              </div>
            </form>
          )}
        </div>
      )}

      {(gig.status === "completed" || ratings.length > 0) && (
        <div className="card">
          <h2>Ratings</h2>
          {ratings.length === 0 && <div className="empty">No ratings yet.</div>}
          {ratings.map((r, i) => (
            <div key={i} style={{ padding: ".3rem 0" }}><b>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b> {r.rater_name} → {r.ratee_name}
              {r.review && <div className="muted">{r.review}</div>}</div>
          ))}
          {gig.status === "completed" && viewer.isParticipant && (
            <form onSubmit={(e) => { e.preventDefault(); act(() => post(`/api/gigs/${id}/rate`, rate)); }}>
              <div className="inline">
                <div><label>Rate</label>
                  <select required value={rate.ratee_id} onChange={(e) => setRate({ ...rate, ratee_id: e.target.value })}>
                    <option value="">Choose...</option>{rateOptions.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
                  </select></div>
                <div style={{ maxWidth: 110 }}><label>Stars</label>
                  <select value={rate.rating} onChange={(e) => setRate({ ...rate, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></div>
                <div style={{ flex: 3 }}><label>Review</label><input value={rate.review} onChange={(e) => setRate({ ...rate, review: e.target.value })} /></div>
                <button className="btn">Submit</button>
              </div>
            </form>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="card"><h2>History (automatic audit trail)</h2>
          <ul className="timeline">{history.map((h, i) => (
            <li key={i}>{h.old_status ? <><Badge value={h.old_status} /> → </> : null}<Badge value={h.new_status} />
              <span className="small muted"> {h.changed_at}{h.changed_by_name ? ` by ${h.changed_by_name}` : ""}</span></li>
          ))}</ul></div>
      )}
    </>
  );
}
