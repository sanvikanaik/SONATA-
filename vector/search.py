"""
Semantic search functions (the FastAPI layer in the next step will call these).

Hybrid retrieval = vector similarity (meaning)  +  metadata filter (hard rules)
then fresh details are loaded from MySQL by id.
"""
from common import get_collections, get_db


def _similarity(distance):
    # cosine distance -> similarity in [0, 1]; higher = more similar
    return round(1 - distance, 3)


def _query(collection, text, n, where=None):
    res = collection.query(query_texts=[text], n_results=n, where=where)
    return list(zip(res["ids"][0], res["distances"][0]))


def _fetch(sql, ids):
    if not ids:
        return {}
    marks = ",".join(["%s"] * len(ids))
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(sql.format(marks=marks), ids)
        rows = cur.fetchall()
    conn.close()
    return {str(next(iter(r.values()))): r for r in rows}  # keyed by first column (the id)


MUSICIAN_SQL = """
SELECT u.user_id, u.name, mp.experience_level,
       fn_avg_rating(u.user_id) AS avg_rating,
       (SELECT GROUP_CONCAT(i.instrument_name SEPARATOR ', ')
          FROM user_instrument ui JOIN instrument i ON i.instrument_id = ui.instrument_id
         WHERE ui.user_id = u.user_id) AS instruments
FROM users u JOIN musician_profile mp ON mp.user_id = u.user_id
WHERE u.user_id IN ({marks})
"""

GIG_SQL = """
SELECT g.gig_id, g.title, g.gig_type, g.status, g.budget, g.event_date, v.venue_name
FROM gig g LEFT JOIN venue v ON v.venue_id = g.venue_id
WHERE g.gig_id IN ({marks})
"""


def _musicians_result(hits):
    rows = _fetch(MUSICIAN_SQL, [h[0] for h in hits])
    out = []
    for id_, dist in hits:
        if id_ in rows:
            out.append({**rows[id_], "similarity": _similarity(dist)})
    return out


def _gigs_result(hits):
    rows = _fetch(GIG_SQL, [h[0] for h in hits])
    out = []
    for id_, dist in hits:
        if id_ in rows:
            out.append({**rows[id_], "similarity": _similarity(dist)})
    return out


def find_musicians(text, n=5, level=None):
    """Free-text search:  'someone for a mellow rooftop dinner'."""
    musicians, _ = get_collections()
    where = {"experience_level": level} if level else None
    return _musicians_result(_query(musicians, text, n, where))


def find_gigs(text, n=5, max_budget=None):
    """Free-text search over OPEN gigs only, optionally under a budget."""
    _, gigs = get_collections()
    conds = [{"status": "open"}]
    if max_budget is not None:
        conds.append({"budget": {"$lte": float(max_budget)}})
    where = conds[0] if len(conds) == 1 else {"$and": conds}
    return _gigs_result(_query(gigs, text, n, where))


def musicians_for_gig(gig_id, n=5):
    """Recommend musicians for a gig: the gig's own text is the query."""
    musicians, gigs = get_collections()
    got = gigs.get(ids=[str(gig_id)], include=["documents", "metadatas"])
    if not got["ids"]:
        return []
    poster = got["metadatas"][0]["poster_id"]
    where = {"user_id": {"$ne": poster}}  # the poster can't be recommended to their own gig
    return _musicians_result(_query(musicians, got["documents"][0], n, where))


def gigs_for_musician(user_id, n=5):
    """Recommend open gigs for a musician: their profile text is the query."""
    musicians, gigs = get_collections()
    got = musicians.get(ids=[str(user_id)], include=["documents"])
    if not got["ids"]:
        return []
    where = {"$and": [{"status": "open"}, {"poster_id": {"$ne": int(user_id)}}]}
    return _gigs_result(_query(gigs, got["documents"][0], n, where))
