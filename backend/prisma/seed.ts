import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const chains = [
    { name: "Ethereum", shortName: "ETH", chainId: 1, status: "healthy" },
    { name: "Arbitrum", shortName: "ARB", chainId: 42161, status: "healthy" },
    { name: "Base", shortName: "BASE", chainId: 8453, status: "healthy" },
    { name: "Solana", shortName: "SOL", chainId: 101, status: "healthy" },
    { name: "Avalanche", shortName: "AVAX", chainId: 43114, status: "degraded" },
    { name: "BNB Chain", shortName: "BNB", chainId: 56, status: "healthy" },
  ];

  for (const chain of chains) {
    await prisma.chain.upsert({
      where: { name: chain.name },
      update: chain,
      create: chain,
    });
  }

  console.log("Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
