const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "No deployer account configured. Please verify PRIVATE_KEY in contracts/.env"
    );
  }

  const deployer = signers[0];
  console.log("--------------------------------------------------");
  console.log("Deploying AllowanceGuard with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BOT");
  console.log("--------------------------------------------------");

  if (balance === 0n) {
    console.warn("⚠️ Warning: Account balance is 0 BOT. The deployment transaction may fail due to lack of gas.");
  }

  // Deploy AllowanceGuard
  const AllowanceGuard = await ethers.getContractFactory("AllowanceGuard");
  console.log("Deploying AllowanceGuard...");
  const guard = await AllowanceGuard.deploy();
  await guard.waitForDeployment();

  const guardAddress = await guard.getAddress();
  console.log(" AllowanceGuard deployed successfully!");
  console.log(" Contract Address:", guardAddress);
  console.log(" Bohr Explorer:", `https://scan.bohr.life/address/${guardAddress}`);

  // Deploy MockERC20 test token if requested
  const deployMock = process.env.DEPLOY_MOCK === "true";
  if (deployMock) {
    console.log("\nDeploying MockERC20 test token...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mock = await MockERC20.deploy("Bohr Guard USD", "BGUSD", ethers.parseUnits("1000000", 18));
    await mock.waitForDeployment();
    const mockAddress = await mock.getAddress();
    console.log(" MockERC20 deployed at:", mockAddress);
    console.log(" Bohr Explorer:", `https://scan.bohr.life/address/${mockAddress}`);
  }

  // Update .env.local in root and frontend
  const envCandidates = [
    path.join(__dirname, "../../.env.local"),
    path.join(__dirname, "../.env.local"),
    path.join(__dirname, "../../frontend/.env.local"),
    path.join(__dirname, "../frontend/.env.local"),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf-8");
      if (content.includes("CONTRACT_ADDRESS=")) {
        content = content.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${guardAddress}`);
      } else {
        content += `\nCONTRACT_ADDRESS=${guardAddress}\n`;
      }
      fs.writeFileSync(envPath, content);
      console.log(` Updated ${path.basename(envPath)} with deployed address.`);
    }
  }

  // Copy ABI to frontend
  const artifactSrc = path.join(__dirname, "../artifacts/contracts/AllowanceGuard.sol/AllowanceGuard.json");
  const frontendArtifactDir = path.join(__dirname, "../../frontend/src/contracts");
  if (fs.existsSync(artifactSrc)) {
    if (!fs.existsSync(frontendArtifactDir)) {
      fs.mkdirSync(frontendArtifactDir, { recursive: true });
    }
    fs.copyFileSync(artifactSrc, path.join(frontendArtifactDir, "AllowanceGuard.json"));
    console.log(" Synced latest ABI to frontend/src/contracts/AllowanceGuard.json");
  }

  console.log("--------------------------------------------------");
  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
