import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  const s = await requireUser();
  const posted = await query(
    `SELECT g.gig_id, g.title, g.status, g.budget, g.event_date,
            (SELECT COUNT(*) FROM gig_application a WHERE a.gig_id = g.gig_id AND a.application_status = 'pending') AS pending_applications
     FROM gig g WHERE g.poster_id = ? ORDER BY g.created_at DESC`, [s.id]);
  const applied = await query(
    `SELECT a.application_id, a.gig_id, g.title, g.status AS gig_status, a.quoted_price, a.application_status
     FROM gig_application a JOIN gig g ON g.gig_id = a.gig_id
     WHERE a.provider_id = ? ORDER BY a.application_id DESC`, [s.id]);
  const earned = await query("SELECT payment_status, SUM(amount) AS total FROM payment WHERE payee_id = ? GROUP BY payment_status", [s.id]);
  const spent = await query("SELECT payment_status, SUM(amount) AS total FROM payment WHERE payer_id = ? GROUP BY payment_status", [s.id]);
  const [rep] = await query(
    "SELECT fn_avg_rating(?) AS avg_rating, (SELECT COUNT(*) FROM rating WHERE ratee_id = ?) AS reviews", [s.id, s.id]);
  return json({ user: s, posted, applied, earned, spent, reputation: rep });
});
