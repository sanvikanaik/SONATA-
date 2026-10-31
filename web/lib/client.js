// Tiny fetch helper for the pages: returns JSON or throws an Error with the server's message.
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const money = (n) => "Rs " + Number(n || 0).toLocaleString("en-IN");
export const fmtDate = (s) => (s ? String(s).slice(0, 10) : "");
export const fmtTime = (s) => (s ? String(s).slice(0, 5) : "");
