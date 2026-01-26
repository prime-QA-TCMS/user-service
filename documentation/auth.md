# Auth

Base path: `/auth`

## POST /auth/register
- **Auth:** none
- **Rate limit:** none
- **Body required:** `email` (string), `password` (string), `roleId` (ObjectId); optional `tenantId` (ObjectId)
- **Validation/Rules:**
  - Missing `email`, `password`, or `roleId` → 400 validation error
  - Email must be unique
- **Responses:**
  - `201` with created user `{ id, email, role }`
  - `409` if user already exists
  - `500` on unexpected errors
- **Sample:**
```json
{
  "email": "user@example.com",
  "password": "Pass123!",
  "roleId": "64b7e...",
  "tenantId": "64b7f..."
}
```

## POST /auth/login
- **Auth:** none
- **Rate limit:** loginRateLimiter applied
- **Body required:** `email`, `password`
- **Validation/Rules:**
  - Missing `email` or `password` → 400 validation error
  - Invalid credentials or inactive user → 401
- **Responses:**
  - `200` with `{ accessToken, refreshToken, user: { id, email, role, tenantId } }`
  - `401` invalid credentials

## POST /auth/refresh
- **Auth:** none
- **Body required:** `refreshToken`
- **Validation/Rules:**
  - Missing token → 400
  - Invalid/expired token or user missing → 401
  - Rotates refresh token on success
- **Responses:**
  - `200` with `{ accessToken, refreshToken }`
  - `401` invalid/expired

## POST /auth/logout
- **Auth:** none (token in body)
- **Body required:** `refreshToken`
- **Rules:** revokes refresh token hash
- **Responses:**
  - `200` logout successful
  - `400` if token missing
  - `500` on unexpected errors
