import { clearSession } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const POST = handle(async () => {
  clearSession();
  return json({ ok: true });
});
