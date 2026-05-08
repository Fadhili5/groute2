import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const IntentRouter = await ethers.getContractFactory("IntentRouter");
  const router = await IntentRouter.deploy();
  await router.waitForDeployment();
  console.log("IntentRouter deployed:", router.target);

  const FragmentVault = await ethers.getContractFactory("FragmentVault");
  const vault = await FragmentVault.deploy();
  await vault.waitForDeployment();
  console.log("FragmentVault deployed:", vault.target);

  const RouteRegistry = await ethers.getContractFactory("RouteRegistry");
  const registry = await RouteRegistry.deploy();
  await registry.waitForDeployment();
  console.log("RouteRegistry deployed:", registry.target);

  const SettlementVerifier = await ethers.getContractFactory("SettlementVerifier");
  const verifier = await SettlementVerifier.deploy();
  await verifier.waitForDeployment();
  console.log("SettlementVerifier deployed:", verifier.target);

  const PrivacyScoreOracle = await ethers.getContractFactory("PrivacyScoreOracle");
  const oracle = await PrivacyScoreOracle.deploy();
  await oracle.waitForDeployment();
  console.log("PrivacyScoreOracle deployed:", oracle.target);

  const TreasuryFeeCollector = await ethers.getContractFactory("TreasuryFeeCollector");
  const feeCollector = await TreasuryFeeCollector.deploy(deployer.address);
  await feeCollector.waitForDeployment();
  console.log("TreasuryFeeCollector deployed:", feeCollector.target);

  const Governance = await ethers.getContractFactory("Governance");
  const gov = await Governance.deploy();
  await gov.waitForDeployment();
  console.log("Governance deployed:", gov.target);

  const RelayerRegistry = await ethers.getContractFactory("RelayerRegistry");
  const relayerReg = await RelayerRegistry.deploy();
  await relayerReg.waitForDeployment();
  console.log("RelayerRegistry deployed:", relayerReg.target);

  const addresses = {
    intentRouter: router.target,
    fragmentVault: vault.target,
    routeRegistry: registry.target,
    settlementVerifier: verifier.target,
    privacyScoreOracle: oracle.target,
    treasuryFeeCollector: feeCollector.target,
    governance: gov.target,
    relayerRegistry: relayerReg.target,
  };

  console.log("\nDeployment complete!");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
