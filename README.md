# National Group IT Asset & Domain Tracker

A high-performance, full-stack web application for tracking domains, software licenses, and IT assets.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Auth | JWT (7-day tokens) |
| Deployment | Docker Compose |

---

## Quick Start (Docker)

```bash
# 1. Clone / open project
cd "Tracker-National Group India"

# 2. Copy env file
cp backend/.env.example backend/.env
# Edit backend/.env with your email settings (optional for alerts)

# 3. Start everything
docker-compose up -d --build

# 4. Seed the database with sample data
docker-compose exec backend npm run seed

# 5. Open the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

### Default Login Credentials

| User | Username | Password | Role |
|------|----------|----------|------|
| System Admin | `admin` | `Admin@1234` | Admin (full access) |
| IT Manager | `bala` | `Admin@1234` | IT Manager (edit + view) |
| View Only | `viewer` | `Admin@1234` | Viewer (read only) |

> **Change passwords immediately** after first login in production.

---

## Local Development (without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 15
- Redis 7

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB and Redis connection strings

# Run DB schema
psql -U tracker_user -d tracker_db -f src/db/schema.sql

# Seed sample data
npm run seed

# Start dev server (with hot reload)
npm run dev
```

### Frontend

```bash
cd frontend
npm install

# Set the API URL
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

# Start dev server
npm run dev
```

---

## Features

### Dashboard
- **Summary cards**: Total domains, expiring soon, high-critical assets, renewed this month
- **Color-coded alerts**: Red (< 15 days), Amber (15–60 days), Green (> 60 days)
- **Upcoming renewals chart**: Visual 90-day calendar view
- **Auto-refresh**: Dashboard updates every 60 seconds

### Domain Tracker
All columns from the original spreadsheet:
- Sr No, Domain Name, Registrar, Expiry Date
- **Days to Expiry** (auto-calculated, color-coded)
- Auto Renew toggle, Owner, Criticality
- Last Renewal Date, Renewal Period, Annual Cost (INR)
- Payment Method, Invoice Reference, Remarks

Features:
- Search by domain name / registrar / owner
- Filter by criticality
- Sort by any column
- Pagination (50 per page)
- Inline edit & delete
- **Excel import** (upload your existing spreadsheet)
- **Excel export**

### Software & License Tracker
Track: Firewall, Microsoft 365, Antivirus, SaaS subscriptions, etc.

### Alerts
- Daily cron job runs at 08:00
- Email alerts sent at 30, 15, 7, and 1 day before expiry
- Dashboard bell shows live alert count

### Security
- JWT authentication (7-day expiry)
- Role-based access (Admin / IT Manager / Viewer)
- Bcrypt password hashing (cost factor 12)
- Helmet.js security headers
- Rate limiting (20 login attempts / 15 min)
- Audit logs for all Create/Update/Delete actions
- SQL injection prevention (parameterized queries)

---

## API Reference

```
POST   /api/auth/login
GET    /api/auth/profile
GET    /api/dashboard/summary
GET    /api/dashboard/alerts

GET    /api/domains               ?page&limit&search&criticality&sort&order
POST   /api/domains
PUT    /api/domains/:id
DELETE /api/domains/:id
GET    /api/domains/export/excel
POST   /api/domains/import        (multipart, field: file)

GET    /api/software
POST   /api/software
PUT    /api/software/:id
DELETE /api/software/:id
GET    /api/software/export/excel

GET    /api/audit
```

---

## Project Structure

```
Tracker-National Group India/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js              # Express server entry point
│       ├── db/
│       │   ├── index.js        # PostgreSQL pool
│       │   ├── schema.sql      # Database schema
│       │   └── seed.js         # Sample data seeder
│       ├── config/redis.js     # Redis cache helpers
│       ├── middleware/
│       │   ├── auth.js         # JWT authentication
│       │   └── audit.js        # Audit log middleware
│       ├── controllers/        # Business logic
│       ├── routes/             # Express routes
│       └── utils/
│           ├── email.js        # Nodemailer alerts
│           └── alertJob.js     # Daily cron scheduler
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/                # Next.js App Router pages
        │   ├── (dashboard)/    # Protected dashboard routes
        │   └── login/          # Public auth page
        ├── components/
        │   ├── Dashboard/      # Stats, alerts, chart
        │   ├── Domain/         # Table + Modal
        │   ├── Software/       # Table + Modal
        │   ├── Layout/         # Sidebar + Header
        │   └── common/         # StatusBadge, DaysBadge
        ├── context/AuthContext.jsx
        └── lib/api.js          # Axios instance
```

---

## Performance Notes

- **Redis cache** on dashboard summary (1-min TTL) → sub-100ms dashboard loads
- **Database indexes** on `expiry_date`, `criticality`, `domain_name`
- **Pagination** — max 200 rows per request (no full-table loads)
- **React Query** with 30-second stale time → avoids redundant fetches
- **Next.js standalone output** → minimal Docker image size

---

## Production Checklist

- [ ] Change `JWT_SECRET` to a random 64-char string
- [ ] Change all default passwords
- [ ] Configure `EMAIL_*` variables for alerts
- [ ] Set `FRONTEND_URL` to your actual domain
- [ ] Enable HTTPS (nginx reverse proxy recommended)
- [ ] Set up PostgreSQL backups
- [ ] Review `ALERT_EMAILS` for correct recipients
