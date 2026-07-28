# Unit Testing Guide

## Scope
Unit tests cover isolated logic without external network calls:
- `lib/utils/apiImportExport.ts`: Postman v2.1 collection parser, OpenAPI specification reader, cURL command line parser.
- `lib/runtime/runtimes/`: Multi-language code execution message transformers.

## Execution Command
```bash
npm run test:unit
```
