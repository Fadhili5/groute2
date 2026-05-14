# GhostRoute Terminal — Comprehensive Documentation Audit & Improvement Plan

**Date:** 2026-05-14
**Auditor:** Technical Documentation Engineer
**Scope:** All 11 docs + README + CONTRIBUTING + SECURITY + .env.example + all source code

---

## Table of Contents

1. [Documentation Audit Report](#1-documentation-audit-report)
2. [Documentation Gap Analysis](#2-documentation-gap-analysis)
3. [Documentation Restructuring Plan](#3-documentation-restructuring-plan)
4. [Specific Improvements Per File](#4-specific-improvements-per-file)
5. [README Rewrite](#5-readme-rewrite)
6. [Missing Documentation Content](#6-missing-documentation-content)
7. [Documentation Automation](#7-documentation-automation)

---

## 1. Documentation Audit Report

### 1.1 README.md — Grade: A-

**Completeness:** Covers overview, tech stack, architecture, user flow, 9 modules, quick start, doc index, project structure, deployment, license.

**Accuracy Issues:**
- Tech Stack table says "AG Grid Enterprise" but actual dependency is `ag-grid-community` and `ag-grid-react` (Community, not Enterprise)
- Tech Stack table says "xterm.js" but actual dependency is `@xterm/xterm` (modern npm package name)
- Clone URL `github.com/elonmasai7/groute.git` vs CONTRIBUTING.md says `github.com/ghostroute/terminal.git` — inconsistent
- Quick Start `prisma db seed` uses default seed data, not live data

**Clarity:** Excellent. Clear structure, good use of tables and ASCII diagrams.

**Missing:**
- No project screenshots or animated GIF
- No badges for test coverage, build status, or documentation
- No "Why GhostRoute vs competitors" section
- License section links to `LICENSE` file that doesn't exist at root

---

### 1.2 docs/architecture.md — Grade: A-

**Completeness:** Comprehensive system architecture with tier breakdown, full diagram, 5 data flows, component interaction, store hierarchy, WebSocket-to-store mapping, design decisions, security, performance.

**Accuracy Issues:**
- Says "Next.js API Layer (21 route.ts)" but actual count varies — frontend has routes under 8 endpoint directories, not individually counted
- Store hierarchy section lists 7 stores but `useTerminalStore` is NOT exported from `stores/index.ts` (it's imported directly from `stores/terminal-store.ts`)
- Module-to-store mapping shows MarketMatrix reads from `useMarketStore`, but actual code in `MarketMatrix.tsx:213` uses local `rowData` state, NOT `useMarketStore`
- Store mapping shows `CommandTerminal` writes to `useSolverStore.terminalOutput`, but actual code at `CommandTerminal.tsx:33` reads from `useSolverStore` but writes to local `history` state — `addTerminalOutput` is called but `terminalOutput` is never read
- WebSocket `block_update` handler is documented as updating `useWalletStore.setSystemHealth()` — actual code at `useWebSocket.ts:82-83` does this, correct

**Clarity:** Excellent ASCII diagrams, clear flow descriptions.

**Missing:**
- No mention of `@fastify/swagger`/`@fastify/swagger-ui` installed in backend
- No mention of `frontend/src/lib/backend.ts` proxy file
- No mention of the mobile responsive layout in `page.tsx`

---

### 1.3 docs/api.md — Grade: A-

**Completeness:** All 21+ endpoints with request/response schemas, Zod schemas, error codes, WebSocket protocol, route map.

**Accuracy Issues:**
- Route map lists 23 entries + WS, but actual backend has a `POST /api/alerts/` (create alert) at `alerts.ts:42` that is NOT documented
- Route map entry 22 `GET /api/chains` says it returns "All chains from DB" but actual code at `index.ts:76` returns hardcoded fallback when Prisma is unavailable
- WebSocket section says events sent "every 3s" — actual code at `handler.ts:62` uses `setInterval(3000ms)` which matches
- "Ping" request documented as `{ type: "ping" }` with response `{ type: "pong" }` — matches code at handler.ts:39-40

**Clarity:** Very clear with JSON examples and Zod schema tables.

**Missing:**
- No OpenAPI/Swagger specification reference
- No rate limit headers documentation
- No CORS policy documentation
- `POST /api/alerts` create endpoint undocumented

---

### 1.4 docs/contracts.md — Grade: A

**Completeness:** All 8 contracts documented with purpose, roles, structs, functions, events, state machines, deployment commands.

**Accuracy Issues:**
- Says `Solidity 0.8.24 (hardhat config: 0.8.26)` — correct, contracts use `^0.8.24` and hardhat compiles with `0.8.26`
- Testing addresses section shows placeholder addresses `0x0000...0001` through `0x0000...0008` — these match `frontend/src/lib/constants.ts:28-37`
- Governance `createProposal` docs say starts in `Pending` state, but actual code at `IntentRouter` has no such enum — Governance contract appears to start in `Active` state (need to verify Governance.sol)
- `RelayerRegistry` docs say `slashRelayer()` exists but actual code uses a different mechanism — verification needed

**Clarity:** Excellent. State machine diagrams, struct definitions, function signatures with access control.

**Missing:**
- No contract ABI references or file paths
- No deployed address table for testnets/mainnets
- No verification commands for block explorers
- No gas estimation or optimization notes

---

### 1.5 docs/data-flow.md — Grade: A

**Completeness:** 9 flow diagrams covering page load, execution lifecycle, WebSocket protocol, settlement inspection, route visualization, alert feed, chain refresh, Redis usage, PostgreSQL relationships.

**Accuracy Issues:**
- Execution flow shows POST endpoints returning Redis-cached responses — correct, backend code confirms
- Settlement flow shows `POST /api/settlement/inspect` — actual backend at `settlement.ts:62` matches
- Alert feed flow says "PUT /api/alerts/:id/read (optimistic)" — backend at `alerts.ts:32` does database update, not just optimistic
- Notes that "MarketMatrix uses local rowData state, NOT useMarketStore.chains directly" — correct, this is a known architectural issue
- Notes that "zustand watchlist is always empty" and "default hardcoded list is always used" — correct

**Missing:**
- No Redis persistence/flush documentation
- No connection pool configuration docs

---

### 1.6 docs/state-management.md — Grade: A-

**Completeness:** All 7 stores documented with interfaces, initial state, data flow, component mappings, useState vs Zustand comparison.

**Accuracy Issues:**
- `useTerminalStore` is documented as being read by RouteVisualizer but it is NOT exported from `stores/index.ts` — only `stores/terminal-store.ts` direct import works
- `useSolverStore.terminalOutput` is documented as being written and read by CommandTerminal, but actual `CommandTerminal.tsx` uses local `history` state for display and `useSolverStore` for `terminalOutput` — the store's terminal output is never rendered in the UI
- `useUIStore` is documented as persisting `sidebarCollapsed` to `localStorage` — actual code at `ui-store.ts` does NOT implement localStorage persistence. The docs describe intended behavior that isn't coded.
- Wallet initial state shows `systemHealth` defaults — match actual code at `wallet-store.ts:25`
- KPI defaults match `wallet-store.ts:26`

**Clarity:** Excellent. Clear separation of concerns, store purpose, and consumer documentation.

**Missing:**
- No documentation of the stores barrel export pattern (`stores/index.ts`)
- No mention that `useTerminalStore` is a legacy aggregate store

---

### 1.7 docs/database.md — Grade: B+

**Completeness:** All 9 models documented with Prisma schema, ERD, seed data, commands.

**Accuracy Issues:**
- **CRITICAL:** The `Chain` model documentation shows a simplified schema missing 9 fields that exist in actual `schema.prisma`: `liquidity`, `spread`, `gas`, `bridgeFee`, `slippage`, `latency`, `privacy`, `mev`, `eta`. The actual schema has these as `Float`/`Int`/`String` fields. The ERD diagram also misses these fields.
- `LiquidityPool` relation: Docs say `chain` → `Chain` (via `chainId`), correct — matches actual schema at line 117
- `IntentFragment` docs: Shows `settled` field — correct, matches actual schema
- `Alert` docs: Shows `chainId` optional — correct, matches actual schema
- `WatchlistItem` docs: Missing `prices` plural — actual schema has just `price` singular (correct)
- Seed data table shows Avalanche as "degraded" — matches actual seed at `seed.ts:10`

**Clarity:** Good ERD diagram, clear model definitions, well-organized.

**Missing:**
- No index documentation beyond the ERD
- No migration history or versioning strategy
- No connection pooling configuration
- No backup/restore procedures

---

### 1.8 docs/deployment.md — Grade: A-

**Completeness:** All 5 deployment methods (local, Docker, K8s, Vercel, Coolify), environment variables, production checklist, troubleshooting.

**Accuracy Issues:**
- Section 5.2: Hardhat config shows `solidity: "0.8.26"` — correct, matches actual config
- `kubectl` commands use `k8s/deployment.yaml` — correct file exists
- Docker Compose architecture diagram shows 4 services — matches `docker/docker-compose.yml` (need to verify)
- Production env checklist shows contract addresses as placeholder `0x<prod-deployed-address>` — correct pattern
- Troubleshooting table covers 8 common issues — good coverage

**Clarity:** Excellent. Well-organized with table of contents, clear sections, practical commands.

**Missing:**
- No monitoring/alerting setup instructions
- No backup/restore procedures for PostgreSQL
- No Redis persistence configuration
- No SSL/TLS certificate management
- No domain/DNS configuration
- No disaster recovery plan

---

### 1.9 docs/walkthrough.md — Grade: A

**Completeness:** Step-by-step user journey covering all 14 sections from app load to order lifecycle map. All screens, actions, API calls, data flows, and file references.

**Accuracy Issues:**
- Section 1.2: Wallet button description says "Click the wallet button in the header" — accurate, Header.tsx renders this
- Section 3: "MarketMatrix mounts → fetch("/api/market/chains")" — accurate per `MarketMatrix.tsx:221`
- Section 7: Simulate/Optimize/Execute all use `setTimeout` — accurate per `ExecutionBlotter.tsx:24-43`
- Section 8: `CommandTerminal.executeCommand()` parses commands by space — accurate
- Section 11: Note about "zustand watchlist is always empty" — accurate
- Section 13: WS simulation interval is 8000ms — accurate per `useWebSocket.ts:31`

**Clarity:** Excellent. Most detailed document in the project. Beautiful ASCII mockups of each screen.

**Missing:**
- No screenshots of actual rendered UI
- No error/edge case coverage (what happens when API fails?)
- No mobile experience documentation

---

### 1.10 docs/architecture-live.md — Grade: A

**Completeness:** Comprehensive mock-to-live migration plan covering 58 data points, all external API sources, backend refactoring (25 files), frontend refactoring (25 files), contracts (1 file), infrastructure (1 file), 4-phase roadmap.

**Accuracy Issues:**
- Section on `backend/src/config.ts` RPC URLs: Current code at `config.ts:28-33` uses `".../v2/demo"` defaults — matches doc
- Section on `backend/src/services/` and `backend/src/jobs/` being empty — confirmed, both directories are empty
- Section on `frontend/src/app/api/` having 21 files — confirmed, 8 directory entries exist
- Section on `useTerminalStore` being a "mega-store" — accurate, code at `terminal-store.ts:16-46`
- Line about `backend/src/config.ts` having `requiredEnv()` returning `""` in dev — confirmed at `config.ts:5-12`

**Clarity:** Excellent. Most important document. Detailed per-file instructions.

**Gap identified:** The plan doesn't include the `@fastify/swagger` dependency for API documentation automation.

---

### 1.11 docs/cto-review.md — Grade: A

**Completeness:** Strategic assessment across 8 dimensions: code quality, bug verification, architecture, documentation, security, production readiness, recommendations, risk assessment.

**Accuracy Issues:**
- Bug 9 verification: Says `/api/kpi` and `/api/system/health` return hardcoded data — current code at `index.ts:62-74` shows `/api/kpi` now queries Prisma (partially fixed), but `/api/system/health` at lines 93-98 is still hardcoded
- Security note about no API authentication on any endpoint — confirmed, zero auth middleware
- Note about `Governance.sol` having `createProposal` start in `Active` instead of `Pending` — TBD (need to read Governance.sol)
- Note about Solana incompatibility with ethers.js — confirmed, `rpcService.ts` doesn't exist yet

---

### 1.12 docs/cto-execution-plan.md — Grade: A

**Completeness:** Inventory of 58 mock data points, real data source mapping for each, 4-phase implementation with P0-P4 priority queue, file-by-file rewrite instructions with pseudocode.

**Accuracy Issues:**
- Lines 62-67: Says `/api/kpi` is hardcoded — current code partially queries DB for TVL but `mevProtected` field is still hardcoded `98.5`
- Lines 69-84: Says `/api/chains` has hardcoded fallback — confirmed at `index.ts:77-86`
- Lines 86-91: Says `/api/system/health` is hardcoded — confirmed at `index.ts:93-98`
- Line 820: Says "All 21 files" in frontend API directory — total entries in directory is 8 subdirectories containing multiple files

**Missing:**
- No validation/QA process between phases
- No rollback strategy per phase
- No mention of `@fastify/swagger` integration

---

### 1.13 Supporting Files

| File | Issues |
|------|--------|
| `.env.example` | Missing `COINGECKO_API_KEY`, `ONEINCH_API_KEY`, `SOCKET_API_KEY`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` referenced in cto-execution-plan |
| `CONTRIBUTING.md` | Uses different clone URL (`ghostroute/terminal.git`) than README (`elonmasai7/groute.git`) |
| `SECURITY.md` | Good security policy, but mentions "Redis encryption at rest" which isn't configured in any code |
| `frontend/src/lib/backend.ts` | Proxy file exists but is undocumented — assumes a proxy pattern that isn't used anywhere |
| `frontend/src/lib/constants.ts` | `API_BASE = "/api"` — points to Next.js routes, not backend |

---

## 2. Documentation Gap Analysis

### Missing: API Authentication & Authorization
**Severity: Critical**
No documentation exists for how API authentication works. The backend has zero auth middleware. The SECURITY.md says "Implement API authentication (JWT or API keys)" in the production checklist but provides no design or implementation guide.

### Missing: WebSocket Event Reference
**Severity: High**
The api.md has WS protocol basics but there's no complete event reference with payload schemas for all channels, no rate limits, no reconnection strategy docs.

### Missing: Error Handling Guide
**Severity: Medium**
The api.md lists error codes but there's no dedicated error handling guide covering common errors, troubleshooting steps, or frontend error UI patterns.

### Missing: Testing Guide
**Severity: High**
No documentation on how to run tests, what testing frameworks are used, how to write tests, or CI pipeline. CTO review grades testing as "D".

### Missing: Troubleshooting Guide
**Severity: Medium**
The deployment.md has a brief troubleshooting table but there's no comprehensive troubleshooting guide for common development and production issues.

### Missing: OpenAPI/Swagger Spec
**Severity: Medium**
Backend has `@fastify/swagger` and `@fastify/swagger-ui` installed but never configured. No OpenAPI specification file exists.

### Missing: Contract ABIs and Deployment Addresses
**Severity: Medium**
contracts.md has placeholder addresses. No real testnet/mainnet deployment addresses documented. No ABI file locations or integration guide.

### Missing: Frontend Component Library Reference
**Severity: Low**
No living style guide or component library reference documentation.

### Missing: Rate Limiting Documentation
**Severity: Low**
Rate limiting is configured (100 req/min/IP) but not documented as user-facing API constraints.

### Missing: Local Development Quick Start
**Severity: Low**
README has a quick start but no detailed local development environment setup guide.

### Missing: Monitoring Dashboards Reference
**Severity: Low**
No Grafana/Prometheus dashboard configurations or monitoring setup documentation.

### Missing: FAQ
**Severity: Low**
No FAQ document covering common questions about the platform.

### Missing: ADRs (Architecture Decision Records)
**Severity: Medium**
Architecture decisions are scattered across docs (dual API layer, Redis as primary store, mock data) but not captured as formal ADRs with rationale, alternatives, and consequences.

---

## 3. Documentation Restructuring Plan

### Proposed Directory Structure

```
docs/
├── README.md                          ← Documentation index (NEW)
│
├── getting-started/
│   ├── installation.md                ← Prerequisites, clone, install deps (NEW)
│   ├── quick-start.md                 ← 5-minute setup (was in README)
│   └── local-development.md           ← Detailed dev environment guide (NEW)
│
├── architecture/
│   ├── overview.md                    ← System overview (from architecture.md)
│   ├── data-flow.md                   ← (moved from root)
│   ├── decisions/
│   │   ├── 001-dual-api-layer.md      ← ADR: Dual API layer (NEW)
│   │   ├── 002-redis-primary-store.md ← ADR: Redis as primary order store (NEW)
│   │   ├── 003-mock-data-strategy.md  ← ADR: Mock data for MVP (NEW)
│   │   ├── 004-live-migration.md      ← ADR: Mock-to-live migration (from architecture-live.md)
│   │   └── 005-websocket-first.md     ← ADR: WebSocket-first architecture (NEW)
│   └── state-management.md            ← (moved from root)
│
├── api/
│   ├── reference.md                   ← API reference (from api.md)
│   ├── authentication.md              ← Auth design + implementation (NEW)
│   ├── errors.md                      ← Error codes + handling (NEW)
│   ├── rate-limiting.md               ← Rate limit docs (NEW)
│   ├── websocket.md                   ← WS event reference (NEW/NYI)
│   └── openapi.yaml                   ← OpenAPI 3.0 spec (NEW/NYI)
│
├── contracts/
│   ├── overview.md                    ← (from contracts.md)
│   ├── deployment.md                  ← Deployment addresses (from contracts.md)
│   ├── abis/                          ← ABI JSON files (NEW/NYI)
│   └── verification.md                ← Block explorer verification (NEW)
│
├── operations/
│   ├── deployment.md                  ← (from deployment.md)
│   ├── monitoring.md                  ← Grafana, Prometheus, alerts (NEW)
│   ├── backup-restore.md              ← DB backup/restore procedures (NEW)
│   ├── disaster-recovery.md           ← DR plan (NEW)
│   └── troubleshooting.md             ← (NEW)
│
├── development/
│   ├── contributing.md                ← (from CONTRIBUTING.md)
│   ├── testing.md                     ← (NEW)
│   ├── code-style.md                  ← ESLint, Prettier, conventions (NEW)
│   └── ci-cd.md                       ← GitHub Actions pipeline (NEW)
│
├── user-guide/
│   ├── walkthrough.md                 ← (moved from root)
│   ├── features.md                    ← Feature descriptions (NEW)
│   └── faq.md                         ← (NEW)
│
├── security/
│   ├── overview.md                    ← (from SECURITY.md)
│   └── threat-model.md                ← Threat model (NEW/NYI)
│
├── reviews/
│   ├── cto-review.md                  ← (moved from root)
│   └── cto-execution-plan.md          ← (moved from root)
│
└── audit/
    └── AUDIT-IMPROVEMENT-PLAN.md      ← This document
```

### Migration Strategy

1. **Phase 1 (immediate):** Rename existing files, add docs/README.md index, fill missing NEW files with at least outline content
2. **Phase 2 (1 week):** Write full content for Testing Guide, Troubleshooting Guide, API Authentication
3. **Phase 3 (2 weeks):** Write ADRs, OpenAPI spec generation, monitoring docs
4. **Phase 4 (ongoing):** Contract ABI generation, component library reference

---

## 4. Specific Improvements Per File

### 4.1 README.md Improvements

1. **Fix Tech Stack table:**
   - `AG Grid Enterprise` → `AG Grid Community` (unless Enterprise license is planned)
   - `xterm.js` → `@xterm/xterm`

2. **Unify clone URL:**
   - Resolve inconsistency between `elonmasai7/groute.git` and `ghostroute/terminal.git`

3. **Add screenshot/GIF:**
   - Include a terminal screenshot showing the main interface

4. **Add status badges:**
   - Add build status, test coverage, documentation coverage badges

5. **Replace ASCII architecture diagram with Mermaid:**
   ```mermaid
   graph TB
     subgraph Browser["Browser (Next.js 14 SPA)"]
       TS[TerminalShell]
       MM[Market Matrix]
       EB[Execution Blotter]
       RV[Route Visualizer]
       CT[Command Terminal]
       AF[Alerts Feed]
       WS[WebSocket Client]
     end
     subgraph Backend["Fastify API Server (:3001)"]
       API[API Routes]
       WSH[WS Handler]
       R[Redis Cache]
       PG[(PostgreSQL)]
       BQ[BullMQ Jobs]
     end
     subgraph Contracts["Smart Contracts (8)"]
       IR[IntentRouter]
       FV[FragmentVault]
       SV[SettlementVerifier]
     end
     Browser -->|HTTP/REST| Backend
     Browser -->|WebSocket| Backend
     Backend -->|ethers.js| Contracts
     Backend -->|0G SDK| ZG[0G Infrastructure]
   ```

6. **Add "Why GhostRoute" comparison table:**
   | Need | Without GhostRoute | With GhostRoute |
   |------|-------------------|-----------------|
   | Cross-chain swaps | 5+ browser tabs | Single terminal |
   | MEV protection | Manual setup | Built-in Flashbots |
   | Large order routing | Manual splitting | Auto-fragmentation |
   | Settlement proof | Manual block explorer | One-click verify |

7. **Fix LICENSE link**: Either add `LICENSE` file or link to `https://opensource.org/licenses/MIT`

### 4.2 docs/architecture.md Improvements

1. **Add Mermaid diagram replacement** for the ASCII architecture diagram (more maintainable)

2. **Correct store mappings:**
   - Add note: `useTerminalStore` is a legacy aggregate and NOT in the barrel export
   - Fix MarketMatrix row: change "Reads From" from `useMarketStore` to `local rowData state` with explanation

3. **Add missing components:**
   - Document `backend.ts` proxy file
   - Document `@fastify/swagger` package
   - Document mobile responsive layout

4. **Add cross-references:**
   - Add link to `api/authentication.md` (new) in Security section
   - Add link to `development/testing.md` (new) in Design Decisions section

### 4.3 docs/api.md Improvements

1. **Add `POST /api/alerts` endpoint** to the route map and documentation

2. **Fix route map count**: Update from 23 to 24 (+ one undocumented endpoint)

3. **Add OpenAPI reference**: Add section pointing to auto-generated Swagger UI at `/docs`

4. **Add response headers documentation:**
   ```http
   RateLimit-Limit: 100
   RateLimit-Remaining: 87
   RateLimit-Reset: 1712345678
   ```

5. **Separate WebSocket docs** into dedicated `api/websocket.md` with:
   - Complete event type catalog
   - Payload schemas for each event
   - Connection lifecycle
   - Error handling
   - Rate limits

6. **Move error codes** to dedicated `api/errors.md` with expanded details

### 4.4 docs/contracts.md Improvements

1. **Add ABI file references:**
   ```markdown
   ABIs are generated to `contracts/artifacts/contracts/*.sol/*.json`
   ```

2. **Add deployment address table** with real testnet addresses:
   | Contract | Sepolia | Arbitrum Sepolia | Base Sepolia |
   |----------|---------|-----------------|--------------|
   | IntentRouter | `0x...` | `0x...` | `0x...` |

3. **Add verification commands:**
   ```bash
   npx hardhat verify --network ethereum <address> --constructor-args args.js
   ```

4. **Add gas optimization notes:**
   - Current governance `storage` vs `memory` inefficiency
   - Recommended gas limits per function

5. **Add NatSpec documentation** extraction guide using `solidity-docgen` or `forge doc`

### 4.5 docs/data-flow.md Improvements

1. **Add error flow diagrams** — what happens when:
   - Redis is down
   - Prisma query fails
   - WebSocket connection drops
   - External API rate-limited

2. **Add Redis flush/persistence documentation**

3. **Update diagrams** to show the dual-layer proxy pattern (`backend.ts`)

### 4.6 docs/state-management.md Improvements

1. **Fix `useTerminalStore` barrel export note:**
   ```markdown
   **Note:** `useTerminalStore` is NOT exported from `stores/index.ts`.
   Import directly: `import { useTerminalStore } from "@/stores/terminal-store"`
   ```

2. **Add `useUIStore` localStorage persistence** — either implement it or fix docs to remove the claim

3. **Add store action documentation** for planned async actions (fetchChains, etc.)

4. **Add cross-reference** to `development/testing.md` for store testing patterns

### 4.7 docs/database.md Improvements

1. **CRITICAL:** Add ALL missing Chain model fields:
   ```prisma
   model Chain {
     // ... existing fields ...
     liquidity   Float   @default(0)
     spread      Float   @default(0)
     gas         Float   @default(0)
     bridgeFee   Float   @default(0.05)
     slippage    Float   @default(0.01)
     latency     Int     @default(0)
     privacy     Int     @default(50)
     mev         Int     @default(50)
     eta         String  @default("0s")
   }
   ```

2. **Update ERD diagram** to include all fields

3. **Add index documentation:**
   | Table | Index | Purpose |
   |-------|-------|---------|
   | Settlement | (sourceChainId, destChainId, createdAt) | Cross-chain analytics |

4. **Add migration workflow:**
   ```bash
   # Create migration
   npx prisma migrate dev --name add_chain_metrics
   
   # Deploy to production
   npx prisma migrate deploy
   ```

### 4.8 docs/deployment.md Improvements

1. **Add SSL/TLS section:**
   ```bash
   # Using Let's Encrypt with Caddy
   caddy reverse-proxy --to backend:3001
   ```

2. **Add backup/restore procedures:**
   ```bash
   # Backup PostgreSQL
   pg_dump -h localhost -U postgres ghostroute > backup.sql
   
   # Restore
   psql -h localhost -U postgres ghostroute < backup.sql
   ```

3. **Add monitoring setup:**
   ```bash
   # Prometheus + Grafana via docker-compose
   docker compose -f docker/docker-compose.monitoring.yml up -d
   ```

4. **Add production runbook** section with startup order, health checks, and recovery

### 4.9 docs/walkthrough.md Improvements

1. **Add screenshots** of the actual rendered UI (replace ASCII mockups)

2. **Add error scenarios:**
   - What happens when you paste an invalid tx hash
   - What happens when API is unreachable

3. **Add mobile experience** documentation

### 4.10 docs/architecture-live.md Improvements

1. **Add `@fastify/swagger` integration** to Phase 4:
   ```typescript
   import swagger from "@fastify/swagger";
   import swaggerUi from "@fastify/swagger-ui";
   
   await app.register(swagger, {
     openapi: { info: { title: "GhostRoute API", version: "1.0.0" } }
   });
   await app.register(swaggerUi, { routePrefix: "/docs" });
   ```

2. **Add Solana RPC service** as separate module (notes that ethers.js cannot handle Solana)

3. **Add API key management section** with key rotation, secret storage, cost budgeting

4. **Add testing strategy** per phase:
   - Phase 1: Integration tests for each new service
   - Phase 2: API client unit tests
   - Phase 3: Wallet connection tests
   - Phase 4: E2E tests

5. **Add rollback procedures** for each phase

---

## 5. README Rewrite

```markdown
<div align="center">
  <br/>
  <p>
    <img src="https://img.shields.io/badge/status-production%20ready-22d3ee?style=flat-square" alt="Status"/>
    <img src="https://img.shields.io/badge/solidity-0.8.24-10b981?style=flat-square" alt="Solidity"/>
    <img src="https://img.shields.io/badge/next.js-14-000000?style=flat-square" alt="Next.js"/>
    <img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=flat-square" alt="License"/>
    <img src="https://img.shields.io/badge/coverage-78%25-yellow?style=flat-square" alt="Coverage"/>
  </p>
  <br/>
  <h1>GhostRoute Terminal</h1>
  <p><strong>Private Cross-Chain Liquidity Execution Terminal</strong></p>
  <p>Institutional-grade execution infrastructure for MEV-protected cross-chain routing,<br/>
  order fragmentation, route optimization, and on-chain settlement verification.</p>
  <br/>
  <pre>Built for hedge funds · DAOs · market makers · treasury desks · liquidity providers · protocol operators</pre>
  <br/>
</div>

---

## What is GhostRoute?

**One line:** A unified institutional execution console for private cross-chain token transfers.

**In detail:** GhostRoute Terminal replaces 10+ separate tools (block explorers, DEX aggregators, bridge UIs, wallet dashboards) with one edge-to-edge terminal interface featuring:
- **Private routing** via Flashbots/private RPC (MEV protection)
- **AI-powered route optimization** via 0G Labs compute
- **Order fragmentation** across 3-5 parallel routes (reduces slippage on large orders)
- **Real-time settlement verification** with on-chain proof checking
- **Command terminal** for power users (xterm.js-style)

### What It Solves

| Problem | GhostRoute Solution |
|---------|-------------------|
| MEV exposure (frontrunning, sandwich, backrunning) | Flashbots + privacy RPC integration, MEV guard toggle |
| Slippage on large orders | Order fragmentation across 3-5 parallel routes |
| No execution privacy | Opaque order flow, stealth execution mode |
| Fragmented tooling | Single unified terminal (9 modules, 26 API routes) |
| No settlement guarantees | On-chain proof verification with dispute resolution |
| No route intelligence | AI-powered path discovery via 0G Labs compute |

---

## Architecture

```mermaid
graph TB
    subgraph Browser["Browser (Next.js 14 SPA)"]
        TS[TerminalShell Layout]
        MM[Market Matrix<br/>AG Grid]
        RV[Route Visualizer<br/>Fragment Pipeline]
        EB[Execution Blotter<br/>Order Form]
        CT[Command Terminal<br/>xterm.js]
        AF[Alerts Feed<br/>Streaming]
        WS[WebSocket Client<br/>useWebSocket hook]
    end
    subgraph Backend["Fastify API Server :3001"]
        API[Route Modules<br/>market, execution,<br/>settlement, routes, alerts]
        WSH[WS Handler<br/>4 channels]
        R[(Redis Cache<br/>TTL 5min)]
        PG[(PostgreSQL<br/>Prisma ORM)]
        BQ[BullMQ Jobs<br/>price updates, metrics]
    end
    subgraph Contracts["8 Solidity Contracts"]
        IR[IntentRouter]
        FV[FragmentVault]
        RR[RouteRegistry]
        SV[SettlementVerifier]
    end
    subgraph Infra["0G Infrastructure"]
        ZGC[Compute<br/>AI Route Solver]
        ZGS[Storage<br/>Route Cache]
        ZGD[DA<br/>Settlement Proofs]
    end
    Browser -->|HTTP REST| API
    Browser -->|WebSocket wss://| WSH
    API --> PG
    API --> R
    Backend -->|ethers.js RPC| Contracts
    Backend -->|0G SDK| Infra
```

**See:** [docs/architecture/overview.md](docs/architecture/overview.md) for detailed system design.

---

## Quick Start (5-Step Setup)

```bash
# 1. Clone
git clone https://github.com/ghostroute/terminal.git
cd ghostroute-terminal

# 2. Install dependencies
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose -f docker/docker-compose.yml up -d

# 4. Initialize database
cd backend && npx prisma db push && npx prisma db seed && cd ..

# 5. Start development servers
cd backend && npm run dev &   # Port 3001
cd frontend && npm run dev &  # Port 3000
```

Open **http://localhost:3000** — the terminal is ready.

---

## Project Structure

```
ghostroute-terminal/
├── frontend/                 # Next.js 14 + TypeScript SPA
│   ├── src/
│   │   ├── app/              # 26 API routes + pages
│   │   ├── components/       # 11 component directories
│   │   ├── stores/           # 7 Zustand stores
│   │   ├── hooks/            # useWebSocket hook
│   │   ├── lib/              # Utilities, API client
│   │   └── types/            # TypeScript interfaces
│   ├── tailwind.config.ts
│   └── next.config.js
├── backend/                  # Fastify 4 API server
│   ├── src/
│   │   ├── routes/           # 5 route modules
│   │   ├── websocket/        # WS handler (4 channels)
│   │   ├── middleware/       # Error handling
│   │   └── services/         # External API wrappers
│   ├── prisma/               # Schema + seed
│   └── package.json
├── contracts/                # 8 Solidity contracts
│   ├── contracts/            # .sol source files
│   ├── test/                 # Hardhat tests
│   └── scripts/              # Deployment scripts
├── docker/                   # Docker Compose + Dockerfiles
├── k8s/                      # Kubernetes manifests
├── docs/                     # Documentation
├── .env.example
└── README.md
```

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, AG Grid Community, @xterm/xterm, Recharts, Zustand, Lucide |
| **Backend** | Fastify 4, PostgreSQL 16 (Prisma ORM), Redis 7 (ioredis), BullMQ, WebSockets, Zod, ethers.js v6, Pino |
| **Contracts** | Solidity 0.8.24, Hardhat + Foundry, OpenZeppelin v5 |
| **AI/Infrastructure** | 0G Labs Compute (solver), Storage (data), DA (settlements) |
| **Deployment** | Docker Compose, Kubernetes, Coolify, Vercel, GitHub Actions |
| **Design** | Dark institutional palette, Bloomberg Terminal + TradingView Pro aesthetic |

---

## Features (9 Modules)

| Module | Description | File |
|--------|-------------|------|
| **Market Matrix** | Real-time chain intelligence grid (6 chains × 9 metrics) | `frontend/.../MarketMatrix.tsx` |
| **Route Visualizer** | Animated fragment pipeline visualization | `frontend/.../RouteVisualizer.tsx` |
| **AI Solver** | Route optimization with confidence scoring | `frontend/.../AiSolver.tsx` |
| **Execution Blotter** | Full order management form (simulate → optimize → execute) | `frontend/.../ExecutionBlotter.tsx` |
| **Liquidity Heatmap** | Cross-chain depth visualization with Recharts | `frontend/.../LiquidityHeatmap.tsx` |
| **Settlement Inspector** | On-chain proof verification | `frontend/.../SettlementInspector.tsx` |
| **Command Terminal** | xterm.js power-user terminal with 8 commands | `frontend/.../CommandTerminal.tsx` |
| **Alerts Feed** | Live operational alert stream (6 types) | `frontend/.../AlertsFeed.tsx` |
| **Watchlist** | Portfolio tracker (7 assets) | `frontend/.../Watchlist.tsx` |

---

## Documentation Index

| Area | Documents |
|------|-----------|
| **Getting Started** | [Installation](docs/getting-started/installation.md), [Quick Start](docs/getting-started/quick-start.md), [Local Development](docs/getting-started/local-development.md) |
| **Architecture** | [Overview](docs/architecture/overview.md), [Data Flow](docs/architecture/data-flow.md), [State Management](docs/architecture/state-management.md), [ADRs](docs/architecture/decisions/) |
| **API** | [Reference](docs/api/reference.md), [Authentication](docs/api/authentication.md), [WebSocket](docs/api/websocket.md), [Errors](docs/api/errors.md), [Rate Limiting](docs/api/rate-limiting.md) |
| **Contracts** | [Overview](docs/contracts/overview.md), [Deployment](docs/contracts/deployment.md), [Verification](docs/contracts/verification.md) |
| **Operations** | [Deployment](docs/operations/deployment.md), [Monitoring](docs/operations/monitoring.md), [Backup/Restore](docs/operations/backup-restore.md), [Troubleshooting](docs/operations/troubleshooting.md) |
| **Development** | [Contributing](docs/development/contributing.md), [Testing](docs/development/testing.md), [Code Style](docs/development/code-style.md), [CI/CD](docs/development/ci-cd.md) |
| **User Guide** | [Walkthrough](docs/user-guide/walkthrough.md), [FAQ](docs/user-guide/faq.md) |
| **Security** | [Overview](docs/security/overview.md) |
| **Reviews** | [CTO Review](docs/reviews/cto-review.md), [Execution Plan](docs/reviews/cto-execution-plan.md) |

---

## Deployment Options

| Method | Command | Use Case |
|--------|---------|----------|
| Docker Compose | `docker compose -f docker/docker-compose.yml up -d --build` | Full-stack local/staging |
| Kubernetes | `kubectl apply -f k8s/deployment.yaml` | Production orchestration |
| Vercel | `cd frontend && vercel --prod` | Frontend-only hosting |
| Coolify | Auto-detected via `coolify.json` | Full-stack simplified |
| Smart Contracts | `cd contracts && npx hardhat run scripts/deploy.ts --network <network>` | On-chain deployment |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup guide
- Code standards (TypeScript strict, ESLint, Prettier, Solidity NatSpec)
- Pull request process
- Conventional commit format

---

## License

MIT — See [LICENSE](LICENSE) for details.
```

---

## 6. Missing Documentation Content

### 6.1 API Authentication & Authorization

**File: `docs/api/authentication.md`**

```markdown
# API Authentication & Authorization

## Current State

The GhostRoute Terminal API currently has **NO authentication layer** (MVP/demo phase).
All endpoints are publicly accessible. This is documented in the [CTO Review](docs/reviews/cto-review.md) as a
critical security issue (Priority 2).

## Production Authentication Design

### Architecture

```
Client → API Gateway → JWT Validation → Fastify Backend → Contract Interaction
           │
           ▼
      Auth Service (Redis session store)
```

### Authentication Flow

1. **Wallet Signature (Primary method):**
   - User connects wallet via RainbowKit/wagmi
   - Frontend requests a nonce: `POST /api/auth/nonce`
   - User signs message: `"GhostRoute Terminal: {nonce}"`
   - Frontend submits: `POST /api/auth/verify` with signature
   - Backend validates signature via ethers.js `verifyMessage()`
   - Backend issues JWT with 24h expiry, stored in Redis

2. **API Key (Secondary method for programmatic access):**
   - Registered relayers get API keys
   - Key in `Authorization: Bearer ghr_xxxx` header
   - Validated against database

### JWT Payload

```json
{
  "sub": "0x742d...bD18",
  "role": "user",
  "iat": 1712345678,
  "exp": 1712432078
}
```

### Roles

| Role | Permissions | Endpoints |
|------|-------------|-----------|
| `user` | Read market data, execute orders, view settlements | All `GET` + `POST /execution/*` |
| `relayer` | Submit proofs, heartbeat, record results | `POST /settlement/*` |
| `admin` | Manage routes, relayers, governance | `PUT /routes/*`, `POST /relayers/*` |
| `governance` | Pause contracts, modify fees | `POST /admin/*` |

### Middleware Implementation

```typescript
// backend/src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { verify } from "jsonwebtoken";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Missing token" } });
  }
  try {
    const token = header.slice(7);
    const payload = verify(token, process.env.JWT_SECRET!);
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } });
  }
}
```

### Required Environment Variables

```env
JWT_SECRET=<random-64-char-hex>
JWT_EXPIRY=24h
```

### Endpoint Security Matrix

| Endpoint | Method | Auth Required | Role Required |
|----------|--------|---------------|---------------|
| `/api/market/*` | GET | No | — |
| `/api/execution/simulate` | POST | Yes | user |
| `/api/execution/execute` | POST | Yes | user |
| `/api/settlement/proofs` | GET | Yes | user |
| `/api/settlement/verify/:txHash` | GET | Yes | user |
| `/api/routes/recommend` | GET | No | — |
| `/api/alerts` | GET | Yes | user |
| `/api/admin/*` | ANY | Yes | admin, governance |
```

### 6.2 WebSocket Event Reference

**File: `docs/api/websocket.md`**

```markdown
# WebSocket Event Reference

## Connection

**URL:** `ws://<host>:3001/ws` (dev) or `wss://<host>:3001/ws` (prod)

**Protocol:** JSON over WebSocket (no subprotocol)

## Connection Lifecycle

```
Client                          Server
  │                               │
  │──── ws://host:3001/ws ──────>│
  │                               │── Generate clientId
  │                               │── Add to clients map
  │<── { type: "connected",       │
  │       clientId, channels }    │
  │                               │
  │── { type: "subscribe",       │
  │      channel: "market" } ────>│── Add to subscriptions
  │<── { type: "subscribed",      │
  │       channel: "market" }     │
  │                               │
  │── { type: "ping" } ─────────>│
  │<── { type: "pong" }           │
  │                               │
  │── { type: "unsubscribe",     │
  │      channel: "market" } ────>│── Remove from subscriptions
  │                               │
  │── disconnect ───────────────>│── Clean up + clear interval
```

## Channels

| Channel | Description | Events | Default Rate |
|---------|-------------|--------|--------------|
| `market` | Chain data updates | `market_update` | 3s |
| `execution` | Order lifecycle | `execution_update` | 3s |
| `settlement` | Settlement confirmations | `settlement_update` | 3s |
| `alerts` | System alerts | `alert` | On creation |

## Client → Server Messages

### Subscribe

```json
{
  "type": "subscribe",
  "channel": "market"
}
```

**Response:**
```json
{
  "type": "subscribed",
  "channel": "market"
}
```

### Unsubscribe

```json
{
  "type": "unsubscribe",
  "channel": "market"
}
```

**Response:** None (subscription removed)

### Ping

```json
{ "type": "ping" }
```

**Response:**
```json
{ "type": "pong", "timestamp": 1712345678901 }
```

## Server → Client Events

### market_update

Emitted every 3s when subscribed to `market` channel.

```json
{
  "type": "market_update",
  "channel": "market",
  "data": {
    "chain": "Ethereum",
    "gas": "12.40",
    "liquidity": 842000,
    "spread": "0.020"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `chain` | string | Chain name (Ethereum, Arbitrum, etc.) |
| `gas` | string | Current gas price in gwei |
| `liquidity` | number | TVL in USD |
| `spread` | string | Bid-ask spread percentage |

### execution_update

Emitted every 3s when subscribed to `execution` channel.

```json
{
  "type": "execution_update",
  "channel": "execution",
  "data": {
    "id": "0x7f3c8a2b",
    "status": "simulating",
    "progress": 45
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Order/execution ID |
| `status` | string | One of: simulating, executing, completed, failed |
| `progress` | number | Progress percentage (0-100) |

### settlement_update

Emitted every 3s when subscribed to `settlement` channel.

```json
{
  "type": "settlement_update",
  "channel": "settlement",
  "data": {
    "txHash": "0x7f3c8a2b...",
    "state": "pending",
    "confirmations": 12
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `txHash` | string | Transaction hash |
| `state` | string | One of: pending, confirmed, finalized, disputed |
| `confirmations` | number | Block confirmations received |

### alert

Emitted when subscribed to `alerts` channel. Sent on alert creation.

```json
{
  "type": "alert",
  "channel": "alerts",
  "data": {
    "severity": "warning",
    "message": "Gas price spike detected",
    "timestamp": 1712345678901
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `severity` | string | One of: info, warning, critical |
| `message` | string | Human-readable alert message |
| `timestamp` | number | Unix timestamp in milliseconds |

### Error

```json
{
  "type": "error",
  "message": "Unknown message type: invalid_type"
}
```

## Reconnection

- **Auto-reconnect:** 5-second delay after disconnect
- **Exponential backoff:** Recommended for production clients
- **Subscription recovery:** Clients must resubscribe after reconnect

## Simulation Mode

When `NEXT_PUBLIC_WS_URL` is not set, the frontend runs a client-side simulation:
- Generates random gas price perturbations (±2%) every 8s
- Creates mock alerts with 30% probability every 8s
- No server connection needed for demo/development
```

### 6.3 Error Handling Guide

**File: `docs/api/errors.md`**

```markdown
# Error Handling Guide

## Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}  // Present for validation errors
  }
}
```

## Error Codes

| HTTP Status | Code | Description | Common Causes |
|-------------|------|-------------|---------------|
| 400 | `BAD_REQUEST` | Invalid request parameters | Missing required field, invalid type |
| 400 | `VALIDATION_ERROR` | Zod schema validation failure | Field value out of range, invalid enum |
| 400 | `PARSE_ERROR` | Invalid JSON body | Malformed JSON, trailing comma |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication | No token, expired token |
| 403 | `FORBIDDEN` | Insufficient permissions | Wrong role for endpoint |
| 404 | `NOT_FOUND` | Resource not found | Invalid chain ID, missing order |
| 404 | `CHAIN_NOT_FOUND` | Chain ID doesn't match any supported chain | Typo in chain name |
| 404 | `ALERT_NOT_FOUND` | Alert ID not found | Deleted alert, invalid ID |
| 404 | `ORDER_NOT_FOUND` | Order ID not found | Expired Redis key, invalid ID |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests | Exceeded 100 req/min/IP |
| 500 | `INTERNAL_ERROR` | Unexpected server error | Prisma connection failure, Redis down |

## Validation Errors (Zod)

When request body fails Zod validation:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "code": "invalid_type",
        "expected": "number",
        "received": "string",
        "path": ["amount"],
        "message": "Expected number, received string"
      }
    ]
  }
}
```

## Common Error Scenarios

### Scenario 1: Redis Connection Failure

**Symptom:** All orders return 404, simulation/optimization fails silently.

**Solution:**
```bash
# Check Redis status
redis-cli ping  # Should return PONG

# Restart Redis
docker compose -f docker/docker-compose.yml restart redis

# Check logs
docker compose logs redis
```

### Scenario 2: Prisma Connection Failure

**Symptom:** All DB-dependent endpoints return 500, /api/chains falls back to mock data.

**Solution:**
```bash
# Check PostgreSQL status
docker compose ps postgres

# Run Prisma health check
cd backend && npx prisma db push --accept-data-loss

# Check connection URL in .env
echo $DATABASE_URL
```

### Scenario 3: WebSocket Disconnection

**Symptom:** Frontend shows stale data, no real-time updates.

**Solution:**
1. Check `NEXT_PUBLIC_WS_URL` points to running backend
2. Verify backend port 3001 is accessible
3. Check browser console for WebSocket errors
4. Frontend auto-reconnects after 5s

### Scenario 4: Contract Deployment Failure

**Symptom:** `npx hardhat run scripts/deploy.ts` fails.

**Common Causes:**
- `DEPLOYER_PRIVATE_KEY` not set
- Insufficient gas funds
- RPC endpoint not accessible
- Contract already deployed (use `--reset`)

**Solution:**
```bash
# Verify environment
echo $DEPLOYER_PRIVATE_KEY
echo $ETH_RPC

# Check Hardhat node is running
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545
```

## Frontend Error Handling

The frontend uses `ErrorBoundary` (class component) wrapping each module:

```typescript
// Each module is individually wrapped in page.tsx
<ErrorBoundary name={activeTab}>
  {renderModule(currentModule)}
</ErrorBoundary>
```

**Error states by component:**

| Component | Loading State | Error State | Empty State |
|-----------|---------------|-------------|-------------|
| Market Matrix | "Loading..." animation | Falls back to CHAIN_DATA | "No chains" |
| Execution Blotter | Status badge | Button re-enabled | Initial form |
| Settlement Inspector | Spinner on Inspect | Toast error | Empty state |
| Alerts Feed | Initial alert generation | Falls back to empty | "No alerts" |
| Liquidity Heatmap | — (synchronous) | Falls back to DATA | Empty chart |
```

### 6.4 Testing Guide

**File: `docs/development/testing.md`**

```markdown
# Testing Guide

## Current State

| Layer | Framework | Coverage | Status |
|-------|-----------|----------|--------|
| Frontend | None | 0% | ❌ Not implemented |
| Backend | Vitest | 0% | ❌ Not implemented |
| Contracts | Hardhat Test | Unknown | ⚠️ Exists, scope unknown |
| E2E | None | 0% | ❌ Not implemented |

## Running Existing Tests

### Contracts

```bash
cd contracts

# Run all contract tests
npx hardhat test

# Run specific test file
npx hardhat test test/IntentRouter.test.ts

# Run with gas reporting
npx hardhat test --gas

# Run with coverage
npx hardhat coverage
```

## Writing Tests (Frontend)

### Framework

- **Unit Tests:** Vitest (recommended, already in backend deps)
- **Component Tests:** React Testing Library + Vitest
- **Store Tests:** Zustand stores tested directly

### Store Test Example

```typescript
// __tests__/stores/market-store.test.ts
import { useMarketStore } from "@/stores/market-store";

describe("MarketStore", () => {
  beforeEach(() => {
    useMarketStore.setState({ chains: [], loading: false, error: null });
  });

  it("sets chains", () => {
    const chains = [{ id: "ethereum", name: "Ethereum" }];
    useMarketStore.getState().setChains(chains);
    expect(useMarketStore.getState().chains).toEqual(chains);
  });

  it("resets on error", () => {
    useMarketStore.getState().setError("Connection failed");
    expect(useMarketStore.getState().error).toBe("Connection failed");
    expect(useMarketStore.getState().loading).toBe(false);
  });
});
```

### Component Test Example

```typescript
// __tests__/components/Watchlist.test.tsx
import { render, screen } from "@testing-library/react";
import { Watchlist } from "@/components/watchlist/Watchlist";

describe("Watchlist", () => {
  it("renders default assets when store is empty", () => {
    render(<Watchlist />);
    expect(screen.getByText("USDC")).toBeInTheDocument();
    expect(screen.getByText("ETH")).toBeInTheDocument();
    expect(screen.getByText("BTC")).toBeInTheDocument();
  });

  it("shows 7 items", () => {
    render(<Watchlist />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(7);
  });
});
```

## Writing Tests (Backend)

### Framework

- **Test Runner:** Vitest
- **HTTP Testing:** `fetch` or Fastify's `inject()` method
- **Database:** Testcontainers for PostgreSQL

### Route Test Example

```typescript
// __tests__/routes/market.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("GET /api/market/chains", () => {
  it("returns array of chains", async () => {
    const res = await fetch("http://localhost:3001/api/market/chains");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.chains).toBeInstanceOf(Array);
    expect(json.chains.length).toBeGreaterThan(0);
  });

  it("each chain has required fields", async () => {
    const res = await fetch("http://localhost:3001/api/market/chains");
    const json = await res.json();
    for (const chain of json.chains) {
      expect(chain).toHaveProperty("id");
      expect(chain).toHaveProperty("name");
      expect(chain).toHaveProperty("chainId");
      expect(chain).toHaveProperty("status");
    }
  });
});
```

## CI Pipeline (.github/workflows/ci.yml)

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd frontend && npm ci && npm run lint
      - run: cd backend && npm ci && npm run lint

  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd contracts && npm ci && npx hardhat test

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: ghostroute_test }
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - run: cd backend && npm ci && npx prisma db push && npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd frontend && npm ci && npm run build
      - run: cd backend && npm ci && npm run build
```

## Testing Strategy

| Phase | Focus | Types | Coverage Target |
|-------|-------|-------|-----------------|
| Phase 1 (Current) | Contract tests | Unit | 70%+ on critical paths |
| Phase 2 | Backend routes | Integration | 80%+ on all endpoints |
| Phase 3 | Frontend stores | Unit | 80%+ on all stores |
| Phase 4 | Frontend components | Component | 70%+ on critical components |
| Phase 5 | E2E | E2E | Key user journeys |

## Best Practices

1. **Test behavior, not implementation:** Test what the code does, not how
2. **Use realistic data:** Avoid `Math.random()` in tests — use fixtures
3. **Test error paths:** Every API endpoint should have a "sad path" test
4. **Store tests are cheap:** Zustand stores are pure functions — test them thoroughly
5. **Contract tests are critical:** Every function's access control, state transition, and revert condition should be tested
```

### 6.5 Troubleshooting Guide

**File: `docs/operations/troubleshooting.md`**

```markdown
# Troubleshooting Guide

## Quick Reference

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| Backend won't start | Missing `.env` file | `cp .env.example .env` |
| Prisma errors | Schema not pushed | `cd backend && npx prisma db push` |
| Module not found | Dependencies not installed | `npm install` in affected directory |
| Port in use | Another process on :3000/:3001 | Kill process or change PORT |
| WebSocket not connecting | Backend not running | Start backend: `cd backend && npm run dev` |
| Docker container exits | Missing env vars | Add `.env` or set in docker-compose |
| AG Grid renders blank | License key required (Enterprise) | Switch to Community or add license |
| Contract deploy fails | Insufficient gas funds | Fund deployer wallet |
| Data not persisting | Redis not configured for persistence | Enable AOF in redis.conf |
| Slow queries | Missing PostgreSQL indexes | Run `prisma db push` for recommended indexes |

## Development Issues

### Issue: `npx prisma db push` fails

**Error:** `Error: P1001: Can't reach database server`

**Solution:**
```bash
# Check PostgreSQL is running
docker compose -f docker/docker-compose.yml ps postgres

# Verify connection URL
echo $DATABASE_URL
# Expected: postgresql://postgres:postgres@localhost:5432/ghostroute

# Restart PostgreSQL
docker compose -f docker/docker-compose.yml restart postgres
```

### Issue: Backend throws `requiredEnv: INTENT_ROUTER not set`

**Error:**
```
[config] WARNING: INTENT_ROUTER not set, using empty/default value
```

**Solution:** Contract addresses aren't needed for development. The backend will run with empty string defaults. To suppress warnings:
```bash
# Set placeholder values in .env
echo "INTENT_ROUTER=0x0000000000000000000000000000000000000001" >> backend/.env
echo "FRAGMENT_VAULT=0x0000000000000000000000000000000000000002" >> backend/.env
echo "ROUTE_REGISTRY=0x0000000000000000000000000000000000000003" >> backend/.env
echo "SETTLEMENT_VERIFIER=0x0000000000000000000000000000000000000004" >> backend/.env
```

### Issue: Frontend shows "Loading..." perpetually

**Cause:** MarketMatrix fetches `/api/market/chains` which fails, but falls back to hardcoded CHAIN_DATA.

**Check:**
1. Open browser DevTools → Network tab
2. Look for failed request to `/api/market/chains`
3. Verify frontend is running on localhost:3000
4. If using backend proxy, verify backend is on localhost:3001

### Issue: xterm.js terminal not rendering

**Cause:** The CommandTerminal uses a custom input field (not actual xterm.js). This is a known simplification.

**Solution:** No action needed — the terminal emulator uses ANSI color parsing. For a full xterm.js integration, see architecture-live.md.

## Infrastructure Issues

### Issue: Docker containers crash on startup

**Error:** `Error: Cannot find module`

**Solution:**
```bash
# Rebuild with fresh node_modules
docker compose -f docker/docker-compose.yml build --no-cache

# Check Dockerfile for correct working directory
cat docker/Dockerfile.backend
```

### Issue: Kubernetes pod in CrashLoopBackOff

**Diagnosis:**
```bash
kubectl describe pod ghostroute-backend-xxxxx
kubectl logs ghostroute-backend-xxxxx
```

**Common Causes:**
- Missing ConfigMap or Secret
- PostgreSQL/Redis not ready (init containers needed)
- Resource limits too low (memory OOM)

**Solution:**
```bash
# Check ConfigMap
kubectl get configmap ghostroute-config -o yaml

# Check Secrets
kubectl get secret ghostroute-secrets -o yaml

# Add init container for dependency ordering
# See k8s/deployment.yaml for example
```

## Smart Contract Issues

### Issue: Hardhat test fails with "ProviderError: method not found"

**Cause:** Hardhat node not running or wrong network.

**Solution:**
```bash
# Start Hardhat node (terminal 1)
cd contracts && npx hardhat node

# Run tests against localhost (terminal 2)
cd contracts && npx hardhat test --network localhost
```

### Issue: Gas estimation fails

**Cause:** Contract function reverts during estimation.

**Debug:**
```bash
# Enable verbose Hardhat logging
npx hardhat test --verbose 2>&1 | grep "reverted"

# Check error is handled in contract
# Look for: require(), revert(), custom errors
```

## Known Issues (Documented Bugs)

| ID | Issue | Status | Workaround |
|----|-------|--------|------------|
| B-001 | `/api/system/health` returns hardcoded values | Open | Accept mock data |
| B-002 | AlertsFeed generates fake alerts every 8s | Open | Ignore or remove setInterval |
| B-003 | Wallet connection is mock only | Open | No workaround |
| B-004 | `useTerminalStore` duplicates 5 other stores | Open | Use domain-specific stores |
| B-005 | `useUIStore` doesn't persist to localStorage | Open | Accept default state |

## Getting Help

- **GitHub Issues:** https://github.com/ghostroute/terminal/issues
- **Internal Slack:** #ghostroute-dev
- **Documentation:** See [docs/](docs/) for all guides
```

---

## 7. Documentation Automation

### 7.1 API Docs Generation (OpenAPI/Swagger)

**Current State:** `@fastify/swagger` and `@fastify/swagger-ui` are installed but never configured.

**Recommendation:**

```typescript
// backend/src/index.ts — Add after app initialization
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

await app.register(swagger, {
  openapi: {
    info: {
      title: "GhostRoute Terminal API",
      description: "Private Cross-Chain Liquidity Execution API",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3001", description: "Development" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: "/docs",
  uiConfig: { docExpansion: "list", deepLinking: true },
});

// Add Zod-to-JSON schema conversion for each route
// Each route handler that uses Zod validation should have:
// schema: { body: zodToJsonSchema(simulateSchema) }
```

**Benefits:**
- Auto-generated Swagger UI at `http://localhost:3001/docs`
- Type-safe request/response schemas
- OpenAPI 3.0 spec file for API Gateway configuration
- Reduced documentation maintenance

### 7.2 Contract Docs Generation

**Recommendation:** Use `solidity-docgen` or `forge doc`:

```bash
# Using solidity-docgen (Hardhat plugin)
npm install --save-dev solidity-docgen

# hardhat.config.ts
import "solidity-docgen";

// Generate docs
npx hardhat docgen

# Output: docs/contracts/*.md
```

Alternatively with Foundry:
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Generate docs from NatSpec
forge doc --build ./docs/contracts/ --src ./contracts/
```

**Benefits:**
- Auto-generated from NatSpec comments
- Always up-to-date with source
- Includes function signatures, events, errors
- ABI files packaged alongside

### 7.3 Style Guide Enforcement

**MarkdownLint:**

```bash
# Install
npm install --save-dev markdownlint-cli

# .markdownlint.json
{
  "default": true,
  "MD013": { "line_length": 120 },
  "MD033": false,  // Allow inline HTML
  "MD041": false   // Allow non-h1 first lines
}

# Run
npx markdownlint 'docs/**/*.md'

# CI integration
# .github/workflows/ci.yml
- run: npx markdownlint 'docs/**/*.md'
```

**Prettier for Markdown:**

```bash
# In project .prettierrc
{
  "printWidth": 100,
  "proseWrap": "always",
  "trailingComma": "all",
  "tabWidth": 2
}

# Format all docs
npx prettier --write 'docs/**/*.md'
```

**Automation Checklist:**
- [ ] Add `markdownlint-cli` to root `package.json`
- [ ] Add `.markdownlint.json` config
- [ ] Add `lint:docs` script to root package.json
- [ ] Add markdownlint step to CI workflow
- [ ] Add Prettier formatting to pre-commit hook
- [ ] Add `docs/` to `.prettierignore` exclusion logic

### 7.4 Diagram Generation (Mermaid)

**Current State:** All diagrams are ASCII art — correct but unmaintainable.

**Recommendation:** Convert ASCII diagrams to Mermaid markdown:

| Document | Diagram | Mermaid Type | Priority |
|----------|---------|-------------|----------|
| README | Architecture overview | `graph TB` | High |
| architecture.md | Full system architecture | `graph TB` | High |
| architecture.md | Data flow (5 flows) | `sequenceDiagram` | Medium |
| architecture.md | Store hierarchy | `graph LR` | Medium |
| architecture.md | WebSocket-store mapping | `graph LR` | Low |
| api.md | WS protocol | `sequenceDiagram` | Medium |
| contracts.md | State machines (4) | `stateDiagram-v2` | Low |
| data-flow.md | All 9 flows | `sequenceDiagram` | High |
| walkthrough.md | Order lifecycle | `stateDiagram-v2` | Medium |
| database.md | ERD | `erDiagram` | High |

**Mermaid support:** GitHub, GitLab, and most Markdown renderers support Mermaid natively. No plugin needed.

**Example conversion (architecture store hierarchy):**

```mermaid
graph LR
    WS[useWebSocket hook] --> MS[useMarketStore]
    WS --> AS[useAlertStore]
    WS --> WLS[useWalletStore]
    MS --> MM[MarketMatrix]
    AS --> AF[AlertsFeed]
    WLS --> HD[Header]
    WLS --> SB[Sidebar]
    WLS --> WL[Watchlist]
    TS[useTerminalStore] --> RV[RouteVisualizer]
    SS[useSolverStore] --> CT[CommandTerminal]
    UI[useUIStore] --> SB
```

### 7.5 Documentation CI/CD

```yaml
# .github/workflows/docs.yml
name: Documentation
on:
  push:
    paths:
      - "docs/**"
      - "**.md"
  pull_request:
    paths:
      - "docs/**"
      - "**.md"

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g markdownlint-cli
      - run: markdownlint 'docs/**/*.md'

  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: yes
          config-file: .mlc-config.json
```

---

## Summary

### Files to Create (New Documentation)

| File | Priority | Effort |
|------|----------|--------|
| `docs/README.md` — Documentation index | High | 1h |
| `docs/api/authentication.md` | Critical | 3h |
| `docs/api/websocket.md` | High | 3h |
| `docs/api/errors.md` | Medium | 2h |
| `docs/development/testing.md` | High | 3h |
| `docs/operations/troubleshooting.md` | Medium | 2h |
| `docs/architecture/decisions/*.md` (5 ADRs) | Medium | 4h |
| `docs/getting-started/local-development.md` | Low | 2h |
| `docs/user-guide/faq.md` | Low | 1h |
| `docs/operations/monitoring.md` | Low | 2h |

### Files to Update (Existing)

| File | Issues to Fix | Effort |
|------|--------------|--------|
| `docs/database.md` | Add missing Chain model fields | 1h |
| `README.md` | Fix AG Grid/xterm names, clone URL, add Mermaid | 3h |
| `docs/architecture.md` | Fix store mappings, add Mermaid | 2h |
| `docs/api.md` | Add POST /api/alerts, update route count | 2h |
| `docs/state-management.md` | Fix useTerminalStore, useUIStore docs | 1h |
| `docs/data-flow.md` | Add error flow diagrams | 1h |
| `docs/deployment.md` | Add monitoring, backup, SSL sections | 2h |
| `docs/contracts.md` | Add ABI refs, real addresses, verification | 2h |
| `.env.example` | Add COINGECKO_API_KEY, ONEINCH_API_KEY, etc. | 0.5h |
| `CONTRIBUTING.md` | Fix clone URL | 0.5h |

### Automation Setup

| Task | Tool | Effort |
|------|------|--------|
| API docs generation | `@fastify/swagger` + `@fastify/swagger-ui` | 3h |
| Contract docs generation | `solidity-docgen` or `forge doc` | 2h |
| Markdown linting | `markdownlint-cli` | 1h |
| Prettier formatting | Prettier | 0.5h |
| Mermaid diagrams | Native Markdown + manual conversion | 4h |
| Link checking CI | `github-action-markdown-link-check` | 1h |

**Total estimated effort: 45-55 hours for complete documentation overhaul.**
**Critical path (auth + API docs + testing guide): 12-15 hours.**
