# SONATA: Music Gig Booking and Management System

Requesters post gigs, musicians apply, the requester books them and pays through an escrow
flow (pending -> held -> released), and both sides rate each other. Admins resolve disputes.

**Team:** Sanvika M Naik (PES1UG24AM253), Sanika V Patil (PES1UG24AM248)

## Architecture

```
Browser --> Next.js (pages + /api routes) --> MySQL 8        (source of truth)
                     |
                     +--> FastAPI vector service --> Chroma  (semantic search index)
                                   |
                                   +--> reads MySQL to build / refresh the index
```

| Part | Where | What it does |
|---|---|---|
| Relational DB | `01_schema.sql` ... `04_advanced.sql` | 14 tables, constraints, indexes, triggers, procedures, views |
| Vector DB | `vector/` | Chroma + all-MiniLM-L6-v2 embeddings, FastAPI wrapper |
| Web app | `web/` | Next.js 14 (App Router): login, roles, gigs, escrow, disputes, search |

## Setup (Windows)

Needs: MySQL 8, Node.js 18.17+, Python 3.9+.

**1. Database** (inside the `mysql>` prompt; use your own folder path)
```sql
SOURCE C:/Users/<you>/SONATA/01_schema.sql;
SOURCE C:/Users/<you>/SONATA/02_seed.sql;
SOURCE C:/Users/<you>/SONATA/04_advanced.sql;
```
(`03_queries.sql` is optional: example SELECT and DML statements.)

**2. Vector service**
```
cd vector
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
notepad .env
uvicorn api:app --port 8000
```
Fill in your MySQL password and a `VECTOR_API_KEY` of your choice. The first start downloads the
embedding model (~80 MB) and builds the index automatically.

**3. Web app** (new terminal)
```
cd web
copy .env.example .env.local
notepad .env.local
npm install
npm run dev
```
Use the same `VECTOR_API_KEY` here, and set `AUTH_SECRET` to any random 32+ character string.
Open http://localhost:3000

## Demo accounts (password for all: `Sonata@123`)

| Email | Role |
|---|---|
| admin@sonata.app | admin |
| ananya@sonata.app | requester |
| rohan@sonata.app | provider |
| karthik@sonata.app, vikram@sonata.app | both |

## Security notes
- Passwords are stored as bcrypt hashes. Sessions are signed tokens in httpOnly cookies.
- Every SQL statement uses parameter placeholders (no string concatenation), so SQL injection is blocked.
- Roles are enforced on the server (API routes + route middleware) and again inside the database
  (`sp_resolve_dispute` checks `app_role`). Nobody can register as admin.
- Secrets live in `.env` / `.env.local`, which are git-ignored. Only the `.env.example` files are committed.
- The vector service requires a shared key header, so it cannot be called directly by strangers.

## Database features (for the viva)
- **Triggers:** audit trail of every gig status change; blocks applying to own/closed gigs; ratings only after completion by participants.
- **Stored procedures + transactions:** accept application, fund escrow, complete gig, raise dispute, resolve dispute. All-or-nothing with rollback.
- **Functions:** `fn_avg_rating`, `fn_gig_committed`.
- **Views:** `v_public_users` (no password hash), `v_open_gigs`, `v_provider_leaderboard`, `v_gig_finance`, `v_open_disputes`.
- **Indexes:** composite and FULLTEXT (`ft_gig_search`, `ft_profile_bio`).
