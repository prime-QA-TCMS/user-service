# TCMS Agent Instructions

This repository contains a microservices-based Test Case Management System.

Use these instructions for coding agents:
- Respect service ownership and avoid direct database access across services.
- Use TypeScript consistently.
- Keep backend controllers thin and move business logic to service layers.
- Validate API input and enforce JWT authorization server-side.
- Keep frontend API URLs environment-driven.
- Add tests and update docs for behavior changes.
- Do not introduce secrets into source control.
