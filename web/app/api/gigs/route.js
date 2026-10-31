import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json, need } from "@/lib/http";
import { reindexInBackground } from "@/lib/vector";

export const dynamic = "force-dynamic";

// GET /api/gigs?q=&status=&type=&minBudget=&maxBudget=
export const GET = handle(async (req) => {
  await requireUser();
  const p = new URL(req.url).searchParams;
  const selectParams = [];
  const where = [];
  const whereParams = [];
  let select = "";
  let order = "g.event_date, g.gig_id";

  const status = p.get("status") || "open";
  if (status !== "all") { where.push("g.status = ?"); whereParams.push(status); }
  if (p.get("type")) { where.push("g.gig_type = ?"); whereParams.push(p.get("type")); }
  if (p.get("minBudget")) { where.push("g.budget >= ?"); whereParams.push(Number(p.get("minBudget"))); }
  if (p.get("maxBudget")) { where.push("g.budget <= ?"); whereParams.push(Number(p.get("maxBudget"))); }

  const q = (p.get("q") || "").trim();
  if (q.length >= 3) {
    // MySQL FULLTEXT index (ft_gig_search) ranks by relevance
    select = ", MATCH(g.title, g.description) AGAINST (? IN NATURAL LANGUAGE MODE) AS relevance";
    selectParams.push(q);
    where.push("MATCH(g.title, g.description) AGAINST (? IN NATURAL LANGUAGE MODE)");
    whereParams.push(q);
    order = "relevance DESC";
  } else if (q.length > 0) {
    where.push("(g.title LIKE ? OR g.description LIKE ?)");
    whereParams.push(`%${q}%`, `%${q}%`);
  }

  const sql = `
    SELECT g.gig_id, g.title, g.gig_type, g.event_date, g.start_time, g.end_time, g.budget, g.status,
           v.venue_name, u.name AS poster_name,
           (SELECT COUNT(*) FROM gig_application a
             WHERE a.gig_id = g.gig_id AND a.application_status = 'pending') AS pending_applications
           ${select}
    FROM gig g
    JOIN users u ON u.user_id = g.poster_id
    LEFT JOIN venue v ON v.venue_id = g.venue_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY ${order}`;
  const gigs = await query(sql, [...selectParams, ...whereParams]);
  const types = (await query("SELECT DISTINCT gig_type FROM gig ORDER BY gig_type")).map((r) => r.gig_type);
  return json({ gigs, types });
});

export const POST = handle(async (req) => {
  const s = await requireUser();
  need(s.type !== "provider", "Provider-only accounts cannot post gigs.", 403);
  const b = await req.json();
  const title = String(b.title || "").trim();
  const gigType = String(b.gig_type || "").trim();
  const budget = Number(b.budget);

  need(title.length >= 3 && title.length <= 150, "Title must be 3 to 150 characters.");
  need(gigType.length >= 2 && gigType.length <= 80, "Enter a gig type (for example wedding, cafe gig).");
  need(/^\d{4}-\d{2}-\d{2}$/.test(b.event_date || ""), "Choose an event date.");
  need(b.start_time && b.end_time, "Enter a start and end time.");
  need(Number.isFinite(budget) && budget > 0, "Budget must be greater than 0.");

  // The database enforces the rest (end_time > start_time, budget > 0) with CHECK constraints.
  const r = await query(
    `INSERT INTO gig (poster_id, venue_id, title, description, gig_type, event_date, start_time, end_time, budget)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [s.id, b.venue_id || null, title, String(b.description || "").trim() || null, gigType,
     b.event_date, b.start_time, b.end_time, budget]
  );
  reindexInBackground();
  return json({ gig_id: r.insertId }, 201);
});
