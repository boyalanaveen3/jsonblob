# End-to-End Testing Guide

## Scope
E2E tests simulate full user workflows in chromium browser environments.

## Automated Test Scripts (`tests/e2e/`)
- `test-e2e-suite.js`: Full system workflow test.
- `test-isolation-e2e.js`: Multi-tab state isolation test.
- `test-playground-complete-e2e.js`: Code playground worker runtime test.

## Execution Command
```bash
npm run test:e2e
```
