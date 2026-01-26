# Tenants

Base path: `/tenants`

**Middleware:** `authenticate`; no `requireTenant` because tenants are global

## GET /tenants
- **Permissions:** `tenant.read`
- **Response:** `200` with array of tenants

## POST /tenants
- **Permissions:** `tenant.create`
- **Body required:** `name` (unique); optional `domain`
- **Rules:** `ensureTenantNameUnique` enforces unique name
- **Responses:**
  - `201` with created tenant
  - `409` if duplicate name

## PUT /tenants/:id
- **Permissions:** `tenant.update`
- **Validation:** missing id → 400
- **Responses:**
  - `200` with updated tenant
  - `404` if not found

## DELETE /tenants/:id
- **Permissions:** `tenant.delete`
- **Validation:** missing id → 400
- **Rules:** `ensureTenantDeletable` blocks delete when users exist for tenant
- **Responses:**
  - `200` on delete
  - `404` if not found
  - `500` if constraint check fails
