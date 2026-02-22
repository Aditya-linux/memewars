'use client';

import * as React from 'react';
import {
    RainbowKitProvider,
    getDefaultWallets,
    connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import {
    argentWallet,
    trustWallet,
    ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

// Monad Testnet Definition
const monadTestnet = {
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Monad',
        symbol: 'MON',
    },
    rpcUrls: {
        public: { http: ['https://testnet-rpc.monad.xyz/'] },
        default: { http: ['https://testnet-rpc.monad.xyz/'] },
    },
    testnet: true,
};

const { chains, publicClient, webSocketPublicClient } = configureChains(
    [monadTestnet],
    [publicProvider()]
);

const projectId = 'c57ca95b47569778a828d19178114f4d'; // Demo ID

const { wallets } = getDefaultWallets({
    appName: 'MemeWars',
    projectId,
    chains,
});

const demoAppInfo = {
    appName: 'MemeWars',
};

const connectors = connectorsForWallets([
    ...wallets,
    {
        groupName: 'Other',
        wallets: [
            argentWallet({ projectId, chains }),
            trustWallet({ projectId, chains }),
            ledgerWallet({ projectId, chains }),
        ],
    },
]);

const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient,
});

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);
    return (
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitProvider chains={chains} appInfo={demoAppInfo}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    {mounted && children}
                </ThemeProvider>
            </RainbowKitProvider>
        </WagmiConfig>
    );
}
