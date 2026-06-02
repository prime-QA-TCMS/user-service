# TCMS Copilot Repository Instructions

You are assisting on a microservices-based Test Case Management System.

## Architecture
- Backend services: user-service, project-service, testcase-service, configuration-service, results-service.
- Frontend: PrimeQAUI.
- Backend stack: Node.js, Express, TypeScript, MongoDB/Mongoose, JWT auth, dotenv, Docker.
- Frontend stack: React + TypeScript, likely Vite, API services under src/services or equivalent.

## Global rules
- Preserve service boundaries. Do not couple services through direct database access.
- Prefer REST API contracts between services unless an event-driven change is explicitly requested.
- Use TypeScript types/interfaces for DTOs, request bodies, responses, and service-layer contracts.
- Validate inputs at API boundaries using the validation style already present in the service.
- Use centralized error handling rather than ad-hoc try/catch response logic.
- Never hard-code secrets, ports, tokens, or database URLs.
- Keep Docker and environment variables aligned across services.
- Add or update tests when changing behavior.
- For auth-protected routes, enforce JWT validation consistently and avoid trusting client-provided user identity.
- Keep controllers thin: validation and HTTP concerns in controllers, business logic in services, persistence in repositories/models.
- When generating code, follow the existing project naming, folder, import, and linting conventions.
