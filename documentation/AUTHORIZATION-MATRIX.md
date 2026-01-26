# Authorization Matrix - User Service (Phase 1)

## Overview

This document defines the **Phase 1 Authorization Rules** for the User Service, implementing the RBAC model specified in the system specifications.

## Permission Format

Permissions follow the format: `<resource>.<action>`

Examples:
- `user.read`
- `user.create`
- `user.update`
- `user.delete`
- `role.read`
- `role.create`
- `role.update`
- `role.delete`
- `tenant.read`
- `tenant.create`
- `tenant.update`
- `tenant.delete`

## Roles & Permissions Matrix

| Action | Super Admin | Admin | Project Owner | Contributor | Viewer |
|--------|-------------|-------|---------------|-------------|--------|
| **Users** |  |  |  |  |  |
| List users (tenant-scoped) | ✅ | ✅ | ✅ | ❌ | ❌ |
| View user details (tenant-scoped) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create user (in own tenant) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update user (tenant-scoped) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deactivate user (tenant-scoped) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Roles** (Tenant-scoped) |  |  |  |  |  |
| List roles (tenant-scoped) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View role details (tenant-scoped) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create role (in own tenant) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update role (tenant-scoped) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete role (soft, non-system) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Tenants** (Super Admin & Admin) |  |  |  |  |  |
| List tenants | ✅ | ✅ | ❌ | ❌ | ❌ |
| View tenant details | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create tenant | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update tenant | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete tenant (soft) | ✅ | ✅ | ❌ | ❌ | ❌ |

## Role Definitions

### Super Admin
- **Scope**: System-wide
- **Purpose**: Platform administration and tenant management
- **Permissions**:
  - `user.read`, `user.create`, `user.update`, `user.delete`
  - `role.read`, `role.create`, `role.update`, `role.delete`
  - `tenant.read`, `tenant.create`, `tenant.update`, `tenant.delete`
- **Special Rules**:
  - NOT bound to a tenant (tenantId is null)
  - Can manage all tenants
  - Cannot access tenant-scoped domain data (projects, test cases, results)
  - Cannot bypass tenant isolation for domain entities

### Admin
- **Scope**: Tenant-scoped
- **Purpose**: Tenant administration
- **Permissions**:
  - `user.read`, `user.create`, `user.update`, `user.delete`
  - `role.read`, `role.create`, `role.update`, `role.delete`
  - `tenant.read`, `tenant.create`, `tenant.update`, `tenant.delete`
- **Special Rules**:
  - Bound to exactly one tenant
  - Can manage users and roles within their tenant
  - Can manage tenant configuration and settings
  - Cannot assign roles above their own level
  - All deletions are soft deletes (isDeleted flag)

### Project Owner
- **Scope**: Tenant-scoped
- **Purpose**: Project management and test execution
- **Permissions**:
  - `user.read`
  - `role.read`
- **Special Rules**:
  - Read-only access to users and roles in their tenant
  - Full permissions for project/test management (handled by other services)

### Contributor
- **Scope**: Tenant-scoped
- **Purpose**: Test execution and result submission
- **Permissions**:
  - `role.read`
- **Special Rules**:
  - Can view roles but not users
  - Limited to test execution workflows (handled by other services)

### Viewer
- **Scope**: Tenant-scoped
- **Purpose**: Read-only access to test data
- **Permissions**:
  - `role.read`
- **Special Rules**:
  - No write permissions
  - Read-only access to test data (handled by other services)

## Tenant Isolation Rules (Phase 1 MANDATORY)

### Hard Rules
1. **Every user belongs to exactly one tenant** (except Super Admin)
2. **Every query is filtered by tenantId**
3. **Tenant ID MUST NOT be accepted from request bodies for writes** (enforced via `enforceTenantOnBody` middleware)
4. **Cross-tenant access returns 403 or 404**

### Implementation
- User Service: All user queries filtered by `req.user.tenantId`
- `enforceTenantOnBody()` middleware ensures tenantId matches authenticated user's tenant
- Services validate tenant ownership before any mutation

## Authentication Flow

### JWT Contract (Phase 1)
```json
{
  "sub": "userId",
  "tenantId": "tenantId",
  "role": "roleName",
  "permissions": ["user.read", "user.create", ...],
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Middleware Chain
1. `authenticate` - Validates JWT, sets `req.user`
2. `requireTenant` - Ensures user has tenant context, sets `req.tenantId`
3. `requirePermission(permission)` - Checks specific permission
4. `enforceTenantOnBody(field)` - Prevents cross-tenant data manipulation

## Rate Limiting

### Login Endpoint
- **Limit**: 10 requests per minute per IP
- **Middleware**: `loginRateLimiter`
- **Response**: 429 Too Many Requests

### Other Endpoints
- No rate limiting in Phase 1 (except auth)
- Future: Consider per-user rate limiting for write operations

## Error Responses

All error responses follow the standard format:
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "correlationId": "uuid"
}
```

### Error Codes
- `VALIDATION_ERROR` (400): Invalid input
- `UNAUTHORIZED` (401): Missing/invalid credentials
- `FORBIDDEN` (403): Insufficient permissions or wrong tenant
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource already exists
- `INTERNAL_ERROR` (500/503): Server error or dependency failure

## Examples

### Creating a User (Admin)
```http
POST /users
Authorization: Bearer {jwt_with_admin_role}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securePass123",
  "roleId": "65abc123...",
  "tenantId": "65def456..."  // Must match JWT tenantId
}
```

**Success**: 201 Created  
**Failure**: 403 Forbidden (if tenantId doesn't match JWT)

### Listing Users (Contributor - No Permission)
```http
GET /users
Authorization: Bearer {jwt_with_contributor_role}
```

**Response**: 403 Forbidden
```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

### Managing Tenants (Non-Super Admin)
```http
GET /tenants
Authorization: Bearer {jwt_with_admin_role}
```

**Response**: 403 Forbidden
```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

## Phase 1 Exit Criteria

✅ All services enforce tenant isolation  
✅ All protected endpoints enforce RBAC  
✅ JWT contract implemented consistently  
✅ Commons middleware used everywhere  
✅ Auth endpoints rate-limited  
✅ No cross-tenant data access possible  
✅ APIs stable and documented  

## Phase 2 Considerations (Out of Scope)

- Audit logs for permission checks
- Fine-grained permissions (e.g., `user.update.self`)
- Dynamic permission assignment
- Permission inheritance
- Custom roles per tenant
