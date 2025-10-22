/**
 * Wallet Provider Setup for FractionalBase dApps
 *
 * Configures Solana wallet adapter with support for:
 * - Phantom
 * - Solflare
 * - Backpack
 * - Ledger
 * - And more...
 */

import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
    children: ReactNode;
    network?: WalletAdapterNetwork;
    endpoint?: string;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({
    children,
    network = WalletAdapterNetwork.Devnet,
    endpoint
}) => {
    // You can also provide a custom RPC endpoint
    const rpcEndpoint = useMemo(() => {
        if (endpoint) return endpoint;

        // Use custom RPC for mainnet for better performance
        if (network === WalletAdapterNetwork.Mainnet) {
            return process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl(network);
        }

        return clusterApiUrl(network);
    }, [network, endpoint]);

    // Configure wallet adapters
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new BackpackWalletAdapter(),
            new LedgerWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={rpcEndpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

/**
 * Network Selector Component
 */
export const NetworkSelector: FC<{
    value: WalletAdapterNetwork;
    onChange: (network: WalletAdapterNetwork) => void;
}> = ({ value, onChange }) => {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as WalletAdapterNetwork)}
            className="network-selector"
        >
            <option value={WalletAdapterNetwork.Mainnet}>Mainnet Beta</option>
            <option value={WalletAdapterNetwork.Devnet}>Devnet</option>
            <option value={WalletAdapterNetwork.Testnet}>Testnet</option>
        </select>
    );
};
