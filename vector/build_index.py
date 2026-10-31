"""
Build / refresh the vector index from MySQL.
Run it any time data changes:   python build_index.py
It UPSERTS (insert or update by id) and removes vectors whose rows were deleted.
"""
from common import get_collections, get_db, gig_document, musician_document

MUSICIANS_SQL = """
SELECT u.user_id, u.name, mp.bio, mp.experience_level, mp.years_experience,
  (SELECT GROUP_CONCAT(CONCAT(i.instrument_name, ' (', ui.skill_level, ')') SEPARATOR ', ')
     FROM user_instrument ui JOIN instrument i ON i.instrument_id = ui.instrument_id
    WHERE ui.user_id = u.user_id) AS instruments,
  (SELECT GROUP_CONCAT(g.genre_name SEPARATOR ', ')
     FROM user_genre ug JOIN genre g ON g.genre_id = ug.genre_id
    WHERE ug.user_id = u.user_id) AS genres
FROM users u
JOIN musician_profile mp ON mp.user_id = u.user_id
"""

GIGS_SQL = """
SELECT g.gig_id, g.poster_id, g.title, g.description, g.gig_type, g.status,
       g.budget, g.event_date, v.venue_name, v.venue_type
FROM gig g
LEFT JOIN venue v ON v.venue_id = g.venue_id
"""


def sync(collection, ids, docs, metas):
    """Upsert everything, then delete vectors that no longer exist in MySQL."""
    if ids:
        collection.upsert(ids=ids, documents=docs, metadatas=metas)
    stale = set(collection.get()["ids"]) - set(ids)
    if stale:
        collection.delete(ids=list(stale))
    return len(ids), len(stale)


def main():
    musicians, gigs = get_collections()
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(MUSICIANS_SQL)
        m_rows = cur.fetchall()
        cur.execute(GIGS_SQL)
        g_rows = cur.fetchall()
    conn.close()

    m_ids = [str(r["user_id"]) for r in m_rows]
    m_docs = [musician_document(r) for r in m_rows]
    m_meta = [
        {
            "user_id": r["user_id"],
            "experience_level": r["experience_level"],
            "years_experience": float(r["years_experience"] or 0),
        }
        for r in m_rows
    ]

    g_ids = [str(r["gig_id"]) for r in g_rows]
    g_docs = [gig_document(r) for r in g_rows]
    g_meta = [
        {
            "gig_id": r["gig_id"],
            "poster_id": r["poster_id"],
            "status": r["status"],
            "gig_type": r["gig_type"],
            "budget": float(r["budget"]),
            "event_ymd": int(r["event_date"].strftime("%Y%m%d")),
        }
        for r in g_rows
    ]

    n, stale = sync(musicians, m_ids, m_docs, m_meta)
    print(f"musicians: {n} indexed, {stale} stale removed")
    n, stale = sync(gigs, g_ids, g_docs, g_meta)
    print(f"gigs:      {n} indexed, {stale} stale removed")


if __name__ == "__main__":
    main()
