import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireUser();
  return json({ venues: await query("SELECT venue_id, venue_name, location, capacity, venue_type FROM venue ORDER BY venue_name") });
});
