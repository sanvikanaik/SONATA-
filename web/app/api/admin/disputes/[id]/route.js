import { call } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, json, need } from "@/lib/http";

// POST /api/admin/disputes/:id   body: { resolution, refund: true|false }
export const POST = handle(async (req, { params }) => {
  const s = await requireAdmin();
  const { resolution, refund } = await req.json();
  need(String(resolution || "").trim().length >= 3, "Write a short resolution note.");
  // The procedure checks the admin role again inside the database (defence in depth).
  const r = await call("sp_resolve_dispute", [Number(params.id), s.id, String(resolution).trim(), refund ? 1 : 0]);
  return json({ message: r?.[0]?.result });
});
