# Changelog

All notable changes to Developer Workspace are documented in this file.

## [1.0.0] - 2026-07-28

### Added
- **Hybrid Storage (Cloudflare D1 + R2)**: D1 stores metadata indexes while R2 stores JSON payloads and API execution responses.
- **API Studio**: Postman-style collection hierarchy, HTTP request runner, edge proxy (`/api/proxy`), and response execution history.
- **JSON Blob SaaS**: Monaco JSON editor, Ajv schema validation, tree/graph visualization, shortlink sharing.
- **Centralized Testing Suite (`tests/`)**: Automated unit, API (`tests/api/api-endpoints.test.ts`), integration, and Playwright E2E testing suites.
- **Enterprise Documentation (`docs/`)**: System architecture diagrams, D1 database schema, API references, phase tracking, and Cloudflare setup guides.
