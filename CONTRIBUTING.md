# Contributing

## Development Setup

```bash
# Clone
git clone https://github.com/ghostroute/terminal.git
cd ghostroute-terminal

# Install dependencies
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start infrastructure
docker compose -f docker/docker-compose.yml up -d postgres redis

# Run database migrations
cd backend && npx prisma db push && npx prisma db seed && cd ..

# Start development servers
cd backend && npm run dev &
cd frontend && npm run dev &
```

## Code Standards

- TypeScript strict mode
- ESLint + Prettier formatting
- Solidity NatSpec documentation
- Comprehensive test coverage
- No placeholders or dead code

## Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure all checks pass
4. Request review from maintainers
5. Squash merge to main

## Commit Messages

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Include issue reference when applicable
