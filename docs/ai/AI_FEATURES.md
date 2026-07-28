# AI Assistant Specification

## Core AI Features

1. **SQL Query Generator**: Converts natural language requests into D1-compatible SQLite queries.
2. **SQL Query Optimizer**: Analyzes queries for missing indexes or sub-optimal JOINs.
3. **Schema Explainer**: Explains complex D1 database schemas in human-readable terms.
4. **Synthetic Data Generator**: Populates tables with realistic test records.
5. **ORM Code Converter**: Converts raw SQL queries to Drizzle ORM TypeScript code.

---

## Edge API Route (`/api/ai`)

```
Prompt Input -> Extract D1 Schema Context -> Format Gemini Prompt -> Call Gemini API -> Parse & Return Markdown Code Block
```
