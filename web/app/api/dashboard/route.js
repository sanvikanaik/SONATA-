import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  const s = await requireUser();
  const byStatus = await query("SELECT status, COUNT(*) AS total FROM gig GROUP BY status ORDER BY total DESC");
  const [totals] = await query(
    `SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM gig) AS gigs,
            (SELECT COALESCE(SUM(amount),0) FROM payment WHERE payment_status = 'released') AS paid_out,
            (SELECT COALESCE(ROUND(AVG(rating),2),0) FROM rating) AS avg_rating,
            (SELECT COUNT(*) FROM dispute WHERE dispute_status IN ('open','under_review')) AS open_disputes`);
  const leaderboard = await query(
    "SELECT * FROM v_provider_leaderboard WHERE review_count > 0 ORDER BY avg_rating DESC, total_earned DESC LIMIT 5");
  const upcoming = await query("SELECT * FROM v_open_gigs ORDER BY event_date LIMIT 5");
  const activity = await query(
    `SELECT h.changed_at, h.new_status, h.remarks, g.gig_id, g.title
     FROM gig_status_history h JOIN gig g ON g.gig_id = h.gig_id ORDER BY h.history_id DESC LIMIT 8`);
  return json({ viewer: s, byStatus, totals, leaderboard, upcoming, activity });
});
