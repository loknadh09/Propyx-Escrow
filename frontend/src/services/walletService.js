import { ethers } from "ethers";

export const walletService = {
  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled() {
    return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
  },

  /**
   * Connect to MetaMask and return user's wallet address
   */
  async connectWallet() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("MetaMask is not installed. Please install it from https://metamask.io");
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      
      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      
      // Get network info
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const networkName = await this.getNetworkName(chainId);

      // Subscribe to account changes
      window.ethereum.on("accountsChanged", (newAccounts) => {
        if (newAccounts.length === 0) {
          console.log("MetaMask account disconnected");
        }
      });

      // Subscribe to chain changes
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });

      return {
        address: address,
        chainId: chainId,
        networkName: networkName,
      };
    } catch (error) {
      if (error.code === 4001) {
        throw new Error("User rejected the connection request");
      }
      throw error;
    }
  },

  /**
   * Get current connected account
   */
  async getCurrentAccount() {
    if (!this.isMetaMaskInstalled()) {
      return null;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error("Error getting current account:", error);
      return null;
    }
  },

  /**
   * Get network name from chain ID
   */
  async getNetworkName(chainId) {
    const networks = {
      "0x1": "Ethereum Mainnet",
      "0x5": "Goerli Testnet",
      "0xaa36a7": "Sepolia Testnet",
      "0x38": "BSC Mainnet",
      "0x61": "BSC Testnet",
      "0x89": "Polygon Mainnet",
      "0x13881": "Polygon Mumbai",
      "0x7a69": "Hardhat Local",
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
  },

  /**
   * Sign a message with MetaMask
   */
  async signMessage(message) {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length === 0) {
        throw new Error("No account connected");
      }

      const address = accounts[0];
      const messageHash = ethers.id(message);
      
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      return {
        message: message,
        signature: signature,
        address: address,
      };
    } catch (error) {
      console.error("Error signing message:", error);
      throw error;
    }
  },

  /**
   * Verify a signed message
   */
  verifySignature(message, signature, address) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error("Error verifying signature:", error);
      return false;
    }
  },

  /**
   * Get wallet balance
   */
  async getBalance(address) {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
    }
  },

  /**
   * Switch to a specific network
   */
  async switchNetwork(chainId) {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("MetaMask is not installed");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainId }],
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        console.log("Network not found in MetaMask, please add it manually");
      }
      throw error;
    }
  },
};

export default walletService;
