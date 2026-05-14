# Smart Contracts

GhostRoute Terminal includes 8 production Solidity contracts, all compiled with Solidity 0.8.24 (hardhat config: 0.8.26) using OpenZeppelin v5 audited components.

---

## Overview

| # | Contract | File | Lines | Purpose |
|---|----------|------|-------|---------|
| 1 | IntentRouter | `contracts/IntentRouter.sol` | 169 | Cross-chain intent management, fragmentation, settlement |
| 2 | FragmentVault | `contracts/FragmentVault.sol` | 128 | Fragment custody, settlement, withdrawal |
| 3 | RouteRegistry | `contracts/RouteRegistry.sol` | 140 | Route registration, performance tracking |
| 4 | SettlementVerifier | `contracts/SettlementVerifier.sol` | 166 | Proof submission, confirmation, dispute resolution |
| 5 | PrivacyScoreOracle | `contracts/PrivacyScoreOracle.sol` | 123 | Chain-level privacy scoring |
| 6 | TreasuryFeeCollector | `contracts/TreasuryFeeCollector.sol` | 150 | Tiered fee collection and distribution |
| 7 | Governance | `contracts/Governance.sol` | 210 | Proposal creation, voting, execution (fixed state machine) |
| 8 | RelayerRegistry | `contracts/RelayerRegistry.sol` | 213 | Relayer staking, heartbeats, slashing (underflow-safe) |

**Standard Features (all contracts):**
- OpenZeppelin `AccessControl` with 3-4 distinct roles
- `Pausable` for emergency stop
- `ReentrancyGuard` on value-transfer functions
- `SafeERC20` for all token operations
- Custom errors (gas-efficient)
- NatSpec documentation
- Events for all state changes

**Bug Fixes Applied:**
- Governance: Proposals now start in `Pending` state (was `Active`). Added `activateProposal()` transition. `castVote` reverts for zero voting power instead of granting weight=1. Separated `executeProposal` (sets `Succeeded`) from `finalizeProposal` (sets `Executed`). Added `approvalDelay` parameter.
- RelayerRegistry: All `activeRelayers--` operations are guarded against underflow. Slashing is idempotent (skips if already slashed). `recordRouteResult` checks status before slashing. `heartbeat` emits the `signature` parameter.

---

## 1. IntentRouter

**Purpose:** Manages the lifecycle of cross-chain routing intents. A user creates an intent specifying source/destination tokens, chains, amount, and privacy preferences. The router then fragments, routes, and settles the intent.

**File:** `contracts/IntentRouter.sol`

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract admin |
| `ROUTER_ROLE` | Can fragment, route, settle, and fail intents |
| `GOVERNANCE_ROLE` | Can pause/unpause the contract |

### State Machine

```
Created → Fragmented → Routed → Settled
   │                          │
   └──────── Failed ←─────────┘
```

### Structs

```solidity
enum IntentState { Created, Fragmented, Routed, Settled, Failed }
enum PrivacyLevel { Standard, Medium, High, Stealth }

struct Intent {
    bytes32 id;
    address user;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 minAmountOut;      // Slippage protection
    uint256 sourceChain;       // Chain ID
    uint256 destChain;         // Chain ID
    PrivacyLevel privacy;
    bool fragmented;           // Enable fragmentation?
    IntentState state;
    uint256 timestamp;
    bytes32 routeId;
}
```

### Key Functions

#### `createIntent(tokenIn, tokenOut, amountIn, minAmountOut, sourceChain, destChain, privacy, fragmented) → bytes32`
- Transfers `amountIn` of `tokenIn` from `msg.sender` to contract
- Creates intent with `Created` state
- Emits `IntentCreated`
- **Access:** Public (with `whenNotPaused`)
- **Reverts:** `InvalidIntentParameters`, `InsufficientAmount`, `InvalidChain`

#### `fragmentIntent(intentId, fragmentIds)` 
- Transitions intent to `Fragmented` state
- Associates fragment IDs with intent
- **Access:** `ROUTER_ROLE` only
- **Reverts:** `IntentNotActive`, `InvalidIntentParameters`

#### `routeIntent(intentId, routeId)`
- Assigns a route ID and transitions to `Routed` state
- **Access:** `ROUTER_ROLE` only

#### `settleIntent(intentId, amountOut, fee)`
- Checks `amountOut >= minAmountOut` (slippage guard)
- Transfers `amountOut - fee` of `tokenOut` to user
- Transitions to `Settled` on success, `Failed` on slippage breach
- **Access:** `ROUTER_ROLE` only, `nonReentrant`

#### `failIntent(intentId, reason)`
- Refunds `tokenIn` amount to user
- **Access:** `ROUTER_ROLE` only

#### `pause()` / `unpause()`
- **Access:** `GOVERNANCE_ROLE` only

### Events
```
IntentCreated(id, user, tokenIn, tokenOut, amountIn, sourceChain, destChain)
IntentFragmented(id, fragmentCount)
IntentRouted(id, routeId)
IntentSettled(id, amountOut, fee)
IntentFailed(id, reason)
```

---

## 2. FragmentVault

**Purpose:** Custodies fragmented assets during routing. Each fragment represents a portion of the total amount being routed through a specific bridge/DEX. The vault tracks locked (in-flight) vs available (settled) balances.

**File:** `contracts/FragmentVault.sol`

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract admin |
| `FRAGMENTER_ROLE` | Can create fragments |
| `SETTLER_ROLE` | Can settle fragments and withdraw funds |

### Structs

```solidity
struct Fragment {
    bytes32 id;
    bytes32 intentId;
    address token;
    uint256 amount;
    uint256 targetChain;      // Destination chain ID
    address targetDex;        // Target DEX/router
    bytes routeData;          // Encoded routing instructions
    bool settled;
    uint256 timestamp;
}

struct VaultBalance {
    address token;
    uint256 locked;           // In-flight fragments
    uint256 available;        // Settled, ready for withdrawal
}
```

### Key Functions

#### `createFragment(intentId, token, amount, targetChain, targetDex, routeData) → bytes32`
- Transfers tokens from `msg.sender` to vault
- Increments `locked` balance
- Emits `FragmentCreated`
- **Access:** `FRAGMENTER_ROLE`

#### `settleFragment(fragmentId, amountOut)`
- Marks fragment as settled
- Moves `locked → available` balance
- Emits `FragmentSettled`
- **Access:** `SETTLER_ROLE`, `nonReentrant`
- **Reverts:** `FragmentNotFound`, `FragmentAlreadySettled`

#### `withdrawFunds(token, amount, to)`
- Transfers `amount` of `token` to `to` from available balance
- **Access:** `SETTLER_ROLE`, `nonReentrant`
- **Reverts:** `InsufficientVaultBalance`

#### View Functions
- `getFragment(id)` — Returns fragment details
- `getIntentFragments(intentId)` — Returns fragment IDs for an intent
- `getVaultBalance(token)` — Returns (locked, available)

---

## 3. RouteRegistry

**Purpose:** Registry of available routes between chains. Tracks performance metrics: average latency, success rate, total volume, and execution count.

**File:** `contracts/RouteRegistry.sol`

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract admin |
| `ROUTE_MANAGER_ROLE` | Register/update routes, record executions |
| `GOVERNANCE_ROLE` | Pause/unpause |

### Structs

```solidity
struct Route {
    bytes32 id;
    string name;
    uint256 sourceChain;
    uint256 destChain;
    address[] bridges;
    address[] dexes;
    uint256 maxAmount;
    uint256 minAmount;
    uint256 avgLatency;        // Running average
    uint256 successRate;       // Basis points (10000 = 100%)
    uint256 totalVolume;
    uint256 totalExecutions;
    RouteStatus status;         // Active, Paused, Retired, Failed
    uint256 createdAt;
    uint256 updatedAt;
}
```

### Key Functions

#### `registerRoute(name, sourceChain, destChain, bridges, dexes, maxAmount, minAmount) → bytes32`
- Registers a new route between chains
- Initializes `successRate = 10000` (100%)
- Emits `RouteRegistered`
- **Access:** `ROUTE_MANAGER_ROLE`
- **Reverts:** `InvalidRouteParameters`

#### `updateRouteStatus(routeId, status)`
- Updates route status (Active, Paused, Retired, Failed)
- **Access:** `ROUTE_MANAGER_ROLE`

#### `recordExecution(routeId, amount, latency, success)`
- Updates running averages for latency, success rate, and total volume
- Uses moving average formula:
  - `avgLatency = (avgLatency * (totalExecs - 1) + latency) / totalExecs`
  - `successRate = ((successRate * (totalExecs - 1)) + (success ? 10000 : 0)) / totalExecs`
- **Access:** `ROUTE_MANAGER_ROLE`

#### View Functions
- `getRoute(id)` — Returns route details
- `getChainRoutes(chainId)` — Routes involving a chain
- `getAllRoutes()` — All registered route IDs
- `getRouteCount()` — Total routes

---

## 4. SettlementVerifier

**Purpose:** Verifies cross-chain settlement proofs. Supports multi-confirmation verification with a dispute period before finalization.

**File:** `contracts/SettlementVerifier.sol`

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract admin |
| `VERIFIER_ROLE` | Submit/confirm/finalize/dispute proofs |
| `GOVERNANCE_ROLE` | Governance |

### Constants
- `MIN_CONFIRMATIONS = 12` — Minimum block confirmations required
- `FINALIZATION_PERIOD = 64` — Blocks to wait after confirmation before finalization

### State Machine

```
Pending → Confirmed → Finalized
    │          │
    └── Disputed
```

### Structs

```solidity
struct SettlementProof {
    bytes32 txHash;
    bytes32 routeId;
    bytes32 proofHash;
    bytes32 sourceChainBlockHash;
    bytes32 destChainBlockHash;
    address relayer;
    uint256 amount;
    uint256 fee;
    uint256 sourceConfirmations;
    uint256 destConfirmations;
    SettlementState state;     // Pending, Confirmed, Finalized, Disputed, Failed
    uint256 timestamp;
    uint256 finalizedAt;
}
```

### Key Functions

#### `submitProof(txHash, routeId, proofHash, sourceBlockHash, destBlockHash, amount, fee) → bytes32`
- Submits a new proof for cross-chain settlement
- State → `Pending`
- Emits `ProofSubmitted`
- **Access:** `VERIFIER_ROLE`

#### `confirmProof(txHash, sourceConfs, destConfs)`
- Updates confirmation counts
- If both ≥ `MIN_CONFIRMATIONS`, state → `Confirmed`
- Emits `ProofConfirmed`
- **Access:** `VERIFIER_ROLE`

#### `finalizeProof(txHash)`
- Requires state == `Confirmed` AND `block.timestamp >= proof.timestamp + FINALIZATION_PERIOD`
- State → `Finalized`, marks hash as verified
- Emits `ProofFinalized`
- **Access:** `VERIFIER_ROLE`

#### `disputeProof(txHash, reason)`
- State → `Disputed` (cannot dispute finalized proofs)
- Emits `ProofDisputed`
- **Access:** `VERIFIER_ROLE`

#### `requestVerification(txHash) → bytes32`
- Anyone can request verification of a proof
- Creates `VerificationRequest`

#### `completeVerification(requestId, verified)`
- Completes a verification request
- **Access:** `VERIFIER_ROLE`

---

## 5. PrivacyScoreOracle

**Purpose:** Oracle for chain-level privacy scores. Tracks MEV resistance, anonymity set size, frontrunning/sandwich risks per chain.

**File:** `contracts/PrivacyScoreOracle.sol`

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract admin |
| `ORACLE_ROLE` | Update scores |
| `GOVERNANCE_ROLE` | Add/remove chains, pause |

### Key Data

```solidity
struct PrivacyScore {
    uint256 chainId;
    uint256 score;              // 0-100 overall
    uint256 mevResistance;      // 0-100
    uint256 anonymitySet;       // 0-100
    uint256 frontrunningRisk;   // 0-100
    uint256 sandwhichRisk;      // 0-100
    uint256 timestamp;
    string metadata;
}

struct ChainPrivacyConfig {
    bool hasPrivacyRPC;
    bool supportsFlashbots;
    bool hasTornadoCash;
    bool hasRailgun;
    uint256 mevBlockspace;
    uint256 privateMempoolSize;
}
```

### Key Functions
- `updateScore(chainId, score, mevResistance, anonymitySet, frontrunningRisk, sandwhichRisk, metadata)` — `ORACLE_ROLE`
- `addChain(chainId, config)` — `GOVERNANCE_ROLE`
- `removeChain(chainId)` — `GOVERNANCE_ROLE`
- `getScore(chainId)` — Public view
- `requestScore(chainId)` — Anyone can request an oracle update

---

## 6. TreasuryFeeCollector

**Purpose:** Collects and distributes protocol fees with tiered fee structures based on transaction amount.

**File:** `contracts/TreasuryFeeCollector.sol`

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract admin |
| `FEE_MANAGER_ROLE` | Collect fees |
| `GOVERNANCE_ROLE` | Configure fees, treasury, tiers |

### Fee Tiers (default)

| Tier | Amount Range | Fee (bps) |
|------|-------------|-----------|
| 1 | $0 – $10K | 30 (0.30%) |
| 2 | $10K – $100K | 25 (0.25%) |
| 3 | $100K – $1M | 20 (0.20%) |
| 4 | $1M+ | 15 (0.15%) |

### Key Functions
- `collectFee(routeId, token, amount, chainId)` — Calculates and collects fee, `FEE_MANAGER_ROLE`
- `distributeToTreasury(token, amount)` — Sends fees to treasury wallet, `GOVERNANCE_ROLE`
- `setFeeConfig(chainId, protocolFee, relayerFee, bridgeFee, treasuryFee, enabled)` — Per-chain config override
- `setTreasuryWallet(address)` — Update treasury recipient
- `addFeeTier(minAmount, maxAmount, feeBps)` — Add custom tier
- `getFeeForAmount(amount)` — Public view of applicable fee

---

## 7. Governance

**Purpose:** On-chain governance with proposal creation, weighted voting, and execution. Uses EIP-712 typed signatures.

**File:** `contracts/Governance.sol`

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract admin |
| `PROPOSAL_ROLE` | Create proposals |
| `EXECUTOR_ROLE` | Execute passed proposals |
| `GOVERNANCE_ROLE` | Cancel proposals, update params |

### Parameters
- `votingPeriod = 50400` blocks (~7 days at 12s blocks)
- `quorum = 4` minimum voters
- `approvalDelay = 100` blocks review period before voting starts

### State Machine

```
Pending → Active → Succeeded → Executed
                 → Defeated
                 → Cancelled
```

### Key Functions
- `createProposal(targetContract, data, value, description)` — `PROPOSAL_ROLE`, creates in `Pending` state
- `activateProposal(proposalId)` — Anyone can call after `approvalDelay` blocks, transitions to `Active`
- `castVote(proposalId, support, reason)` — Weighted by `votingPower`, reverts if weight is 0 (NoVotingPower error), `AlreadyVoted` check
- `executeProposal(proposalId)` — `EXECUTOR_ROLE`, checks `forVotes > againstVotes` AND `quorum` met, sets `Succeeded` state
- `finalizeProposal(proposalId)` — `EXECUTOR_ROLE`, transitions `Succeeded` → `Executed`
- `cancelProposal(proposalId)` — `GOVERNANCE_ROLE`
- `setVotingPower(voter, power)` — `GOVERNANCE_ROLE`
- `setQuorum(uint256)` / `setVotingPeriod(uint256)` / `setApprovalDelay(uint256)` — `GOVERNANCE_ROLE`

---

## 8. RelayerRegistry

**Purpose:** Manages the relayer network with staking, heartbeats, and slashing. Relayers execute cross-chain routing and submit proofs.

**File:** `contracts/RelayerRegistry.sol`

### Roles
| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract admin |
| `REGISTRY_MANAGER_ROLE` | Record route results |
| `GOVERNANCE_ROLE` | Ban relayers, pause |

### Constants
- `MIN_STAKE = 10 ether` — Minimum staking requirement
- `SLASH_THRESHOLD = 5` — Failed routes before slashing
- `HEARTBEAT_TIMEOUT = 1 hours` — Heartbeat interval

### State Machine

```
Inactive → Active → Slashed → Banned
              │
              └ (heartbeat timeout) → Inactive
```

### Key Functions

**Security:**
- All `activeRelayers--` operations are guarded with `if (activeRelayers > 0)` to prevent underflow
- `_slash()` is idempotent -- returns early if relayer is not `Active`
- `recordRouteResult` checks `relayer.status == RelayerStatus.Active` before slashing
- `banRelayer` checks if relayer is already `Banned` before processing
- `heartbeat` now emits the `signature` parameter in the event

#### `registerRelayer(endpoint, supportedChains)` — `payable`
- Requires `msg.value >= MIN_STAKE` (10 ETH)
- Existing relayers can increase stake
- Registers for supported chains
- Emits `RelayerRegistered`

#### `heartbeat(signature)`
- Updates `lastHeartbeat` timestamp
- Emits `RelayerHeartbeat`

#### `recordRouteResult(relayerAddress, routeId, success)`
- Updates relayer success/failure stats
- If `failedRoutes >= SLASH_THRESHOLD` (5), automatically slashes (10% stake loss)
- **Access:** `REGISTRY_MANAGER_ROLE`

#### `banRelayer(relayerAddress, reason)`
- Governance function to ban malicious relayers
- **Access:** `GOVERNANCE_ROLE`

#### `withdrawStake()`
- Only available when relayer is NOT `Active` (slashed/banned/inactive)
- Sends remaining stake to relayer
- `nonReentrant`

#### `checkHeartbeats()`
- Scans all relayers, marks any with `lastHeartbeat > 1hr` as `Inactive` and decrements active count
- **Access:** `REGISTRY_MANAGER_ROLE`

---

## Deployment

### Prerequisites
```bash
cd contracts
npm install
```

### Compile
```bash
npx hardhat compile
```

### Test
```bash
npx hardhat test
```

### Deploy (Local Hardhat Node)
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.ts --network localhost
```

### Deploy (Testnet/Mainnet)
```bash
# Set deployer key
export DEPLOYER_PRIVATE_KEY=0x...

# Deploy to specific network
npx hardhat run scripts/deploy.ts --network ethereum
npx hardhat run scripts/deploy.ts --network arbitrum
npx hardhat run scripts/deploy.ts --network base
```

### Verify
```bash
npx hardhat verify --network ethereum <CONTRACT_ADDRESS>
```

### Configuration
```solidity
solidity: "0.8.24"  // In source files
solidity: "0.8.26"  // In hardhat.config.ts
optimizer: { enabled: true, runs: 200 }
```

---

## Testing Contract Addresses

| Contract | Address |
|----------|---------|
| IntentRouter | `0x0000...0001` |
| FragmentVault | `0x0000...0002` |
| RouteRegistry | `0x0000...0003` |
| SettlementVerifier | `0x0000...0004` |
| PrivacyScoreOracle | `0x0000...0005` |
| TreasuryFeeCollector | `0x0000...0006` |
| Governance | `0x0000...0007` |
| RelayerRegistry | `0x0000...0008` |

These addresses are defined in `frontend/src/lib/constants.ts` and `backend/src/config.ts`.
