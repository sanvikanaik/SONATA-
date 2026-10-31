import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { handle, json, need } from "@/lib/http";

export const POST = handle(async (req) => {
  const b = await req.json();
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const phone = String(b.phone || "").trim() || null;
  const type = b.user_type;
  const bio = String(b.bio || "").trim();

  need(name.length >= 2 && name.length <= 100, "Name must be 2 to 100 characters.");
  need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), "Enter a valid email address.");
  need(password.length >= 8, "Password must be at least 8 characters.");
  need(["requester", "provider", "both"].includes(type), "Choose an account type.");

  const hash = await bcrypt.hash(password, 10); // never store the plain password

  // app_role is NOT taken from the form: nobody can sign up as admin.
  const conn = await pool.getConnection();
  let userId;
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      "INSERT INTO users (name, email, password_hash, phone, user_type) VALUES (?,?,?,?,?)",
      [name, email, hash, phone, type]
    );
    userId = r.insertId;
    if (type !== "requester" && bio) {
      await conn.query("INSERT INTO musician_profile (user_id, bio) VALUES (?,?)", [userId, bio]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  await createSession({ user_id: userId, name, app_role: "user", user_type: type });
  return json({ ok: true }, 201);
});
