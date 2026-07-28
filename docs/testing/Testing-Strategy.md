# Testing Strategy

## Overview

The Developer Workspace testing framework is built to ensure total stability across the hybrid storage architecture (Cloudflare D1 + R2), edge proxy APIs, and UI components.

## Testing Pyramid

```
           / \
          /   \  E2E Playwright Tests (Browser Automation)
         /-----\
        /       \  Integration Tests (D1 + R2 Storage Actions)
       /---------\
      /           \  Unit Tests (Parsers, Utilities, Runtimes)
     /-------------\
```

---

## Centralized Structure (`tests/`)

- `tests/unit/`: Utility functions, importers, schema parsers.
- `tests/integration/`: Storage service verification, atomic rollbacks.
- `tests/api/`: Edge API endpoint handler suites.
- `tests/e2e/`: Playwright browser UI automation.
- `tests/fixtures/`: Sample JSON payloads and Postman collections.

---

## Continuous Integration Pipeline

1. **Pre-commit**: TypeScript compilation check (`tsc --noEmit`).
2. **Build Phase**: Unit and integration test execution.
3. **Deployment Phase**: Post-deploy E2E check against UAT Cloudflare Pages URL.
