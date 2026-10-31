import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { handle, json, need } from "@/lib/http";

export const POST = handle(async (req) => {
  const { email, password } = await req.json();
  need(email && password, "Enter your email and password.");
  const rows = await query("SELECT * FROM users WHERE email = ?", [String(email).trim().toLowerCase()]);
  const user = rows[0];
  // Same message whether the email or the password is wrong, so attackers learn nothing.
  const ok = user && (await bcrypt.compare(String(password), user.password_hash));
  need(ok, "Invalid email or password.", 401);
  await createSession(user);
  return json({ ok: true });
});
