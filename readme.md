# User Service API

A TypeScript/Express service providing authentication, RBAC, and multi-tenant user management for the TCMS ecosystem.

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 7+ (local or cloud)
- Git

### Install & Run (Local)
```bash
# clone
git clone <your-repo-url> user-service
cd user-service

# install deps
npm install

# configure env
cat > .env <<'EOF'
PORT=3000
MONGO_URI=mongodb://localhost:27017/user-service
JWT_SECRET=change-me
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
EOF

# seed initial data (permissions/roles/tenant/admin user)
npm run seed

# dev mode (ts-node-dev)
npm run dev
# or production
npm run build && npm start
```

Verify:
```bash
curl http://localhost:3000/health
```
Expected: status ok and database connected.

> Default admin (from seed): admin@example.com / Admin123!

## Scripts
- `npm run dev` – start in dev with reload
- `npm run build` – compile TypeScript to dist
- `npm start` – run compiled app
- `npm run seed` – seed permissions, roles, tenant, admin user
- `npm test` – run full test suite
- `npm run test:unit` – run tests with coverage

## API Surface
Base URL: `http://localhost:${PORT}` (default 3000 via .env)

- Auth: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- Users: `/users` (list, get, create, update, delete)
- Roles: `/roles` (list, create, update, delete)
- Tenants: `/tenants` (list, create, update, delete)
- Health: `/health`, `/health/live`, `/health/ready`

## Health Endpoints
- `/health` – detailed status (DB, memory, uptime); 200 when connected, 503 when degraded
- `/health/live` – liveness probe
- `/health/ready` – readiness probe (checks DB)

## Documentation
- Getting started guide: [documentation/getting-started.md](documentation/getting-started.md)
- Hosting & sizing: [documentation/hosting-requirements.md](documentation/hosting-requirements.md)
- Features overview: [documentation/FEATURES.md](documentation/FEATURES.md)
- API endpoint docs: [documentation/auth.md](documentation/auth.md), [documentation/users.md](documentation/users.md), [documentation/roles.md](documentation/roles.md), [documentation/tenants.md](documentation/tenants.md), [documentation/health.md](documentation/health.md)
- Postman setup: [documentation/POSTMAN.md](documentation/POSTMAN.md)
- Authorization matrix: [AUTHORIZATION-MATRIX.md](AUTHORIZATION-MATRIX.md)

## Postman Collection
1) Import collection: [documentation/User-Service.postman_collection.json](documentation/User-Service.postman_collection.json)
2) Import env (local): [documentation/User-Service-Local.postman_environment.json](documentation/User-Service-Local.postman_environment.json)
3) Select environment and run **Auth > Login** to populate tokens

## Features (highlights)
- JWT auth with refresh rotation and secure token revocation
- Multi-tenant isolation with hard tenant enforcement (Phase 1 compliant)
- RBAC with granular permissions and protected system roles
- User/role/tenant CRUD with business rules (uniqueness, role protection, soft deletes)
- Rate-limited login endpoint (10 req/min per IP)
- Comprehensive health checks (liveness/readiness/detailed)
- Extensive automated test suite (536 tests passing, 18 suites)
- **Phase 1 Spec Compliant** - Production-ready multi-tenant security

More detail in [documentation/FEATURES.md](documentation/FEATURES.md).

## Testing
```bash
npm test          # full suite
npm run test:unit # with coverage
```

## Tech Stack
- Node.js 20+, Express 5, TypeScript
- MongoDB + Mongoose
- JWT (jsonwebtoken), bcrypt
- Jest + Supertest for tests
- PM2/Docker/Kubernetes ready (see hosting doc)

## Deployment
See [documentation/hosting-requirements.md](documentation/hosting-requirements.md) for managed and self-managed options (Linux/Windows, Docker, K8s, cloud providers) and sizing for individual, team, department, and enterprise tiers.
