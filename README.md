# Developer Workspace 🚀

> **Enterprise-Grade Cloud Native Developer Environment & SaaS Platform**  
> *Hybrid Storage Architecture (Cloudflare D1 + R2), Integrated Monaco JSON Blob SaaS Editor, Postman-Style API Studio, Client Sandbox Code Execution, and AI Assistant.*

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Enterprise Architecture](#-enterprise-architecture)
- [Repository Folder Structure](#-repository-folder-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Cloudflare Platform Setup](#-cloudflare-platform-setup)
  - [1. Cloudflare D1 Database Setup](#1-cloudflare-d1-database-setup)
  - [2. Cloudflare R2 Object Storage Setup](#2-cloudflare-r2-object-storage-setup)
  - [3. Cloudflare OAuth Integration](#3-cloudflare-oauth-integration)
- [Development & Deployment](#-development--deployment)
  - [Local Development](#local-development)
  - [Production Deployment (Cloudflare Pages)](#production-deployment-cloudflare-pages)
- [Available Scripts](#-available-scripts)
- [Testing Suite](#-testing-suite)
- [Documentation Directory](#-documentation-directory)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Developer Workspace** is a high-performance web platform designed for moderne software engineering teams. It unifies JSON document editing, SQL execution, Postman-grade API development, multi-language code execution, and AI-assisted workflows into a single edge-optimized web application.

Built on **Next.js (App Router)** and deployed natively to **Cloudflare Pages / Workers**, Developer Workspace achieves sub-50ms latency globally by utilizing Cloudflare D1 for relational metadata index tracking and Cloudflare R2 for large JSON and payload storage.

---

## ✨ Key Features

### 🗂️ Hybrid Storage Architecture (D1 + R2)
- **Metadata Layer (D1)**: Fast, relational indexing for Workspaces, Collections, Folders, API Requests, and Blobs.
- **Payload Storage (R2)**: Low-latency object storage for JSON documents, API request bodies, test scripts, and execution response histories.
- **Atomic Transactions & Fallbacks**: Multi-phase commit pattern ensuring no orphaned R2 objects exist if database metadata updates fail.

### 🌐 Postman-Style API Studio
- **Collections & Folders**: Organize requests hierarchically with drag-and-drop support and favorite tagging.
- **Full HTTP Request Lifecycle**: Support for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
- **Payload Management**: Headers, Params, Auth (`Bearer`, `Basic`, `API Key`), JSON Body, Form-Data, and Pre-request Scripts.
- **Edge Proxy Engine**: Bypasses browser CORS restrictions via serverless edge routing (`/api/proxy`).
- **Execution History**: Per-request execution log stored atomically in D1 with full raw response bodies saved in R2.

### 📝 Monaco JSON Blob SaaS Editor
- **Real-Time Validation**: JSON schema validation using Ajv with formatting and syntax highlighting.
- **Sharing & Versioning**: Instant shortlink blob URLs with CORS configuration and payload privacy toggles.
- **Tree & Graph Visualization**: Visual representations of complex nested JSON structures.

### ⚡ Client-Side SQL Sandbox & Web Worker Runtimes
- **In-Browser SQLite**: Complete client-side database execution without server round-trips.
- **Multi-Language Playground**: JavaScript, TypeScript, Python, and Java execution in isolated Web Workers.

### 🤖 AI SQL & Code Assistant
- **SQL Generation & Optimization**: Natural language to SQL translation, query optimization, and schema analysis.
- **Sample Data Generator**: Context-aware synthetic database generation.
- **Code Conversion**: Automatic SQL-to-TypeScript / ORM mapper code generation.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router, Edge Runtime) |
| **Language** | TypeScript 5.5 |
| **Styling** | Tailwind CSS v4, Lucide React Icons |
| **Editor Component** | Monaco Editor (`@monaco-editor/react`) |
| **State Management** | Zustand |
| **ORM & DB Access** | Drizzle ORM + Cloudflare D1 Binding |
| **Object Storage** | Cloudflare R2 Bucket Binding (`STORAGE`) |
| **Edge Serverless** | Cloudflare Pages / Workers (`@cloudflare/next-on-pages`) |
| **Testing** | Playwright E2E, Node.js Test Runners |

---

## 📐 Enterprise Architecture

```
                                  +-------------------+
                                  |   Client Browser  |
                                  +---------+---------+
                                            |
                                            v
                                  +-------------------+
                                  | Next.js App Router|
                                  | (Cloudflare Edge) |
                                  +----+---------+----+
                                       |         |
                     +-----------------+         +-----------------+
                     |                                             |
                     v                                             v
        +-------------------------+                   +-------------------------+
        |   Cloudflare D1 (SQL)   |                   |   Cloudflare R2 (S3)    |
        |      Metadata Index     |                   |     Object Storage      |
        +-------------------------+                   +-------------------------+
        | - Workspaces            |                   | - Blob Payloads (.json) |
        | - Collections & Folders |                   | - Request Bodies        |
        | - API Request Metadata  |                   | - Execution Responses   |
        | - History Records       |                   | - Test Scripts          |
        +-------------------------+                   +-------------------------+
```

*For complete details, see [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) and [docs/architecture/FULL_ARCHITECTURE.md](docs/architecture/FULL_ARCHITECTURE.md).*

---

## 📂 Repository Folder Structure

```
DeveloperWorkspace
├── actions/                  # Next.js Server Actions (API Studio, Blobs, Snippets)
├── app/                      # Next.js App Router pages and API routes
│   ├── api/                  # Edge API routes (/api/blobs, /api/proxy, /api/sql, /api/ai)
│   ├── dashboard/            # Blob SaaS Dashboard
│   └── playground/           # Code Playground
├── components/               # React UI Components
│   ├── editor/               # ApiStudioView, BlobDashboard, StorageStatusPanel
│   └── ui/                   # Reusable UI elements
├── docs/                     # Centralized Enterprise Documentation
│   ├── ai/                   # AI Assistant architecture & prompt flows
│   ├── api/                  # Complete REST API reference
│   ├── architecture/         # System & Hybrid storage diagrams
│   ├── cloudflare/           # D1, R2, and OAuth integration guides
│   ├── database/             # Schema, ER diagrams, D1 indexes
│   ├── phases/               # Phase 01 through Phase 16 development history
│   └── testing/              # Testing strategy, Playwright, API test specs
├── drizzle/                  # Generated SQL schema migrations
├── hooks/                    # Custom React Hooks
├── lib/                      # Core business logic and storage layer
│   ├── db/                   # Drizzle ORM schema & D1 connection client
│   ├── services/             # Storage verification & key generation
│   └── storage/              # R2 storage drivers for Blobs & API Studio
├── public/                   # Static assets and icons
├── scripts/                  # DB seed & verification scripts
├── tests/                    # Centralized Automated Test Suite
│   ├── api/                  # API integration test suites
│   ├── e2e/                  # Playwright E2E browser automation
│   ├── fixtures/             # Test payloads and JSON mocks
│   ├── integration/          # D1 + R2 Hybrid persistence tests
│   ├── reports/              # Generated test run reports
│   └── unit/                 # Unit tests for helpers & parsers
├── types/                    # TypeScript interfaces & domain models
├── CHANGELOG.md              # Historical version release log
├── CONTRIBUTING.md           # Developer guidelines & git workflow
├── LICENSE                   # MIT Open Source License
├── README.md                 # Primary Developer Documentation
├── ROADMAP.md                # Enterprise feature roadmap
└── TEST_REPORT.md            # Execution test reports & coverage metrics
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **Package Manager**: `npm` or `pnpm`
- **Cloudflare CLI**: `wrangler` (`npx wrangler`)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/boyalanaveen3/jsonblob.git
cd jsonblob

# 2. Install project dependencies
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
# Cloudflare OAuth Credentials
NEXT_PUBLIC_CLOUDFLARE_CLIENT_ID=your_client_id
CLOUDFLARE_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_CLOUDFLARE_REDIRECT_URI=http://localhost:3000/api/auth/cloudflare/callback

# Gemini AI Key (Optional)
GEMINI_API_KEY=your_gemini_api_key
```

---

## ⚡ Cloudflare Platform Setup

### 1. Cloudflare D1 Database Setup
```bash
# Create D1 Database
npx wrangler d1 create jsonblob-db

# Update wrangler.toml with generated database_id
# Apply schema migrations to remote D1
npx wrangler d1 execute jsonblob-db --remote --file=./drizzle/0000_initial.sql
```

### 2. Cloudflare R2 Object Storage Setup
```bash
# Create R2 Bucket
npx wrangler r2 bucket create devworkspace
```

Ensure `wrangler.toml` contains:
```toml
name = "jsonblob-app"
compatibility_date = "2024-09-23"
pages_build_output_dir = ".vercel/output/static"

[[d1_databases]]
binding = "DB"
database_name = "jsonblob-db"
database_id = "<YOUR_D1_DATABASE_ID>"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "devworkspace"
```

---

## 💻 Development & Deployment

### Local Development
```bash
npm run dev
# Server running at http://localhost:3000
```

### Production Deployment (Cloudflare Pages)
```bash
npm run pages:deploy
```
*Live Preview URL: `https://uat.jsonblob-app.pages.dev`*

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server |
| `npm run build` | Builds production Next.js application |
| `npm run pages:build` | Compiles app using `@cloudflare/next-on-pages` |
| `npm run pages:deploy` | Builds and deploys app directly to Cloudflare Pages |
| `npm run test` | Runs core unit test suite |
| `npm run test:integration` | Verifies D1 + R2 storage actions and APIs |
| `npm run test:e2e` | Runs Playwright browser end-to-end test suite |

---

## 🧪 Testing Suite

Automated tests are centralized in `tests/`:

```bash
# Run Unit Tests
npm run test:unit

# Run Storage & API Integration Tests
npm run test:integration

# Run Playwright E2E Tests
npm run test:e2e
```

*For comprehensive testing strategy, coverage metrics, and logs, see [TEST_REPORT.md](TEST_REPORT.md) and [docs/testing/Testing-Strategy.md](docs/testing/Testing-Strategy.md).*

---

## 📚 Documentation Directory

- 📐 **Architecture**: [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)
- 🔌 **API Reference**: [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md)
- 🗄️ **Database Schema**: [docs/database/DATABASE.md](docs/database/DATABASE.md)
- ☁️ **Cloudflare Integration**: [docs/cloudflare/CLOUDFLARE.md](docs/cloudflare/CLOUDFLARE.md)
- 🤖 **AI Assistant**: [docs/ai/AI_FEATURES.md](docs/ai/AI_FEATURES.md)
- 📈 **Development Phases**: [docs/phases/](docs/phases/)

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
