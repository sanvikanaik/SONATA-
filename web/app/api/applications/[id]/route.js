import { query, call } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json, need } from "@/lib/http";

// POST /api/applications/:id   body: { action: "accept" | "reject" | "withdraw" }
export const POST = handle(async (req, { params }) => {
  const s = await requireUser();
  const id = Number(params.id);
  const { action } = await req.json();

  if (action === "accept") {
    // one transaction: application -> accepted, participants added, payment created, gig booked
    const r = await call("sp_accept_application", [id, s.id]);
    return json({ message: r?.[0]?.result });
  }
  if (action === "reject") {
    const r = await query(
      `UPDATE gig_application a JOIN gig g ON g.gig_id = a.gig_id
       SET a.application_status = 'rejected'
       WHERE a.application_id = ? AND g.poster_id = ? AND a.application_status = 'pending'`, [id, s.id]);
    need(r.affectedRows > 0, "Nothing to reject (not your gig, or already handled).", 400);
    return json({ message: "Application rejected." });
  }
  if (action === "withdraw") {
    const r = await query(
      `UPDATE gig_application SET application_status = 'withdrawn'
       WHERE application_id = ? AND provider_id = ? AND application_status = 'pending'`, [id, s.id]);
    need(r.affectedRows > 0, "Nothing to withdraw (not yours, or already handled).", 400);
    return json({ message: "Application withdrawn." });
  }
  need(false, "Unknown action.", 400);
});
