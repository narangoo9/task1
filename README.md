# TaskFlow — Production Multi-Tenant Task Management SaaS

A full-stack, real-time, multi-tenant Kanban task management system built for scale.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│              Next.js (SSR) + React + Zustand + dnd-kit          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WSS
                    ┌────────▼────────┐
                    │   Nginx / Ingress│  ← TLS termination
                    │   (K8s Ingress) │    Rate limiting
                    └────────┬────────┘    Sticky sessions (WS)
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌────▼───────┐ ┌──▼──────────┐
       │  API Pod 1  │ │  API Pod 2 │ │  API Pod 3  │  ← HPA 2-10 pods
       │  Node/Express│ │            │ │             │
       └──────┬──────┘ └────┬───────┘ └──┬──────────┘
              │              │             │
              └──────────────┼─────────────┘
                             │
                    ┌────────▼────────┐
                    │      Redis       │  ← Pub/Sub (WS scaling)
                    │  (pub/sub+cache) │    Session cache
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL     │  ← Neon.tech (serverless)
                    │  (Prisma ORM)   │    RLS tenant isolation
                    └─────────────────┘
```

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript |
| Styling     | Tailwind CSS (dark theme)           |
| State       | Zustand + React Query               |
| Drag & Drop | dnd-kit with fractional indexing    |
| Backend     | Node.js + Express + TypeScript      |
| Auth        | JWT + Refresh Token Rotation        |
| Database    | PostgreSQL + Prisma ORM             |
| Cache/RT    | Redis (pub/sub + cache)             |
| WebSocket   | Socket.io + Redis adapter           |
| Logging     | Pino (structured JSON)              |
| Metrics     | Prometheus + Grafana                |
| Container   | Docker + Docker Compose             |
| K8s         | Kubernetes (HPA, Ingress, PVC)      |
| CI/CD       | GitHub Actions                      |
| Hosting     | Vercel (FE) + Railway (API)         |
| DB Hosting  | Neon.tech (serverless Postgres)     |

## Features

- **Multi-tenant**: Schema-level + RLS isolation per tenant
- **Real-time**: WebSocket updates via Redis pub/sub (scales across K8s pods)
- **Drag & Drop**: Fractional indexing for stable card ordering (no full re-index)
- **Auth**: JWT access tokens (15min) + rotating refresh tokens (7d) + reuse detection
- **RBAC**: Admin / Member / Viewer roles per workspace
- **Dashboard**: Completion %, overdue tasks, activity feed, upcoming deadlines
- **Filtering**: By assignee, label, priority, deadline
- **Security**: Helmet, CORS, rate limiting, httpOnly cookies, CSP headers
- **Observability**: Pino logs, Prometheus metrics, health endpoints

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- npm / pnpm

### 1. Clone & setup

```bash
git clone https://github.com/yourorg/taskflow
cd taskflow
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3. Backend

```bash
cd backend
cp .env.example .env        # Fill in your values
npm install
npx prisma migrate deploy   # Run migrations
npx prisma db seed          # (Optional) seed demo data
npm run dev                 # Starts on :4000
```

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # Starts on :3000
```

Open http://localhost:3000 and register your first workspace.

---

## Production Deployment

### Free-tier Stack

| Service    | Provider      | Config            |
|------------|---------------|-------------------|
| Frontend   | Vercel        | Auto-deploy on push|
| API        | Railway       | $5/mo free tier   |
| Database   | Neon.tech     | Free 0.5GB        |
| Redis      | Railway       | Free 25MB         |

### Required Secrets (GitHub Actions)

```
RAILWAY_TOKEN          # Railway deploy token
DATABASE_URL           # Neon.tech connection string
VERCEL_TOKEN           # Vercel deploy token
VERCEL_ORG_ID          # Vercel org ID
VERCEL_PROJECT_ID      # Vercel project ID
NEXT_PUBLIC_API_URL    # Your Railway API URL
JWT_ACCESS_SECRET      # 64-char random string
JWT_REFRESH_SECRET     # 64-char random string
```

### Kubernetes Deployment

```bash
# Apply all manifests
kubectl apply -f k8s/

# Verify pods
kubectl get pods -n taskflow

# Check HPA
kubectl get hpa -n taskflow
```

### SSL Certificates (K8s)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f k8s/cert-issuer.yaml

# Ingress will auto-provision certs via Let's Encrypt
```

---

## Database Design

### Indexing Strategy

Critical indexes for 1000+ cards per board:

```sql
-- Hot path: board load (all cards, ordered)
CREATE INDEX card_listId_position_idx ON "Card"("listId", "position");

-- Overdue queries (dashboard)
CREATE INDEX card_deadline_idx ON "Card"("deadline");

-- Assignee filter
CREATE INDEX card_assigneeId_idx ON "Card"("assigneeId");

-- Composite: list + archived filter
CREATE INDEX card_listId_isArchived_idx ON "Card"("listId", "isArchived");
```

### Row Level Security

Tenants are isolated via PostgreSQL RLS:

```sql
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_tenant_isolation ON "Workspace"
  USING (
    "tenantId" IN (
      SELECT "tenantId" FROM "TenantUser" 
      WHERE "userId" = current_setting('app.current_user_id', true)
    )
  );
```

---

## WebSocket Scaling

Socket.io uses the Redis adapter so events published on any pod reach all connected clients:

```
Pod 1 (card moved) → Redis pub → Pod 2, Pod 3 → clients get update
```

Sticky sessions via Nginx/Ingress ensure WebSocket connections stay on the same pod during their lifetime (required for upgrade handshake).

---

## Security Checklist

- [x] HTTPS enforced (TLS 1.2/1.3 only)
- [x] JWT access tokens (15min expiry)
- [x] Refresh token rotation + reuse detection
- [x] httpOnly, Secure, SameSite=Strict cookies
- [x] Helmet.js security headers
- [x] CORS whitelist
- [x] Rate limiting (API + auth endpoints)
- [x] Input validation (express-validator + Zod)
- [x] SQL injection prevention (Prisma parameterized queries)
- [x] Tenant isolation (RLS + application-level checks)
- [x] Non-root Docker user
- [x] Read-only container filesystem
- [x] Resource limits (K8s)
- [x] Secrets via K8s Secrets / CI environment variables

---

## Project Structure

```
taskflow/
├── frontend/                    # Next.js 14 app
│   ├── src/
│   │   ├── app/                # App router pages
│   │   │   ├── auth/           # Login / Register
│   │   │   └── dashboard/      # Protected routes
│   │   ├── components/         # UI components
│   │   │   ├── board/          # Kanban, Card, List
│   │   │   └── dashboard/      # Stats, Activity
│   │   ├── hooks/              # useSocket
│   │   ├── lib/                # api.ts, utils.ts
│   │   ├── store/              # Zustand auth store
│   │   └── types/              # TypeScript types
│   └── Dockerfile
│
├── backend/                     # Express API
│   ├── src/
│   │   ├── config/             # env, db, redis, logger, metrics
│   │   ├── controllers/        # Auth, Card, etc.
│   │   ├── middleware/         # auth, error, rateLimit, logger
│   │   ├── routes/             # Express routers
│   │   ├── services/           # TokenService
│   │   ├── utils/              # AppError, fractionalIndex
│   │   └── websocket/          # Socket.io server + publisher
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── Dockerfile
│
├── k8s/                         # Kubernetes manifests
│   ├── api-deployment.yaml     # API + HPA + Ingress
│   ├── redis.yaml
│   └── monitoring.yaml         # Prometheus + Grafana
│
├── nginx/
│   └── nginx.conf              # SSL, WS proxy, rate limiting
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
│
└── docker-compose.yml          # Local dev stack
```
