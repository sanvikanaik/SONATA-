import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json, need } from "@/lib/http";
import { vectorFetch } from "@/lib/vector";

export const dynamic = "force-dynamic";

// GET /api/search?mode=musicians|gigs|forGig|forMe&q=&level=&maxBudget=&gig_id=
// Semantic (meaning-based) search. The heavy lifting happens in the Python vector service.
export const GET = handle(async (req) => {
  const s = await requireUser();
  const p = new URL(req.url).searchParams;
  const mode = p.get("mode");
  const q = (p.get("q") || "").trim();
  const enc = encodeURIComponent;

  if (mode === "musicians") {
    need(q.length >= 3, "Type at least 3 characters.");
    const level = p.get("level") ? `&level=${enc(p.get("level"))}` : "";
    return json({ results: await vectorFetch(`/search/musicians?q=${enc(q)}&n=6${level}`) });
  }
  if (mode === "gigs") {
    need(q.length >= 3, "Type at least 3 characters.");
    const max = p.get("maxBudget") ? `&max_budget=${Number(p.get("maxBudget"))}` : "";
    return json({ results: await vectorFetch(`/search/gigs?q=${enc(q)}&n=6${max}`) });
  }
  if (mode === "forGig") {
    const id = Number(p.get("gig_id"));
    const [g] = await query("SELECT poster_id FROM gig WHERE gig_id = ?", [id]);
    need(g, "Gig not found.", 404);
    need(g.poster_id === s.id || s.role === "admin", "Only the gig poster can see recommendations.", 403);
    return json({ results: await vectorFetch(`/recommend/musicians/${id}?n=5`) });
  }
  if (mode === "forMe") {
    return json({ results: await vectorFetch(`/recommend/gigs/${s.id}?n=5`) });
  }
  need(false, "Unknown search mode.");
});
