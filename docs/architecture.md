# Architecture

## System Overview

GhostRoute Terminal is a modular cross-chain execution platform built on three tiers:

- **Frontend**: Next.js institutional trading terminal
- **Backend**: Fastify API with real-time WebSocket streaming
- **Contracts**: Solidity smart contracts for on-chain execution

## Architecture Diagram

```
User Browser (Next.js)
    |
    |-- HTTP/REST (API calls)
    |-- WebSocket (real-time data)
    |
    v
Fastify API Server
    |
    |-- PostgreSQL (persistence)
    |-- Redis (caching, queues)
    |-- BullMQ (job processing)
    |
    v
Smart Contracts (Solidity)
    |
    |-- IntentRouter (order management)
    |-- FragmentVault (fragment custody)
    |-- RouteRegistry (path discovery)
    |-- SettlementVerifier (proof verification)
    |-- PrivacyScoreOracle (privacy scoring)
    |-- TreasuryFeeCollector (fee management)
    |-- Governance (protocol governance)
    |-- RelayerRegistry (relayer management)
    |
    v
Blockchain Networks
    |-- Ethereum, Arbitrum, Base
    |-- Solana, Avalanche, BNB Chain
    |
    v
0G Infrastructure
    |-- Compute (AI solver)
    |-- Storage (route data)
    |-- DA (settlement proofs)
```

## Data Flow

1. User creates route intent via Execution Blotter
2. Intent is validated and stored by API
3. Route is simulated off-chain first
4. AI Solver recommends optimal path
5. Intent is submitted to IntentRouter contract
6. Route is fragmented across selected bridges/DEXes
7. Settlement proof is submitted and verified
8. User receives settled assets minus fees
