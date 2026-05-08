# Smart Contracts

## IntentRouter.sol
Manages cross-chain routing intents. Users create intents specifying source/destination tokens, chains, amounts, and privacy preferences. Supports fragmentation and MEV protection.

- `createIntent()` - Create new routing intent
- `fragmentIntent()` - Split intent into fragments
- `routeIntent()` - Assign route to intent
- `settleIntent()` - Complete settlement
- Pausable, ReentrancyGuard, AccessControl

## FragmentVault.sol
Custodies fragmented assets during routing. Each fragment represents a portion of the total amount being routed through a specific bridge/DEX.

- `createFragment()` - Create asset fragment
- `settleFragment()` - Settle individual fragment
- `withdrawFunds()` - Withdraw settled funds

## RouteRegistry.sol
Registry of available routes between chains. Tracks route performance, latency, success rates, and volume.

- `registerRoute()` - Add new route
- `updateRouteStatus()` - Update route status
- `recordExecution()` - Track execution metrics

## SettlementVerifier.sol
Verifies cross-chain settlement proofs. Supports multi-confirmation verification with dispute resolution.

- `submitProof()` - Submit settlement proof
- `confirmProof()` - Confirm with block confirmations
- `finalizeProof()` - Finalize after dispute period
- `disputeProof()` - Dispute invalid proof

## PrivacyScoreOracle.sol
Oracle for chain privacy scores. Tracks MEV resistance, anonymity set size, and frontrunning risks per chain.

- `updateScore()` - Update chain privacy score
- `addChain()` - Add tracked chain
- `getScore()` - Get current privacy score

## TreasuryFeeCollector.sol
Collects and distributes protocol fees. Supports tiered fee structures based on amount.

- `collectFee()` - Collect route fee
- `distributeToTreasury()` - Send to treasury
- `setFeeConfig()` - Configure fee parameters

## Governance.sol
On-chain governance with proposal creation, voting, and execution.

- `createProposal()` - Create governance proposal
- `castVote()` - Vote on proposal
- `executeProposal()` - Execute passed proposal
- `setVotingPower()` - Assign voting power

## RelayerRegistry.sol
Manages relayer network with staking, heartbeats, and slashing.

- `registerRelayer()` - Register with stake
- `heartbeat()` - Send heartbeat
- `recordRouteResult()` - Track relayer performance
- `banRelayer()` - Ban malicious relayers

## Deployment

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network ethereum
```
