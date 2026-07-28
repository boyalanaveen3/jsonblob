# Playwright End-to-End Testing

## Test Configuration

- **Framework**: `@playwright/test`
- **Headless Mode**: Enabled for CI runs, toggleable for debug visual runs.
- **Base URL**: `http://localhost:3000` (Local) / `https://uat.jsonblob-app.pages.dev` (UAT)

## Automated Scenarios

1. **JSON Editor**: Typing valid JSON, prettifying, saving blob, retrieving blob URL.
2. **API Studio**: Creating collection, adding request, setting headers/body, sending request, confirming history entry.
3. **SQL Sandbox**: Running `CREATE TABLE`, `INSERT`, and `SELECT` queries in browser SQLite.
