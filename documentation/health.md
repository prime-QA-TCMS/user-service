# Health

## GET /health
- **Auth:** none
- **Purpose:** Comprehensive health check with database, memory, and uptime
- **Responses:**
  - `200 OK` when database connected
  - `503 Service Unavailable` when database disconnected
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T10:30:00.000Z",
  "uptime": 1234.567,
  "environment": "production",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "name": "user-service"
  },
  "memory": {
    "heapUsed": "45MB",
    "heapTotal": "64MB",
    "rss": "120MB"
  }
}
```

## GET /health/live
- **Auth:** none
- **Purpose:** Kubernetes liveness probe - checks if process is running
- **Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T10:30:00.000Z"
}
```

## GET /health/ready
- **Auth:** none
- **Purpose:** Kubernetes readiness probe - checks if service can handle traffic
- **Responses:**
  - `200 OK` when database is ready
  - `503 Service Unavailable` when database not ready
```json
{
  "status": "ready",
  "timestamp": "2026-01-26T10:30:00.000Z"
}
```
**Not Ready Response:**
```json
{
  "status": "not_ready",
  "reason": "database",
  "timestamp": "2026-01-26T10:30:00.000Z"
}
```
