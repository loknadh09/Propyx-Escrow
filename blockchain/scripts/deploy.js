const hre = require("hardhat");

async function main() {
  const [buyer, seller, inspector] = await hre.ethers.getSigners();

  const Escrow = await hre.ethers.getContractFactory("Escrow");

  const escrow = await Escrow.deploy(seller.address, inspector.address);

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();

  console.log("Escrow deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});