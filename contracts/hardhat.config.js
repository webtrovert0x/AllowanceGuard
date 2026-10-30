require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const rawKey = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.trim() : "";
const formattedKey =
  rawKey && rawKey !== "your_private_key_here"
    ? rawKey.startsWith("0x")
      ? rawKey
      : `0x${rawKey}`
    : null;

const accounts = formattedKey ? [formattedKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    botchain: {
      url: process.env.BOTCHAIN_RPC_URL || "https://rpc.botchain.ai",
      chainId: 677,
      accounts: accounts,
      gasPrice: 20000000000, // 20 Gwei (small, standard gas fee)
    },
    bohr: {
      url: process.env.BOHR_RPC_URL || "https://rpc.bohr.life",
      chainId: 968,
      accounts: accounts,
    },
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      botchain: "botchain",
    },
    customChains: [
      {
        network: "botchain",
        chainId: 677,
        urls: {
          apiURL: "https://scan.botchain.ai/api",
          browserURL: "https://scan.botchain.ai",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};
