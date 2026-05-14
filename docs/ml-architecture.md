# ML/AI Architecture — GhostRoute Terminal

> **Status:** Design Document  
> **Author:** ML/AI Engineering  
> **Codebase:** `/home/elon/ghostroute-terminal`  
> **Current State:** All AI is hardcoded mock data (`frontend/src/components/ai-solver/AiSolver.tsx:7-17`, `backend/src/routes/routes.ts:30-60`, `backend/src/routes/execution.ts:29-42`). This document defines the real ML architecture.

---

## Table of Contents
1. [AI/ML System Architecture](#1-aiml-system-architecture)
2. [Model 1: Route Optimizer](#2-model-1-route-optimizer)
3. [Model 2: MEV Risk Predictor](#3-model-2-mev-risk-predictor)
4. [Model 3: Liquidity Predictor](#4-model-3-liquidity-predictor)
5. [Model 4: Privacy Score Calculator](#5-model-4-privacy-score-calculator)
6. [Infrastructure Design](#6-infrastructure-design)
7. [Integration Points](#7-integration-points)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [0G Integration Details](#9-0g-integration-details)

---

## 1. AI/ML System Architecture

### 1.1 Overall ML Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DATA COLLECTION LAYER                              │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ On-Chain RPC │  │  DeFiLlama   │  │  CoinGecko   │  │  Mempool Stream  │  │
│  │ (ethers.js)  │  │  (REST API)  │  │  (REST API)  │  │  (Flashbots/etc) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                  │                  │                   │           │
│         ▼                  ▼                  ▼                   ▼           │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     Kafka/RabbitMQ Event Bus                          │  │
│  │  Topics: raw.blocks, raw.txs, raw.prices, raw.liquidity, raw.mempool │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          FEATURE ENGINEERING LAYER                           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   Streaming Feature Processor                         │   │
│  │  • Block features: gas_price, block_time, txs_per_block              │   │
│  │  • Pool features: reserves, volumes, fees, utilization               │   │
│  │  • Mempool features: pending_txs, sandwich_clusters, frontrun_cands  │   │
│  │  • Market features: price_volatility, correlation_matrix, spreads    │   │
│  │  • Route features: latency, success_rate, relayer_health             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                        │                                    │
│                                        ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         FEATURE STORE                                  │   │
│  │  Technology: Feast + Redis + PostgreSQL (time-series)                  │   │
│  │  • Online features: Redis (low-latency inference)                      │   │
│  │  • Historical features: PostgreSQL/Parquet (training)                  │   │
│  │  • Feature registry: YAML-defined feature definitions                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           MODEL TRAINING LAYER                               │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Training Pipeline │  │  Experiment       │  │  Model Registry         │   │
│  │  (Flyte/Airflow)   │  │  Tracking         │  │  (MLflow)               │   │
│  │                    │  │  (MLflow UI)      │  │                         │   │
│  │  • Data validation │  │  • Hyperparams     │  │  • Model versions       │   │
│  │  • Feature w/      │  │  • Metrics         │  │  • Artifacts (weights)  │   │
│  │  • Train/val/test  │  │  • Artifacts       │  │  • Stage promotion      │   │
│  │  • Model eval      │  │  • Git commit      │  │  • Deployment tags      │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           MODEL SERVING LAYER                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    REAL-TIME INFERENCE API                             │   │
│  │  Technology: FastAPI (separate service, port 8000)                     │   │
│  │  Endpoints:                                                            │   │
│  │  • POST /api/v1/route/optimize    → RouteOptimizer.predict()          │   │
│  │  • POST /api/v1/mev/score         → MEVRiskPredictor.predict()        │   │
│  │  • POST /api/v1/liquidity/forecast → LiquidityPredictor.predict()      │   │
│  │  • POST /api/v1/privacy/score     → PrivacyScorer.score()             │   │
│  │  • POST /api/v1/solver/solve      → Composite solver (all 4 models)   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                        │                                    │
│                                        ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    BATCH INFERENCE (scheduled)                         │   │
│  │  • Every 60s: Liquidity forecast for all tracked pools                │   │
│  │  • Every 120s: Route performance rerank                               │   │
│  │  • Every 300s: MEV risk map update                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          FEEDBACK LOOP                                        │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ On-chain     │  │ User actions  │  │ Relayer      │  │ Manual labels    │  │
│  │ Settlement   │  │ (route chosen)│  │ Performance  │  │ (MEV confirmed)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                  │                  │                   │           │
│         ▼                  ▼                  ▼                   ▼           │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                 GROUND TRUTH COLLECTOR                                 │    │
│  │  • Actual execution cost vs predicted cost → route_optimizer_feedback │    │
│  │  • Actual MEV extraction vs predicted risk → mev_predictor_feedback   │    │
│  │  • Actual slippage vs predicted → liquidity_predictor_feedback        │    │
│  │  • Actual privacy breach vs predicted → privacy_scorer_feedback       │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                        │                                     │
│                                        ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │              ACTIVE LEARNING PIPELINE → retraining triggers            │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 New Files to Create

```
backend/
├── ml/                              # NEW: ML service directory
│   ├── __init__.py
│   ├── requirements.txt             # Python deps (torch, sklearn, feast, mlflow)
│   ├── Dockerfile                   # Separate container for ML service
│   ├── inference/
│   │   ├── __init__.py
│   │   ├── app.py                   # FastAPI inference server
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── router_optimizer.py     # RouteOptimizer inference wrapper
│   │   ├── mev_predictor.py        # MEVRiskPredictor inference wrapper
│   │   ├── liquidity_predictor.py  # LiquidityPredictor inference wrapper
│   │   └── privacy_scorer.py       # PrivacyScorer inference wrapper
│   ├── training/
│   │   ├── __init__.py
│   │   ├── train_route_optimizer.py
│   │   ├── train_mev_predictor.py
│   │   ├── train_liquidity_predictor.py
│   │   ├── train_privacy_scorer.py
│   │   └── utils.py                # Shared training utilities
│   ├── features/
│   │   ├── __init__.py
│   │   ├── feature_definitions.yaml # Feast feature definitions
│   │   ├── onchain_features.py     # On-chain data → features
│   │   ├── market_features.py      # Market data → features
│   │   └── route_features.py       # Route data → features
│   ├── data/
│   │   ├── __init__.py
│   │   ├── collector.py            # Kafka consumer → feature store
│   │   ├── defillama_collector.py  # DeFiLlama API → feature store
│   │   ├── coingecko_collector.py  # CoinGecko API → feature store
│   │   ├── mempool_collector.py    # Mempool tx → feature store
│   │   └── feedback_collector.py   # On-chain settlement → ground truth
│   └── models/
│       ├── __init__.py
│       ├── route_optimizer.py      # Model architecture definition
│       ├── mev_predictor.py        # Model architecture definition
│       ├── liquidity_predictor.py  # Model architecture definition
│       ├── privacy_scorer.py       # Model architecture definition
│       └── ensembles.py            # Ensemble/stacking logic
└── src/
    └── services/
        └── aiSolverClient.ts       # NEW: Fastify → ML inference proxy

backend/prisma/
└── schema.prisma                   # ADD: ML-related models (see §6)

frontend/src/
├── components/
│   └── ai-solver/
│       └── AiSolver.tsx            # MODIFY: connect to real ML backend
├── stores/
│   └── solver-store.ts             # MODIFY: add ML-related state
└── types/
    └── index.ts                    # MODIFY: add ML-related types
```

---

## 2. Model 1: Route Optimizer

### 2.1 Problem Definition

**Input:** `(source_chain, dest_chain, token_in, token_out, amount, max_slippage, privacy_level)`  
**Output:** `(ordered_route_steps[], expected_cost, expected_latency, mev_risk, confidence, privacy_score)`  

The route space is a directed multigraph where:
- **Nodes:** Chains (Ethereum, Arbitrum, Base, Solana, Avalanche, BNB)
- **Edges:** Bridges (LayerZero, Across, CCTP, Wormhole)  
- **Sub-nodes per chain:** DEX pools (Uniswap V3, Curve, Aerodrome, Trader Joe, etc.)

Search space: up to 6 chains × 4 bridges × 10 DEXs/chain → ~240 possible 2-hop paths, grows combinatorially with fragmentation.

### 2.2 Approach: Graph Neural Network + Multi-Objective RL

#### Phase 1 (Heuristic — Phase 1 of roadmap):
Weighted shortest path on static graph:
```
cost(edge) = w₁ × gas_fee + w₂ × bridge_fee + w₃ × slippage + w₄ × latency - w₅ × privacy
```
Weights tuned manually per deployment. Implemented in `backend/src/services/routeOptimizerService.ts`.

#### Phase 2 (Learned — Phase 3+ of roadmap):
**Model architecture:** Graph Attention Network (GAT) + Deep Q-Network (DQN)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ROUTE OPTIMIZER ARCHITECTURE                       │
│                                                                      │
│  Input Features (per node/edge):                                     │
│  • Node features: chain_tvl, chain_gas, chain_volume_24h,           │
│    chain_active_relayers, chain_avg_latency, chain_mev_score,       │
│    chain_privacy_score, chain_stability_index                        │
│  • Edge features: bridge_tvl, bridge_uptime, bridge_avg_settlement, │
│    bridge_success_rate, bridge_cost_per_token, bridge_speed          │
│  • DEX features: pool_depth, pool_utilization, pool_fee_tier,       │
│    pool_volume_24h, pool_impermanent_loss, pool_spread               │
│  • Order features: amount_usd, token_pair_volatility,               │
│    time_pressure, privacy_level, fragmentation_setting               │
│                                                                      │
│  ┌──────────────────┐                                                 │
│  │  GAT Encoder      │  Hidden: 256 → 128 → 64 (LeakyReLU)          │
│  │  (3 layers)       │  Attention heads: 8 (layer 1), 4 (layer 2)   │
│  │                   │  Dropout: 0.2                                  │
│  └────────┬─────────┘                                                 │
│           │ node_embeddings (64-dim)                                  │
│           ▼                                                           │
│  ┌──────────────────┐                                                 │
│  │  DQN Policy       │  Q(s, a) for each possible next step          │
│  │  (2 layers)       │  Hidden: 128 → 64 → num_actions               │
│  │                   │  Activation: ReLU                               │
│  └────────┬─────────┘                                                 │
│           │ Q-values for each edge                                    │
│           ▼                                                           │
│  ┌──────────────────┐                                                 │
│  │  Multi-Obj.       │  Weighted sum:                                 │
│  │  Scorer           │  score = β₁·cost + β₂·latency + β₃·mev_risk   │
│  │                   │         + β₄·privacy + β₅·confidence          │
│  └────────┬─────────┘                                                 │
│           │ β weights learned via preference tuning                   │
│           ▼                                                           │
│  ┌──────────────────┐                                                 │
│  │  Beam Search      │  Top-k paths (k=5), reranked by scorer       │
│  │  (k=5)            │  Return path + alternatives                    │
│  └──────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Features — Complete Specification

| Feature | Type | Source | Window | Update Freq |
|---------|------|--------|--------|-------------|
| `chain_tvl` | float (USD) | DeFiLlama | 1h MA | 60s |
| `chain_gas_standard` | float (gwei) | RPC | 5min MA | 12s |
| `chain_gas_fast` | float (gwei) | RPC | 1min EMA | 12s |
| `chain_volume_24h` | float (USD) | DeFiLlama | 24h | 300s |
| `chain_active_relayers` | int | Prisma | current | 30s |
| `chain_avg_latency` | float (s) | Settlement records | 1h MA | 120s |
| `chain_mev_score` | float [0,100] | MEV model output | current | 60s |
| `chain_privacy_score` | float [0,100] | Privacy model | current | 60s |
| `chain_stability_index` | float [0,1] | Block time variance | 24h | 300s |
| `bridge_tvl` | float (USD) | DeFiLlama | current | 300s |
| `bridge_uptime_24h` | float [0,1] | Relayer heartbeats | 24h | 300s |
| `bridge_avg_settlement_time` | float (s) | On-chain records | 6h EMA | 120s |
| `bridge_success_rate_24h` | float [0,1] | Settlement records | 24h | 120s |
| `bridge_cost_per_token` | float (USD) | Fee oracle | current | 60s |
| `bridge_speed` | float (blocks) | Contract param | static | — |
| `pool_depth` | float (USD) | On-chain reserves | current | 15s |
| `pool_utilization` | float [0,1] | Reserves / total | current | 15s |
| `pool_fee_tier` | float | DEX config | static | — |
| `pool_volume_24h` | float (USD) | Subgraph/DeFiLlama | 24h | 300s |
| `pool_impermanent_loss` | float [0,1] | Price ratio ^2 | 1h | 60s |
| `pool_spread` | float (bps) | Effective spread | 1min | 15s |
| `order_amount_usd` | float | User input | — | per request |
| `token_pair_volatility` | float | Chainlink/CCIP | 1h | 60s |
| `time_pressure` | float [0,1] | User max wait | — | per request |
| `privacy_level` | int {0,1,2} | User config | — | per request |
| `fragmentation_setting` | bool | User config | — | per request |

### 2.4 Training

**Data:** Historical route executions stored in Prisma `Settlement` + `Intent` tables.  
**Label:** Multi-dimensional outcome vector:
- `execution_cost_usd` (gas + bridge fee + DEX fee)
- `execution_latency_s` (total time from submission to settlement)
- `mev_extracted` (bool — was there a sandwich/frontrun?)
- `slippage_realized` (float — actual vs expected)
- `privacy_breached` (bool — was tx traceable?)

**Loss function:**
```
L = λ₁ × MSE(cost_pred, cost_real) / cost_real
  + λ₂ × MSE(latency_pred, latency_real) / latency_real
  + λ₃ × BCE(mev_pred, mev_real)
  + λ₄ × MSE(slippage_pred, slippage_real) / slippage_real
  + λ₅ × BCE(privacy_pred, privacy_real)
```
Where λ = [0.3, 0.2, 0.25, 0.15, 0.1] initially, tuned via Bayesian hyperparameter search.

**Training regime:**
- Batch size: 256
- Optimizer: AdamW (lr=3e-4, weight_decay=1e-5)
- Learning rate schedule: Cosine annealing with warm restarts
- Early stopping: patience=10 on validation mAP
- Train/val/test split: 70/15/15 by time (chronological)
- Evaluation metric: Weighted Spearman rank correlation on top-5 routes

### 2.5 Serving

```python
# backend/ml/inference/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Literal

class RouteOptimizeRequest(BaseModel):
    source_chain: str                                  # "ethereum"
    dest_chain: str                                    # "arbitrum"
    token_in: str                                      # "USDC"
    token_out: str                                     # "ETH"
    amount: float                                      # 50000.0
    max_slippage: float = 0.5                          # 0.5%
    privacy_level: Literal[0, 1, 2] = 1                # 0=standard, 1=enhanced, 2=max
    fragmentation: bool = False
    bridge_preference: Optional[str] = None             # "layerzero" | None (auto)
    mev_guard: bool = True
    num_alternatives: int = 3

class RouteStep(BaseModel):
    type: Literal["bridge", "swap", "fragment", "settle"]
    protocol: str                                      # "LayerZero", "UniswapV3"
    chain: str
    token_in: str
    token_out: str
    amount: float
    expected_cost: float                               # USD
    expected_latency: float                            # seconds
    expected_slippage: float
    mev_risk: float                                    # [0,1]
    privacy_score: float                               # [0,100]
    confidence: float                                  # [0,1]

class RouteOptimizeResponse(BaseModel):
    id: str                                            # UUID
    steps: List[RouteStep]
    total_cost: float
    total_latency: float
    total_slippage: float
    total_mev_risk: float
    total_privacy_score: float
    confidence: float
    alternatives: List[List[RouteStep]]
    timestamp: int
    model_version: str
```

---

## 3. Model 2: MEV Risk Predictor

### 3.1 Problem Definition

**Input:** `(order_parameters, current_mempool_state, recent_block_data)`  
**Output:** `(risk_level: {low, medium, high, critical}, risk_score: float [0,1], expected_mev_type: {sandwich, frontrun, backrun, jito_tip, none}, confidence: float)`

### 3.2 Approach: Multi-Head Transformer on Mempool Time-Series

```
┌────────────────────────────────────────────────────────────────────┐
│                      MEV RISK PREDICTOR                              │
│                                                                      │
│  Time-series features (lookback = 100 blocks / ~20 min):            │
│  • mempool_density: pending_tx_count, gas_price_distribution        │
│  • sandwich_clusters: number of known sandwich bots active          │
│  • frontrun_candidates: tx count with same token pair               │
│  • block_builder_concentration: HHI of blocks built by top builder │
│  • mev_extracted_total: recent MEV in USD (from Flashbots data)    │
│  • gas_spike_indicator: |gas_current - gas_ma(100)| / gas_std       │
│                                                                      │
│  Static features (per order):                                       │
│  • order_depth_ratio: amount / pool_depth                           │
│  • token_pair_liquidity_category: {low, medium, deep}               │
│  • dex_type: {uniswap_v2, uniswap_v3, curve, balancer, other}      │
│  • is_stablecoin_pair: bool                                         │
│  • recent_sandwich_activity: how many sandwiches on this pair (24h) │
│  • historical_mev_profit_potential: expected profit for attacker    │
│                                                                      │
│  ┌──────────────────────────────┐                                    │
│  │  Time-series Encoder         │  Input: (batch, 100, 16)          │
│  │  (TransformerEncoder)        │  Hidden: d_model=128, nhead=8     │
│  │                               │  Layers: 4                        │
│  │                               │  FFN dim: 512 (ReLU, dropout 0.1)│
│  │                               │  Positional encoding: learnable   │
│  └──────────────┬───────────────┘                                    │
│                 │ encoded_series (batch, 128)                        │
│                 ▼                                                    │
│  ┌──────────────────────────────┐                                    │
│  │  Static Feature Encoder      │  Input: (batch, 7)                │
│  │  (MLP)                       │  Hidden: 32 → 16 (ReLU)           │
│  └──────────────┬───────────────┘                                    │
│                 │ static_feats (batch, 16)                           │
│                 ▼                                                    │
│  ┌──────────────────────────────┐                                    │
│  │  Fusion Layer                │  Concatenate + LayerNorm           │
│  │                              │  Output: (batch, 144)              │
│  └──────────────┬───────────────┘                                    │
│                 ▼                                                    │
│  ┌──────────────────────────────────────────┐                       │
│  │  Multi-Head Output                         │                       │
│  │                                            │                       │
│  │  ┌────────────────┐  ┌──────────────────┐  │                       │
│  │  │ Risk Classifier │  │ MEV Type         │  │                       │
│  │  │ (4-class)       │  │ Classifier        │  │                       │
│  │  │ Linear(144→64)  │  │ (5-class)         │  │                       │
│  │  │ ReLU + Dropout  │  │ Linear(144→64)    │  │                       │
│  │  │ Linear(64→4)    │  │ ReLU + Dropout    │  │                       │
│  │  │ Softmax         │  │ Linear(64→5)      │  │                       │
│  │  └────────────────┘  │ Softmax            │  │                       │
│  │                       └──────────────────┘  │                       │
│  │                                            │                       │
│  │  ┌──────────────────────────────────────┐  │                       │
│  │  │ Risk Score Regressor                  │  │                       │
│  │  │ Linear(144→32) → ReLU → Linear(32→1) │  │                       │
│  │  │ Sigmoid → [0,1]                       │  │                       │
│  │  └──────────────────────────────────────┘  │                       │
│  └──────────────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Training

**Label sources:**
1. **Flashbots MEV-Share data:** Extract real sandwich/frontrun transactions via `mev-inspect-py` or Flashbots API
2. **Manual labels:** Submit honeypot transactions, observe if MEV extracted
3. **Relayer reports:** RelayerRegistry events record failed executions with MEV flags

**Loss function:**
```
L = α·CE(risk_class, true_class) + β·CE(mev_type, true_type) + γ·BCE(risk_score > 0.5, mev_extracted)
```
Where α=0.5, β=0.3, γ=0.2.

**Training regime:**
- Batch size: 64
- Optimizer: AdamW (lr=1e-4, weight_decay=1e-5)
- Gradient clipping: 1.0
- Class weights for risk: [1.0, 2.0, 5.0, 10.0] (rare events weighted higher)
- Validation: AUC-ROC per class
- Target: AUC > 0.85 on critical risk class

### 3.4 Serving

```python
# backend/ml/inference/schemas.py (continued)
class MEVScoreRequest(BaseModel):
    source_chain: str
    token_in: str
    token_out: str
    amount: float
    pool_address: Optional[str]
    dex_type: Optional[str]
    recent_tx_count: Optional[int]          # mempool snapshot

class MEVScoreResponse(BaseModel):
    risk_level: Literal["low", "medium", "high", "critical"]
    risk_score: float                        # [0, 1]
    expected_mev_type: Literal["sandwich", "frontrun", "backrun", "jito_tip", "none"]
    confidence: float                        # [0, 1]
    contributing_factors: List[str]          # e.g. ["large_order_relative_to_pool", "active_sandwich_bots"]
    model_version: str
    timestamp: int
```

---

## 4. Model 3: Liquidity Predictor

### 4.1 Problem Definition

**Input:** `(chain, token_pair, historical_reserves_for_N_blocks)`  
**Output:** `(predicted_depth_T_blocks_ahead, predicted_spread, predicted_volatility, confidence_interval)`  

Multi-step forecast for next 60 blocks (~10-15 min) and 360 blocks (~1 hour).

### 4.2 Approach: Temporal Fusion Transformer (TFT)

```
┌────────────────────────────────────────────────────────────────┐
│                  LIQUIDITY PREDICTOR (TFT)                      │
│                                                                 │
│  Input sequence: 720 blocks (~2 hours) of:                     │
│  • pool_reserve_0, pool_reserve_1                               │
│  • pool_volume_per_block                                        │
│  • pool_fees_per_block                                          │
│  • chain_gas_price                                              │
│  • token_price_usd (for both tokens)                            │
│  • block_timestamp                                                │
│                                                                 │
│  Static covariates:                                             │
│  • dex_type, fee_tier, pool_address (embedding)                 │
│  • chain_id (embedding)                                         │
│                                                                 │
│  Future-known inputs:                                           │
│  • hour_of_day, day_of_week (sin/cos encoding)                  │
│  • expected_whale_settlements (from mempool)                    │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐         │
│  │  TFT Encoder                                        │         │
│  │  • VariableSelectionNetwork (VSN) per timestep      │         │
│  │  • LSTM encoder (2 layers, hidden=128)              │         │
│  │  • Multi-head attention (4 heads) over time         │         │
│  │  • Skip connections → positional encoding          │         │
│  └────────────────────────────────────────────────────┘         │
│                        │                                        │
│                        ▼                                        │
│  ┌────────────────────────────────────────────────────┐         │
│  │  TFT Decoder                                        │         │
│  │  • LSTM decoder (2 layers, hidden=128)              │         │
│  │  • Quantile outputs: [0.05, 0.5, 0.95]             │         │
│  │  • 3 output heads: depth, spread, volatility       │         │
│  └────────────────────────────────────────────────────┘         │
│                        │                                        │
│                        ▼                                        │
│  Output: (60, 3, 3) for each horizon step:                     │
│  • depth: [p5, p50, p95]                                        │
│  • spread: [p5, p50, p95]                                       │
│  • volatility: [p5, p50, p95]                                   │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 Training

**Loss:** Quantile loss (pinball loss) for each quantile:
```
ρ_τ(y, ŷ) = max(τ·(y-ŷ), (τ-1)·(y-ŷ))
L = Σ_τ Σ_t ρ_τ(y_t, ŷ_t^τ)
```

**Training regime:**
- Batch size: 128 sequences
- Sequence length: 720 in, 60 out
- Optimizer: Adam (lr=1e-3)
- ReduceLROnPlateau (factor=0.5, patience=5)
- Validation: MAE on p50 + pinball loss on p5/p95
- Feature importance tracked via VSN weights

### 4.4 Serving

```python
class LiquidityForecastRequest(BaseModel):
    chain: str
    token_a: str
    token_b: str
    pool_address: Optional[str]
    horizon_blocks: int = 60                  # default ~10 min

class LiquidityForecastPoint(BaseModel):
    block_number: int
    timestamp: int
    depth_p50: float
    depth_p5: float
    depth_p95: float
    spread_p50: float
    spread_p5: float
    spread_p95: float
    volatility_p50: float

class LiquidityForecastResponse(BaseModel):
    chain: str
    pool_address: str
    token_a: str
    token_b: str
    forecast: List[LiquidityForecastPoint]
    model_version: str
    timestamp: int
```

---

## 5. Model 4: Privacy Score Calculator

### 5.1 Problem Definition

**Input:** `(route_strategy, execution_parameters, network_state)`  
**Output:** `(privacy_score: [0,100], risk_areas: [str], anonymization_entropy: float)`

### 5.2 Approach: Heuristic + Learned Scoring Model

The privacy score is computed as a weighted combination of features from three dimensions:

```
privacy_score = w₁·fragmentation_score + w₂·route_diversity + w₃·anonymity_set + w₄·settlement_delay + w₅·execution_entropy
```

**Phase 1 (Heuristic):** Fixed weights based on domain expertise.

**Phase 2 (Learned):** Logistic regression → GBM → small MLP trained on privacy breach labels.

### 5.3 Features

| Feature | Weight (heuristic) | Description | Range |
|---------|-------------------|-------------|-------|
| `fragmentation_level` | 0.25 | Number of order fragments / optimal fragments | [0,1] |
| `route_diversity` | 0.20 | Unique paths among fragments (Shannon index) | [0,1] |
| `relayer_anonymity_set` | 0.20 | Number of relayers that could execute each fragment | [0,1] |
| `settlement_delay_ratio` | 0.15 | Actual delay / max acceptable delay | [0,1] |
| `execution_path_entropy` | 0.10 | Entropy of DEX/bridge selection across fragments | [0,1] |
| `bridge_privacy_score` | 0.10 | Bridge-level privacy (LayerZero > CCTP > Wormhole) | [0,1] |

**Learned extension:** Add features:
- `tx_pattern_deviation`: How different is the execution pattern from typical user behavior
- `wallet_history_entropy`: How many different chains/protocols has the wallet used
- `timing_randomness`: Are fragment executions randomized in timing
- `correlation_probability`: Probability that fragments can be linked on-chain

### 5.4 Model Architecture (Phase 2)

```python
class PrivacyScorer:
    def __init__(self):
        self.encoder = nn.Sequential(
            nn.Linear(12, 32), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(32, 16), nn.ReLU(),
            nn.Linear(16, 8), nn.ReLU(),
        )
        self.score_head = nn.Linear(8, 1)       # Sigmoid output → [0,1] × 100
        self.risk_head = nn.Linear(8, 5)        # Multi-label: 5 risk categories

    def forward(self, x):
        h = self.encoder(x)
        score = torch.sigmoid(self.score_head(h)) * 100
        risks = torch.sigmoid(self.risk_head(h))  # Multi-label
        return score, risks
```

**Loss:** `MSE(score, true_score) + BCE(risks, true_risks)`

### 5.5 Serving

```python
class PrivacyScoreRequest(BaseModel):
    route_steps: List[RouteStep]
    fragmentation_strategy: Optional[Literal["none", "auto", "aggressive"]]
    wallet_address: Optional[str]
    use_historical_data: bool = True

class PrivacyScoreResponse(BaseModel):
    privacy_score: float                        # [0, 100]
    anonymization_entropy: float               # Shannon entropy of execution paths
    risk_areas: List[str]                       # e.g. ["correlated_fragments", "low_relayer_diversity"]
    recommendations: List[str]                  # e.g. ["increase delay between fragments", "use different bridge"]
    model_version: str
```

---

## 6. Infrastructure Design

### 6.1 Compute (0G Compute)

Training and inference run on 0G Compute instances:

| Resource | Training | Real-time Inference | Batch Inference |
|----------|----------|-------------------|-----------------|
| Instance type | 0G-Compute-GPU-L (8 vCPU, 32GB RAM, 1× A100 40GB) | 0G-Compute-CPU-M (4 vCPU, 16GB RAM) | 0G-Compute-CPU-L (8 vCPU, 32GB RAM) |
| Count | 1 (on-demand) | 2 (HA, active-active) | 1 (scheduled) |
| Storage | 500GB 0G Storage | 100GB (read-only model cache) | 200GB |
| Autoscaling | No | Yes (CPU > 80% for 5min) | No |

### 6.2 Training Pipeline

```yaml
# backend/ml/training/pipeline.yaml — Flyte workflow definition
# Orchestrated via Flyte (or Airflow for simpler setups)

workflow:
  name: ghostroute-ml-pipeline
  schedule: daily at 02:00 UTC

  steps:
    - name: data_validation
      image: ghostroute/ml-training:latest
      command: python -m training.validate_data
      inputs:
        - feature_store_path
      outputs:
        - validation_report

    - name: feature_engineering
      image: ghostroute/ml-training:latest
      command: python -m training.build_features
      inputs:
        - feature_store_path
        - start_date: "{{ ds - 7d }}"
        - end_date: "{{ ds }}"
      outputs:
        - training_dataset: parquet/2024-01-01.parquet

    - name: train_route_optimizer
      image: ghostroute/ml-training:latest
      command: python -m training.train_route_optimizer
      resources:
        gpu: 1
        memory: 32Gi
      inputs:
        - dataset_path
      outputs:
        - model_artifact: mlflow://route-optimizer/latest
        - metrics: mlflow://route-optimizer/latest/metrics

    - name: train_mev_predictor
      image: ghostroute/ml-training:latest
      command: python -m training.train_mev_predictor
      resources:
        gpu: 1
        memory: 24Gi
      inputs:
        - dataset_path
      outputs:
        - model_artifact: mlflow://mev-predictor/latest

    - name: train_liquidity_predictor
      image: ghostroute/ml-training:latest
      command: python -m training.train_liquidity_predictor
      resources:
        gpu: 1
        memory: 32Gi
      inputs:
        - dataset_path
      outputs:
        - model_artifact: mlflow://liquidity-predictor/latest

    - name: train_privacy_scorer
      image: ghostroute/ml-training:latest
      command: python -m training.train_privacy_scorer
      inputs:
        - dataset_path
      outputs:
        - model_artifact: mlflow://privacy-scorer/latest

    - name: model_evaluation
      image: ghostroute/ml-training:latest
      command: python -m training.evaluate_all
      inputs:
        - route_optimizer: mlflow://route-optimizer/latest
        - mev_predictor: mlflow://mev-predictor/latest
        - liquidity_predictor: mlflow://liquidity-predictor/latest
        - privacy_scorer: mlflow://privacy-scorer/latest
      outputs:
        - evaluation_report

    - name: promote_to_staging
      condition: "{{ steps.model_evaluation.metrics.route_optimizer.spearman > 0.7 }}"
      command: python -m training.promote_model
      inputs:
        - model_uri: mlflow://route-optimizer/latest
        - stage: staging

    - name: deploy_inference
      condition: "{{ steps.model_evaluation.metrics.route_optimizer.spearman > 0.75 }}"
      command: python -m training.deploy_inference
      inputs:
        - model_uri: mlflow://route-optimizer/latest
        - stage: production
```

### 6.3 Model Registry (MLflow)

```python
# backend/ml/training/utils.py
import mlflow

mlflow.set_tracking_uri("http://mlflow.ghostroute.internal:5000")
mlflow.set_experiment("ghostroute-route-optimizer")

with mlflow.start_run():
    # Log hyperparameters
    mlflow.log_params({
        "gat_hidden_dim": 256,
        "gat_heads": 8,
        "dqn_hidden": 128,
        "learning_rate": 3e-4,
        "batch_size": 256,
        "optimizer": "AdamW",
        "loss_weights": json.dumps({"cost": 0.3, "latency": 0.2, "mev": 0.25, "slippage": 0.15, "privacy": 0.1}),
    })

    # Log metrics
    mlflow.log_metrics({
        "val_spearman_rank": 0.823,
        "val_cost_mse": 0.042,
        "val_latency_mse": 0.087,
        "val_mev_auc": 0.891,
    })

    # Log model
    mlflow.pytorch.log_model(model, "model", registered_model_name="route_optimizer")
```

### 6.4 Inference Pipeline

```python
# backend/ml/inference/app.py
from fastapi import FastAPI, HTTPException
from prometheus_client import Histogram, Counter, Gauge
import mlflow.pytorch

app = FastAPI(title="GhostRoute ML Inference", version="1.0.0")

# Metrics
INFERENCE_LATENCY = Histogram("inference_latency_seconds", "Inference latency", ["model"])
INFERENCE_COUNT = Counter("inference_total", "Total inference requests", ["model", "status"])
MODEL_LOADED = Gauge("model_loaded", "Whether model is loaded", ["model"])

# Model cache
models = {}

def load_model(name: str, stage: str = "production"):
    model_uri = f"models:/{name}/{stage}"
    models[name] = mlflow.pytorch.load_model(model_uri)
    MODEL_LOADED.labels(model=name).set(1)

@app.on_event("startup")
async def load_models():
    for name in ["route_optimizer", "mev_predictor", "liquidity_predictor", "privacy_scorer"]:
        load_model(name)

@app.post("/api/v1/route/optimize")
async def route_optimize(request: RouteOptimizeRequest):
    with INFERENCE_LATENCY.labels(model="route_optimizer").time():
        try:
            features = extract_route_features(request)   # From feature store
            result = models["route_optimizer"].predict(features)
            INFERENCE_COUNT.labels(model="route_optimizer", status="success").inc()
            return result
        except Exception as e:
            INFERENCE_COUNT.labels(model="route_optimizer", status="error").inc()
            raise HTTPException(500, str(e))
```

### 6.5 Monitoring

```yaml
# Docker Compose or k8s manifests
monitoring:
  prometheus:
    scrape_configs:
      - job_name: "ml-inference"
        static_configs:
          - targets: ["ml-service:8000"]
      - job_name: "feature-store"
        static_configs:
          - targets: ["feature-store:8080"]

  grafana:
    dashboards:
      - name: "ML Model Performance"
        panels:
          - title: "Inference Latency (p50/p95/p99)"
          - title: "Prediction Drift (PSI per feature)"
          - title: "Model Accuracy Over Time"
          - title: "Feature Distribution Shift"
          - title: "Cache Hit Ratio"
      - name: "Data Pipeline Health"
        panels:
          - title: "Kafka Consumer Lag"
          - title: "Feature Store Write Latency"
          - title: "Collector Error Rate"

  alerts:
    - name: "ModelDrift"
      condition: "prediction_drift > 0.2"
      action: "PagerDuty + Slack #ml-alerts"
    - name: "InferenceLatency"
      condition: "p99_inference_latency > 500ms"
      action: "Slack #ml-alerts"
    - name: "FeatureStaleness"
      condition: "feature_age > 120s"
      action: "Slack #data-pipeline"
```

### 6.6 Data Pipeline

```python
# backend/ml/data/collector.py — Kafka consumer
from kafka import KafkaConsumer
import json
import redis
import psycopg2

consumer = KafkaConsumer(
    "raw.blocks", "raw.txs", "raw.prices",
    bootstrap_servers=["kafka.ghostroute.internal:9092"],
    value_deserializer=lambda v: json.loads(v.decode("utf-8")),
)

redis_client = redis.Redis(host="redis.ghostroute.internal", port=6379)
pg_conn = psycopg2.connect("host=postgres.ghostroute.internal dbname=ghostroute")

for message in consumer:
    if message.topic == "raw.blocks":
        process_block(message.value, redis_client, pg_conn)
    elif message.topic == "raw.txs":
        process_transaction(message.value, redis_client, pg_conn)
    elif message.topic == "raw.prices":
        process_price(message.value, redis_client, pg_conn)
```

### 6.7 New Prisma Models

Add to `backend/prisma/schema.prisma`:

```prisma
// ML Model Registry
model MlModel {
  id              String   @id @default(uuid())
  name            String   @unique        // "route_optimizer", "mev_predictor", etc.
  version         String
  stage           String   @default("staging")  // "staging", "production", "archived"
  mlflowRunId     String?
  artifactUri     String
  metrics         Json?
  hyperparams     Json?
  deployedAt     DateTime?
  createdAt      DateTime @default(now())

  @@index([name, stage])
}

// Feature Store metadata
model FeatureDefinition {
  id              String   @id @default(uuid())
  name            String   @unique
  featureGroup   String              // "onchain", "market", "route"
  dataType        String             // "float", "int", "string", "bool"
  source          String             // "rpc", "defillama", "coingecko", "derived"
  description     String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

// Prediction logs for monitoring
model PredictionLog {
  id              String   @id @default(uuid())
  modelName      String
  modelVersion   String
  requestHash     String             // SHA256 of request body
  requestBody     Json
  responseBody    Json
  latencyMs       Int
  featuresSnapshot Json?             // Feature values at inference time
  groundTruth     Json?              // Filled later by feedback loop
  createdAt      DateTime @default(now())

  @@index([modelName, createdAt])
  @@index([requestHash])
}

// Feedback / ground truth
model FeedbackLabel {
  id              String   @id @default(uuid())
  predictionLogId String
  modelName      String
  actualCost     Float?
  mevExtracted   Boolean?
  actualSlippage Float?
  privacyBreached Boolean?
  userRating      Int?                // 1-5 star from user
  source          String              // "onchain", "user", "relayer"
  createdAt      DateTime @default(now())

  @@index([modelName, createdAt])
}
```

---

## 7. Integration Points

### 7.1 Fastify Backend → ML Inference API

Create `backend/src/services/aiSolverClient.ts`:

```typescript
// backend/src/services/aiSolverClient.ts
import { Redis } from "ioredis";
import { v4 as uuid } from "uuid";

const ML_BASE_URL = process.env.ML_API_URL || "http://ml-service:8000";
const CACHE_TTL = parseInt(process.env.ML_CACHE_TTL || "30");

export interface RouteOptimizeParams {
  sourceChain: string;
  destChain: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  maxSlippage: number;
  privacyLevel: number;
  fragmentation: boolean;
  bridgePreference?: string;
  mevGuard: boolean;
  numAlternatives: number;
}

export interface RouteStep {
  type: "bridge" | "swap" | "fragment" | "settle";
  protocol: string;
  chain: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  expectedCost: number;
  expectedLatency: number;
  expectedSlippage: number;
  mevRisk: number;
  privacyScore: number;
  confidence: number;
}

export interface RouteOptimizeResult {
  id: string;
  steps: RouteStep[];
  totalCost: number;
  totalLatency: number;
  totalSlippage: number;
  totalMevRisk: number;
  totalPrivacyScore: number;
  confidence: number;
  alternatives: RouteStep[][];
  modelVersion: string;
}

export class AiSolverClient {
  constructor(private redis: Redis) {}

  async optimizeRoute(params: RouteOptimizeParams): Promise<RouteOptimizeResult> {
    const cacheKey = `ml:route:${this.cacheKey(params)}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Call ML service
    // In Phase 1 (no ML), fall back to heuristic solver
    const result = await this.callMLService("/api/v1/route/optimize", params)
      .catch(() => this.heuristicSolve(params));

    // Cache result
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
  }

  private async callMLService(path: string, body: any): Promise<any> {
    const response = await fetch(`${ML_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),  // 5s timeout
    });
    if (!response.ok) throw new Error(`ML service error: ${response.status}`);
    return response.json();
  }

  // Phase 1 fallback: simple weighted graph search
  private async heuristicSolve(params: RouteOptimizeParams): Promise<RouteOptimizeResult> {
    // TODO: Implement A* search with static weights
    // See §8 Phase 1 for details
    return {
      id: uuid(),
      steps: [],
      totalCost: 0,
      totalLatency: 0,
      totalSlippage: 0,
      totalMevRisk: 0,
      totalPrivacyScore: 0,
      confidence: 0.7,
      alternatives: [],
      modelVersion: "heuristic-v1",
    };
  }

  private cacheKey(params: RouteOptimizeParams): string {
    return `${params.sourceChain}:${params.destChain}:${params.tokenIn}:${params.tokenOut}:${params.amount}:${params.privacyLevel}`;
  }
}
```

### 7.2 Integration with Fastify Routes

Modify `backend/src/routes/execution.ts`:

```typescript
// backend/src/routes/execution.ts — POST /optimize
app.post("/optimize", async (request, reply) => {
  const data = simulateSchema.parse(request.body);
  const solver = new AiSolverClient(opts.redis);

  const result = await solver.optimizeRoute({
    sourceChain: data.sourceChain,
    destChain: data.destinationChain,
    tokenIn: data.sourceAsset,
    tokenOut: data.destinationAsset,
    amount: data.amount,
    maxSlippage: data.slippageTolerance,
    privacyLevel: data.privacyMode ? 2 : 0,
    fragmentation: data.fragmentationMode,
    bridgePreference: data.bridgePreference,
    mevGuard: data.mevGuard,
    numAlternatives: 2,
  });

  return {
    id: result.id,
    optimizedRoute: result.steps.map(s => `${s.protocol} → ${s.chain}`).join(" → "),
    gas: result.totalCost.toFixed(2),
    savings: `${((1 - result.totalCost / this.estimateNaiveCost(data)) * 100).toFixed(1)}%`,
    confidence: result.confidence,
    bridges: [...new Set(result.steps.filter(s => s.type === "bridge").map(s => s.protocol))],
    fragments: result.steps.length,
    privacyScore: result.totalPrivacyScore,
    mevRisk: result.totalMevRisk,
    alternatives: result.alternatives,
  };
});
```

Modify `backend/src/routes/routes.ts` — GET /recommend:

```typescript
// backend/src/routes/routes.ts — GET /recommend
app.get("/recommend", async (request, reply) => {
  const { source, dest, token, amount } = request.query as any;
  const solver = new AiSolverClient(opts.redis);

  const result = await solver.optimizeRoute({
    sourceChain: source || "ethereum",
    destChain: dest || "arbitrum",
    tokenIn: token || "ETH",
    tokenOut: token || "USDC",
    amount: parseFloat(amount || "10000"),
    maxSlippage: 0.5,
    privacyLevel: 1,
    fragmentation: true,
    mevGuard: true,
    numAlternatives: 2,
  });

  return {
    recommended: {
      path: result.steps.map(s => `${s.tokenIn} → ${s.protocol} → ${s.chain}`).join(" → "),
      reason: `Optimal gas + liquidity combination. ${result.steps[0]?.protocol ?? "LayerZero"} shows ${(result.confidence * 100).toFixed(1)}% confidence with ${result.totalLatency.toFixed(1)}s finality.`,
      confidence: Math.round(result.confidence * 100),
      alternatives: result.alternatives.map(alt =>
        alt.map(s => `${s.protocol} → ${s.chain}`).join(" → ")
      ),
    },
  };
});
```

### 7.3 Frontend AiSolver Component → ML Backend

Modify `frontend/src/components/ai-solver/AiSolver.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import { useRouteStore } from "@/stores/route-store";
// ...existing imports (Sparkles, ChevronRight, etc.)

export function AiSolver() {
  const { aiRecommendation, fetchRecommendation, loading } = useRouteStore();
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    setFetching(true);
    fetchRecommendation().finally(() => setFetching(false));
  }, [fetchRecommendation]);

  if (loading || fetching) {
    return <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="panel-title">AI Solver</span>
        <Sparkles className="w-3 h-3 text-matrix-yellow animate-pulse" />
      </div>
      <div className="flex-1 p-3 flex items-center justify-center">
        <span className="text-2xs text-surface-500 animate-pulse">Computing optimal route...</span>
      </div>
    </div>;
  }

  const rec = aiRecommendation ?? {
    path: "ETH → LayerZero → Arbitrum → Uniswap V3 → USDC",
    reason: "Optimal gas + liquidity combination.",
    alternatives: [],
    confidence: 94,
    bridgeHealth: "99.8% uptime",
    mevForecast: "Low risk",
  };

  // ... rest of render unchanged
}
```

Update `frontend/src/stores/route-store.ts` to call real API:

```typescript
// frontend/src/stores/route-store.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const useRouteStore = create<RouteState>((set) => ({
  activeRoute: null,
  aiRecommendation: null,
  loading: false,
  error: null,

  fetchRecommendation: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/routes/recommend`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ aiRecommendation: data.recommended, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setActiveRoute: (route) => set({ activeRoute: route }),
  setAiRecommendation: (rec) => set({ aiRecommendation: rec }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

### 7.4 Redis Caching Strategy for ML

| Cache Key Pattern | TTL | Purpose |
|-------------------|-----|---------|
| `ml:route:{hash}` | 30s | Route optimization result (per unique params) |
| `ml:mev:{chain}:{token}:{amount}` | 15s | MEV risk score |
| `ml:liquidity:{chain}:{pool}` | 60s | Liquidity forecast |
| `ml:privacy:{hash}` | 30s | Privacy score |
| `ml:model:version` | 3600s | Current model versions for drift detection |
| `feature:{name}:{key}` | 12-60s | Individual feature values (varies by feature) |

### 7.5 Fallback Behavior

| Scenario | Fallback |
|----------|----------|
| ML service unavailable (HTTP 5xx / timeout) | `aiSolverClient.heuristicSolve()` — A* on static graph with rule-based weights |
| Feature store unavailable | Use cached features (Redis, last known values) with staleness header |
| Model not loaded (cold start) | Load model synchronously from 0G Storage, cache in memory, serve heuristic during load |
| All downstream unavailable | Return last cached result with `stale: true` flag |
| Invalid input | Return validation error with helpful message (Zod/Fastify layer) |

```typescript
// Fallback chain in aiSolverClient.ts
async optimizeRoute(params: RouteOptimizeParams): Promise<RouteOptimizeResult> {
  const cacheKey = `ml:route:${this.cacheKey(params)}`;

  // 1. Try cache
  const cached = await this.redis.get(cacheKey);
  if (cached) return { ...JSON.parse(cached), cached: true };

  // 2. Try ML service
  try {
    const result = await this.callMLService("/api/v1/route/optimize", params);
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
  } catch (mlError) {
    console.warn("ML service unavailable, using heuristic fallback", mlError);
  }

  // 3. Try stale cache
  const staleCache = await this.redis.get(cacheKey);
  if (staleCache) return { ...JSON.parse(staleCache), cached: true, stale: true };

  // 4. Heuristic solver
  const heuristic = await this.heuristicSolve(params);
  await this.redis.setex(cacheKey, 60, JSON.stringify(heuristic));
  return heuristic;
}
```

---

## 8. Implementation Roadmap

### Phase 1: Heuristic Routing Engine
**Files to create/modify:**
- `backend/src/services/routeOptimizerService.ts` — NEW: A* search on static weighted graph
- `backend/src/services/aiSolverClient.ts` — NEW: solver client with heuristic fallback
- `backend/src/routes/execution.ts` — MODIFY: use AiSolverClient
- `backend/src/routes/routes.ts` — MODIFY: use AiSolverClient for /recommend

**Details:**
- Weighted graph with edges representing bridges and DEXs
- A* search with heuristic: `h(n) = min_edge_cost × remaining_steps`
- Edge weights from configurable JSON (initially hardcoded)
- Single-objective: minimize `(gas + fee + slippage × 100) / (1 + privacy_score × 0.1)`

```typescript
// backend/src/services/routeOptimizerService.ts (Phase 1 sketch)
interface GraphEdge {
  from: string;
  to: string;
  protocol: string;
  cost: number;       // USD expected cost
  latency: number;    // seconds
  successRate: number;
  privacy: number;    // [0, 100]
}

function aStarSearch(
  graph: GraphEdge[],
  start: string,
  end: string,
  options: { maxSteps: number; privacyWeight: number }
): GraphEdge[] {
  // Standard A* with priority queue
  // g(n) = cumulative cost along path
  // h(n) = estimated remaining cost (heuristic from min edge)
  // f(n) = g(n) + h(n)
  // Returns optimal path
}
```

### Phase 2: Data Collection Pipeline + Feature Store
**Files to create:**
- `backend/ml/data/collector.py` — Kafka consumer for on-chain data
- `backend/ml/data/defillama_collector.py` — DeFiLlama polling
- `backend/ml/data/coingecko_collector.py` — CoinGecko polling
- `backend/ml/data/mempool_collector.py` — Mempool tx collector
- `backend/ml/features/feature_definitions.yaml` — Feast registry
- `backend/ml/features/onchain_features.py` — Feature computation
- `backend/ml/features/market_features.py` — Market feature computation
- `backend/prisma/schema.prisma` — ADD MlModel, PredictionLog, FeedbackLabel
- `backend/src/jobs/priceUpdate.job.ts` — MODIFY: push to Kafka
- `backend/src/jobs/chainMetrics.job.ts` — MODIFY: push to Kafka

**Infrastructure:**
- Kafka/RabbitMQ deployment (Docker Compose or k8s)
- Redis for online feature store
- PostgreSQL for historical feature storage
- Feast feature registry

```yaml
# backend/ml/features/feature_definitions.yaml
features:
  - name: chain_gas_standard_ema_5min
    group: onchain
    type: FLOAT
    source: rpc
    ttl: 60s
    description: "5-minute exponential moving average of standard gas price"

  - name: bridge_tvl_usd
    group: defillama
    type: FLOAT
    source: defillama
    ttl: 300s
    description: "Total value locked in bridge"

  - name: pool_depth_usd
    group: onchain
    type: FLOAT
    source: rpc
    ttl: 15s
    description: "Current pool depth in USD terms"

  - name: mempool_sandwich_cluster_count
    group: mempool
    type: INT
    source: mempool_collector
    ttl: 12s
    description: "Number of detected sandwich bot clusters in mempool"
```

### Phase 3: Basic Model Training
**Files to create:**
- `backend/ml/requirements.txt` — Python dependencies
- `backend/ml/models/route_optimizer.py` — Simple MLP baseline
- `backend/ml/models/mev_predictor.py` — GBDT (LightGBM/XGBoost) classifier
- `backend/ml/models/liquidity_predictor.py` — Linear regression + ARIMA baseline
- `backend/ml/models/privacy_scorer.py` — Heuristic scorer (no ML yet)
- `backend/ml/training/train_route_optimizer.py` — Training script
- `backend/ml/training/train_mev_predictor.py` — Training script
- `backend/ml/training/train_liquidity_predictor.py` — Training script
- `backend/ml/inference/app.py` — FastAPI server
- `backend/ml/inference/schemas.py` — Pydantic schemas
- `backend/ml/Dockerfile` — Container for inference
- `.env.example` — ADD ML configuration vars

**Model details (Phase 3):**

| Model | Architecture | Features | Target |
|-------|-------------|----------|--------|
| Route Optimizer | 3-layer MLP (128→64→32) + beam search | ~25 features (flattened) | Regression on cost/latency per edge |
| MEV Predictor | LightGBM (num_leaves=64, max_depth=12) | ~30 features | 4-class classification |
| Liquidity Predictor | Linear ARIMA(2,1,2) per pool | Time-series only | Next-60-block depth |
| Privacy Scorer | Heuristic weighted sum | 6 features | Scalar score |

### Phase 4: Advanced Models
**Files to create/modify:**
- `backend/ml/models/route_optimizer.py` — MODIFY: GAT + DQN architecture
- `backend/ml/models/mev_predictor.py` — MODIFY: Transformer encoder
- `backend/ml/models/liquidity_predictor.py` — MODIFY: TFT architecture
- `backend/ml/models/privacy_scorer.py` — MODIFY: MLP scorer
- `backend/ml/models/ensembles.py` — NEW: stacking ensemble
- `backend/ml/training/*.py` — MODIFY: advanced training loops

**Compute requirements:**
- Route Optimizer: 1× A100 (~4h training for 1M episodes of RL)
- MEV Predictor: 1× A100 (~2h training for 100 epochs)
- Liquidity Predictor: 1× A100 (~6h training for 200 epochs)
- Privacy Scorer: CPU only (~30min training)

### Phase 5: Continuous Improvement
**Files to create:**
- `backend/ml/data/feedback_collector.py` — Ground truth from settlements
- `backend/ml/training/active_learning.py` — Uncertainty sampling
- `backend/ml/training/pipeline.yaml` — Flyte CI/CD pipeline
- `backend/ml/monitoring/drift_detector.py` — Data drift monitoring

**Feedback loop cycle:**
1. Order executed → Settlement recorded in Prisma
2. Feedback collector matches settlement to PredictionLog by requestHash
3. Ground truth stored in FeedbackLabel
4. Daily batch: retrain models on new data
5. Model evaluation → promote to staging if metrics improve
6. Canary deployment (10% traffic) → promote to production
7. Drift detector alerts if feature distributions shift > 2σ

---

## 9. 0G Integration Details

### 9.1 0G Compute

**Training jobs:**
```yaml
# docker-compose.ml.yml — 0G compute configuration
services:
  ml-training:
    image: ghostroute/ml-training:latest
    runtime: nvidia  # For GPU training
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - ZG_COMPUTE_ENDPOINT=${ZG_COMPUTE_ENDPOINT}
      - ZG_STORAGE_ENDPOINT=${ZG_STORAGE_ENDPOINT}
      - MLFLOW_TRACKING_URI=http://mlflow:5000
    volumes:
      - model-cache:/models
      - training-data:/data
    command: python -m training.train_route_optimizer
```

**0G Compute SDK:**
```python
# backend/ml/training/zerog_compute.py
import requests
from typing import Optional

ZG_COMPUTE_ENDPOINT = "https://compute.0g.ai"

class ZeroGCompute:
    def submit_training_job(self, job_config: dict) -> str:
        """Submit a training job to 0G Compute."""
        resp = requests.post(
            f"{ZG_COMPUTE_ENDPOINT}/api/v1/jobs",
            json={
                "image": "ghostroute/ml-training:latest",
                "gpu_required": job_config.get("gpu", 1),
                "memory_gb": job_config.get("memory", 32),
                "storage_gb": job_config.get("storage", 100),
                "command": job_config["command"],
                "env_vars": job_config.get("env", {}),
            },
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        resp.raise_for_status()
        return resp.json()["job_id"]

    def get_job_status(self, job_id: str) -> dict:
        resp = requests.get(f"{ZG_COMPUTE_ENDPOINT}/api/v1/jobs/{job_id}")
        resp.raise_for_status()
        return resp.json()

    def get_job_logs(self, job_id: str, tail: int = 100) -> str:
        resp = requests.get(f"{ZG_COMPUTE_ENDPOINT}/api/v1/jobs/{job_id}/logs?tail={tail}")
        resp.raise_for_status()
        return resp.text
```

### 9.2 0G Storage

**Model artifact storage:**
```python
# backend/ml/training/zerog_storage.py
import mlflow
import os

ZG_STORAGE_ENDPOINT = "https://storage.0g.ai"

class ZeroGStorage:
    def upload_model_artifact(self, local_path: str, remote_path: str) -> str:
        """Upload model artifact to 0G Storage."""
        with open(local_path, "rb") as f:
            resp = requests.put(
                f"{ZG_STORAGE_ENDPOINT}/api/v1/storage/{remote_path}",
                files={"file": f},
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
        resp.raise_for_status()
        return resp.json()["url"]

    def download_model_artifact(self, remote_path: str, local_path: str):
        """Download model artifact from 0G Storage."""
        resp = requests.get(
            f"{ZG_STORAGE_ENDPOINT}/api/v1/storage/{remote_path}",
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        resp.raise_for_status()
        with open(local_path, "wb") as f:
            f.write(resp.content)

    def get_model_uri(self, model_name: str, version: str) -> str:
        """Return 0G Storage URI for MLflow-compatible loading."""
        return f"zg://storage.0g.ai/models/{model_name}/{version}.pt"

# Configure MLflow to use 0G Storage for artifact storage
mlflow.set_tracking_uri("http://mlflow.internal:5000")
os.environ["MLFLOW_ARTIFACT_UPLOADER"] = "zg_storage"
```

**Training data storage:**
Parquet files stored on 0G Storage, accessed by training jobs:
```python
# backend/ml/training/build_features.py
import pyarrow.parquet as pq
from zerog_storage import ZeroGStorage

zg = ZeroGStorage()

# Read features from 0G Storage
dataset_path = "zg://storage.0g.ai/datasets/features/2024-01-01.parquet"
table = pq.read_table(dataset_path)
df = table.to_pandas()
```

### 9.3 0G DA (Data Availability)

Use 0G DA for committing route optimization results on-chain:

```solidity
// contracts/RouteRegistry.sol — DA commitment
interface IZeroGDA {
    function submit(bytes calldata data) external returns (bytes32 hash);
    function verify(bytes32 hash, bytes calldata data) external view returns (bool);
}

contract RouteRegistry {
    IZeroGDA public zgDA;

    // Commitment of route optimization results
    struct RouteCommitment {
        bytes32 routeHash;      // SHA256 of route steps
        bytes32 zgDAHash;       // 0G DA commitment
        uint256 timestamp;
        string  modelVersion;
    }

    mapping(bytes32 => RouteCommitment) public commitments;

    event RouteCommitted(bytes32 indexed routeHash, bytes32 zgDAHash, string modelVersion);

    function commitRoute(bytes calldata routeData, string calldata modelVersion) external {
        bytes32 routeHash = keccak256(routeData);
        bytes32 zgHash = zgDA.submit(routeData);  // Submit to 0G DA

        commitments[routeHash] = RouteCommitment({
            routeHash: routeHash,
            zgDAHash: zgHash,
            timestamp: block.timestamp,
            modelVersion: modelVersion
        });

        emit RouteCommitted(routeHash, zgHash, modelVersion);
    }

    function verifyRoute(bytes calldata routeData) external view returns (bool) {
        bytes32 routeHash = keccak256(routeData);
        RouteCommitment memory c = commitments[routeHash];
        require(c.timestamp > 0, "Route not committed");
        return zgDA.verify(c.zgDAHash, routeData);
    }
}
```

Backend code to commit routes:

```typescript
// backend/src/services/zerogDaService.ts
export class ZeroGDaService {
  private endpoint: string;

  constructor() {
    this.endpoint = process.env.ZG_DA_ENDPOINT || "https://da.0g.ai";
  }

  async commitRoute(routeData: object, modelVersion: string): Promise<string> {
    const serialized = JSON.stringify(routeData);
    const resp = await fetch(`${this.endpoint}/api/v1/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: Buffer.from(serialized).toString("hex"),
        tags: [`model:${modelVersion}`, "type:route_optimization"],
      }),
    });
    const result = await resp.json();
    return result.hash;  // 0G DA commitment hash
  }

  async verifyRoute(hash: string, routeData: object): Promise<boolean> {
    const serialized = JSON.stringify(routeData);
    const resp = await fetch(`${this.endpoint}/api/v1/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hash,
        data: Buffer.from(serialized).toString("hex"),
      }),
    });
    const result = await resp.json();
    return result.verified;
  }
}
```

---

## Appendix A: New Environment Variables

Add to `.env.example`:

```bash
# ML Service
ML_API_URL=http://ml-service:8000
ML_CACHE_TTL=30

# 0G Infrastructure
ZG_COMPUTE_ENDPOINT=https://compute.0g.ai
ZG_STORAGE_ENDPOINT=https://storage.0g.ai
ZG_DA_ENDPOINT=https://da.0g.ai
ZG_API_KEY=your_0g_api_key_here

# Feature Store
FEAST_REDIS_HOST=redis.ghostroute.internal
FEAST_REDIS_PORT=6379
FEAST_REGISTRY_PATH=s3://feast-registry/registry.db

# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka.ghostroute.internal:9092
KAFKA_SCHEMA_REGISTRY_URL=http://schema-registry:8081

# MLflow
MLFLOW_TRACKING_URI=http://mlflow.ghostroute.internal:5000
MLFLOW_ARTIFACT_STORE=zg://storage.0g.ai/mlflow

# Model Registry
MODEL_STAGE=production           # staging | production
ENABLE_CANARY_DEPLOYMENT=false

# Monitoring
DRIFT_THRESHOLD_PSI=0.2
INFERENCE_TIMEOUT_MS=5000
```

## Appendix B: File Dependency Graph

The following shows which files need to be created or modified, organized by implementation phase:

```
Phase 1 ──────────────────────────────────────────────────────────────
  backend/src/services/routeOptimizerService.ts        [CREATE]
  backend/src/services/aiSolverClient.ts               [CREATE]
  backend/src/routes/execution.ts                      [MODIFY: use AiSolverClient]
  backend/src/routes/routes.ts                         [MODIFY: use AiSolverClient]

Phase 2 ──────────────────────────────────────────────────────────────
  backend/ml/data/collector.py                         [CREATE]
  backend/ml/data/defillama_collector.py               [CREATE]
  backend/ml/data/coingecko_collector.py               [CREATE]
  backend/ml/data/mempool_collector.py                 [CREATE]
  backend/ml/features/feature_definitions.yaml         [CREATE]
  backend/ml/features/onchain_features.py              [CREATE]
  backend/ml/features/market_features.py               [CREATE]
  backend/prisma/schema.prisma                         [MODIFY: add ML models]
  backend/src/jobs/priceUpdate.job.ts                  [MODIFY: Kafka output]
  backend/src/jobs/chainMetrics.job.ts                 [MODIFY: Kafka output]
  docker-compose.yml                                   [MODIFY: add Kafka/Redis]

Phase 3 ──────────────────────────────────────────────────────────────
  backend/ml/requirements.txt                          [CREATE]
  backend/ml/models/route_optimizer.py                 [CREATE]
  backend/ml/models/mev_predictor.py                   [CREATE]
  backend/ml/models/liquidity_predictor.py             [CREATE]
  backend/ml/models/privacy_scorer.py                  [CREATE]
  backend/ml/training/train_route_optimizer.py         [CREATE]
  backend/ml/training/train_mev_predictor.py           [CREATE]
  backend/ml/training/train_liquidity_predictor.py     [CREATE]
  backend/ml/training/utils.py                         [CREATE]
  backend/ml/inference/app.py                          [CREATE]
  backend/ml/inference/schemas.py                      [CREATE]
  backend/ml/inference/router_optimizer.py             [CREATE]
  backend/ml/inference/mev_predictor.py                [CREATE]
  backend/ml/inference/liquidity_predictor.py          [CREATE]
  backend/ml/inference/privacy_scorer.py               [CREATE]
  backend/ml/Dockerfile                                [CREATE]
  .env.example                                         [MODIFY]

Phase 4 ──────────────────────────────────────────────────────────────
  backend/ml/models/route_optimizer.py                 [REWRITE: GAT + DQN]
  backend/ml/models/mev_predictor.py                   [REWRITE: Transformer]
  backend/ml/models/liquidity_predictor.py             [REWRITE: TFT]
  backend/ml/models/privacy_scorer.py                  [REWRITE: MLP]
  backend/ml/models/ensembles.py                       [CREATE]
  backend/ml/training/*.py                             [MODIFY: advanced loops]

Phase 5 ──────────────────────────────────────────────────────────────
  backend/ml/data/feedback_collector.py                [CREATE]
  backend/ml/training/active_learning.py               [CREATE]
  backend/ml/training/pipeline.yaml                    [CREATE]
  backend/ml/monitoring/drift_detector.py              [CREATE]

Frontend changes (any phase) ─────────────────────────────────────────
  frontend/src/components/ai-solver/AiSolver.tsx       [MODIFY: live API]
  frontend/src/stores/route-store.ts                   [MODIFY: API calls]
  frontend/src/stores/solver-store.ts                  [MODIFY: add ML state]
  frontend/src/types/index.ts                          [MODIFY: add ML types]
```

**Total: ~42 new files, ~10 modified files across 5 phases.**
