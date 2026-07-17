Phase 1
--------
JSON Blob

✔ CRUD
✔ Login
✔ Security

Phase 2
--------
Code Playground

✔ JS
✔ TS
✔ Python
✔ Java

Phase 3
--------
Projects

Folders

Collections

Search

Phase 4
--------
Dashboard

Phase 5
--------
AI Assistant

JSON Explain

Code Explain

Generate Code

Phase 6
--------
Teams

Sharing

Public Snippets

API Tester

SQL Playground

for phase 6  
--------------------
Build an AI Developer Assistant module inside the existing JSON Blob SaaS application.

The assistant should not be a generic chatbot. It should understand the current editor content and provide developer-focused assistance.

The AI Assistant must integrate with both:

1. JSON Blob Editor
2. Code Playground

The assistant should appear as a collapsible right sidebar that can be opened or closed without leaving the editor.

Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Zustand
- Cloudflare Pages
- Cloudflare Workers (for AI proxy if needed)

UI

The sidebar should contain:

- Chat history
- Prompt input
- Suggested actions
- Copy response
- Insert into editor
- Clear conversation

Context Awareness

The assistant should automatically detect:

- Current module (JSON Blob or Code Playground)
- Selected language
- Current editor content
- Selected text (if any)

JSON Blob Features

- Explain JSON
- Beautify JSON
- Fix invalid JSON
- Generate JSON Schema
- Convert JSON to TypeScript interface
- Convert JSON to Java class
- Convert JSON to Python dataclass
- Convert JSON to C# model
- Generate sample JSON
- Detect duplicate keys
- Suggest improvements

Code Playground Features

- Explain code
- Find bugs
- Optimize code
- Add comments
- Refactor code
- Convert between supported languages
- Generate unit tests
- Explain compiler/runtime errors
- Suggest best practices

Reusable AI Architecture

Create an AI service layer that accepts:
- Current module
- Language
- Editor content
- Selected text
- User prompt

The UI should remain independent of the AI provider so different providers can be configured later without changing the interface.

Future Extensibility

Design the assistant so future capabilities can include:
- API documentation generation
- SQL query explanations
- Commit message generation
- README generation
- Code review
- Security analysis
- Performance suggestions
- Architecture recommendations

Do not replace the existing editor. The AI assistant should enhance the workflow while preserving the current JSON Blob and Code Playground functionality.


Phase 1 (Quick Win)
-----------------
AI Sidebar
Chat
Explain JSON
Fix Invalid JSON
Explain Code

Phase 2
-------------------
Convert JSON → TypeScript
Convert JSON → Java
Convert JSON → Python
Convert JSON → C#

Phase 3
---------------
Refactor Code
Optimize Code
Generate Unit Tests
Explain Runtime Errors

Phase 4
----------------
AI Code Review
Generate README
Generate API Docs
Architecture Suggestions