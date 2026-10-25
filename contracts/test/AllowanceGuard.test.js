const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AllowanceGuard Unit Tests", function () {
  let guard;
  let mockToken;
  let owner, spender, user2;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18);
  const UNLIMITED_ALLOWANCE = ethers.MaxUint256;
  const CAPPED_ALLOWANCE = ethers.parseUnits("500", 18);

  beforeEach(async function () {
    [owner, spender, user2] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Bohr Guard USD", "BGUSD", INITIAL_SUPPLY);
    await mockToken.waitForDeployment();

    // Deploy AllowanceGuard
    const AllowanceGuard = await ethers.getContractFactory("AllowanceGuard");
    guard = await AllowanceGuard.deploy();
    await guard.waitForDeployment();
  });

  it("should record an allowance check when allowance is 0", async function () {
    const tx = await guard.recordCheck(
      await mockToken.getAddress(),
      spender.address
    );
    await tx.wait();

    // Check emitted event & history
    const totalChecks = await guard.totalChecksRecorded();
    expect(totalChecks).to.equal(1);

    const userCount = await guard.getUserCheckCount(owner.address);
    expect(userCount).to.equal(1);

    const records = await guard.getUserChecks(owner.address, 0, 10);
    expect(records.length).to.equal(1);
    expect(records[0].token).to.equal(await mockToken.getAddress());
    expect(records[0].spender).to.equal(spender.address);
    expect(records[0].allowanceAmount).to.equal(0);
    expect(records[0].isUnlimited).to.be.false;
  });

  it("should detect and record unlimited allowance (MaxUint256)", async function () {
    // Approve spender with MaxUint256
    await mockToken.approve(spender.address, UNLIMITED_ALLOWANCE);

    const tx = await guard.recordCheck(
      await mockToken.getAddress(),
      spender.address
    );
    await tx.wait();

    const records = await guard.getUserChecks(owner.address, 0, 10);
    expect(records[0].allowanceAmount).to.equal(UNLIMITED_ALLOWANCE);
    expect(records[0].isUnlimited).to.be.true;
  });

  it("should detect capped allowance", async function () {
    await mockToken.approve(spender.address, CAPPED_ALLOWANCE);

    await guard.recordCheck(
      await mockToken.getAddress(),
      spender.address
    );

    const records = await guard.getUserChecks(owner.address, 0, 10);
    expect(records[0].allowanceAmount).to.equal(CAPPED_ALLOWANCE);
    expect(records[0].isUnlimited).to.be.false;
  });

  it("should fetch token metadata and allowance details via getAllowanceDetails", async function () {
    await mockToken.approve(spender.address, CAPPED_ALLOWANCE);

    const details = await guard.getAllowanceDetails(
      owner.address,
      await mockToken.getAddress(),
      spender.address
    );

    expect(details.allowance).to.equal(CAPPED_ALLOWANCE);
    expect(details.balance).to.equal(INITIAL_SUPPLY);
    expect(details.decimals).to.equal(18);
    expect(details.symbol).to.equal("BGUSD");
    expect(details.name).to.equal("Bohr Guard USD");
    expect(details.isUnlimited).to.be.false;
  });

  it("should support batch check recording", async function () {
    const tokens = [await mockToken.getAddress(), await mockToken.getAddress()];
    const spenders = [spender.address, user2.address];

    await guard.batchRecordChecks(tokens, spenders);

    const total = await guard.totalChecksRecorded();
    expect(total).to.equal(2);

    const userCount = await guard.getUserCheckCount(owner.address);
    expect(userCount).to.equal(2);
  });

  it("should verify that revoking approval resets allowance to 0", async function () {
    // Approve unlimited first
    await mockToken.approve(spender.address, UNLIMITED_ALLOWANCE);
    let currentAllowance = await mockToken.allowance(owner.address, spender.address);
    expect(currentAllowance).to.equal(UNLIMITED_ALLOWANCE);

    // User revokes approval directly on the token contract
    await mockToken.approve(spender.address, 0);

    // Verify allowance is now 0
    currentAllowance = await mockToken.allowance(owner.address, spender.address);
    expect(currentAllowance).to.equal(0);

    // Record check after revocation
    await guard.recordCheck(await mockToken.getAddress(), spender.address);
    const records = await guard.getUserChecks(owner.address, 0, 10);
    const latest = records[records.length - 1];
    expect(latest.allowanceAmount).to.equal(0);
    expect(latest.isUnlimited).to.be.false;
  });
});
