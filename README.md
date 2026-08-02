<div align="center">

# ChamaLedger

**Savings, loans, and M-Pesa reconciliation for women's Chama & Sacco groups.**

Flask · SQLAlchemy · JWT &nbsp;—&nbsp; React 19 · Vite · Tailwind v4 · Framer Motion

[Quick Start](#quick-start) · [Features](#features) · [Screenshots](#screenshots) · [Full Documentation](./DOCUMENTATION.md)

</div>

---

## What is ChamaLedger?

A **Chama** (Swahili for "group") is an informal savings circle — most often run by women — where members
contribute a fixed amount on a schedule into a shared pool, and can borrow against it. A **Sacco** is the
formalized, registered version of the same idea. Both are run today on paper ledgers, WhatsApp, and manual
M-Pesa statement reading.

ChamaLedger digitizes that workflow: members see their standing at a glance, treasurers record contributions
and loans without a spreadsheet, and M-Pesa statements reconcile against members automatically instead of by
hand.

This repo contains both halves of the app:

| | |
|---|---|
| **`backend/`** | A Flask + SQLAlchemy REST API — auth, groups, cycles, contributions, loans, and M-Pesa reconciliation. |
| **`frontend/`** | A React SPA — dashboard, cycle detail, members, loans, and reconciliation screens, talking to the API above. |

For the full architecture, API reference, data model, and page-by-page walkthrough, see
**[DOCUMENTATION.md](./DOCUMENTATION.md)**. This README is the fast path to running it.

---

## Features

- 🔐 **Phone + password auth** with JWT, role-aware from the token (`treasurer` vs `member`)
- 👥 **One group, one circle** — register a new group as its treasurer, or join an existing one with its Group ID
- 💰 **Cycle-based contributions** — open a cycle, track who's paid/partial/unpaid, close it when done
- 🤝 **Loans with simple interest** — issue, repay, auto-clear on full repayment, remaining-balance tracking
- 🔁 **M-Pesa statement reconciliation** — upload a CSV export, payments auto-match to members by phone number,
  anything uncertain is flagged instead of silently guessed
- 🎨 **A dashboard that doesn't feel like a bank** — glass-panel bento grid, a "chama circle" gauge for
  collection health, cascading Framer Motion entrances, full `prefers-reduced-motion` support

---

## Screenshots

<table>
<tr>
<td width="50%"><img src="docs/screenshots/login.png" alt="Login and account creation" /><br/><sub align="center">Login / create-account with create-group vs. join-group flow</sub></td>
<td width="50%"><img src="docs/screenshots/dashboard.png" alt="Dashboard" /><br/><sub>Dashboard — this cycle's contribution, outstanding loan, group pool</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/cycle-detail.png" alt="Cycle detail" /><br/><sub>Cycle detail — financial summary and member-by-member breakdown</sub></td>
<td width="50%"><img src="docs/screenshots/members.png" alt="Members" /><br/><sub>Members — invite by Group ID, manage roles and status</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/loans.png" alt="Loans" /><br/><sub>Loans — issue, track, and repay</sub></td>
<td width="50%"><img src="docs/screenshots/reconcile.png" alt="Reconcile" /><br/><sub>Reconcile — upload an M-Pesa statement, review unmatched rows</sub></td>
</tr>
</table>

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+ and npm
- SQLite (bundled with Python) for local dev, or PostgreSQL for anything closer to production

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # if you don't have one yet — see below for the variables
flask db upgrade                  # creates the schema
python seed.py                    # optional: sample group, members, cycle, and mock M-Pesa statement

flask run                         # → http://localhost:5000
```

**`backend/.env`**
```bash
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me-too
DATABASE_URL=sqlite:///chamaledger.db     # or postgresql://user:pass@host:5432/chamaledger
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

### 2. Frontend

```bash
cd frontend
npm install

cp .env.example .env              # VITE_API_URL=http://localhost:5000

npm run dev                       # → http://localhost:5173
```

Open `http://localhost:5173`, create an account (which also creates your group as its first treasurer), and
you're in. Share the Group ID shown on the **Members** page for anyone else to join.

### 3. Run the test suite

```bash
cd backend
pytest
```

---

## Project layout

```
chamaledger/
├── backend/            Flask API — see DOCUMENTATION.md § Backend
│   ├── app/
│   │   ├── api/v1/     Route blueprints (auth, groups, cycles, contributions, loans, reconcile)
│   │   ├── models/     SQLAlchemy models + enums
│   │   ├── services/   Business logic (loan eligibility, M-Pesa matching)
│   │   ├── schemas/    Pydantic request/response contracts
│   │   └── core/       Shared utilities (phone normalization, role decorators)
│   ├── migrations/     Alembic migrations
│   └── seed.py         Sample data for local development
│
└── frontend/            React SPA — see DOCUMENTATION.md § Frontend
    └── src/
        ├── pages/       One file per screen (Dashboard, Loans, Members, …)
        ├── components/  Shared UI (GlassCard, StatusChip, Table) and layout (Navbar, AppLayout)
        ├── hooks/       Data-fetching hooks, one per backend resource
        ├── services/    api.js — the single place that talks to the backend
        ├── store/       Zustand auth store
        └── routes/      React Router config + auth guards
```

---

## Known limitations

- **No self-service member actions.** Deposits, loan issuance, and repayments are all treasurer-recorded by
  design — there's no member-initiated "request a loan" or "I paid" endpoint yet. The UI is honest about this
  (it says "Contact your treasurer" rather than showing a button that would fail).
- **Cycle-scoped, not lifetime, metrics.** "Group pool capital" and collection rate reflect the *current cycle*
  only — there's no lifetime-aggregate endpoint yet.
- **SQLite by default.** Fine for development; use `DATABASE_URL` to point at PostgreSQL for anything shared
  or production-like.

See [DOCUMENTATION.md § Roadmap](./DOCUMENTATION.md#roadmap--next-steps) for what would close these gaps.

---

## License

Add a license of your choice — none is currently specified.