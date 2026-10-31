import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireAdmin(); // 403 for everyone who is not an admin
  const disputes = await query(
    `SELECT d.dispute_id, d.gig_id, g.title AS gig_title, u.name AS raised_by, d.reason, d.description,
            d.dispute_status, d.resolution, d.created_at, DATEDIFF(NOW(), d.created_at) AS days_open
     FROM dispute d JOIN gig g ON g.gig_id = d.gig_id JOIN users u ON u.user_id = d.raised_by
     ORDER BY (d.dispute_status IN ('open','under_review')) DESC, d.created_at DESC`);
  const finance = await query("SELECT * FROM v_gig_finance ORDER BY gig_id");
  const users = await query("SELECT * FROM v_public_users ORDER BY user_id"); // view hides password hashes
  return json({ disputes, finance, users });
});
