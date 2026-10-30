import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_PROJECT_ID:
      process.env.PROJECT_ID ||
      process.env.REOWN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_PROJECT_ID ||
      "d9690df1851903b53a4f8c440127edec",
    NEXT_PUBLIC_RPC_URL:
      process.env.RPC_URL ||
      process.env.NEXT_PUBLIC_RPC_URL ||
      "https://rpc.botchain.ai",
    NEXT_PUBLIC_CHAIN_ID:
      process.env.CHAIN_ID ||
      process.env.NEXT_PUBLIC_CHAIN_ID ||
      "677",
    NEXT_PUBLIC_EXPLORER_URL:
      process.env.EXPLORER_URL ||
      process.env.NEXT_PUBLIC_EXPLORER_URL ||
      "https://scan.botchain.ai",
    NEXT_PUBLIC_CONTRACT_ADDRESS:
      process.env.CONTRACT_ADDRESS ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      "0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF",
  },
};

export default nextConfig;
