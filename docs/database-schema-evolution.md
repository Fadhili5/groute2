# Database Schema Evolution — GhostRoute Terminal

## Overview

This document describes the complete schema evolution supporting all 20 advanced upgrade proposals. The design follows a **domain-driven, multi-model** approach: PostgreSQL (via Prisma) for relational/transactional workloads, TimescaleDB hypertables for time-series, and Redis for caching/real-time data.

---

## 1. New Models Per Upgrade

| Upgrade | New Models | Fields | Indexes | Relations | Est. Rows | Growth |
|---|---|---|---|---|---|---|
| **1. Intent Execution** | `SolverBid`, `Auction` | amount, fee, state, signature, deadlines | (intentId,state), solverId, amount | Intent, SolverProfile | 500K | 10K/day |
| **2. Private Mempool** | `EncryptedTx`, `SealedBundle` | encryptedPayload, commitmentHash, chainId, ordering | (commitmentHash,chainId), bundleId, (chainId,status) | Chain, SealedBundle | 100K | 2K/day |
| **3. Graph Engine** | `GraphNode`, `GraphEdge`, `PathHistory` | weight, latency, fee, liquidity, isActive | (sourceNodeId,destNodeId), (isActive,weight), (sourceNodeId,destNodeId,timestamp) | Chain, Route | 10K nodes, 50K edges | 200 edges/day |
| **4. AI Copilot** | `AiRecommendation`, `AiExecutionReport`, `AiChat` | type, data, confidence, role, content | (userId,createdAt), (type,confidence), sessionId | User, Intent | 1M chats | 50K/day |
| **5. Dynamic Rebalancing** | `FragmentStateMachine`, `RerouteEvent` | fromState, toState, transition, reason, gasSaved | (fragmentId,timestamp), toState, intentId, newRouteId | IntentFragment, Intent, Route | 2M | 20K/day |
| **6. Treasury Automation** | `ScheduledTask`, `RebalancePlan`, `AllocationRule` | cron, params, targetAllocations, min/maxAllocation | (type,state), (nextRunAt,state), status, (chainId,enabled) | Chain | 1K tasks | 10/month |
| **7. Risk Engine** | `RiskScore`, `AnomalyEvent`, `ThreatIntel` | score, factors, severity, details, confidence, indicator | (entityId,entityType), (entityType,score), (type,severity), detectedAt | (polymorphic) | 5M scores | 100K/day |
| **8. Solver Marketplace** | `SolverProfile`, `SolverReward`, `SolverReputationHistory` | capabilities, stake, reputation, score, change | reputation, status, totalVolume, solverId, (solverId,recordedAt) | User, SolverBid | 10K solvers | 50/day |
| **9. zk-Proof Settlement** | `ZkProof`, `VerifierAttestation`, `AttestationChain` | proof, publicInputs, verifyingKey, attestation, root, depth | (zkProofId,verifier), zkProofId, root | Settlement | 500K proofs | 5K/day |
| **10. Multi-Wallet** | `User`, `PermissionPolicy`, `ApprovalWorkflow` | address, role, permissions, effect, action, params | (resource,effect), (requesterId,state), (approverId,state) | (self-referencing) | 100K users | 500/day |
| **11. Liquidity Intelligence** | `LiquidityPredictionModel`, `LiquidityForecast`, `ForecastAccuracy` | modelType, accuracy, mape, predictedDepth, error, errorPct | (name,version), status, (modelId,forecastTime), (chainId,token,forecastTime) | Chain | 50 models, 10M forecasts | 100K/day |
| **12. Execution Replay** | `ExecutionSnapshot`, `FragmentTrace` | state, data, blockNumber, step, action | (intentId,capturedAt), (fragmentId,timestamp) | Intent, IntentFragment | 2M snapshots | 10K/day |
| **13. Relayer Reputation** | `RelayerTrustScoreHistory`, `SlashingEvent` | score, components, change, amount, reason, evidence | (relayerId,recordedAt), relayerId, occurredAt | Relayer | 500K | 1K/day |
| **14. Institutional UI** | `WorkspaceConfig`, `SavedLayout` | layout, widgets, config, sharing, isDefault | (userId,name) | User | 50K | 100/day |
| **15. Route Strategy Builder** | `RouteStrategy`, `ConditionTreeNode`, `StrategyExecutionLog` | conditions, actions, nodeType, operator, value, result | (userId,status), status, strategyId, parentId, (strategyId,executedAt) | User, Intent, Route | 10K strategies | 50/day |
| **16. Position Engine** | `Position`, `PositionMigration`, `YieldSnapshot` | amount, entryPrice, pnl, status, fee, apr, rewards | (userId,status), (chainId,token), status, positionId, (positionId,snapshotAt) | User, Chain | 500K positions | 5K/day |
| **17. Compliance Layer** | `AuditLog`, `ReportTemplate`, `PermissionAudit` | action, resource, details, ipAddress, state | (userId,createdAt), (action,createdAt), (resource,resourceId), createdAt | User | 50M audit logs | 500K/day |
| **18. SDK** | `ApiKey`, `RateLimitRule`, `IntegrationWebhook` | key, permissions, allowedOrigins, tier, url, events, secret | keyPrefix, (userId,enabled), tier, userId, state | User | 200K keys | 200/day |
| **19. Relayer Coordination** | `CoordinationRound`, `ConsensusVote`, `CoordinationMessage` | roundNumber, state, threshold, vote, signature, messageType | (roundNumber), (state,startedAt), (roundId,relayerId), (roundId,timestamp) | Relayer | 100K rounds | 500/day |
| **20. Long-Term Vision** | `FeatureFlag`, `SchemaVersion`, `ExtensionPoint` | name, enabled, config, version, checksum, handler, schema | name | (none) | 100 flags | 5/month |

---

## 2. Existing Model Changes

### `Chain` — 6 new fields, 0 deprecated
- **Add**: `wsUrl String?`, `explorerUrl String?`, `blockTime Float?`, `nativeCurrency String?`, `decimals Int?`, `isTestnet Boolean`, `isDeprecated Boolean`, `metadata Json?`
- **Change**: `status` → `ChainStatus` enum
- **Indexes**: `@@index([status])` (for filtering), `@@index([chainId])` (for lookups)
- **Migration**: Backfill `nativeCurrency` from `shortName`, migrate `status` string → enum

### `Route` — 7 new fields, 0 deprecated
- **Add**: `category String?`, `tags String[]`, `costModel Json?`, `riskProfile Json?`, `version Int`, `deprecatedAt DateTime?`
- **Change**: `status` → `RouteStatus` enum
- **Indexes**: `@@index([sourceChainId, destChainId])`, `@@index([successRate, avgLatency])`
- **Migration**: Set `version=1` for all existing rows

### `Intent` — 6 new fields, 0 deprecated
- **Add**: `userId` → relation to `User`, `slippageTolerance Float?`, `deadline DateTime?`, `metadata Json?`
- **Change**: `state` → `IntentState` enum, `privacyLevel` → `PrivacyLevel` enum
- **Indexes**: `@@index([userId])`, `@@index([createdAt])`
- **Migration**: Create `User` records for existing `userId` values, backfill relation

### `IntentFragment` — 5 new fields, 0 deprecated
- **Add**: `state ExecutionFragmentState`, `routeId String?`, `txHash String?`, `metadata Json?`
- **Change**: `targetDex` → optional with default ""
- **Indexes**: `@@index([state])`, `@@index([routeId])`

### `Settlement` — 4 new fields, 0 deprecated
- **Add**: `blockNumber Int?`, `finalityRisk Float?`, `metadata Json?`
- **Change**: `state` → `SettlementState` enum
- **Relation**: `route Route @relation`
- **Indexes**: `@@index([createdAt])`

### `LiquidityPool` — 4 new fields, 0 deprecated
- **Add**: `tokenAddress String?`, `price Float?`, `liquidity Float?`, `metadata Json?`
- **Constraint**: `@@unique([chainId, token])`
- **Indexes**: `@@index([chainId, utilization])`, `@@index([depth])`

### `Alert` — 5 new fields, 0 deprecated
- **Add**: `entityId String?`, `entityType String?`, `acknowledgedBy String?`, `acknowledgedAt DateTime?`, `expiresAt DateTime?`
- **Change**: `severity` → `Severity` enum
- **Indexes**: `@@index([type, severity])`, `@@index([read])`

### `WatchlistItem` — 4 new fields, 0 deprecated
- **Add**: `change24h Float?`, `userId String?`, `alertThreshold Float?`, `enabled Boolean`
- **Indexes**: `@@index([userId])`, `@@index([symbol, chainId])`

### `Relayer` — 5 new fields, 0 deprecated
- **Add**: `trustScore Float`, `version String?`, `os String?`, `metadata Json?`, `jailedAt DateTime?`
- **Change**: `status` → `RelayerStatus` enum
- **Indexes**: `@@index([trustScore])`, `@@index([stake])`
- **Migration**: Compute initial `trustScore` from `(successfulRoutes / NULLIF(totalRoutes, 0)) * 100`

---

## 3. Time-Series / Hypertable Schema

These tables are designed for **TimescaleDB hypertables** (partitioned by `timestamp`):

| Hypertable | Chunk Interval | Compression Policy | Retention | 
|---|---|---|---|
| `price_history` | 1 day | After 7 days (segmentby=token) | 1 year |
| `gas_price_history` | 6 hours | After 1 day (segmentby=chainId) | 90 days |
| `route_performance_history` | 1 day | After 30 days (segmentby=routeId) | 2 years |
| `risk_score_history` | 1 day | After 7 days (segmentby=entityType) | 1 year |
| `relayer_performance_history` | 1 day | After 30 days (segmentby=relayerId) | 2 years |

**Create hypertables SQL** (run as migration after Prisma generates tables):
```sql
SELECT create_hypertable('price_history', 'timestamp', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('gas_price_history', 'timestamp', chunk_time_interval => INTERVAL '6 hours');
SELECT create_hypertable('route_performance_history', 'timestamp', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('risk_score_history', 'timestamp', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('relayer_performance_history', 'timestamp', chunk_time_interval => INTERVAL '1 day');
```

**Continuous aggregates** (materialized views):
```sql
CREATE MATERIALIZED VIEW price_1h
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', timestamp) AS bucket,
       token,
       FIRST(price, timestamp) AS open,
       MAX(price) AS high,
       MIN(price) AS low,
       LAST(price, timestamp) AS close,
       SUM(volume) AS volume
FROM price_history
GROUP BY bucket, token;

CREATE MATERIALIZED VIEW gas_15m
WITH (timescaledb.continuous) AS
SELECT time_bucket('15 minutes', timestamp) AS bucket,
       chainId,
       AVG(gasPrice) AS avg_gas,
       MAX(gasPrice) AS max_gas,
       AVG(baseFee) AS avg_base_fee
FROM gas_price_history
GROUP BY bucket, chainId;
```

**Compression policies**:
```sql
ALTER TABLE price_history SET (timescaledb.compress, timescaledb.compress_segmentby = 'token');
SELECT add_compression_policy('price_history', INTERVAL '7 days');
SELECT add_compression_policy('gas_price_history', INTERVAL '1 day');
SELECT add_compression_policy('route_performance_history', INTERVAL '30 days');
```

---

## 4. Partitioning Strategy

### By Time (Hypertables)
- `price_history`, `gas_price_history`, `route_performance_history`, `risk_score_history`, `relayer_performance_history`

### By Chain (Native PostgreSQL partitioning)
| Table | Partition Key | Partitions | Rationale |
|---|---|---|---|
| `Settlement` | `sourceChainId` (LIST) | 1 per chain | Queries always filter by chain |
| `Intent` | `sourceChainId` (LIST) | 1 per chain | Dashboard per-chain filtering |
| `EncryptedTx` | `chainId` (LIST) | 1 per chain | Mempool is per-chain |
| `AnomalyEvent` | `entityType` (LIST) | 5 partitions | Different scan patterns per type |

### Archival Strategy
| Table | Active Retention | Warm Storage | Cold Storage (S3) |
|---|---|---|---|
| `Settlement` | 90 days | 1 year (compressed) | After 1 year |
| `PriceHistory` | 30 days | 1 year (compressed) | After 1 year |
| `GasPriceHistory` | 7 days | 90 days (compressed) | After 90 days |
| `RoutePerformanceHistory` | 90 days | 2 years (compressed) | After 2 years |
| `AuditLog` | 30 days | 1 year | After 1 year |
| `RiskScoreHistory` | 30 days | 1 year | After 1 year |

Archival process: `pg_dump --data-only --table=<table> | gzip | aws s3 cp - s3://bucket/archives/`

---

## 5. Caching Layer (Redis vs PostgreSQL)

### Redis Cache — TTL Strategy

| Data Type | Key Pattern | TTL | Invalidation Trigger |
|---|---|---|---|
| Chain status | `chain:{id}` | 30s | Chain update event |
| Route recommendations | `route:recommend:{src}:{dst}` | 60s | Route metric change |
| Gas prices | `gas:{chainId}` | 15s | New block |
| Best execution path | `path:best:{src}:{dst}:{amt}` | 120s | Graph edge update |
| Solver reputation cache | `solver:top:{limit}` | 300s | New bid/settlement |
| Liquidity pool depth | `pool:depth:{chain}:{token}` | 30s | On-chain event |
| User session | `session:{userId}` | 3600s | Logout / expiry |
| API rate limiter | `ratelimit:{key}:{window}` | window+1s | Auto-expire |
| Real-time execution status | `execution:{orderId}` | 3600s | Completion event |
| Featured/intelligence data | `feat:{userId}:{type}` | 600s | Periodic recompute |

### PostgreSQL-Only Data (no Redis)
- **AuditLog**: append-only, queried rarely for compliance
- **Settlement finality**: durability-critical, no cache
- **ZkProof artifacts**: verification-critical, no cache
- **Permission/access control**: consistency-critical, cache only via Redis with very short TTL
- **Position records**: financial data, read from primary with replica reads
- **GraphNode/GraphEdge**: cached in Redis but source of truth is PG
- **ForecastAccuracy**: write-once, read occasionally
- **CoordinationRounds/ConsensusVotes**: consensus-critical, no cache

### Cache Invalidation Patterns

```
1. Write-Through: On DB write to Chain/LiquidityPool, publish Redis pub/sub invalidation
2. Time-Based: Short TTLs for market data, longer for static config
3. Event-Driven: WebSocket events trigger cache bust for affected keys
4. Lazy: On read miss, fetch from PG and repopulate cache
```

Pub/Sub channels for invalidation:
```
cache:invalidate:chain:{id}
cache:invalidate:route:{id}
cache:invalidate:pool:{chain}:{token}
cache:invalidate:gas:{chainId}
cache:invalidate:user:{userId}
```

---

## 6. Read/Write Patterns

### Query Load Estimates

| Model | Reads/sec | Writes/sec | Pattern | Hot Path |
|---|---|---|---|---|
| Chain | 500 | 2 | Read-heavy | Dashboard, route simulation |
| Route | 300 | 5 | Read-heavy | Route comparison, recommendations |
| Intent | 100 | 50 | Write-heavy | Execution pipeline |
| IntentFragment | 200 | 100 | Write-heavy | Fragment execution |
| SolverBid | 50 | 30 | Mixed | Auction engine |
| Settlement | 150 | 20 | Mixed | Proof verification |
| ZkProof | 30 | 10 | Read-moderate | Verification |
| LiquidityPool | 400 | 10 | Read-heavy | Market overview |
| Alert | 100 | 20 | Mixed | Notification system |
| Relayer | 50 | 10 | Read-moderate | Coordination |
| GraphEdge | 200 | 5 | Read-heavy | Path finding |
| AiChat | 100 | 80 | Write-heavy | Copilot sessions |
| RiskScore | 50 | 30 | Mixed | Dashboard, alerts |
| AuditLog | 10 | 200 | Write-heavy | Append-only |
| Position | 80 | 20 | Mixed | User portfolio |
| PriceHistory | 500 | 100 | Read-heavy | Charts, analysis |
| GasPriceHistory | 300 | 50 | Read-heavy | Gas estimation |
| RoutePerformanceHistory | 100 | 20 | Read-heavy | Analytics |

### Hot Paths Requiring Optimization

1. **Route Simulation Endpoint** (`POST /api/execution/simulate`)
   - Reads: Chain (gas), Route (best path), LiquidityPool (depth), GasPriceHistory
   - Cache: All in Redis with 15-30s TTL
   - Query: 3-4 single-row lookups + 1 range query on GasPriceHistory

2. **Execution Pipeline** (Intents → Fragments → Settlements)
   - Multiple writes in a transaction: Intent + IntentFragment + SolverBid state changes
   - Needs: Transaction grouping, batch commits every 100ms
   - Pattern: Write to PG via Prisma batch, then publish to Redis for WS broadcast

3. **Dashboard / KPI View** (`GET /api/kpi`)
   - Aggregates: Chain liquidity SUM, Route COUNT, Volume SUM
   - Cache: Materialized in Redis with 60s refresh via cron job
   - Falls back: `SELECT SUM(liquidity) FROM chains` (fast on indexed column)

4. **Path Finding** (Graph Engine)
   - Reads: GraphNode + GraphEdge with recursive CTE
   - Optimization: Pre-computed top-K paths cached in Redis, re-compute on edge changes
   - Query: `WITH RECURSIVE` depth-limited shortest path

5. **Gas Price Charts**
   - Reads: GasPriceHistory time-bucketed
   - Optimization: Continuous aggregate view `gas_15m` in TimescaleDB
   - Query: `SELECT * FROM gas_15m WHERE chainId=$1 AND bucket > now() - interval '24h'`

6. **Compliance / Audit Reporting**
   - Reads: AuditLog with filters
   - Optimization: Partitioned by month, parallel seq scans acceptable
   - Query: Range scan on `created_at` with filter on `action`

### Reporting / OLAP Queries

These bypass Prisma and use raw SQL with the read replica:
```sql
-- Daily volume by route (for reporting dashboard)
SELECT DATE_TRUNC('day', s.created_at) AS day,
       r.name,
       COUNT(*) AS tx_count,
       SUM(s.amount) AS total_volume,
       AVG(s.fee) AS avg_fee
FROM settlements s
JOIN routes r ON r.id = s.route_id
WHERE s.created_at > now() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY 1 DESC;

-- Relayer performance ranking
SELECT r.address,
       r.trust_score,
       COUNT(ph.id) AS total_routes,
       AVG(ph.latency) AS avg_latency,
       SUM(CASE WHEN ph.success THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 AS success_rate
FROM relayers r
LEFT JOIN relayer_performance_history ph ON ph.relayer_id = r.id
  AND ph.timestamp > now() - INTERVAL '7 days'
GROUP BY r.id, r.address, r.trust_score
ORDER BY success_rate DESC;
```

---

## 7. Full Prisma Schema

The complete updated `schema.prisma` is at `backend/prisma/schema.prisma` (written to disk). It contains:

- **48 models** (up from 9)
- **12 enums** for type safety
- **90+ composite indexes**
- **TimescaleDB extension** declared for hypertables
- **citext + pgcrypto** extensions for case-insensitive lookups and key generation

---

## 8. Migration Strategy (Zero-Downtime Expand-Contract)

### Phase 1: Schema Expansion (Week 1)
```
1. Deploy new Prisma schema with all new models + nullable fields on existing models
2. Run `prisma migrate dev --create-only` to generate SQL
3. Apply migration with `EXPAND` approach:
   - Add new columns as NULLABLE
   - Add new tables (they don't affect existing queries)
   - Add new indexes CONCURRENTLY (not in transaction)
```
```sql
-- Example: Add columns CONCURRENTLY
ALTER TABLE chains ADD COLUMN IF NOT EXISTS ws_url TEXT;
ALTER TABLE chains ADD COLUMN IF NOT EXISTS is_testnet BOOLEAN DEFAULT false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_status ON chains(status);
```

### Phase 2: Dual-Writes (Week 2)
```
1. Deploy updated application code that writes to BOTH old and new fields
2. Backfill new fields from old data:
   - trust_score = successfulRoutes / totalRoutes
   - nativeCurrency from chain shortName mappings
3. Run data migration scripts in batches of 10,000 rows
4. Monitor for errors, no reads from new fields yet
```

### Phase 3: Read Migration (Week 3)
```
1. Switch reads to new fields one service at a time
2. Each service gets a feature flag for the new path
3. Feature flags in DB (`feature_flags` table) toggled per-tenant
4. A/B test: 10% → 50% → 100% traffic on new fields
```

### Phase 4: Contract (Week 4)
```
1. Remove old columns after confirming zero reads
2. Add NOT NULL constraints where applicable
3. Drop old indexes that are superseded
4. Run `prisma migrate dev` to sync the schema
```
```sql
ALTER TABLE chains DROP COLUMN IF EXISTS old_field CASCADE;
ALTER TABLE chains ALTER COLUMN ws_url SET NOT NULL;
DROP INDEX IF EXISTS idx_chains_old;
```

### Rollback Plan
- Phase 1-2: Fully reversible — new columns are nullable, old code still works
- Phase 3: Revert by flipping feature flag back to old path
- Phase 4: Requires restoring from backup (unlikely needed)

### Migration Prerequisites

| Requirement | Tooling |
|---|---|
| **Connection pooling** | PgBouncer (transaction mode) — supports mixed schema versions |
| **Read replicas** | 2+ replicas for OLAP queries, 1 for failover |
| **Schema diff tool** | `prisma migrate diff` + `prisma db push --accept-data-loss` (dev only) |
| **Migration runner** | Custom wrapper using Prisma `SchemaDelegate` or `pg-migrator` |
| **Backup** | `pg_dump` before each phase, WAL archiving to S3 |

### Backend Service Changes Required

| Service | Change |
|---|---|
| **execution.ts** | Add `Intent`, `SolverBid`, `Auction` writes; replace in-memory ORDERS with DB |
| **settlement.ts** | Add `ZkProof`, `VerifierAttestation` writes; add `SettlementState` enum handling |
| **market.ts** | Add `GasPriceHistory`, `PriceHistory` reads; add `LiquidityPool` enhanced queries |
| **routes.ts** | Add `RouteStrategy`, `ConditionTreeNode` evaluation; add `PathHistory` reads |
| **alerts.ts** | Add `AnomalyEvent` creation; add `Severity` enum; add entity scoping |
| **New: ai-copilot.ts** | `AiRecommendation`, `AiChat`, `AiExecutionReport` CRUD |
| **New: treasury.ts** | `ScheduledTask`, `RebalancePlan`, `AllocationRule` management |
| **New: risk-engine.ts** | `RiskScore` computation, `AnomalyEvent` detection, `ThreatIntel` matching |
| **New: relayer-coord.ts** | `CoordinationRound`, `ConsensusVote` management |
| **New: positions.ts** | `Position`, `PositionMigration`, `YieldSnapshot` CRUD |
| **New: compliance.ts** | `AuditLog` ingestion, `ReportTemplate` generation |
| **New: admin-sdk.ts** | `ApiKey`, `IntegrationWebhook` management |
| **WebSocket handler** | Add channels for new event types: `risk`, `positions`, `coordination`, `strategies` |
| **Job queue (BullMQ)** | New workers for: rebalancing, model training, report generation, data archival |
| **Redis cache layer** | New cache invalidation handlers per domain |
