import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const json = (data, status = 200) => NextResponse.json(data, { status });

// Turns any error into a clean JSON response. Business-rule messages that come
// from MySQL triggers/procedures (SQLSTATE 45000) are safe to show to the user.
export function fail(err) {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  if (err?.sqlState === "45000") return json({ error: err.sqlMessage }, 400);
  if (err?.errno === 3819) return json({ error: "Rejected by a database rule: " + (err.sqlMessage || "invalid value") }, 400);
  if (err?.code === "ER_DUP_ENTRY") return json({ error: "That record already exists." }, 409);
  if (err?.code === "ER_NO_REFERENCED_ROW_2") return json({ error: "A referenced record does not exist." }, 400);
  console.error(err);
  return json({ error: "Something went wrong on the server." }, 500);
}

// Small helper: wrap a handler so every route gets the same error handling.
export const handle = (fn) => async (req, ctx) => {
  try {
    return await fn(req, ctx);
  } catch (e) {
    return fail(e);
  }
};

export function need(cond, message, status = 400) {
  if (!cond) throw new HttpError(status, message);
}
