# Integration Testing Guide

## Scope
Integration tests validate interaction between server actions and Cloudflare storage bindings:
- `tests/integration/test-storage-verification.ts`: Tests `uploadJson()`, R2 `head()` verification, and D1 database row insertion.
- `tests/integration/test-api-studio-verification.ts`: Tests collection CRUD, request payload uploads, and cascade deletion.

## Execution Command
```bash
npm run test:integration
```
