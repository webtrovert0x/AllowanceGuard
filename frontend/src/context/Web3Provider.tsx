"use client";

import React, { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, cookieToInitialState } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bohrTestnet } from "@/config/bohr";

// Project ID from .env.local (mapped safely through next.config)
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "37af4e98e17e490d8ae7817b4dadf3d1";

// Metadata for Reown AppKit
const metadata = {
  name: "AllowanceGuard",
  description: "Token approval checker and revoke utility for Bohr Testnet",
  url: "https://allowanceguard.local",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Wagmi Adapter with Bohr Testnet
export const wagmiAdapter = new WagmiAdapter({
  networks: [bohrTestnet],
  projectId,
  ssr: true,
});

// Initialize Reown AppKit modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [bohrTestnet],
  projectId,
  metadata,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#00f0ff",
    "--w3m-border-radius-master": "12px",
  },
  features: {
    analytics: false,
  },
});

export default function Web3Provider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies?: string | null;
}) {
  const [queryClient] = useState(() => new QueryClient());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = wagmiAdapter.wagmiConfig as any;
  const initialState = cookieToInitialState(config, cookies);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
