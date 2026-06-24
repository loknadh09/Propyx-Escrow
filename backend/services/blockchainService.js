const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC || "http://127.0.0.1:8545");

const TX_TIMEOUT_MS = Number(process.env.TX_TIMEOUT_MS || "60000");

const withTimeout = (promise, ms, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const blockchainDir = path.join(__dirname, "..", "..", "blockchain");
const escrowArtifactPath = path.join(blockchainDir, "artifacts", "contracts", "Escrow.sol", "Escrow.json");

const loadEscrowArtifact = () => {
  try {
    if (!fs.existsSync(escrowArtifactPath)) {
      console.log("📋 Compiling Escrow contract...");
      try {
        execSync("npx hardhat compile --force", { cwd: blockchainDir, stdio: "inherit" });
      } catch (compileErr) {
        throw new Error(`Contract compilation failed: ${compileErr.message}`);
      }
    }
    const artifact = require(escrowArtifactPath);
    if (!artifact.abi || !artifact.bytecode) {
      throw new Error("Invalid artifact: missing abi or bytecode");
    }
    return artifact;
  } catch (error) {
    const msg = `Failed to load Escrow artifact: ${error.message}`;
    console.error("❌", msg);
    throw new Error(msg);
  }
};

const getContract = (address, signerOrProvider) => {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(`Invalid contract address: ${address}`);
  }

  const abi = [
    "function deposit() payable",
    "function confirmBuyer()",
    "function confirmSeller()",
    "function refundBuyer()",
    "function buyer() view returns (address)",
    "function seller() view returns (address)",
    "function admin() view returns (address)",
    "function isDeposited() view returns (bool)",
    "function buyerConfirmed() view returns (bool)",
    "function sellerConfirmed() view returns (bool)",
    "function currentState() view returns (uint8)"
  ];
  return new ethers.Contract(address, abi, signerOrProvider);
};

/**
 * Get a Wallet signer from Hardhat local accounts by index.
 * Hardhat provides deterministic accounts via the JsonRpcProvider.
 */
const getSignerByIndex = async (index = 0) => {
  // ethers v6 JsonRpcProvider: getSigner(index) works with Hardhat
  try {
    const signer = await provider.getSigner(index);
    return signer;
  } catch (err) {
    throw new Error(`Cannot get signer at index ${index}: ${err.message}`);
  }
};

/**
 * Try to match a given address to a Hardhat local account by address.
 * If not found, fall back to the given fallback index.
 */
const getSignerByAddress = async (targetAddress, fallbackIndex = 0) => {
  try {
    const accounts = await provider.listAccounts();
    const normalizedTarget = (targetAddress || "").toLowerCase();

    for (let i = 0; i < accounts.length; i++) {
      let addr;
      if (typeof accounts[i] === "string") {
        addr = accounts[i].toLowerCase();
      } else {
        addr = (accounts[i].address || "").toLowerCase();
      }
      if (addr === normalizedTarget) {
        return await provider.getSigner(i);
      }
    }

    // Address not among Hardhat accounts — use fallback index
    console.warn(`⚠️  Address ${targetAddress} not in Hardhat accounts. Using fallback index ${fallbackIndex}.`);
    return await provider.getSigner(fallbackIndex);
  } catch (err) {
    throw new Error(`getSignerByAddress failed: ${err.message}`);
  }
};

/**
 * Deploy the Escrow contract.
 * - admin (account[0]) deploys the contract
 * - buyer is set to account[1] (Hardhat test account used as buyer)
 * - seller wallet is matched from Hardhat accounts if available, else account[2]
 */
const deployContract = async (buyerAddress, sellerAddress, description, amountEth, deadlineSeconds) => {
  try {
    if (typeof amountEth !== "number" && typeof amountEth !== "string") throw new Error("Amount must be a number");
    if (Number(amountEth) <= 0) throw new Error("Amount must be greater than 0");
    if (typeof deadlineSeconds !== "number" || deadlineSeconds <= 0) throw new Error("Deadline must be a positive number");
    if (!description || typeof description !== "string") throw new Error("Description is required");

    const artifact = loadEscrowArtifact();
    const accounts = await provider.listAccounts();

    if (accounts.length === 0) {
      throw new Error("No accounts on blockchain provider. Is Hardhat node running on port 8545?");
    }

    // Account[0] = admin (deploys contract)
    const adminSigner = await provider.getSigner(0);

    // For the escrow contract, use Hardhat account[1] as buyer, account[2] as seller
    // These addresses will be stored and used for on-chain calls
    const hardhatBuyerAddr = typeof accounts[1] === "string" ? accounts[1] : accounts[1].address;
    const hardhatSellerAddr = typeof accounts[2] === "string" ? accounts[2] : (accounts[2]?.address || hardhatBuyerAddr);

    const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, adminSigner);
    const amountWei = ethers.parseEther(amountEth.toString());

    console.log("🚀 Deploying escrow contract...");
    console.log("  buyer  (on-chain):", hardhatBuyerAddr);
    console.log("  seller (on-chain):", hardhatSellerAddr);
    console.log("  amount:", amountEth, "ETH");

    const contract = await contractFactory.deploy(
      hardhatBuyerAddr,
      hardhatSellerAddr,
      description,
      amountWei,
      deadlineSeconds
    );

    await withTimeout(contract.waitForDeployment(), TX_TIMEOUT_MS, "Deployment timed out");
    const contractAddr = await contract.getAddress();

    console.log("✅ Contract deployed at:", contractAddr);

    return {
      contractAddress: contractAddr,
      deployedBuyer: hardhatBuyerAddr,
      deployedSeller: hardhatSellerAddr,
      adminAddress: typeof accounts[0] === "string" ? accounts[0] : accounts[0].address,
      transactionHash: contract.deploymentTransaction()?.hash
    };
  } catch (error) {
    const msg = `Contract deployment failed: ${error.message}`;
    console.error("❌", msg);
    throw new Error(msg);
  }
};

/**
 * Deposit funds into the escrow contract.
 * Auto-funds the buyer Hardhat account to cover any property price (test environment).
 */
const deposit = async (contractAddress, amountEth, buyerAddress) => {
  try {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }
    if (Number(amountEth) <= 0) throw new Error("Deposit amount must be greater than 0");

    // Get buyer signer (Hardhat account[1] or matching address)
    const buyerSigner = await getSignerByAddress(buyerAddress, 1);
    const buyerAddr = await buyerSigner.getAddress();

    // ✅ Auto-fund: set buyer balance to amount + gas buffer (works only on Hardhat/local network)
    const amountWei = ethers.parseEther(amountEth.toString());
    const gasBuffer = ethers.parseEther("10"); // extra 10 ETH for gas
    const requiredBalance = amountWei + gasBuffer;

    // Check current balance
    const currentBalance = await provider.getBalance(buyerAddr);
    if (currentBalance < requiredBalance) {
      console.log(`💡 Funding buyer account ${buyerAddr} with enough ETH for deposit...`);
      // Convert to hex for hardhat_setBalance (must be 0x prefixed hex)
      const newBalanceHex = "0x" + requiredBalance.toString(16);
      try {
        await provider.send("hardhat_setBalance", [buyerAddr, newBalanceHex]);
        console.log(`✅ Buyer funded: ${ethers.formatEther(requiredBalance)} ETH`);
      } catch (fundErr) {
        console.warn("⚠️  hardhat_setBalance failed (might not be Hardhat):", fundErr.message);
        // Try to send ETH from admin account as fallback
        const adminSigner = await provider.getSigner(0);
        const adminBalance = await provider.getBalance(await adminSigner.getAddress());
        if (adminBalance > requiredBalance) {
          const fundTx = await adminSigner.sendTransaction({ to: buyerAddr, value: requiredBalance });
          await fundTx.wait();
          console.log("✅ Buyer funded via admin transfer");
        } else {
          throw new Error(`Cannot fund buyer: admin also has insufficient balance. Admin: ${ethers.formatEther(adminBalance)} ETH`);
        }
      }
    }

    const contract = getContract(contractAddress, buyerSigner);

    console.log(`💰 Depositing ${amountEth} ETH into escrow at ${contractAddress}...`);
    const tx = await contract.deposit({ value: amountWei });
    await withTimeout(tx.wait(), TX_TIMEOUT_MS, "Deposit timed out");

    console.log("✅ Deposit successful. Tx hash:", tx.hash);
    return tx.hash;
  } catch (error) {
    const msg = `Deposit failed: ${error.message}`;
    console.error("❌", msg);
    throw new Error(msg);
  }
};

/**
 * Buyer confirms receipt.
 * Always uses Hardhat account[1] as buyer signer.
 */
const confirmBuyer = async (contractAddress, buyerAddress) => {
  try {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }

    const buyerSigner = await getSignerByAddress(buyerAddress, 1);
    const contract = getContract(contractAddress, buyerSigner);

    console.log("👍 Buyer confirming transaction...");
    const tx = await contract.confirmBuyer();
    await withTimeout(tx.wait(), TX_TIMEOUT_MS, "Buyer confirmation timed out");

    console.log("✅ Buyer confirmed. Tx hash:", tx.hash);
    return tx.hash;
  } catch (error) {
    const msg = `Buyer confirmation failed: ${error.message}`;
    console.error("❌", msg);
    throw new Error(msg);
  }
};

/**
 * Seller confirms fulfillment.
 * Always uses Hardhat account[2] as seller signer.
 */
const confirmSeller = async (contractAddress, sellerAddress) => {
  try {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }

    const sellerSigner = await getSignerByAddress(sellerAddress, 2);
    const contract = getContract(contractAddress, sellerSigner);

    console.log("👍 Seller confirming transaction...");
    const tx = await contract.confirmSeller();
    await withTimeout(tx.wait(), TX_TIMEOUT_MS, "Seller confirmation timed out");

    console.log("✅ Seller confirmed. Tx hash:", tx.hash);
    return tx.hash;
  } catch (error) {
    const msg = `Seller confirmation failed: ${error.message}`;
    console.error("❌", msg);
    throw new Error(msg);
  }
};

/**
 * Admin force-refunds buyer.
 * Uses Hardhat account[0] (admin, who deployed the contract).
 */
const refundBuyer = async (contractAddress, adminAddress) => {
  try {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }

    const adminSigner = await getSignerByAddress(adminAddress, 0);
    const contract = getContract(contractAddress, adminSigner);

    console.log("💸 Processing refund...");
    const tx = await contract.refundBuyer();
    await withTimeout(tx.wait(), TX_TIMEOUT_MS, "Refund timed out");

    console.log("✅ Refund processed. Tx hash:", tx.hash);
    return tx.hash;
  } catch (error) {
    const msg = `Refund failed: ${error.message}`;
    console.error("❌", msg);
    throw new Error(msg);
  }
};

module.exports = {
  deployContract,
  deposit,
  confirmBuyer,
  confirmSeller,
  refundBuyer,
  provider
};