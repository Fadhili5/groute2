# GhostRoute Terminal — Infrastructure Evolution for 20 Upgrade Proposals

> **Status**: Design Document
> **Target**: Production-grade infrastructure supporting all 20 advanced upgrades
> **Based on**: `devops-analysis.md` (current state), `k8s/deployment.yaml`, `docker/docker-compose.yml`, `.github/workflows/ci.yml`

---

## Table of Contents

1. [Service Architecture](#1-service-architecture)
2. [Container Orchestration](#2-container-orchestration)
3. [Database Infrastructure](#3-database-infrastructure)
4. [Compute Infrastructure](#4-compute-infrastructure)
5. [Networking](#5-networking)
6. [CI/CD Evolution](#6-cicd-evolution)
7. [Observability](#7-observability)
8. [Security Infrastructure](#8-security-infrastructure)
9. [Cost Projections](#9-cost-projections)
10. [Disaster Recovery](#10-disaster-recovery)

---

## 1. Service Architecture

### 1.1 Microservice Decomposition

The 20 upgrades decompose into 14 microservices mapped to domain boundaries:

```
ghostroute-terminal/
├── backend/                          # Monolith gateway (existing)
├── services/
│   ├── solver-auction/               # Upgrade 1 — Intent Execution
│   ├── private-mempool/              # Upgrade 2 — Private Mempool (Rust/Go, TEE)
│   ├── graph-engine/                 # Upgrade 3 — Graph Engine
│   ├── ai-copilot/                   # Upgrade 4 — AI Copilot (Python, LLM)
│   ├── rebalancer/                   # Upgrade 5 — Dynamic Rebalancing
│   ├── treasury/                     # Upgrade 6 — Treasury Automation
│   ├── risk-engine/                  # Upgrade 7 — Risk Engine (Go/Scala, Kafka)
│   ├── solver-marketplace/           # Upgrade 8 — Solver Marketplace
│   ├── zk-prover/                    # Upgrade 9 — zk-Proofs (Rust/C++, GPU)
│   ├── wallet-session/              # Upgrade 10 — Multi-Wallet
│   ├── liquidity-ai/                # Upgrade 11 — Liquidity AI (Python/ML)
│   ├── execution-replay/            # Upgrade 12 — Execution Replay
│   ├── relayer-reputation/          # Upgrade 13 — Relayer Reputation
│   ├── strategy-sandbox/            # Upgrade 15 — Strategy Builder (Firecracker)
│   ├── cross-chain-indexer/         # Upgrade 16 — Position Engine
│   ├── compliance-audit/            # Upgrade 17 — Compliance
│   ├── developer-portal/            # Upgrade 18 — SDK
│   └── relayer-consensus/           # Upgrade 19 — Relayer Coordination
├── helm/
│   ├── charts/
│   │   ├── ghostroute-core/
│   │   ├── ghostroute-data/
│   │   ├── ghostroute-ai/
│   │   └── ghostroute-infra/
│   └── values/
│       ├── production.yaml
│       ├── staging.yaml
│       └── development.yaml
└── k8s/
    ├── production/
    ├── staging/
    └── monitoring/
```

### 1.2 Service Topology

```
                                    ┌──────────────────────────────┐
                                    │      Cloudflare / DDoS       │
                                    └──────────────┬───────────────┘
                                                   │
                                    ┌──────────────┴───────────────┐
                                    │    AWS Global Accelerator     │
                                    └──────────────┬───────────────┘
                                                   │
                                    ┌──────────────┴───────────────┐
                                    │    Istio Ingress Gateway      │
                                    │    (mTLS termination)         │
                                    └──┬────────────┬──────────────┬┘
                                       │            │              │
                            ┌──────────┴──┐  ┌──────┴──────┐  ┌───┴────────┐
                            │ Public API   │  │ SDK Gateway │  │ Developer  │
                            │ (Upgrade 8,  │  │ (Upgrade 18)│  │ Portal     │
                            │  18)         │  │ Rate Limit  │  │            │
                            └──────┬───────┘  └──────┬───────┘  └────┬───────┘
                                   │                  │              │
                     ┌─────────────┼──────────────────┴──────────────┘
                     │             │
              ┌──────┴──────┐ ┌────┴────────────┐
              │  Frontend   │ │  Backend (mono) │
              │  (UI/WS)    │ │  (Upgrade 14)   │
              └──────┬──────┘ └──┬──────────────┘
                     │           │
          ┌──────────┼───────────┼──────────────────────────┐
          │          │           │                          │
          │   ┌──────┴──────┐   │     ┌─────────────────┐  │
          │   │  WebSocket  │   │     │  Risk Engine    │  │
          │   │  (Up 14)    │   │     │  (Kafka/Flink)  │  │
          │   └─────────────┘   │     │  (Upgrade 7)    │  │
          │                     │     └────────┬────────┘  │
          │   ┌─────────────────┼──────────────┼───────┐   │
          │   │   Service Mesh (Istio Sidecar)  │       │   │
          │   └─────────────────┼──────────────┼───────┘   │
          │                     │              │           │
    ┌─────┴─────┐   ┌──────────┴──────┐  ┌────┴──────┐    │
    │ Solver    │   │ Private Mempool │  │ AI/ML     │    │
    │ Auction   │   │ (TEE)           │  │ Copilot   │    │
    │ (Up 1)    │   │ (Up 2)          │  │ (Up 4,11) │    │
    └─────┬─────┘   └──────────┬──────┘  └────┬──────┘    │
          │                    │              │           │
    ┌─────┴─────┐   ┌──────────┴──────┐  ┌────┴──────┐    │
    │ Graph     │   │ zk-Prover       │  │ Strategy  │    │
    │ Engine    │   │ (Up 9)          │  │ Sandbox   │    │
    │ (Up 3)    │   │                 │  │ (Up 15)   │    │
    └─────┬─────┘   └──────────┬──────┘  └────┬──────┘    │
          │                    │              │           │
          └────────────────────┼──────────────┘           │
                               │                          │
                    ┌──────────┴──────────────────────┐   │
                    │         Data Layer              │   │
                    │  ┌──────┐ ┌────┐ ┌──────┐       │   │
                    │  │ PG   │ │Redis│ │Neo4j │       │   │
                    │  │(1M/3R)│ │Clstr│ │Cluster│      │   │
                    │  └──────┘ └────┘ └──────┘       │   │
                    │  ┌──────┐ ┌────┐ ┌────────┐     │   │
                    │  │MinIO │ │TSDB│ │Kafka   │     │   │
                    │  │(S3)  │ │(TS)│ │(Str.Pro)│    │   │
                    │  └──────┘ └────┘ └────────┘     │   │
                    └──────────────────────────────────┘   │
                                                           │
          ┌────────────────────────────────────────────────┘
          │
   ┌──────┴──────┐
   │ Observability│
   │ Prom+Loki+  │
   │ Tempo+Sentry │
   └─────────────┘
```

### 1.3 Service Mesh — Istio

Reference file to create: `k8s/production/service-mesh/istio-operator.yaml`

Istio profile `production` with:
- **mTLS**: STRICT mode across all ghostroute namespaces
- **Ingress Gateway**: NLB-backed, HPA 3-10 replicas
- **Egress Gateway**: Controlled external access (Alchemy, Solana RPC, etc.)
- **Tracing**: 1/1000 sampling rate to Tempo
- **Access logs**: JSON format shipped via Loki

```yaml
# k8s/production/service-mesh/peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: ghostroute-core
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: ghostroute-data
spec:
  mtls:
    mode: PERMISSIVE  # DB traffic may not support mTLS natively
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ghostroute-backend
  namespace: ghostroute-core
spec:
  host: ghostroute-backend
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 1024
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

### 1.4 API Gateway Routing

```yaml
# k8s/production/service-mesh/gateway.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: ghostroute-gateway
  namespace: ghostroute-core
spec:
  selector:
    istio: istio-ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: ghostroute-tls
    hosts:
    - "*.ghostroute.io"
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*.ghostroute.io"
    tls:
      httpsRedirect: true
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ghostroute-routing
  namespace: ghostroute-core
spec:
  hosts:
  - "app.ghostroute.io"
  - "api.ghostroute.io"
  - "sdk.ghostroute.io"
  - "dev.ghostroute.io"
  gateways:
  - ghostroute-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1/sdk
    route:
    - destination:
        host: developer-portal.ghostroute-sdk.svc.cluster.local
        port:
          number: 3000
  - match:
    - uri:
        prefix: /api/v1/auction
    route:
    - destination:
        host: solver-auction.ghostroute-core.svc.cluster.local
        port:
          number: 3000
  - match:
    - uri:
        prefix: /api/v1/mempool
    route:
    - destination:
        host: private-mempool.ghostroute-core.svc.cluster.local
        port:
          number: 3000
  - match:
    - uri:
        prefix: /ws
    route:
    - destination:
        host: ghostroute-backend.ghostroute-core.svc.cluster.local
        port:
          number: 3001
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: ghostroute-backend.ghostroute-core.svc.cluster.local
        port:
          number: 3001
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: ghostroute-frontend.ghostroute-core.svc.cluster.local
        port:
          number: 3000
```

### 1.5 Service Discovery

Kubernetes CoreDNS + Istio service registry. External services via `ServiceEntry`:

```yaml
# k8s/production/service-mesh/service-entry.yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-rpcs
  namespace: ghostroute-core
spec:
  hosts:
  - "eth-mainnet.alchemyapi.io"
  - "api.solana.com"
  - "pro.coinmarketcap.com"
  - "*.rpc.0g.ai"
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: developer-external
  namespace: ghostroute-sdk
spec:
  hosts:
  - "api.ghostroute.io"
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

---

## 2. Container Orchestration

### 2.1 Namespace Isolation Strategy

| Namespace | Purpose | Pod Security | Istio | GPU Access |
|-----------|---------|-------------|-------|------------|
| `ghostroute-core` | Backend, Frontend, Core services | restricted | enabled | no |
| `ghostroute-data` | PostgreSQL, Redis, Neo4j, Kafka | restricted | enabled | no |
| `ghostroute-ai` | AI Copilot, Liquidity AI | baseline | enabled | yes |
| `ghostroute-zk` | zk-Prover service | baseline | disabled | yes |
| `ghostroute-sandbox` | Strategy sandbox (gVisor/Firecracker) | privileged | disabled | no |
| `ghostroute-auth` | Auth services, OAuth2 proxy | restricted | enabled | no |
| `ghostroute-sdk` | SDK Gateway, Developer portal | restricted | enabled | no |
| `ghostroute-compliance` | Audit logging, long-term storage | restricted | enabled | no |

```yaml
# k8s/production/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute-core
  labels:
    pod-security.kubernetes.io/enforce: restricted
    istio-injection: enabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute-data
  labels:
    pod-security.kubernetes.io/enforce: restricted
    istio-injection: enabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute-ai
  labels:
    pod-security.kubernetes.io/enforce: baseline
    istio-injection: enabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute-zk
  labels:
    pod-security.kubernetes.io/enforce: baseline
    istio-injection: disabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute-sandbox
  labels:
    pod-security.kubernetes.io/enforce: privileged
    istio-injection: disabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute-auth
  labels:
    pod-security.kubernetes.io/enforce: restricted
    istio-injection: enabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute-sdk
  labels:
    pod-security.kubernetes.io/enforce: restricted
    istio-injection: enabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute-compliance
  labels:
    pod-security.kubernetes.io/enforce: restricted
    istio-injection: enabled
```

### 2.2 Resource Quotas Per Namespace

```yaml
# k8s/production/quotas/core-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: core-quota
  namespace: ghostroute-core
spec:
  hard:
    requests.cpu: "16"
    requests.memory: "32Gi"
    limits.cpu: "32"
    limits.memory: "64Gi"
    pods: "50"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: data-quota
  namespace: ghostroute-data
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "32Gi"
    limits.cpu: "16"
    limits.memory: "64Gi"
    pods: "20"
    persistentvolumeclaims: "20"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ai-quota
  namespace: ghostroute-ai
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "32Gi"
    limits.cpu: "32"
    limits.memory: "128Gi"
    requests.nvidia.com/gpu: "8"
    pods: "20"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: zk-quota
  namespace: ghostroute-zk
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "16Gi"
    limits.cpu: "16"
    limits.memory: "64Gi"
    pods: "10"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: sandbox-quota
  namespace: ghostroute-sandbox
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "16Gi"
    limits.cpu: "16"
    limits.memory: "32Gi"
    pods: "100"
    ephemeral-storage: "100Gi"
```

### 2.3 Key Service Deployments

**Solver Auction (Upgrade 1)** — low-latency bidding engine:

```yaml
# k8s/production/services/solver-auction/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solver-auction
  namespace: ghostroute-core
  labels:
    app: ghostroute
    component: solver-auction
    tier: critical
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ghostroute
      component: solver-auction
  template:
    metadata:
      labels:
        app: ghostroute
        component: solver-auction
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9464"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            component: solver-auction
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: component
                operator: In
                values:
                - solver-auction
            topologyKey: kubernetes.io/hostname
      containers:
      - name: solver-auction
        image: ghcr.io/ghostroute/solver-auction:latest
        ports:
        - name: http
          containerPort: 3000
        - name: metrics
          containerPort: 9464
        - name: grpc
          containerPort: 50051
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: ghostroute-redis
              key: url
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ghostroute-database
              key: url
        - name: AUCTION_ENGINE
          value: sealed-bid
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        startupProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 30
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 15
          periodSeconds: 10
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      terminationGracePeriodSeconds: 30
```

**AI Copilot (Upgrade 4)** — GPU-backed LLM serving:

```yaml
# k8s/production/services/ai-copilot/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-copilot
  namespace: ghostroute-ai
  labels:
    app: ghostroute
    component: ai-copilot
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ghostroute
      component: ai-copilot
  template:
    metadata:
      labels:
        app: ghostroute
        component: ai-copilot
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
    spec:
      runtimeClassName: nvidia-gpu
      nodeSelector:
        workload-type: gpu-inference
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: vllm-server
        image: vllm/vllm-openai:latest
        ports:
        - containerPort: 8000
          name: http
        - containerPort: 8001
          name: metrics
        env:
        - name: MODEL_NAME
          value: "ghostroute-copilot-v1"
        - name: MAX_MODEL_LEN
          value: "8192"
        - name: GPU_MEMORY_UTILIZATION
          value: "0.90"
        - name: SERVED_MODEL_NAME
          value: "ghostroute-copilot"
        resources:
          requests:
            memory: "32Gi"
            cpu: "8000m"
            nvidia.com/gpu: 1
          limits:
            memory: "64Gi"
            cpu: "16000m"
            nvidia.com/gpu: 1
        volumeMounts:
        - name: models
          mountPath: /models
          readOnly: true
        - name: dshm
          mountPath: /dev/shm
        startupProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 120
          periodSeconds: 15
          failureThreshold: 30
        livenessProbe:
          httpGet:
            path: /health
            port: http
          periodSeconds: 30
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: ai-models-pvc
      - name: dshm
        emptyDir:
          medium: Memory
          sizeLimit: "4Gi"
```

### 2.4 Helm Chart Architecture

```
helm/
├── charts/
│   ├── ghostroute-core/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── _helpers.tpl
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── hpa.yaml
│   │       ├── pdb.yaml
│   │       ├── serviceaccount.yaml
│   │       └── servicemonitor.yaml
│   ├── ghostroute-data/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   ├── ghostroute-ai/
│   │   ├── Chart.yaml
│   │   └── values.yaml
│   └── ghostroute-infra/
│       ├── Chart.yaml
│       └── values/
├── values/
│   ├── production.yaml
│   ├── staging.yaml
│   └── development.yaml
```

### 2.5 HPA Strategies

**Core services** — standard CPU/memory based:
```yaml
minReplicas: 3, maxReplicas: 10
metrics:
- resource: cpu, target: 70%
- resource: memory, target: 80%
scaleUp: stabilizationWindow: 60s, policies: 100% per 60s
scaleDown: stabilizationWindow: 300s, policies: 25% per 120s
```

**Solver Auction** — custom metric (bid latency):
```yaml
- type: Pods
  pods:
    metric: auction_bid_latency_ms
    target:
      type: AverageValue
      averageValue: 50
```

**zk-Prover** — queue-depth based:
```yaml
- type: Pods
  pods:
    metric: zk_proof_queue_depth
    target:
      type: AverageValue
      averageValue: 5
```

**LLM Serving** — request queue length:
```yaml
- type: Pods
  pods:
    metric: avg_request_queue_length
    target:
      type: AverageValue
      averageValue: 5
```

---

## 3. Database Infrastructure

### 3.1 PostgreSQL — Primary + 2 Replicas + PgBouncer

**StatefulSet** (3 replicas, one primary via Patroni or repmgr):
- 200GB data volume (gp3-encrypted), 50GB WAL volume (io2)
- Config: shared_buffers=2GB, effective_cache_size=6GB, max_connections=200
- WAL level: replica, archive_mode: on (pgBackRest to S3)

**Backup schedule**: Full weekly (Sun 1am), Incremental every 6h, WAL streaming continuous
**PITR capability**: Any point within 7 days, using S3 WAL archive
**Connection pooling**: PgBouncer sidecar (3 replicas, transaction mode, pool size 25)

**Point-in-Time Recovery procedure:**
```bash
# 1. Restore base backup
pgbackrest --stanza=ghostroute --type=time --target="2024-01-15 14:30:00 UTC" restore

# 2. Configure recovery.conf
recovery_target_time = '2024-01-15 14:30:00 UTC'
recovery_target_action = 'promote'

# 3. Start PostgreSQL — it replays WAL to target time then promotes
```

### 3.2 Redis — Cluster Mode with Sentinel

Bitnami Redis chart, `architecture: replication`:
- 1 master + 2 replicas (20GB gp3 each)
- 3 sentinel pods (quorum: 2)
- maxmemory: 1GB, policy: allkeys-lru, appendonly: yes

### 3.3 Neo4j — 3-Node Core Cluster (Upgrade 3)

- 3 core nodes with causal clustering
- 8GB heap, 4GB pagecache
- 100GB data volume per node
- Backup: `neo4j-admin database dump` to S3 daily

### 3.4 TimescaleDB — Time-Series (Upgrade 7, 16)

- 1 primary, 1 replica (Patroni)
- 100GB data volume
- Compression policy: 7 days
- Retention policy: 90 days (audit), 365 days (aggregated metrics)

### 3.5 MinIO — Object Storage (Upgrade 12, 17)

- 4-node distributed mode
- 500GB total (gp3-encrypted)
- Buckets: `execution-snapshots`, `audit-logs`, `model-artifacts`, `strategy-backups`
- S3-compatible, exposed via Ingress at `s3.ghostroute.io`

### 3.6 Kafka + Flink — Stream Processing (Upgrade 7)

- 3 brokers (200GB io2 each), 3 controllers, 3 ZK nodes
- Topics: `risk-events`, `rebalancing-commands`, `relayer-reputation`, `audit-events`
- Flink: 1 jobmanager (4GB), 3 taskmanagers (32GB each, 8 slots)
- Default replication factor: 3

---

## 4. Compute Infrastructure

### 4.1 GPU Nodepools

| Pool | Instance | GPU | Min/Max | Use Case |
|------|----------|-----|---------|----------|
| gpu-inference | g5.xlarge | 1x A10G (24GB) | 1/10 | AI Copilot, LLM serving |
| gpu-training | p4d.24xlarge | 8x A100 (320GB) | 0/4 | Model training (spot) |
| gpu-zk | g5.xlarge | 1x A10G (24GB) | 1/8 | zk-proof generation |

### 4.2 Spot Instance Strategy

| Pool | Instance | Min/Max | Use Case |
|------|----------|---------|----------|
| spot-batch | m6i.large | 0/50 | CronJobs, batch processing |
| spot-memory | r6i.large | 0/30 | Memory-intensive batch jobs |

**Spot interruption handling**: AWS Node Termination Handler daemonset drains pods on spot interruption notice.
**CronJobs** (Treasury, Rebalancer, Training) use `nodeSelector: lifecycle: ec2spot` by default.

---

## 5. Networking

### 5.1 Ingress + TLS

- **Ingress Controller**: nginx-ingress (NLB-backed, auto-scaling 2-10 replicas)
- **TLS**: cert-manager + Let's Encrypt (ClusterIssuer: letsencrypt-prod)
- **Wildcard cert**: `*.ghostroute.io`
- **ModSecurity**: OWASP CRS enabled in ingress controller
- **Rate limiting**: nginx `limit-rps: 1000`, `limit-connections: 100`

### 5.2 Network Policy Matrix

| From \ To | Frontend | Backend | Solver | Data | Prometheus | External |
|-----------|----------|---------|--------|------|------------|----------|
| Ingress | ✓ | ✓ | ✓ | ✗ | ✗ | N/A |
| Frontend | ✗ | ✓ | ✗ | ✗ | ✗ | N/A |
| Backend | ✗ | ✓ | ✓ | ✓ (PG:5432, Redis:6379, Neo4j:7687, Kafka:9092, MinIO:9000) | ✗ | ✓ (Alchemy, Solana) |
| Solver | ✗ | ✗ | ✓ | ✓ (Redis, PG) | ✗ | ✗ |
| SDK | ✗ | ✗ | ✗ | ✓ (PG, Redis) | ✗ | ✓ (ext API) |
| Sandbox | ✗ | ✗ | ✗ | ✗ | ✗ | HTTPS only |
| Prometheus | ✓ (9464) | ✓ (9464) | ✓ (9464) | ✓ | ✗ | ✗ |

### 5.3 DDoS Protection

Cloudflare WAF with:
- Country blocking (sanctions lists)
- Threat score challenge (>50 → managed challenge)
- Rate limiting: 1000 req/min per IP on API, 300 req/min on SDK
- Bot management for API endpoints

---

## 6. CI/CD Evolution

### 6.1 Multi-Stage Pipeline

Reference: Replace `.github/workflows/ci.yml` with `.github/workflows/ci-cd.yml`:

```
Stage 1 — Lint & Security (parallel):
  ├── lint (matrix: backend, frontend, contracts)
  └── security-scan (Trivy fs, npm audit, Slither)

Stage 2 — Test (parallel):
  ├── contracts-test (hardhat test, coverage)
  ├── backend-test (postgres + redis services, prisma, jest)
  └── frontend-test (jest, coverage)

Stage 3 — Build (gated by stages 1+2):
  └── build-images (matrix: all 8 services, Docker Buildx, GHCR)

Stage 4 — Scan Images:
  └── scan-images (Trivy container scan, upload SARIF)

Stage 5 — Deploy (gated by stage 4):
  ├── deploy-staging (helm upgrade, smoke test)
  └── deploy-production (helm upgrade, canary rollout, health check)
```

### 6.2 GitOps with ArgoCD

Application-of-applications pattern:

```yaml
# argocd/ghostroute-app-of-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ghostroute
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/ghostroute/ghostroute-terminal
    targetRevision: HEAD
    path: argocd/apps
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 6.3 Blue-Green Deployment

Critical services (Backend, Solver Auction) use Argo Rollouts with blue-green:
- `activeService` / `previewService` pattern
- Auto-promotion disabled for manual verification
- Old version kept for 10 minutes for rollback
- Pre-promotion smoke tests (HTTP health + synthetic transactions)

### 6.4 Canary Releases

New services progressively shifted:
```
Step 1: 10% traffic, pause 5 min
Step 2: 25% traffic, pause 5 min
Step 3: 50% traffic, pause 10 min
Step 4: 75% traffic, pause 5 min
Step 5: 100% traffic
```
Analysis templates: `success-rate > 99%`, `P99 latency < 200ms`

---

## 7. Observability

### 7.1 Stack Components

| Component | Storage | Retention | Scaling |
|-----------|---------|-----------|---------|
| Prometheus (kube-prometheus-stack) | 200GB PVC | 30d | 2-5 replicas |
| Loki (microservices mode) | S3 bucket | 90d | 3 read, 3 write, 3 backend |
| Tempo | S3 bucket | 48h traces | 3 ingesters, 1 querier |
| Grafana | 50GB PVC | N/A | 1 replica |
| Alertmanager | N/A | N/A | 3 replicas |
| Sentry (optional) | 20GB PVC | 90d | 1 server + workers |

### 7.2 Metrics Per Domain

**Core**: Request rate, error rate (5xx), P50/P95/P99 latency, CPU/memory, active WebSocket connections
**Data**: PG connections, WAL size, cache hit ratio, Redis memory %, Kafka consumer lag, Neo4j transactions/s
**AI**: GPU utilization, GPU memory, LLM latency quantiles, tokens/sec (prompt + generation), queue depth
**ZK**: Proof queue depth, generation time, verification time, GPU utilization

### 7.3 SLO/SLI Definitions

| SLO | Target | SLI | Measurement Window |
|-----|--------|-----|-------------------|
| API Availability | 99.95% | (1 - 5xx/total requests) | 30d rolling |
| API Latency | P95 < 500ms | istio_request_duration_ms | 5m |
| Auction Bid Latency | P99 < 100ms | auction_bid_duration | 5m |
| Database Write | P99 < 50ms | pg write latency | 5m |
| zk-Proof Time | P95 < 60s | proof_generation_duration | 5m |
| LLM Response | P95 < 2s | vllm request duration | 5m |

### 7.4 Alert Routing

| Severity | Channel | Response SLA | Examples |
|----------|---------|-------------|----------|
| Critical | PagerDuty + Slack | 15min | Backend down, DB unavailable, SLO burn rate |
| Warning | Slack #alerts-warning | 30min | High error rate, elevated latency, disk space |
| Info | Slack #alerts-info | 2hr | Rollout started, backup completed, scaling event |

---

## 8. Security Infrastructure

### 8.1 Secrets Management

External Secrets Operator reading from AWS Secrets Manager:
- Provider: AWS Secrets Manager with IRSA (IAM Roles for Service Accounts)
- Auto-refresh: 1 hour
- Clusters: `ghostroute-cluster-store` for cross-namespace secrets

### 8.2 Container Security

- **Build time**: Trivy scans in CI (HIGH/CRITICAL → exit 1)
- **Registry**: Daily scheduled scans of all latest tags
- **Runtime**: Falco daemonset monitoring syscalls (crypto mining, shell in container, privilege escalation)
- **Pod Security**: restricted profile enforced via namespace labels

### 8.3 Network Security

- Default-deny NetworkPolicies in all namespaces
- mTLS via Istio (STRICT mode for core, PERMISSIVE for data)
- Egress traffic via Istio Egress Gateway (controlled allowlist)
- Sandbox namespace: no ingress, HTTPS-only egress to core

### 8.4 Audit Logging

All compliance-relevant events (auth, admin actions, trade execution) published to Kafka topic `ghostroute-audit`, consumed by `audit-logger` service, stored in:
- TimescaleDB (90 days hot retention)
- MinIO/S3 bucket (7 years cold storage, immutable)
- Completeness check CronJob runs every 6 hours

---

## 9. Cost Projections

### 9.1 Monthly Infrastructure Costs

| Component | Instance/Resource | Count | Unit Cost | Monthly |
|-----------|------------------|-------|-----------|---------|
| **Phase 1 — Core (Upgrades 1-6)** | | | | **$3,850** |
| Backend | t3.medium (2vCPU, 4GB) | 3 avg | $30 | $90 |
| Frontend | t3.small (2vCPU, 2GB) | 3 avg | $20 | $60 |
| Solver Auction | t3.large (2vCPU, 8GB) | 3 avg | $61 | $183 |
| Private Mempool | t3.large | 2 | $61 | $122 |
| Graph Engine (Neo4j) | r6i.xlarge (4vCPU, 32GB) | 3 | $165 | $495 |
| AI Copilot | g5.xlarge (1xA10G) | 2 | $550 | $1,100 |
| Dynamic Rebalancer | t3.medium | 2 | $30 | $60 |
| Treasury (CronJob) | spot batch | — | — | $10 |
| PostgreSQL | db.r6g.large (2vCPU, 16GB) | 3 | $260 | $780 |
| PgBouncer | t3.small | 2 | $20 | $40 |
| Redis | cache.r6g.large (13GB) | 3 | $130 | $390 |
| Kafka | kafka.m7i.large (2vCPU, 8GB) | 3 | $150 | $450 |
| MinIO/S3 | S3 Standard 500GB | — | $0.023/GB | $12 |
| Networking | ALB/NLB + NAT | — | — | $120 |
| **Phase 2 — Advanced (Upgrades 7-14)** | | | | **$4,100** |
| Risk Engine (Flink) | r6i.xlarge | 3 | $125 | $375 |
| Solver Marketplace | t3.large | 2 | $61 | $122 |
| zk-Prover | g5.xlarge (1xA10G) | 2 | $550 | $1,100 |
| Wallet Session | t3.medium | 2 | $30 | $60 |
| Liquidity AI (Training) | p4d.24xlarge (8xA100) | 1 spot | $3/hr | ~$500 |
| Execution Replay | t3.large | 2 | $61 | $122 |
| Relayer Reputation | t3.medium | 2 | $30 | $60 |
| WebSocket Scaling | t3.large | 2 | $61 | $122 |
| CDN (CloudFront) | 1TB transfer | — | — | $85 |
| TimescaleDB | db.r6g.large | 2 | $260 | $520 |
| **Phase 3 — Platform (Upgrades 15-20)** | | | | **$3,500** |
| Strategy Sandbox | m6i.large | 10 avg | $40 | $400 |
| Cross-Chain Indexer | t3.large | 3 | $61 | $183 |
| Compliance Audit | t3.large | 2 | $61 | $122 |
| SDK Gateway | t3.large | 3 | $61 | $183 |
| Developer Portal | t3.medium | 2 | $30 | $60 |
| Relayer Consensus | t3.large | 3 | $61 | $183 |
| Monitoring Stack | Prom+Loki+Tempo+Grafana | — | — | $400 |
| Object Storage Growth | S3 5TB | — | $0.023/GB | $115 |
| EKS Control Plane | per cluster | 1 | $73 | $73 |
| Data Transfer | cross-AZ + external | 10TB | — | ~$250 |
| **TOTAL** | | | | **~$11,450/mo** |

### 9.2 Reserved Instance Strategy

| Resource | RI Term | Coverage | Savings |
|----------|---------|----------|---------|
| PostgreSQL (r6g.large) | 3yr All Upfront | 3 nodes | ~40% ($312/yr saved) |
| Redis (cache.r6g.large) | 3yr All Upfront | 3 nodes | ~40% ($156/yr) |
| GPU (g5.xlarge) | 1yr No Upfront | 2 instances | ~30% ($660/yr) |
| Kafka (m7i.large) | 3yr All Upfront | 3 nodes | ~40% ($180/yr) |
| EKS cluster | 1yr | 1 cluster | ~30% ($22/yr) |

### 9.3 Auto-Scaling Policies

| Service | Min | Max | Metric | Scale-Up | Scale-Down |
|---------|-----|-----|--------|----------|------------|
| Backend | 3 | 10 | CPU 70% | +100%/60s | -25%/120s |
| Solver Auction | 3 | 20 | Bid latency 50ms | +200%/30s | -25%/180s |
| AI Copilot | 1 | 8 | Queue depth 5 | +1 pod/120s | -50%/600s |
| zk-Prover | 1 | 8 | Queue depth 5 | +2 pods/60s | -50%/300s |
| Frontend | 2 | 8 | CPU 70% | +100%/60s | -25%/120s |

### 9.4 Data Storage Growth Projection

| Data Store | Current/Month | 6 Months | 12 Months | 24 Months |
|------------|--------------|----------|-----------|-----------|
| PostgreSQL | 50GB | 120GB | 250GB | 500GB |
| Neo4j | 20GB | 80GB | 200GB | 400GB |
| TimescaleDB | 30GB | 200GB | 500GB | 1TB |
| Redis | 10GB | 20GB | 30GB | 50GB |
| Kafka (retain 7d) | 50GB | 200GB | 500GB | 1TB |
| MinIO — Snapshots | 100GB | 500GB | 2TB | 5TB |
| MinIO — Audit logs | 20GB | 120GB | 250GB | 500GB |
| MinIO — Model artifacts | 10GB | 50GB | 100GB | 200GB |
| Prometheus | 20GB | 50GB | 100GB | 200GB |
| Loki (S3) | 50GB | 300GB | 1TB | 2TB |
| Backups (S3) | 100GB | 500GB | 1TB | 2TB |

---

## 10. Disaster Recovery

### 10.1 Multi-Region Strategy

**Primary**: `us-east-1` (3 AZs: us-east-1a, us-east-1b, us-east-1c)
**DR**: `eu-west-1` (cold standby, promoted on failover)

**Architecture**:
- Active-passive (primary handles all traffic, DR is warm)
- Route53 failover: health check on primary → automatic cutover to DR
- Cross-region PostgreSQL logical replication (async)
- Velero S3 backups replicated cross-region via S3 CRR
- Global Accelerator for fast regional failover

### 10.2 Database Replication & Backup SLAs

| Database | Replication | RPO | RTO | Backup Method |
|----------|------------|-----|-----|---------------|
| PostgreSQL | Streaming sync (within region) + Logical async (cross-region) | < 1s (region) / < 5min (DR) | < 5min (region failover) / < 30min (DR) | pgBackRest to S3 + S3 CRR |
| Redis | Sentinel failover | < 10s | < 30s | RDB snapshots every 5min to S3 |
| Neo4j | Causal cluster (RAFT) | < 1s | < 30s | `neo4j-admin database dump` daily to S3 |
| Kafka | MirrorMaker 2 cross-region | < 1min | < 5min | Log retention on S3 tiered storage |
| TimescaleDB | Patroni streaming | < 1s | < 5min | pgBackRest to S3 |
| MinIO | MinIO bucket replication | < 5min | < 5min | S3 CRR on buckets |

### 10.3 Recovery Time Objectives Per Service

| Service | RTO | RPO | Priority | Recovery Method |
|---------|-----|-----|----------|----------------|
| Backend API | < 1min | 0 | P0 | Rolling restart / HPA scale-up |
| Solver Auction | < 30s | 0 | P0 | Canary + rollback, active-active |
| PostgreSQL | < 5min | < 1s | P0 | Patroni failover / pgBackRest restore |
| Redis | < 30s | < 10s | P1 | Sentinel failover |
| AI Copilot | < 5min | < 1min | P1 | Roll restart of GPU pods |
| zk-Prover | < 10min | < 5min | P2 | Re-provision GPU pod, rebuild from queue |
| Audit Logs | < 1hr | < 1hr | P3 | Replay from Kafka / restore from S3 |

### 10.4 Chaos Engineering

Approach: Weekly automated chaos experiments via LitmusChaos or Chaos Mesh:

```yaml
# k8s/production/chaos/pod-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-scheduler
  namespace: chaos-engineering
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
    - ghostroute-core
    labelSelectors:
      app: ghostroute
  scheduler:
    cron: "@daily"
  duration: "60s"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
  namespace: chaos-engineering
spec:
  action: delay
  mode: fixed-percent
  value: "50"
  selector:
    namespaces:
    - ghostroute-core
    - ghostroute-data
  delay:
    latency: "1000ms"
    jitter: "100ms"
    correlation: "50"
  duration: "60s"
  scheduler:
    cron: "@weekly"
```

**Game Days**: Quarterly, full-team chaos exercise simulating region failover, database corruption, and traffic spike.

### 10.5 Backup Verification

| Frequency | Action | Responsible |
|-----------|--------|-------------|
| Daily | Verify backup exists (size check) | Automated |
| Weekly | Restore to staging, verify data integrity | SRE |
| Monthly | Full DR test: promote DR region, route traffic | SRE + Engineering |
| Quarterly | Chaos game day | All teams |

---

## Implementation Plan

### Phase 1 — Foundation (Weeks 1-2)
1. Create namespace structure, resource quotas, network policies
2. Deploy Istio service mesh with mTLS
3. Migrate PostgreSQL and Redis to StatefulSets
4. Set up External Secrets Operator
5. Deploy monitoring stack (Prometheus + Grafana + Loki)
6. Create Helm charts for core services

### Phase 2 — Core Upgrades (Weeks 3-6)
1. Deploy Solver Auction, Private Mempool, Treasury
2. Set up Neo4j cluster for Graph Engine
3. Deploy AI Copilot with GPU nodes
4. Set up Kafka + Flink for Risk Engine
5. Deploy MinIO for object storage
6. Implement ArgoCD GitOps workflow

### Phase 3 — Advanced (Weeks 7-10)
1. Deploy zk-Prover on GPU nodes (spot-friendly)
2. Set up Strategy Sandbox (gVisor/Firecracker)
3. Deploy SDK Gateway with rate limiting
4. Set up Compliance audit pipeline
5. Implement blue-green + canary deployments
6. Configure SLO monitoring and alert routing

### Phase 4 — Hardening (Weeks 11-12)
1. Chaos engineering experiments
2. DR failover testing
3. Cost optimization (reserved instances, spot tuning)
4. Performance benchmarking under load
5. Security audit (external penetration test)
6. Production readiness review

---

## File Modifications Required

| File | Action | Notes |
|------|--------|-------|
| `k8s/deployment.yaml` | Replace with structured `k8s/production/` tree | Migrate to per-service manifests |
| `docker/docker-compose.yml` | Enhance with PgBouncer, health checks, logging driver | See devops-analysis.md Section 3 |
| `docker/Dockerfile.backend` | Add non-root user, HEALTHCHECK, tini | Already drafted in devops-analysis.md |
| `docker/Dockerfile.frontend` | Add non-root user, HEALTHCHECK, tini | Already drafted in devops-analysis.md |
| `.github/workflows/ci.yml` | Replace with multi-stage CI/CD pipeline | 8 stages with gating |
| `vercel.json` | Remove or mark deprecated | Frontend will be K8s-deployed |
| `coolify.json` | Keep for local dev, deprecate for production | Production uses K8s only |
| `devops-analysis.md` | Use as reference, incorporate all YAML | Contains base manifests |

### New Files to Create

| Path | Purpose |
|------|---------|
| `k8s/production/namespaces.yaml` | All namespace definitions |
| `k8s/production/quotas/*.yaml` | Per-namespace resource quotas |
| `k8s/production/psp/*.yaml` | PodSecurityPolicies |
| `k8s/production/network-policies/*.yaml` | Default deny, inter-service rules |
| `k8s/production/service-mesh/*.yaml` | Istio operator, gateway, virtual service, mTLS |
| `k8s/production/services/*/deployment.yaml` | Per-microservice deployments |
| `k8s/production/data/postgres/statefulset.yaml` | PostgreSQL StatefulSet |
| `k8s/production/data/postgres/pgbouncer-deployment.yaml` | PgBouncer |
| `k8s/production/data/redis/values.yaml` | Redis cluster values |
| `k8s/production/data/neo4j/statefulset.yaml` | Neo4j cluster |
| `k8s/production/data/kafka/values.yaml` | Kafka + Flink values |
| `k8s/production/data/minio/values.yaml` | MinIO distributed values |
| `k8s/production/data/timescaledb/values.yaml` | TimescaleDB values |
| `k8s/production/security/external-secrets/*.yaml` | SecretStore, ExternalSecret |
| `k8s/production/security/falco/values.yaml` | Falco runtime security |
| `k8s/monitoring/prometheus/values.yaml` | Prometheus stack config |
| `k8s/monitoring/grafana/dashboards/*.yaml` | Per-domain dashboards as ConfigMaps |
| `k8s/monitoring/loki/values.yaml` | Loki microservices config |
| `k8s/monitoring/tempo/values.yaml` | Tempo tracing backend |
| `k8s/monitoring/alertmanager/config.yaml` | Alert routing config |
| `argocd/ghostroute-app-of-apps.yaml` | ArgoCD GitOps root |
| `helm/charts/ghostroute-core/` | Core services Helm chart |
| `helm/charts/ghostroute-data/` | Data layer Helm chart |
| `helm/charts/ghostroute-ai/` | AI services Helm chart |
| `helm/charts/ghostroute-infra/` | Infrastructure Helm chart |
| `services/*/k8s/` | Per-service K8s manifests |
| `.github/workflows/ci-cd.yml` | Multi-stage CI/CD pipeline |
| `.github/workflows/container-scan.yml` | Daily container security scan |
