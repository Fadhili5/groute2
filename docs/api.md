# API Reference

## Market

### GET /api/market/chains
Returns all chains with liquidity, gas, spread, MEV protection data.

### GET /api/market/chains/:id
Returns specific chain data.

### GET /api/market/liquidity
Returns cross-chain liquidity pool data.

### GET /api/market/ticker
Returns live ticker feed items.

## Execution

### POST /api/execution/simulate
Simulate a route execution. Body:
```json
{
  "sourceAsset": "USDC",
  "destinationAsset": "ETH",
  "sourceChain": "Arbitrum",
  "destinationChain": "Ethereum",
  "amount": 50000,
  "privacyMode": true,
  "fragmentationMode": true,
  "slippageTolerance": 0.5,
  "bridgePreference": "LayerZero",
  "mevGuard": true
}
```

### POST /api/execution/optimize
Optimize route parameters.

### POST /api/execution/execute
Execute a route order.

### GET /api/execution/orders
List recent orders.

## Settlement

### GET /api/settlement/proofs
List settlement proofs.

### GET /api/settlement/verify/:txHash
Verify a transaction hash on-chain.

### POST /api/settlement/inspect
Inspect a settlement by tx hash or route ID.

## Routes

### GET /api/routes
List all registered routes.

### GET /api/routes/recommend
Get AI-recommended route.

### GET /api/routes/simulate
Get route simulation with fragments.

## Alerts

### GET /api/alerts
List all alerts.

### GET /api/alerts/unread
List unread alerts with count.

### PUT /api/alerts/:id/read
Mark alert as read.

## System

### GET /api/health
Health check endpoint.

### GET /api/kpi
Key performance indicators.

### GET /api/chains
All chains with liquidity pools.

### GET /api/system/health
System health status.
