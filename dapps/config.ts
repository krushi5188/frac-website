/**
 * FractionalBase Configuration
 *
 * Contains all program IDs and configuration for different networks
 */

import { PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export interface ProgramIds {
  fracToken: PublicKey;
  staking: PublicKey;
  fractionalOwnership: PublicKey;
  governance: PublicKey;
  accessControl: PublicKey;
  rewards: PublicKey;
  enterprise: PublicKey;
  bridge: PublicKey;
}

// Localnet Program IDs (update after deployment)
const LOCALNET_PROGRAM_IDS: ProgramIds = {
  fracToken: new PublicKey('FracToKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  staking: new PublicKey('STAKingxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  fractionalOwnership: new PublicKey('FRACownxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  governance: new PublicKey('GovernCExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  accessControl: new PublicKey('ACCESSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  rewards: new PublicKey('REWARDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  enterprise: new PublicKey('ENTERprxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  bridge: new PublicKey('BRIDGExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
};

// Devnet Program IDs (update after deployment)
const DEVNET_PROGRAM_IDS: ProgramIds = {
  fracToken: new PublicKey('FracToKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  staking: new PublicKey('STAKingxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  fractionalOwnership: new PublicKey('FRACownxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  governance: new PublicKey('GovernCExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  accessControl: new PublicKey('ACCESSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  rewards: new PublicKey('REWARDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  enterprise: new PublicKey('ENTERprxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  bridge: new PublicKey('BRIDGExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
};

// Mainnet Program IDs (update after mainnet deployment)
const MAINNET_PROGRAM_IDS: ProgramIds = {
  fracToken: new PublicKey('FracToKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  staking: new PublicKey('STAKingxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  fractionalOwnership: new PublicKey('FRACownxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  governance: new PublicKey('GovernCExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  accessControl: new PublicKey('ACCESSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  rewards: new PublicKey('REWARDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  enterprise: new PublicKey('ENTERprxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  bridge: new PublicKey('BRIDGExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
};

/**
 * Get program IDs for specific network
 */
export const getProgramIds = (network: WalletAdapterNetwork): ProgramIds => {
  switch (network) {
    case WalletAdapterNetwork.Mainnet:
      return MAINNET_PROGRAM_IDS;
    case WalletAdapterNetwork.Devnet:
      return DEVNET_PROGRAM_IDS;
    case WalletAdapterNetwork.Testnet:
      return DEVNET_PROGRAM_IDS; // Use devnet for testnet
    default:
      return LOCALNET_PROGRAM_IDS;
  }
};

/**
 * Get RPC endpoint for network
 */
export const getRpcEndpoint = (network: WalletAdapterNetwork): string => {
  // Use custom RPC endpoints for better performance
  const customEndpoints = {
    [WalletAdapterNetwork.Mainnet]: process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
    [WalletAdapterNetwork.Devnet]: process.env.NEXT_PUBLIC_DEVNET_RPC || clusterApiUrl(WalletAdapterNetwork.Devnet),
    [WalletAdapterNetwork.Testnet]: clusterApiUrl(WalletAdapterNetwork.Testnet),
  };

  return customEndpoints[network] || clusterApiUrl(network);
};

/**
 * Application configuration
 */
export const APP_CONFIG = {
  name: 'FractionalBase',
  description: 'Fractional Asset Ownership on Solana',
  url: 'https://fractionalbase.com',
  logo: '/logo.svg',

  // Token configuration
  token: {
    name: 'FRAC',
    symbol: '$FRAC',
    decimals: 9,
    totalSupply: 1_000_000_000,
  },

  // Staking configuration
  staking: {
    minStake: 100,
    apyRates: {
      flexible: 5.0,
      fixed30: 7.0,
      fixed90: 10.0,
      fixed180: 13.0,
      fixed365: 16.0,
    },
    earlyUnstakePenalty: 10, // 10%
  },

  // Vault configuration
  vault: {
    creationFee: 100,
    tradingFee: 0.25, // 0.25%
    minShares: 1000,
  },

  // Governance configuration
  governance: {
    minStakeToPropose: 100_000,
    timelockDelay: 86400, // 24 hours
    proposalTypes: {
      emergency: { duration: 2, quorum: 10 },
      parameterChange: { duration: 5, quorum: 15 },
      treasurySpending: { duration: 7, quorum: 20 },
      protocolUpgrade: { duration: 14, quorum: 25 },
    },
  },

  // Access tiers
  accessTiers: [
    { tier: 0, name: 'Public', threshold: 0 },
    { tier: 1, name: 'Bronze', threshold: 5_000 },
    { tier: 2, name: 'Silver', threshold: 15_000 },
    { tier: 3, name: 'Gold', threshold: 50_000 },
    { tier: 4, name: 'Platinum', threshold: 150_000 },
  ],

  // Enterprise tiers
  enterpriseTiers: [
    { tier: 1, name: 'Starter', collateral: 100_000 },
    { tier: 2, name: 'Business', collateral: 500_000 },
    { tier: 3, name: 'Enterprise', collateral: 1_000_000 },
    { tier: 4, name: 'Institutional', collateral: 5_000_000 },
  ],

  // Bridge configuration
  bridge: {
    minAmount: 10,
    maxAmount: 1_000_000,
    fee: 1,
    supportedChains: [
      { chainId: 1, name: 'Solana' },
      { chainId: 2, name: 'Ethereum' },
      { chainId: 4, name: 'BSC' },
    ],
  },

  // Social links
  social: {
    twitter: 'https://twitter.com/fractionalbase',
    discord: 'https://discord.gg/fractionalbase',
    github: 'https://github.com/fractionalbase',
    docs: 'https://docs.fractionalbase.com',
  },
};
