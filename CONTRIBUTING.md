# Contributing Guidelines

Thank you for contributing to Developer Workspace!

## Code Style & Conventions
- **TypeScript**: Strict mode enabled. Avoid `any` where possible.
- **Components**: Functional React components with standard Tailwind CSS styling.
- **Server Actions**: All database or R2 storage operations must be wrapped in `try/catch` blocks with atomic transaction verification.

## Git Workflow
1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Commit your changes with conventional commit messages:
   ```bash
   git commit -m "feat(api-studio): add support for OAuth 2.0 flow"
   ```
3. Push to your branch and open a Pull Request.

## Pull Request Checklist
- [ ] Code passes `npx tsc --noEmit`.
- [ ] Unit and integration tests pass (`npm run test:unit && npm run test:integration`).
- [ ] Documentation updated in `docs/` if modifying APIs or schema.
