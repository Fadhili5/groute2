# GhostRoute Terminal — DevOps Analysis & Production-Hardening Plan

---

## 1. Current Infrastructure Assessment

| Area | Rating | Key Findings |
|------|--------|-------------|
| **Docker** | 2/5 | Multi-stage builds exist but no non-root user, no `.dockerignore`, no health checks on app containers, no image tagging strategy, no vulnerability scanning |
| **Kubernetes** | 2/5 | Single YAML with Deployments+Services. No Ingress, no TLS, no HPA, no PDB, no NetworkPolicies, no Namespace, no RBAC, no ConfigMaps, no StatefulSets for data layer. Uses `latest` tag. |
| **CI/CD** | 1/5 | `|| echo` silently swallows build failures. No lint, no type-check, no tests, no security scanning, no container build/push, no deployment stage. 3 independent jobs with zero gating. |
| **Monitoring** | 0/5 | No metrics, no logging aggregation, no tracing, no alerting, no dashboards in infrastructure. Pino is used in backend but no shipping pipeline. |
| **Security** | 1/5 | Private key hardcoded in `.env.example`. No TLS anywhere. No container non-root user. No network policies. No secret rotation. No API authentication on endpoints (based on available config). |
| **Backup** | 1/5 | Docker Compose has a named volume for Postgres but no backup strategy. K8s has no PV/PVC or backup automation. |
| **Networking** | 1/5 | Frontend is LoadBalancer (costly, insecure without TLS). Backend is ClusterIP (correct). No IngressController, no mTLS, no network policies. |

**Overall: 1.1/5** — This is a development/staging setup, not production-ready.

---

## 2. Security Audit

### 2.1 CRITICAL: Private Key in .env.example

```env
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This is a well-known Hardhat test private key (Hardhat #0 account). While it has no real funds, **committing ANY private key to version control is a catastrophic security anti-pattern**. Attackers scan GitHub for `PRIVATE_KEY` patterns continuously.

**Fix**: Remove immediately and add to `.gitignore` patterns:
```
.env
*.pem
*key*.pem
*secret*
!*.example
```

### 2.2 Secrets Management — Recommended Architecture

**Option A: Kubernetes External Secrets Operator + AWS Secrets Manager (Recommended)**

```
┌──────────────┐     ┌─────────────────┐     ┌───────────────┐
│  AWS SM/ASM  │◄────│ External Secrets │────►│  K8s Secrets  │
│  (source of  │     │   Operator      │     │  (auto-sync)  │
│   truth)     │     └─────────────────┘     └───────┬───────┘
└──────────────┘                                     │
                                                     ▼
                                              ┌───────────────┐
                                              │   Pod Mounts  │
                                              └───────────────┘
```

**Implement External Secrets:**

```yaml
# k8s/production/external-secrets/secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: ghostroute-secret-store
  namespace: ghostroute
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: ghostroute-secret-reader
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ghostroute-external-secret
  namespace: ghostroute
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: ghostroute-secret-store
    kind: SecretStore
  target:
    name: ghostroute-secrets
    creationPolicy: Owner
  data:
    - secretKey: database-url
      remoteRef:
        key: ghostroute/production/database-url
    - secretKey: redis-url
      remoteRef:
        key: ghostroute/production/redis-url
    - secretKey: deployer-private-key
      remoteRef:
        key: ghostroute/production/deployer-private-key
    - secretKey: eth-rpc
      remoteRef:
        key: ghostroute/production/eth-rpc
    - secretKey: coinmarketcap-api-key
      remoteRef:
        key: ghostroute/production/coinmarketcap-api-key
```

**Option B: HashiCorp Vault (for multi-cloud portability)**

```yaml
# k8s/production/vault/agent-injector.yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "ghostroute"
    vault.hashicorp.com/agent-inject-secret-database-url: "secret/data/ghostroute/database-url"
```

### 2.3 Network Security

**Ingress Controller + TLS (cert-manager + Let's Encrypt):**

```yaml
# k8s/production/ingress/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ghostroute-ingress
  namespace: ghostroute
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.ghostroute.io
    - api.ghostroute.io
    secretName: ghostroute-tls
  rules:
  - host: app.ghostroute.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ghostroute-frontend
            port:
              number: 3000
  - host: api.ghostroute.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ghostroute-backend
            port:
              number: 3001
```

**Network Policies:**

```yaml
# k8s/production/network-policies/default-deny.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: ghostroute
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# k8s/production/network-policies/allow-frontend-to-backend.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: ghostroute
spec:
  podSelector:
    matchLabels:
      app: ghostroute
      component: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ghostroute
          component: frontend
    ports:
    - port: 3001
---
# k8s/production/network-policies/allow-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: ghostroute
spec:
  podSelector:
    matchLabels:
      app: ghostroute
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    ports:
    - port: 3000
    - port: 3001
```

### 2.4 Container Security

```dockerfile
# Non-root user setup for both Dockerfiles
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

**Image Scanning (Trivy in CI):**
```yaml
# Add to CI
- name: Scan Docker image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/ghostroute-backend:${{ github.sha }}
    severity: HIGH,CRITICAL
    exit-code: 1
```

### 2.5 K8s Security (Pod Security + RBAC)

```yaml
# k8s/production/rbac/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ghostroute-backend
  namespace: ghostroute
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ghostroute-backend-role
  namespace: ghostroute
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ghostroute-backend-rolebinding
  namespace: ghostroute
subjects:
- kind: ServiceAccount
  name: ghostroute-backend
roleRef:
  kind: Role
  name: ghostroute-backend-role
  apiGroup: rbac.authorization.k8s.io
---
# Pod Security Admission
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: ghostroute-restricted
spec:
  privileged: false
  seLinux:
    rule: RunAsAny
  runAsUser:
    rule: MustRunAsNonRoot
  runAsGroup:
    rule: MustRunAsNonRoot
  fsGroup:
    rule: MustRunAsNonRoot
  volumes:
  - configMap
  - secret
  - emptyDir
  - persistentVolumeClaim
```

---

## 3. Docker Hardening

### 3.1 Hardened Dockerfile.backend

```dockerfile
FROM node:20-alpine AS builder
ARG NODE_ENV=production
WORKDIR /app

# Separate dependency install for caching
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Dev dependencies for build only
RUN npm ci --only=development --ignore-scripts

COPY tsconfig.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

RUN npx prisma generate
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

FROM node:20-alpine AS runner
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
ENV PORT=3001

RUN apk add --no-cache tini curl

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --chown=appuser:appgroup package*.json ./

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```

### 3.2 Hardened Dockerfile.frontend

```dockerfile
FROM node:20-alpine AS builder
ARG NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY next.config.js tsconfig.json tailwind.config.ts postcss.config.js ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine AS runner
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache tini curl

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "node_modules/.bin/next", "start"]
```

### 3.3 .dockerignore (for both contexts)

```dockerignore
# docker/backend.dockerignore
node_modules/
npm-debug.log
.git
.gitignore
*.md
.env
.env.local
.env.*.local
dist/
.next/
coverage/
.nyc_output/
*.tsbuildinfo
```

### 3.4 Docker Compose Improvements

```yaml
# docker/docker-compose.prod.yml
version: "3.9"

x-logging: &logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

x-healthcheck: &healthcheck
  interval: 15s
  timeout: 5s
  retries: 3
  start_period: 30s

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ghostroute
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?err}
    ports:
      - "127.0.0.1:5442:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ghostroute"]
      <<: *healthcheck
    logging: *logging
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 512M

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "127.0.0.1:6389:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      <<: *healthcheck
    logging: *logging
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M

  pgbouncer:
    image: edoburu/pgbouncer:latest
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/ghostroute
      POOL_MODE: transaction
      MAX_DB_CONNECTIONS: 20
      DEFAULT_POOL_SIZE: 10
    ports:
      - "127.0.0.1:5432:5432"
    depends_on:
      postgres:
        condition: service_healthy
    logging: *logging

  backend:
    build:
      context: ../backend
      dockerfile: ../docker/Dockerfile.backend
    image: ghcr.io/ghostroute/backend:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "127.0.0.1:4011:3001"
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@pgbouncer:5432/ghostroute
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      PORT: "3001"
      NODE_ENV: production
      LOG_LEVEL: info
    env_file:
      - ../backend/.env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      pgbouncer:
        condition: service_started
    logging: *logging
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M

  frontend:
    build:
      context: ../frontend
      dockerfile: ../docker/Dockerfile.frontend
    image: ghcr.io/ghostroute/frontend:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "127.0.0.1:4010:3000"
    environment:
      NODE_ENV: production
    env_file:
      - ../frontend/.env.production
    depends_on:
      - backend
    logging: *logging
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
        reservations:
          cpus: "0.1"
          memory: 128M

  # Optional: cron backup
  pg-backup:
    image: prodrigestivill/postgres-backup-local:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ghostroute
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?err}
      BACKUP_DIR: /backups
      BACKUP_SUFFIX: .sql.gz
      SCHEDULE: "@daily"
      BACKUP_KEEP_DAYS: 30
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 3
    volumes:
      - pg_backups:/backups
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
  pg_backups:
```

---

## 4. Kubernetes Production Setup

### 4.1 Complete Manifests Structure

```
k8s/
├── production/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets/
│   │   └── ghostroute-secrets.yaml        (placeholder — use External Secrets)
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── pdb.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── pdb.yaml
│   ├── ingress/
│   │   └── ingress.yaml
│   ├── network-policies/
│   │   ├── default-deny.yaml
│   │   ├── allow-frontend-backend.yaml
│   │   └── allow-ingress.yaml
│   ├── rbac/
│   │   ├── service-account.yaml
│   │   └── role.yaml
│   ├── monitoring/
│   │   ├── prometheus-rules.yaml
│   │   ├── grafana-dashboard.yaml
│   │   └── service-monitor.yaml
│   ├── data/
│   │   ├── postgres-statefulset.yaml
│   │   ├── postgres-service.yaml
│   │   ├── redis-statefulset.yaml
│   │   └── redis-service.yaml
│   └── backup/
│       ├── velero-schedule.yaml
│       └── cronjob-pg-dump.yaml
├── staging/
│   └── (mirrors production with reduced resources)
└── monitoring/
    ├── prometheus/
    │   ├── prometheus.yaml
    │   └── alertmanager.yaml
    └── loki/
        └── loki-stack.yaml
```

### 4.2 Namespace & ConfigMap

```yaml
# k8s/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ghostroute
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# k8s/production/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ghostroute-config
  namespace: ghostroute
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3001"
  NEXT_PUBLIC_API_URL: "https://api.ghostroute.io"
  NEXT_PUBLIC_WS_URL: "wss://api.ghostroute.io/ws"
  REPORT_GAS: "false"
```

### 4.3 Backend Deployment (Production Grade)

```yaml
# k8s/production/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ghostroute-backend
  namespace: ghostroute
  labels:
    app: ghostroute
    component: backend
    managed-by: argo
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  revisionHistoryLimit: 3
  minReadySeconds: 30
  selector:
    matchLabels:
      app: ghostroute
      component: backend
  template:
    metadata:
      labels:
        app: ghostroute
        component: backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: ghostroute-backend
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: component
                  operator: In
                  values:
                  - backend
              topologyKey: kubernetes.io/hostname
      containers:
      - name: backend
        image: ghcr.io/ghostroute/backend:1.0.0
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 3001
          protocol: TCP
        - name: metrics
          containerPort: 9464
          protocol: TCP
        envFrom:
        - configMapRef:
            name: ghostroute-config
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ghostroute-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: ghostroute-secrets
              key: redis-url
        - name: ETH_RPC
          valueFrom:
            secretKeyRef:
              name: ghostroute-secrets
              key: eth-rpc
        - name: DEPLOYER_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: ghostroute-secrets
              key: deployer-private-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "768Mi"
            cpu: "750m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 15
          periodSeconds: 15
          failureThreshold: 3
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 10
          failureThreshold: 2
          timeoutSeconds: 3
        startupProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 12
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15 && kill -SIGTERM $(pidof node)"]
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: prisma
          mountPath: /app/prisma
          readOnly: true
      volumes:
      - name: tmp
        emptyDir: {}
      - name: prisma
        configMap:
          name: ghostroute-prisma-config
      terminationGracePeriodSeconds: 30
```

### 4.4 Horizontal Pod Autoscaler

```yaml
# k8s/production/backend/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ghostroute-backend-hpa
  namespace: ghostroute
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ghostroute-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 120
```

### 4.5 Pod Disruption Budget

```yaml
# k8s/production/backend/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ghostroute-backend-pdb
  namespace: ghostroute
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: ghostroute
      component: backend
---
# k8s/production/frontend/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ghostroute-frontend-pdb
  namespace: ghostroute
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: ghostroute
      component: frontend
```

### 4.6 Frontend Deployment

```yaml
# k8s/production/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ghostroute-frontend
  namespace: ghostroute
  labels:
    app: ghostroute
    component: frontend
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
      component: frontend
  template:
    metadata:
      labels:
        app: ghostroute
        component: frontend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: component
                  operator: In
                  values:
                  - frontend
              topologyKey: kubernetes.io/hostname
      containers:
      - name: frontend
        image: ghcr.io/ghostroute/frontend:1.0.0
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.ghostroute.io"
        - name: NEXT_PUBLIC_WS_URL
          value: "wss://api.ghostroute.io/ws"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "384Mi"
            cpu: "400m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 15
          periodSeconds: 20
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 15
        startupProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 10
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
      terminationGracePeriodSeconds: 30
      imagePullSecrets:
      - name: ghcr-credentials
```

### 4.7 PostgreSQL StatefulSet

```yaml
# k8s/production/data/postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: ghostroute
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      securityContext:
        fsGroup: 999
        runAsUser: 999
        runAsNonRoot: true
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: ghostroute
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ghostroute-secrets
              key: postgres-password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres", "-d", "ghostroute"]
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres", "-d", "ghostroute"]
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3-encrypted
      resources:
        requests:
          storage: 50Gi
---
# k8s/production/data/postgres-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: ghostroute
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None  # Headless for StatefulSet
```

### 4.8 Redis StatefulSet

```yaml
# k8s/production/data/redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: ghostroute
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      securityContext:
        fsGroup: 1000
        runAsUser: 999
        runAsNonRoot: true
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - --appendonly yes
        - --maxmemory 512mb
        - --maxmemory-policy allkeys-lru
        - --requirepass $(REDIS_PASSWORD)
        ports:
        - containerPort: 6379
          name: redis
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ghostroute-secrets
              key: redis-password
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1"
        volumeMounts:
        - name: redis-data
          mountPath: /data
        livenessProbe:
          exec:
            command: ["redis-cli", "-a", "$(REDIS_PASSWORD)", "ping"]
          initialDelaySeconds: 15
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3-encrypted
      resources:
        requests:
          storage: 10Gi
---
# k8s/production/data/redis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: ghostroute
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  clusterIP: None
```

### 4.9 Resource Quotas

```yaml
# k8s/production/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ghostroute-quota
  namespace: ghostroute
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "16Gi"
    limits.cpu: "16"
    limits.memory: "32Gi"
    persistentvolumeclaims: "10"
    pods: "30"
    services: "10"
    secrets: "30"
    configmaps: "20"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: ghostroute-limits
  namespace: ghostroute
spec:
  limits:
  - max:
      cpu: "4"
      memory: "4Gi"
    min:
      cpu: "50m"
      memory: "64Mi"
    default:
      cpu: "250m"
      memory: "256Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

---

## 5. CI/CD Pipeline Redesign

### 5.1 Complete GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags: ["v*"]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  BACKEND_IMAGE: ghcr.io/ghostroute/backend
  FRONTEND_IMAGE: ghcr.io/ghostroute/frontend

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: [backend, frontend]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: ${{ matrix.project }}/package-lock.json
      - run: npm install --legacy-peer-deps
        working-directory: ${{ matrix.project }}
      - run: npm run lint
        working-directory: ${{ matrix.project }}
      - run: npx tsc --noEmit
        working-directory: ${{ matrix.project }}

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: ghostroute_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm install --legacy-peer-deps
      - run: npx prisma generate
      - run: npx prisma db push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ghostroute_test
      - run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ghostroute_test
          REDIS_URL: redis://localhost:6379

  contracts:
    name: Smart Contracts
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: contracts
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: contracts/package-lock.json
      - run: npm install --legacy-peer-deps
      - run: npx hardhat compile
      - run: npx hardhat test
        continue-on-error: false

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          severity: HIGH,CRITICAL
          exit-code: 1
          format: sarif
          output: trivy-results.sarif
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif
      - name: Run npm audit on backend
        run: |
          cd backend && npm audit --audit-level=high
      - name: Run npm audit on frontend
        run: |
          cd frontend && npm audit --audit-level=high
      - name: Run Slither on contracts
        uses: crytic/slither-action@v0.4.0
        continue-on-error: true
        with:
          target: contracts/
          sarif: results.sarif

  build-and-push:
    name: Build & Push Images
    needs: [lint, test, contracts, security]
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v'))
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [backend, frontend]
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ${{ env.REGISTRY }}/ghostroute/${{ matrix.service }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./${{ matrix.service }}
          file: ./docker/Dockerfile.${{ matrix.service }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: false

  deploy-staging:
    name: Deploy to Staging
    needs: [build-and-push]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.ghostroute.io
    steps:
      - uses: actions/checkout@v4
      - name: Configure kubectl
        uses: azure/setup-kubectl@v4
        with:
          version: latest
      - name: Set Kubernetes context
        uses: azure/k8s-set-context@v4
        with:
          kubeconfig: ${{ secrets.KUBECONFIG_STAGING }}
      - name: Update image tags
        run: |
          cd k8s/staging
          kustomize edit set image \
            ghcr.io/ghostroute/backend=${{ env.REGISTRY }}/ghostroute/backend:${{ github.sha }} \
            ghcr.io/ghostroute/frontend=${{ env.REGISTRY }}/ghostroute/frontend:${{ github.sha }}
      - name: Deploy to staging
        run: |
          kubectl apply -k k8s/staging/
          kubectl rollout status deployment/ghostroute-backend -n ghostroute --timeout=5m
          kubectl rollout status deployment/ghostroute-frontend -n ghostroute --timeout=5m
      - name: Smoke test
        run: |
          curl -f https://staging.ghostroute.io/api/health
          curl -f https://staging.ghostroute.io

  deploy-production:
    name: Deploy to Production
    needs: [deploy-staging]
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.ghostroute.io
    steps:
      - uses: actions/checkout@v4
      - name: Configure kubectl
        uses: azure/setup-kubectl@v4
        with:
          version: latest
      - name: Set Kubernetes context
        uses: azure/k8s-set-context@v4
        with:
          kubeconfig: ${{ secrets.KUBECONFIG_PRODUCTION }}
      - name: Update image tags
        run: |
          cd k8s/production
          kustomize edit set image \
            ghcr.io/ghostroute/backend=${{ env.REGISTRY }}/ghostroute/backend:${{ github.ref_name }} \
            ghcr.io/ghostroute/frontend=${{ env.REGISTRY }}/ghostroute/frontend:${{ github.ref_name }}
      - name: Deploy to production
        run: |
          kubectl apply -k k8s/production/
          kubectl rollout status deployment/ghostroute-backend -n ghostroute --timeout=10m
          kubectl rollout status deployment/ghostroute-frontend -n ghostroute --timeout=10m
      - name: Post-deploy smoke test
        run: |
          for i in {1..12}; do
            if curl -sf https://app.ghostroute.io/api/health > /dev/null; then
              echo "Production health check passed"
              exit 0
            fi
            sleep 10
          done
          echo "Production health check failed"
          exit 1
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

### 5.2 Kustomize Structure

```yaml
# k8s/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: ghostroute

resources:
- namespace.yaml
- configmap.yaml
- backend/deployment.yaml
- backend/service.yaml
- backend/hpa.yaml
- backend/pdb.yaml
- frontend/deployment.yaml
- frontend/service.yaml
- frontend/hpa.yaml
- frontend/pdb.yaml
- ingress/ingress.yaml
- network-policies/default-deny.yaml
- network-policies/allow-frontend-backend.yaml
- network-policies/allow-ingress.yaml
- rbac/service-account.yaml
- rbac/role.yaml
- data/postgres-statefulset.yaml
- data/postgres-service.yaml
- data/redis-statefulset.yaml
- data/redis-service.yaml
- resource-quota.yaml
- monitoring/service-monitor.yaml

images:
- name: ghcr.io/ghostroute/backend
  newTag: latest
- name: ghcr.io/ghostroute/frontend
  newTag: latest

commonLabels:
  environment: production
  managed-by: kustomize
```

### 5.3 ArgoCD Application

```yaml
# argocd/ghostroute-app.yaml
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
    path: k8s/production
  destination:
    server: https://kubernetes.default.svc
    namespace: ghostroute
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - Validate=true
    - CreateNamespace=true
    - PruneLast=true
    - ApplyOutOfSyncOnly=true
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas
```

---

## 6. Monitoring & Observability Stack

### 6.1 Prometheus ServiceMonitor

```yaml
# k8s/production/monitoring/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ghostroute-backend-monitor
  namespace: ghostroute
spec:
  selector:
    matchLabels:
      app: ghostroute
      component: backend
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
  namespaceSelector:
    matchNames:
    - ghostroute
```

### 6.2 Prometheus Rules

```yaml
# k8s/production/monitoring/prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ghostroute-alerts
  namespace: ghostroute
spec:
  groups:
  - name: ghostroute
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate on {{ $labels.component }}"
    - alert: HighLatency
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "P95 latency exceeds 2s on {{ $labels.component }}"
    - alert: BackendDown
      expr: up{job="ghostroute-backend"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Backend instance {{ $labels.instance }} is down"
    - alert: HighCPUUsage
      expr: sum(rate(container_cpu_usage_seconds_total{namespace="ghostroute"}[5m])) / sum(kube_pod_container_resource_limits{namespace="ghostroute", resource="cpu"}) > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "CPU usage above 80% in ghostroute namespace"
    - alert: DatabaseConnectionPoolExhausted
      expr: pg_pool_idle_connections == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "PostgreSQL connection pool exhausted"
    - alert: DiskSpaceLow
      expr: node_filesystem_avail_bytes{mountpoint="/data"} / node_filesystem_size_bytes{mountpoint="/data"} < 0.2
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Less than 20% disk space remaining on data volume"
```

### 6.3 Grafana Dashboard (JSON)

I'll provide the dashboard as a ConfigMap for automatic provisioning:

```yaml
# k8s/monitoring/grafana/dashboards/ghostroute-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ghostroute-grafana-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  ghostroute-dashboard.json: |
    {
      "title": "GhostRoute Terminal Overview",
      "uid": "ghostroute-overview",
      "schemaVersion": 38,
      "version": 1,
      "panels": [
        {
          "title": "Request Rate",
          "type": "graph",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "sum(rate(http_requests_total{namespace=\"ghostroute\"}[5m]))",
              "legendFormat": "Requests/s"
            }
          ],
          "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
        },
        {
          "title": "Error Rate",
          "type": "graph",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
              "legendFormat": "Error %"
            }
          ],
          "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
        },
        {
          "title": "P95 Latency",
          "type": "graph",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
              "legendFormat": "P95"
            },
            {
              "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
              "legendFormat": "P99"
            }
          ],
          "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
        },
        {
          "title": "CPU & Memory",
          "type": "graph",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "sum(container_cpu_usage_seconds_total{namespace=\"ghostroute\"}) by (pod)",
              "legendFormat": "{{ pod }} CPU"
            },
            {
              "expr": "sum(container_memory_working_set_bytes{namespace=\"ghostroute\"}) by (pod)",
              "legendFormat": "{{ pod }} Memory"
            }
          ],
          "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
        },
        {
          "title": "PostgreSQL Connections",
          "type": "graph",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "pg_stat_activity_count{datname=\"ghostroute\"}",
              "legendFormat": "Active Connections"
            }
          ],
          "gridPos": {"h": 8, "w": 8, "x": 0, "y": 16}
        },
        {
          "title": "Redis Memory Usage",
          "type": "gauge",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "redis_memory_used_bytes / redis_memory_max_bytes * 100",
              "legendFormat": "Memory Usage %"
            }
          ],
          "gridPos": {"h": 8, "w": 8, "x": 8, "y": 16}
        },
        {
          "title": "Go/Goroutines",
          "type": "graph",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "go_goroutines{namespace=\"ghostroute\"}",
              "legendFormat": "Goroutines"
            }
          ],
          "gridPos": {"h": 8, "w": 8, "x": 16, "y": 16}
        }
      ],
      "tags": ["ghostroute", "production"],
      "time": {"from": "now-6h", "to": "now"}
    }
```

### 6.4 Loki Logging Stack

```yaml
# k8s/monitoring/loki/loki-stack-values.yaml
loki:
  auth_enabled: false
  commonConfig:
    replication_factor: 1
  storage:
    type: filesystem
  schemaConfig:
    configs:
    - from: "2024-01-01"
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

promtail:
  config:
    clients:
    - url: http://loki:3100/loki/api/v1/push
    snippets:
      scrapeConfigs:
      - job_name: kubernetes-pods
        pipeline_stages:
        - cri: {}
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        - action: replace
          source_labels:
          - __meta_kubernetes_namespace
          target_label: namespace
        - action: replace
          source_labels:
          - __meta_kubernetes_pod_label_app
          target_label: app

grafana:
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-server.monitoring.svc.cluster.local:9090
      - name: Loki
        type: loki
        url: http://loki.monitoring.svc.cluster.local:3100
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: ghostroute
        orgId: 1
        folder: GhostRoute
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/ghostroute
```

### 6.5 Application Metrics Instrumentation

Add Prometheus client to the backend (`src/lib/metrics.ts`):

```typescript
import prometheus from "prom-client"

const register = new prometheus.Registry()
prometheus.collectDefaultMetrics({ register })

export const httpRequestDuration = new prometheus.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
})

export const httpRequestsTotal = new prometheus.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
})

export const activeConnections = new prometheus.Gauge({
  name: "active_connections",
  help: "Number of active WebSocket connections",
  registers: [register],
})

export const crossChainTxCounter = new prometheus.Counter({
  name: "cross_chain_transactions_total",
  help: "Total cross-chain transactions processed",
  labelNames: ["source_chain", "destination_chain", "status"],
  registers: [register],
})

export const orderBookDepth = new prometheus.Gauge({
  name: "order_book_depth",
  help: "Current order book depth",
  labelNames: ["chain", "side"],
  registers: [register],
})

export async function metricsHandler(req, reply) {
  reply.header("Content-Type", register.contentType)
  return register.metrics()
}
```

---

## 7. Database Operations

### 7.1 PostgreSQL Hardening

**Connection Pooling (PgBouncer)** — included in Docker Compose and K8s manifests above. Add PgBouncer sidecar to backend pod:

```yaml
# Sidecar in backend deployment
- name: pgbouncer
  image: edoburu/pgbouncer:latest
  ports:
  - containerPort: 5432
  env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: ghostroute-secrets
        key: database-url
  - name: POOL_MODE
    value: transaction
  - name: DEFAULT_POOL_SIZE
    value: "20"
  - name: MAX_DB_CONNECTIONS
    value: "50"
  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
    limits:
      memory: "128Mi"
      cpu: "200m"
```

**Automated Backups (Velero + CronJob):**

```yaml
# k8s/production/backup/cronjob-pg-dump.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pg-backup
  namespace: ghostroute
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: pg-dump
            image: postgres:16-alpine
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: ghostroute-secrets
                  key: postgres-password
            - name: PGSSLMODE
              value: require
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h postgres -U postgres -d ghostroute \
                --format=custom --compress=9 \
                --file=/backups/ghostroute-$(date +%Y%m%d-%H%M%S).dump && \
              find /backups -name "*.dump" -mtime +30 -delete
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: pg-backup-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pg-backup-pvc
  namespace: ghostroute
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: gp3-encrypted
```

**Velero Backup Schedule:**

```yaml
# k8s/production/backup/velero-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: ghostroute-daily-backup
  namespace: velero
spec:
  schedule: "0 1 * * *"
  template:
    includedNamespaces:
    - ghostroute
    includedResources:
    - deployments
    - statefulsets
    - configmaps
    - secrets
    - pvc
    includeClusterResources: false
    ttl: 720h  # 30 days
    storageLocation: default
    volumeSnapshotLocations:
    - default
```

**Prisma Migration Strategy in CI:**

```yaml
# CI migration step
- name: Run database migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  working-directory: backend

# Pre-deploy migration job in K8s
apiVersion: batch/v1
kind: Job
metadata:
  name: ghostroute-migration
  namespace: ghostroute
  annotations:
    argocd.argoproj.io/hook: PreSync
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: ghcr.io/ghostroute/backend:1.0.0
        command: ["npx", "prisma", "migrate", "deploy"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ghostroute-secrets
              key: database-url
```

### 7.2 Redis Production Config

```yaml
# redis-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: ghostroute
data:
  redis.conf: |
    port 6379
    bind 0.0.0.0
    protected-mode yes
    requirepass ${REDIS_PASSWORD}
    appendonly yes
    appendfsync everysec
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb
    maxmemory 512mb
    maxmemory-policy allkeys-lru
    timeout 300
    tcp-keepalive 60
    loglevel notice
```

For production Redis with high availability (3-node cluster):

```yaml
# Using Bitnami Redis chart
# helm install redis bitnami/redis \
#   --namespace ghostroute \
#   --set architecture=replication \
#   --set auth.enabled=true \
#   --set auth.existingSecret=ghostroute-secrets \
#   --set auth.existingSecretPasswordKey=redis-password \
#   --set master.persistence.enabled=true \
#   --set master.persistence.size=10Gi \
#   --set replica.replicaCount=2 \
#   --set replica.persistence.enabled=true \
#   --set replica.persistence.size=10Gi \
#   --set sentinel.enabled=true \
#   --set sentinel.quorum=2
```

---

## 8. Cost Optimization

### 8.1 Resource Sizing Recommendations

| Component | Current Request | Proposed Request | Current Limit | Proposed Limit | Monthly Cost (est) |
|-----------|----------------|-----------------|---------------|----------------|-------------------|
| Backend (3 pods) | 250m CPU, 256Mi | 250m CPU, 256Mi | 500m CPU, 512Mi | 750m CPU, 768Mi | ~$90 → ~$120 |
| Frontend (3 pods) | 100m CPU, 128Mi | 100m CPU, 128Mi | 300m CPU, 256Mi | 400m CPU, 384Mi | ~$45 → ~$60 |
| PostgreSQL (1) | — | 500m CPU, 512Mi | — | 2 CPU, 2Gi | ~$80 |
| Redis (1) | — | 250m CPU, 256Mi | — | 1 CPU, 1Gi | ~$30 |
| PgBouncer (1) | — | 50m CPU, 64Mi | — | 200m CPU, 128Mi | ~$10 |
| Monitoring | — | — | — | — | ~$50 (Loki+Prom+Grafana) |
| **Total** | | | | | **~$350/mo** |

### 8.2 Multi-Region vs Single-Region

**Recommended: Single-region with multi-AZ** (e.g., us-east-1a, us-east-1b, us-east-1c)

- Pod anti-affinity spreads across AZs
- EBS volumes (gp3) replicated within AZ, backup to S3 cross-region
- Cost: ~30-40% more than single-AZ, versus 200%+ for active-active multi-region
- DR: Velero backs up to S3 with cross-region replication

**Multi-region readiness** (future):
- Deploy to us-east-1 (primary) and eu-west-1 (DR)
- Global Load Balancer (AWS Global Accelerator)
- Cross-region PostgreSQL replication (logical replication)
- Redis replication across regions (CRDT-based: Redis Enterprise or Amazon MemoryDB)

### 8.3 CDN Strategy

- **Frontend static assets**: CloudFront (or Vercel Edge Network if using Vercel)
- **API**: CloudFront with origin pointing to K8s Ingress
- **WebSocket**: Direct connection to API (bypass CDN — WebSocket doesn't cache)
- **Cache strategy**:
  - `/static/*`: TTL 1 year, immutable
  - `/_next/static/*`: TTL 1 year, immutable
  - `/api/*`: TTL 0 (dynamic), or short TTL (30s) for public data

---

## 9. Production Runbook

### 9.1 Deployment Procedure

```bash
# 1. Tag release
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 2. CI/CD triggers automatically:
#    - Build & push images to GHCR
#    - Security scan
#    - Deploy to staging
#    - Smoke tests pass
#    - Manual approval gate for production
#    - Deploy to production (rolling update)

# 3. Monitor rollout
kubectl rollout status deployment/ghostroute-backend -n ghostroute --watch
kubectl rollout status deployment/ghostroute-frontend -n ghostroute --watch

# 4. Verify
curl -sf https://api.ghostroute.io/api/health
curl -sf https://app.ghostroute.io
```

### 9.2 Rollback Procedure

```bash
# Option A: Rollback via ArgoCD
argocd app rollback ghostroute <REVISION>

# Option B: Rollback via kubectl
kubectl rollout undo deployment/ghostroute-backend -n ghostroute
kubectl rollout undo deployment/ghostroute-frontend -n ghostroute

# Option C: Git revert + redeploy
git revert HEAD
git push origin main
# CI/CD will auto-deploy the reverted version
```

### 9.3 Scaling

```bash
# Manual scale (emergency)
kubectl scale deployment/ghostroute-backend -n ghostroute --replicas=10
kubectl scale deployment/ghostroute-frontend -n ghostroute --replicas=10

# Update HPA bounds
kubectl edit hpa/ghostroute-backend-hpa -n ghostroute
# Set maxReplicas: 20

# Database scaling
# PostgreSQL: Read replicas for read-heavy workloads
# Redis: Cluster mode for memory-heavy workloads
```

### 9.4 Incident Response

```yaml
severity_matrix:
  critical:
    response_time: 15min
    SLA: "1-hour fix or escalate"
    examples:
    - "Backend down — all pods crash looping"
    - "Database unavailable"
    - "Private key compromise"
    actions:
    - "Page on-call engineer"
    - "Rollback to last known good version"
    - "If DB issue, failover to replica"
    
  high:
    response_time: 30min
    SLA: "2-hour fix"
    examples:
    - "High error rate (>5%)"
    - "Elevated latency (P95 > 5s)"
    - "Redis out of memory"
    actions:
    - "Check logs in Grafana/Loki"
    - "Scale up affected component"
    - "Clear Redis cache if needed"
    
  medium:
    response_time: 2hr
    SLA: "4-hour fix"
    examples:
    - "Slightly elevated error rate"
    - "Minor performance degradation"
    - "Non-critical service degradation"
    actions:
    - "Monitor during business hours"
    - "Schedule fix for next maintenance window"
    
  low:
    response_time: 24hr
    SLA: "5-day fix or backlog"
    examples:
    - "Cosmetic UI issues"
    - "Minor log warnings"
    - "Optional feature improvement"
    actions:
    - "Create GitHub issue"
    - "Add to sprint backlog"
```

**Incident Response Steps:**

```bash
# 1. ACKNOWLEDGE
# If PagerDuty/OpsGenie: Acknowledge alert
# If not: Reply to incident thread

# 2. ASSESS
kubectl get pods -n ghostroute
kubectl logs -n ghostroute deployment/ghostroute-backend --tail=100
kubectl describe pod -n ghostroute <failing-pod>

# 3. MITIGATE (pick one)
# Rollback
kubectl rollout undo deployment/ghostroute-backend -n ghostroute

# Restart
kubectl rollout restart deployment/ghostroute-backend -n ghostroute

# Scale up
kubectl scale deployment/ghostroute-backend -n ghostroute --replicas=8

# Drain node
kubectl drain <node> --ignore-daemonsets

# 4. RESOLVE
# Apply fix
# Commit to main
# Verify deployment

# 5. POST-MORTEM
# Create incident report
# Root cause analysis
# Action items
```

### 9.5 Backup Verification

```bash
# Daily: Verify backup exists
kubectl exec -n ghostroute deploy/pg-backup -- ls -la /backups/

# Weekly: Restore test
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: pg-restore-test
  namespace: ghostroute
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: pg-restore
        image: postgres:16-alpine
        command:
        - /bin/sh
        - -c
        - |
          pg_restore --list /backups/latest.dump | head -20
        volumeMounts:
        - name: backup-storage
          mountPath: /backups
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: pg-backup-pvc
EOF

# Monthly: Full DR test
# 1. Spin up staging environment
# 2. Restore latest backup
# 3. Verify data integrity
# 4. Destroy staging
```

---

## 10. Proposed Architecture

```
                                  ┌─────────────────────────────────────────────────────────────┐
                                  │                      Cloudflare / AWS Shield                │
                                  │                          (DDoS Protection)                   │
                                  └─────────────────────────────────────────────────────────────┘
                                                     │
                                          ┌──────────┴──────────┐
                                          │   AWS Global Accel.   │
                                          │   (Global LB / CDN)   │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────┴──────────┐
                                          │  CloudFront / ALB    │
                                          │   (TLS Termination)  │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────┴──────────┐
                                          │  cert-manager        │
                                          │  (Let's Encrypt TLS) │
                                          └──────────┬──────────┘
                                                     │
                                   ┌─────────────────┼─────────────────┐
                                   │                 │                 │
                          ┌────────┴────────┐ ┌──────┴───────┐ ┌─────┴──────┐
                          │   Ingress-NGINX │ │  K8s API     │ │  ArgoCD    │
                          │  (L7 Routing)   │ │  (Control)   │ │  (GitOps)  │
                          └────────┬────────┘ └──────────────┘ └────────────┘
                                   │
         ┌─────────────────────────┼────────────────────────────────────────┐
         │                         │                                        │
         │                  ┌──────┴──────┐                                │
         │                  │  Namespace   │                                │
         │                  │  ghostroute  │                                │
         │                  └──────┬──────┘                                │
         │                         │                                        │
         │          ┌──────────────┼──────────────┐                        │
         │          │              │              │                        │
         │  ┌───────┴───────┐ ┌───┴────┐  ┌──────┴──────┐                 │
         │  │  Frontend     │ │ Backend │  │  Data Layer │                 │
         │  │  (3 pods)     │ │ (3 pods)│  │             │                 │
         │  │  HPA:2-10     │ │ HPA:3-10│  │ PostgreSQL  │                 │
         │  │  PDB:minAvail │ │ PDB:    │  │ StatefulSet │                 │
         │  │  :1           │ │ min:2   │  │ (50GB gp3)  │                 │
         │  │  res:128/384  │ │ res:    │  │ + PgBouncer │                 │
         │  │               │ │ 256/768 │  │             │                 │
         │  │               │ │         │  │ Redis       │                 │
         │  │               │ │         │  │ StatefulSet │                 │
         │  │               │ │         │  │ (10GB gp3)  │                 │
         │  └───────────────┘ └─────────┘  └─────────────┘                 │
         │                         │                                        │
         │          ┌──────────────┴──────────────┐                        │
         │          │         Monitoring          │                        │
         │          │  ┌──────┐ ┌────┐ ┌───────┐  │                        │
         │          │  │Prom  │ │Loki│ │Grafana│  │                        │
         │          │  │Rules │ │    │ │Dashbd │  │                        │
         │          │  │Alerts│ │    │ │       │  │                        │
         │          │  └──────┘ └────┘ └───────┘  │                        │
         │          └─────────────────────────────┘                        │
         │                         │                                        │
         │          ┌──────────────┴──────────────┐                        │
         │          │          Security           │                        │
         │          │  ┌──────────┐ ┌──────────┐  │                        │
         │          │  │Network   │ │External  │  │                        │
         │          │  │Policies  │ │Secrets   │  │                        │
         │          │  │(default  │ │(AWS SM)  │  │                        │
         │          │  │ deny)    │ │          │  │                        │
         │          │  └──────────┘ └──────────┘  │                        │
         │          └─────────────────────────────┘                        │
         │                         │                                        │
         │          ┌──────────────┴──────────────┐                        │
         │          │          Backup             │                        │
         │          │  ┌──────────┐ ┌──────────┐  │                        │
         │          │  │Velero    │ │CronJob   │  │                        │
         │          │  │(K8s snaps│ │(PG dump) │  │                        │
         │          │  │ + S3)    │ │ + S3     │  │                        │
         │          │  └──────────┘ └──────────┘  │                        │
         │          └─────────────────────────────┘                        │
         │
         │  ┌─────────────────────────────────────────────────────────────────┐
         │  │  External Services                                              │
         │  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐ │
         │  │  │Alchemy   │ │Solana RPC │ │0G Labs   │ │CoinMarketCap API │ │
         │  │  │(ETH/ARB/ │ │           │ │(Compute/ │ │(Gas prices)      │ │
         │  │  │ BASE/AVX)│ │           │ │Storage/DA)│ │                  │ │
         │  │  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘ │
         │  └─────────────────────────────────────────────────────────────────┘

```

---

## Implementation Priority Matrix

| Priority | Item | Effort | Impact | Dependencies |
|----------|------|--------|--------|-------------|
| **P0** | Remove private key from `.env.example` | 5 min | CRITICAL | None |
| **P0** | Add non-root user to Dockerfiles | 30 min | HIGH | None |
| **P0** | Fix CI `|| echo` silent failures | 15 min | HIGH | None |
| **P1** | Add Ingress + TLS + cert-manager | 4 hrs | HIGH | Domain DNS |
| **P1** | Set up External Secrets Operator | 4 hrs | HIGH | AWS Secrets Manager |
| **P1** | Add HPA + PDB manifests | 2 hrs | HIGH | Resource metrics |
| **P1** | Add NetworkPolicies | 2 hrs | HIGH | None |
| **P1** | Add Prometheus + Grafana | 8 hrs | HIGH | Ingress |
| **P2** | Add PgBouncer | 2 hrs | MEDIUM | PostgreSQL |
| **P2** | Implement Velero backups | 4 hrs | MEDIUM | S3 bucket |
| **P2** | Add Loki logging | 4 hrs | MEDIUM | Prometheus |
| **P2** | Create staging environment | 8 hrs | MEDIUM | K8s cluster |
| **P3** | Implement ArgoCD GitOps | 8 hrs | MEDIUM | Git repo |
| **P3** | Add security scanning (Trivy + Slither) | 4 hrs | LOW | CI |
| **P3** | Set up StatefulSets for data layer | 4 hrs | LOW | StorageClass |
| **P3** | Add frontend tests + contract tests in CI | 6 hrs | LOW | Test suite |
| **P4** | Service mesh (Linkerd) | 16 hrs | LOW | mTLS certs |
| **P4** | Multi-region DR | 40 hrs | LOW | Budget |

---

## Critical Path (First Sprint — Week 1)

1. **Hour 0-1**: Remove private key from env, add `.env` to `.gitignore`, add non-root user, fix CI failures
2. **Hour 1-4**: Set up K8s namespace, NetworkPolicies, ResourceQuota, ServiceAccount + RBAC
3. **Hour 4-8**: Deploy Ingress-NGINX + cert-manager, configure TLS
4. **Hour 8-12**: Set up External Secrets Operator + AWS Secrets Manager
5. **Hour 12-16**: Add metrics instrumentation to backend, deploy Prometheus + Grafana
6. **Hour 16-24**: Deploy Loki + Promtail, set up alerting rules
7. **Hour 24-32**: Set up HPA, PDB, PgBouncer sidecar, PostgreSQL StatefulSet
8. **Hour 32-40**: Redeploy CI/CD pipeline with full test suite and deployment stages
