import { query, call } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json, need } from "@/lib/http";

// POST /api/gigs/:id/apply | fund | complete | dispute | rate
// The money and status logic lives in MySQL stored procedures (transactions + triggers);
// this route only checks the input and forwards it.
export const POST = handle(async (req, { params }) => {
  const s = await requireUser();
  const id = Number(params.id);
  const b = await req.json().catch(() => ({}));

  switch (params.action) {
    case "apply": {
      need(s.type !== "requester", "Requester-only accounts cannot apply to gigs.", 403);
      const price = Number(b.quoted_price);
      need(Number.isFinite(price) && price > 0, "Enter a price greater than 0.");
      await query("INSERT INTO gig_application (gig_id, provider_id, proposal, quoted_price) VALUES (?,?,?,?)",
        [id, s.id, String(b.proposal || "").trim() || null, price]); // trigger blocks own/closed gigs
      return json({ message: "Application sent." }, 201);
    }
    case "fund": {
      const r = await call("sp_fund_gig", [id, s.id]);
      return json({ message: r?.[0]?.result });
    }
    case "complete": {
      const r = await call("sp_complete_gig", [id, s.id]);
      return json({ message: r?.[0]?.result });
    }
    case "dispute": {
      const reason = String(b.reason || "").trim();
      need(reason.length >= 3 && reason.length <= 150, "Give a short reason (3 to 150 characters).");
      await call("sp_raise_dispute", [id, s.id, reason, String(b.description || "").trim() || null]);
      return json({ message: "Dispute raised. An admin will review it." }, 201);
    }
    case "rate": {
      const rating = Number(b.rating);
      need(Number.isInteger(rating) && rating >= 1 && rating <= 5, "Rating must be 1 to 5.");
      need(Number(b.ratee_id), "Choose who you are rating.");
      await query("INSERT INTO rating (gig_id, rater_id, ratee_id, rating, review) VALUES (?,?,?,?,?)",
        [id, s.id, Number(b.ratee_id), rating, String(b.review || "").trim() || null]);
      return json({ message: "Thanks for your rating." }, 201);
    }
    default:
      need(false, "Unknown action.", 404);
  }
});
