import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Allows user to define PROJECT_ID in .env.local without exposing 'NEXT_PUBLIC_' prefix in the file
    NEXT_PUBLIC_PROJECT_ID: process.env.PROJECT_ID || process.env.REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_PROJECT_ID || "",
    NEXT_PUBLIC_RPC_URL: process.env.RPC_URL || "https://rpc.bohr.life",
    NEXT_PUBLIC_CHAIN_ID: process.env.CHAIN_ID || "968",
    NEXT_PUBLIC_EXPLORER_URL: process.env.EXPLORER_URL || "https://scan.bohr.life",
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || "",
  },
};

export default nextConfig;
