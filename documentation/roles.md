# Roles

Base path: `/roles`

**Middleware:** `authenticate` + `requireTenant` + per-route `requirePermission`

## GET /roles
- **Permissions:** `role.read`
- **Query:** `page` (default 1), `limit` (default 20)
- **Response:** `200` with `{ items, total, page, limit }` (permissions populated)

## POST /roles
- **Permissions:** `role.create`
- **Body required:** `name` (unique), optional `description`, `permissions` array of permission codes
- **Rules:**
  - `ensureRoleNameUnique` enforces unique name
  - Permissions codes resolved to Permission documents
- **Responses:**
  - `201` with created role
  - `409` if name already exists

## PUT /roles/:id
- **Permissions:** `role.update`
- **Validation:** missing id → 400
- **Rules:**
  - `ensureProtectedRoleName` blocks updates to protected roles (`super-admin`, `admin`)
  - Optional name uniqueness check if name present
  - Permissions array converted to permission ObjectIds
- **Responses:**
  - `200` with updated role
  - `404` if not found

## DELETE /roles/:id
- **Permissions:** `role.delete`
- **Validation:** missing id → 400
- **Rules:**
  - `ensureProtectedRoleName` and `ensureRoleDeletable` prevent deleting protected roles or roles assigned to users
- **Responses:**
  - `200` on delete
  - `404` if not found
  - `403` if protected/system role
