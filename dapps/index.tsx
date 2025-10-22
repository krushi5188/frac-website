/**
 * FractionalBase dApps - Main Export
 *
 * Import this file to use any dApp component
 */

// Main App
export { default as FractionalBaseApp } from './App';

// Individual dApps
export { StakingDApp } from './staking/StakingDApp';
export { VaultsDApp } from './vaults/VaultsDApp';
export { GovernanceDApp, RewardsDApp, EnterpriseDApp, BridgeDApp } from './AllDApps';

// Wallet Provider
export { WalletContextProvider, NetworkSelector } from './WalletProvider';

// Configuration
export { getProgramIds, getRpcEndpoint, APP_CONFIG } from './config';
export type { ProgramIds } from './config';

// Re-export SDK hooks for convenience
export {
  useSDK,
  useUserBalance,
  useStaking,
  useFractionalOwnership,
  useGovernance,
  useAccessControl,
  useRewards,
  useEnterprise,
  useBridge,
  useStakingConfig,
  useTokenSupply,
} from '../frac-contracts/sdk/hooks';

// Usage Examples:
/*

// 1. Use the complete integrated app
import { FractionalBaseApp } from './dapps';

function MyApp() {
  return <FractionalBaseApp />;
}

// 2. Use individual dApps
import { StakingDApp, VaultsDApp } from './dapps';
import { WalletContextProvider } from './dapps';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

function MyCustomApp() {
  const [network, setNetwork] = useState(WalletAdapterNetwork.Devnet);

  return (
    <WalletContextProvider network={network}>
      <StakingDApp network={network} />
      <VaultsDApp network={network} />
    </WalletContextProvider>
  );
}

// 3. Use SDK hooks directly
import { useStaking, useUserBalance } from './dapps';
import { getProgramIds } from './dapps';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

function MyComponent() {
  const { balance } = useUserBalance();
  const programIds = getProgramIds(WalletAdapterNetwork.Devnet);
  const { stakes, createStake } = useStaking(programIds);

  return (
    <div>
      <p>Balance: {balance} $FRAC</p>
      <button onClick={() => createStake(1000, {flexible: {}}, 0)}>
        Stake 1000 $FRAC
      </button>
    </div>
  );
}

*/
