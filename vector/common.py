"""
Shared helpers for the SONATA vector search layer.

Architecture:  MySQL = source of truth.  Chroma = semantic index.
Chroma stores only (id, embedding, document text, small metadata).
After a vector search we go back to MySQL by id to get fresh details.
"""
import os
from functools import lru_cache

import chromadb
import pymysql
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

load_dotenv()  # reads vector/.env  (credentials are NOT hard-coded)

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_data")


def get_db():
    """New MySQL connection from environment variables."""
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "gig_marketplace"),
        cursorclass=pymysql.cursors.DictCursor,
    )


@lru_cache(maxsize=1)
def get_embedder():
    """
    all-MiniLM-L6-v2: a small sentence-embedding model (384 dimensions) that
    runs locally on CPU through ONNX. The ~80 MB model file is downloaded
    automatically the first time it is used.
    """
    return embedding_functions.DefaultEmbeddingFunction()


@lru_cache(maxsize=1)
def get_collections():
    """Open (or create) the two Chroma collections, using cosine distance."""
    ef = get_embedder()
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    musicians = client.get_or_create_collection(
        "musicians", embedding_function=ef, metadata={"hnsw:space": "cosine"}
    )
    gigs = client.get_or_create_collection(
        "gigs", embedding_function=ef, metadata={"hnsw:space": "cosine"}
    )
    return musicians, gigs


# ---------------------------------------------------------------------
# Turn a database row into the text that gets embedded
# ---------------------------------------------------------------------
def musician_document(r):
    parts = [
        f"{r['name']}. {r['experience_level']} musician with {r['years_experience']} years of experience."
    ]
    if r.get("instruments"):
        parts.append(f"Plays: {r['instruments']}.")
    if r.get("genres"):
        parts.append(f"Genres: {r['genres']}.")
    if r.get("bio"):
        parts.append(r["bio"])
    return " ".join(parts)


def gig_document(r):
    where = r.get("venue_name") or "venue to be decided"
    kind = f" ({r['venue_type']})" if r.get("venue_type") else ""
    parts = [f"{r['title']}. {r['gig_type']} event at {where}{kind}."]
    if r.get("description"):
        parts.append(r["description"])
    return " ".join(parts)
