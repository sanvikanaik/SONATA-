import { HttpError } from "./http";

// Talks to the Python/FastAPI vector service. The shared key keeps strangers out of it.
export async function vectorFetch(path, method = "GET") {
  const base = process.env.VECTOR_API_URL;
  const key = process.env.VECTOR_API_KEY;
  if (!base || !key) throw new HttpError(503, "Semantic search is not configured (VECTOR_API_URL / VECTOR_API_KEY).");
  let res;
  try {
    res = await fetch(base + path, {
      method,
      headers: { "X-Service-Key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new HttpError(503, "Semantic search service is not running. Start it from the vector folder: uvicorn api:app --port 8000");
  }
  if (!res.ok) throw new HttpError(502, "Semantic search service returned an error.");
  return res.json();
}

// After a gig is created we refresh the vector index. Failures are ignored on purpose:
// the gig is saved in MySQL either way (MySQL is the source of truth).
export function reindexInBackground() {
  vectorFetch("/reindex", "POST").catch(() => {});
}
