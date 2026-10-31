"""
SONATA vector search service (FastAPI). The Next.js app calls this over HTTP.

Run:  uvicorn api:app --port 8000
Every route except /health needs the header  X-Service-Key: <VECTOR_API_KEY>

Note: this process owns the Chroma data folder while it runs. To refresh the index
use POST /reindex (the web app does this automatically), not build_index.py.
"""
import hmac
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query

import build_index
import search

@asynccontextmanager
async def lifespan(_app):
    # First start (or empty index): build it from MySQL automatically.
    musicians, gigs = search.get_collections()
    if musicians.count() == 0 or gigs.count() == 0:
        build_index.main()
    yield


app = FastAPI(title="Sonata vector service", lifespan=lifespan)

LEVELS = {"beginner", "intermediate", "advanced", "professional"}


def require_key(x_service_key: str = Header(default="")):
    expected = os.getenv("VECTOR_API_KEY", "")
    if not expected or not hmac.compare_digest(x_service_key, expected):
        raise HTTPException(status_code=401, detail="Invalid service key")


guard = [Depends(require_key)]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/search/musicians", dependencies=guard)
def search_musicians(q: str = Query(..., min_length=3, max_length=300),
                     n: int = Query(5, ge=1, le=20), level: Optional[str] = None):
    if level and level not in LEVELS:
        raise HTTPException(status_code=400, detail="Unknown experience level")
    return search.find_musicians(q, n=n, level=level)


@app.get("/search/gigs", dependencies=guard)
def search_gigs(q: str = Query(..., min_length=3, max_length=300),
                n: int = Query(5, ge=1, le=20), max_budget: Optional[float] = None):
    return search.find_gigs(q, n=n, max_budget=max_budget)


@app.get("/recommend/musicians/{gig_id}", dependencies=guard)
def recommend_musicians(gig_id: int, n: int = Query(5, ge=1, le=20)):
    return search.musicians_for_gig(gig_id, n=n)


@app.get("/recommend/gigs/{user_id}", dependencies=guard)
def recommend_gigs(user_id: int, n: int = Query(5, ge=1, le=20)):
    return search.gigs_for_musician(user_id, n=n)


@app.post("/reindex", dependencies=guard)
def reindex():
    """Refresh the index from MySQL. The web app calls this after a gig is posted."""
    build_index.main()
    return {"status": "reindexed"}
