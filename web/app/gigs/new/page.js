"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function NewGig() {
  const router = useRouter();
  const [venues, setVenues] = useState([]);
  const [f, setF] = useState({ title: "", gig_type: "", venue_id: "", event_date: "", start_time: "18:00", end_time: "21:00", budget: "", description: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { api("/api/venues").then((d) => setVenues(d.venues)).catch(() => {}); }, []);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await api("/api/gigs", { method: "POST", body: { ...f, venue_id: f.venue_id || null } });
      router.push(`/gigs/${r.gig_id}`);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Post a gig</h1>
      <form className="card" onSubmit={submit}>
        {err && <div className="alert error">{err}</div>}
        <label>Title</label><input required value={f.title} onChange={set("title")} placeholder="Wedding sangeet band" />
        <div className="inline">
          <div><label>Gig type</label><input required value={f.gig_type} onChange={set("gig_type")} placeholder="wedding, cafe gig, corporate..." /></div>
          <div><label>Venue</label>
            <select value={f.venue_id} onChange={set("venue_id")}>
              <option value="">To be decided</option>
              {venues.map((v) => <option key={v.venue_id} value={v.venue_id}>{v.venue_name} ({v.location})</option>)}
            </select></div>
        </div>
        <div className="inline">
          <div><label>Date</label><input type="date" required value={f.event_date} onChange={set("event_date")} /></div>
          <div><label>Start</label><input type="time" required value={f.start_time} onChange={set("start_time")} /></div>
          <div><label>End</label><input type="time" required value={f.end_time} onChange={set("end_time")} /></div>
          <div><label>Total budget (Rs)</label><input type="number" min="1" required value={f.budget} onChange={set("budget")} /></div>
        </div>
        <label>Description</label>
        <textarea value={f.description} onChange={set("description")} placeholder="Describe the event, the vibe, instruments you need..." />
        <p><button className="btn" disabled={busy}>{busy ? "Posting..." : "Post gig"}</button></p>
      </form>
    </div>
  );
}
