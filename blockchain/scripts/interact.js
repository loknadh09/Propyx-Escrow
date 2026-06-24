const hre = require("hardhat");

async function main() {
  const [buyer, seller, inspector] = await hre.ethers.getSigners();

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.attach(contractAddress);

  // Buyer deposits ETH
  await escrow.connect(buyer).deposit({ value: hre.ethers.utils.parseEther("1") });
  console.log("💰 Deposit done");

  // Inspector approves
  await escrow.connect(inspector).approve();
  console.log("✅ Approved");

  // Release funds
  await escrow.releaseFunds();
  console.log("🚀 Funds released");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});