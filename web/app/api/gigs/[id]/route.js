import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json, need } from "@/lib/http";

export const dynamic = "force-dynamic";

// Everything the gig page needs, filtered by WHO is looking.
export const GET = handle(async (req, { params }) => {
  const s = await requireUser();
  const id = Number(params.id);
  const [gig] = await query(
    `SELECT g.*, v.venue_name, v.location, v.venue_type, u.name AS poster_name
     FROM gig g JOIN users u ON u.user_id = g.poster_id
     LEFT JOIN venue v ON v.venue_id = g.venue_id WHERE g.gig_id = ?`, [id]);
  need(gig, "Gig not found.", 404);

  const isPoster = gig.poster_id === s.id;
  const isAdmin = s.role === "admin";
  const [{ c }] = await query("SELECT COUNT(*) AS c FROM gig_participant WHERE gig_id = ? AND user_id = ?", [id, s.id]);
  const isParticipant = c > 0;
  const inside = isPoster || isAdmin || isParticipant;

  const appSql = `SELECT a.*, u.name AS provider_name, fn_avg_rating(a.provider_id) AS provider_rating
                  FROM gig_application a JOIN users u ON u.user_id = a.provider_id
                  WHERE a.gig_id = ?`;
  // The poster/admin sees every application; everyone else only their own.
  const applications = isPoster || isAdmin
    ? await query(appSql + " ORDER BY a.application_id", [id])
    : await query(appSql + " AND a.provider_id = ? ORDER BY a.application_id", [id, s.id]);

  const participants = inside ? await query(
    `SELECT gp.user_id, gp.role, gp.agreed_amount, u.name FROM gig_participant gp
     JOIN users u ON u.user_id = gp.user_id WHERE gp.gig_id = ? ORDER BY gp.role DESC, u.name`, [id]) : [];
  const payments = inside ? await query(
    `SELECT p.payment_id, p.amount, p.payment_status, payee.name AS payee_name
     FROM payment p JOIN users payee ON payee.user_id = p.payee_id WHERE p.gig_id = ?`, [id]) : [];
  const history = inside ? await query(
    `SELECT h.old_status, h.new_status, h.changed_at, h.remarks, u.name AS changed_by_name
     FROM gig_status_history h LEFT JOIN users u ON u.user_id = h.changed_by
     WHERE h.gig_id = ? ORDER BY h.history_id`, [id]) : [];
  const disputes = inside ? await query(
    `SELECT d.dispute_id, d.reason, d.description, d.dispute_status, d.resolution, d.created_at, u.name AS raised_by_name
     FROM dispute d JOIN users u ON u.user_id = d.raised_by WHERE d.gig_id = ?`, [id]) : [];
  const ratings = await query(
    `SELECT r.rating, r.review, a.name AS rater_name, b.name AS ratee_name
     FROM rating r JOIN users a ON a.user_id = r.rater_id JOIN users b ON b.user_id = r.ratee_id
     WHERE r.gig_id = ?`, [id]);

  return json({
    gig, viewer: { id: s.id, type: s.type, isPoster, isAdmin, isParticipant },
    applications, participants, payments, history, disputes, ratings,
  });
});
