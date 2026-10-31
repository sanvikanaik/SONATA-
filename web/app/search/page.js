"use client";
import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/Badge";
import { api, fmtDate, money } from "@/lib/client";

const TABS = [
  { key: "musicians", label: "Find musicians", hint: "e.g. smooth relaxed music for a fancy dinner" },
  { key: "gigs", label: "Find gigs", hint: "e.g. acoustic singer for a small chilled evening" },
  { key: "forMe", label: "Gigs for me", hint: "" },
];

export default function Search() {
  const [tab, setTab] = useState("musicians");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [results, setResults] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(e, mode = tab) {
    e?.preventDefault();
    setBusy(true); setErr(""); setResults(null);
    const p = new URLSearchParams({ mode, q });
    if (level) p.set("level", level);
    if (maxBudget) p.set("maxBudget", maxBudget);
    try { setResults((await api(`/api/search?${p}`)).results); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const t = TABS.find((x) => x.key === tab);

  return (
    <>
      <h1>Smart search</h1>
      <p className="muted">Describe what you want in your own words. Results are matched by meaning (vector similarity), not just keywords.</p>
      <div className="tabs">
        {TABS.map((x) => (
          <button key={x.key} className={`tab ${tab === x.key ? "on" : ""}`}
            onClick={() => { setTab(x.key); setResults(null); setErr(""); if (x.key === "forMe") run(null, "forMe"); }}>{x.label}</button>
        ))}
      </div>

      {tab !== "forMe" && (
        <form className="card" onSubmit={run}>
          <div className="inline">
            <div style={{ flex: 3 }}><label>What are you looking for?</label><input required minLength={3} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.hint} /></div>
            {tab === "musicians" && <div><label>Experience</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}><option value="">Any</option>
                {["beginner", "intermediate", "advanced", "professional"].map((l) => <option key={l}>{l}</option>)}</select></div>}
            {tab === "gigs" && <div><label>Max budget (Rs)</label><input type="number" min="0" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} /></div>}
            <button className="btn" disabled={busy}>{busy ? "Searching..." : "Search"}</button>
          </div>
        </form>
      )}
      {tab === "forMe" && busy && <p className="muted">Finding gigs that match your profile...</p>}

      {err && <div className="alert error">{err}</div>}
      {results && (
        <div className="card scroll">
          {results.length === 0 ? <div className="empty">{tab === "forMe" ? "No matches. Add a musician bio to your profile to get recommendations." : "No matches."}</div> : tab === "musicians" ? (
            <table><thead><tr><th>Musician</th><th>Level</th><th>Plays</th><th>Rating</th><th>Match</th></tr></thead>
              <tbody>{results.map((r) => (<tr key={r.user_id}><td><b>{r.name}</b></td><td>{r.experience_level}</td><td>{r.instruments}</td>
                <td>{Number(r.avg_rating).toFixed(1)}</td><td>{(r.similarity * 100).toFixed(0)}%</td></tr>))}</tbody></table>
          ) : (
            <table><thead><tr><th>Gig</th><th>Date</th><th>Budget</th><th>Status</th><th>Match</th></tr></thead>
              <tbody>{results.map((r) => (<tr key={r.gig_id}><td><Link href={`/gigs/${r.gig_id}`}><b>{r.title}</b></Link><div className="small muted">{r.venue_name}</div></td>
                <td>{fmtDate(r.event_date)}</td><td>{money(r.budget)}</td><td><Badge value={r.status} /></td><td>{(r.similarity * 100).toFixed(0)}%</td></tr>))}</tbody></table>
          )}
        </div>
      )}
    </>
  );
}
