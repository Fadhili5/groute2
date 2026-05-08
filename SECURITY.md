# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

Report vulnerabilities to security@ghostroute.io. Do not disclose publicly.

We will acknowledge within 24 hours and provide a fix timeline. Critical issues are patched within 72 hours.

## Security Measures

### Smart Contract Security
- All contracts use OpenZeppelin audited components
- ReentrancyGuard on all value-moving functions
- Pausable for emergency stops
- AccessControl for granular permissions
- Custom errors to prevent DoS via string handling
- NatSpec documentation for all public interfaces

### MEV Protection
- Flashbots integration for private mempool submission
- Privacy RPC support for transaction shielding
- Order fragmentation to minimize MEV exposure
- Slippage protection with minimum amount checks
- MEV guard toggle on all execution paths

### Infrastructure Security
- Rate limiting on all API endpoints
- Input validation via Zod schemas
- WebSocket authentication
- Redis encryption at rest
- PostgreSQL with SSL connections
- Docker container isolation
- Kubernetes network policies

### Key Management
- Hardware wallet support for admin operations
- Multi-signature governance for protocol changes
- Timelock on parameter updates
- Role-based access control hierarchy
