import { expect } from "chai";
import { ethers } from "hardhat";
import { IntentRouter, TestERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IntentRouter", function () {
  let router: IntentRouter;
  let token: TestERC20;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let routerRole: string;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("TestERC20");
    token = await TokenFactory.deploy("Test Token", "TST", 18);
    await token.waitForDeployment();

    const RouterFactory = await ethers.getContractFactory("IntentRouter");
    router = await RouterFactory.deploy();
    await router.waitForDeployment();

    routerRole = await router.ROUTER_ROLE();

    await token.mint(user.address, ethers.parseEther("1000"));
    await token.connect(user).approve(router.target, ethers.parseEther("1000"));
  });

  describe("Create Intent", function () {
    it("should create intent successfully", async function () {
      const tx = await router.connect(user).createIntent(
        token.target,
        token.target,
        ethers.parseEther("100"),
        ethers.parseEther("95"),
        1,
        2,
        0,
        false
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const intentId = await router.userIntents(user.address, 0);
      const intent = await router.getIntent(intentId);
      expect(intent.amountIn).to.equal(ethers.parseEther("100"));
      expect(intent.user).to.equal(user.address);
    });

    it("should revert with zero amount", async function () {
      await expect(
        router.connect(user).createIntent(
          token.target,
          token.target,
          0,
          ethers.parseEther("95"),
          1,
          2,
          0,
          false
        )
      ).to.be.revertedWithCustomError(router, "InsufficientAmount");
    });
  });

  describe("Route & Settle", function () {
    it("should route and settle intent", async function () {
      await router.connect(user).createIntent(
        token.target,
        token.target,
        ethers.parseEther("100"),
        ethers.parseEther("95"),
        1,
        2,
        0,
        false
      );

      const intentId = await router.userIntents(user.address, 0);

      await router.connect(owner).routeIntent(intentId, ethers.randomBytes(32));
      await router.connect(owner).settleIntent(intentId, ethers.parseEther("98"), ethers.parseEther("1"));

      const intent = await router.getIntent(intentId);
      expect(intent.state).to.equal(2);
    });
  });
});
