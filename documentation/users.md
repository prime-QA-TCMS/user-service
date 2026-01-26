# Users

Base path: `/users`

**Middleware:** `authenticate` + `requireTenant`; `allowSelfOrPermission` used on GET/PUT /:id. Tenant is enforced on create via `enforceTenantOnBody("tenantId")`.

## GET /users
- **Permissions:** `user.read`
- **Query:** `page` (number, default 1), `limit` (number, default 20)
- **Response:** `200` with `{ items, total, page, limit }` (passwordHash omitted)

## GET /users/:id
- **Permissions:** `user.read` OR self access (actor id matches :id)
- **Validation:** missing id → 400
- **Responses:**
  - `200` with user document (passwordHash omitted)
  - `404` if not found

## POST /users
- **Permissions:** `user.create`
- **Body required:** `email` (unique), `password`, `roleId`; `tenantId` auto-injected from context
- **Business rules:**
  - Email must be unique (throws conflict if duplicate)
  - `validateRoleAssignment` enforces actor role; non-admins may only assign `viewer`
- **Responses:**
  - `201` with created user
  - `409` if email duplicate
  - `400` if validation fails

## PUT /users/:id
- **Permissions:** `user.update` OR self
- **Validation:** missing id → 400
- **Business rules:**
  - Self-update allowed fields only: `email`, `password`
  - Self-update cannot change role, tenant, or isActive
  - Tenant never mutable; role change blocked when not allowed
  - Password, if present, is hashed into `passwordHash`
- **Responses:**
  - `200` with updated user
  - `404` if not found

## DELETE /users/:id
- **Permissions:** `user.delete`
- **Validation:** missing id → 400
- **Behavior:** sets `isActive: false` for tenant-scoped user
- **Responses:**
  - `200` with deactivated user
  - `404` if not found

## Search (placeholder)
- **Route:** GET /users/search (not wired in routes currently; in controller as `searchUsers`)
- **Current behavior:** returns empty array with `"Search not yet implemented"`
