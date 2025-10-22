# FractionalBase TypeScript SDK

Complete TypeScript SDK for interacting with FractionalBase Solana smart contracts.

## Installation

```bash
npm install @fractionalbase/sdk
# or
yarn add @fractionalbase/sdk
```

## Quick Start

### Initialize SDK

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { FractionalBaseSDK } from "@fractionalbase/sdk";

// Program IDs (update with your deployed program addresses)
const programIds = {
  fracToken: new PublicKey("..."),
  staking: new PublicKey("..."),
  fractionalOwnership: new PublicKey("..."),
  governance: new PublicKey("..."),
  accessControl: new PublicKey("..."),
  rewards: new PublicKey("..."),
  enterprise: new PublicKey("..."),
  bridge: new PublicKey("..."),
};

// Create SDK instance
const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = useWallet();

const sdk = new FractionalBaseSDK(connection, wallet, programIds);
```

## React Hooks

### useUserBalance

Get user's $FRAC token balance with automatic updates.

```tsx
import { useUserBalance } from "@fractionalbase/sdk/hooks";

function BalanceDisplay() {
  const { balance, loading, error, refresh } = useUserBalance();

  return (
    <div>
      {loading ? "Loading..." : `${balance.toLocaleString()} $FRAC`}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### useStaking

Complete staking interface with create, claim, and unstake operations.

```tsx
import { useStaking } from "@fractionalbase/sdk/hooks";

function StakingDashboard({ programIds }) {
  const { stakes, loading, createStake, claimRewards, unstake } = useStaking(programIds);

  const handleStake = async () => {
    const amount = 1000; // 1000 $FRAC
    const stakeType = { flexible: {} };
    const lockDuration = 0; // Flexible staking

    try {
      const signature = await createStake(amount, stakeType, lockDuration);
      console.log("Stake created:", signature);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <button onClick={handleStake}>Stake Tokens</button>
      {stakes.map((stake) => (
        <div key={stake.publicKey}>
          <p>Amount: {stake.amount / 1e9} $FRAC</p>
          <p>APY: {stake.apyRate / 100}%</p>
          <button onClick={() => claimRewards(stake.publicKey)}>Claim Rewards</button>
        </div>
      ))}
    </div>
  );
}
```

### useFractionalOwnership

Create vaults, list shares, and trade on the order book.

```tsx
import { useFractionalOwnership } from "@fractionalbase/sdk/hooks";

function VaultTrading({ programIds, vaultId }) {
  const { createVault, listShares, buyShares, getOrderBook } = useFractionalOwnership(programIds);

  const handleCreateVault = async () => {
    const result = await createVault({
      assetType: { nft: {} },
      totalShares: 1_000_000,
      valuationUsd: 100_000,
      metadataUri: "ipfs://QmExample...",
    });
    console.log("Vault created:", result.vaultId);
  };

  const handleListShares = async () => {
    const signature = await listShares(
      vaultId,
      10_000, // shares
      1.5 // price per share in $FRAC
    );
    console.log("Shares listed:", signature);
  };

  return (
    <div>
      <button onClick={handleCreateVault}>Create Vault</button>
      <button onClick={handleListShares}>List Shares</button>
    </div>
  );
}
```

### useGovernance

Create proposals, vote, and manage DAO governance.

```tsx
import { useGovernance } from "@fractionalbase/sdk/hooks";

function GovernanceDashboard({ programIds }) {
  const { proposals, votingPower, createProposal, castVote } = useGovernance(programIds);

  const handleCreateProposal = async () => {
    const result = await createProposal({
      proposalType: { parameterChange: {} },
      title: "Update Staking APY Rates",
      description: "Increase 365-day staking APY from 16% to 18%",
      targetProgram: programIds.staking,
      instructionData: Buffer.from([]), // CPI instruction
    });
    console.log("Proposal created:", result.proposalId);
  };

  const handleVote = async (proposalId: number) => {
    const signature = await castVote(proposalId, { approve: {} });
    console.log("Vote cast:", signature);
  };

  return (
    <div>
      <p>Your Voting Power: {votingPower.toLocaleString()} $FRAC</p>
      <button onClick={handleCreateProposal}>Create Proposal</button>
      {proposals.map((proposal) => (
        <div key={proposal.proposalId}>
          <h3>{proposal.title}</h3>
          <p>{proposal.description}</p>
          <button onClick={() => handleVote(proposal.proposalId)}>Vote Yes</button>
        </div>
      ))}
    </div>
  );
}
```

### useAccessControl

Check user's access tier and permissions.

```tsx
import { useAccessControl } from "@fractionalbase/sdk/hooks";

function TierDisplay({ programIds }) {
  const { tier, loading, checkAccess } = useAccessControl(programIds);

  const handleCheckAccess = async () => {
    const hasAccess = await checkAccess("premium_vaults");
    if (hasAccess) {
      console.log("User has access to premium vaults");
    } else {
      console.log("Access denied - upgrade tier");
    }
  };

  return (
    <div>
      {tier && (
        <div>
          <p>Tier: {tier.tierName}</p>
          <p>Access Score: {tier.accessScore.toLocaleString()}</p>
        </div>
      )}
      <button onClick={handleCheckAccess}>Check Premium Access</button>
    </div>
  );
}
```

### useRewards

Manage reward grants and milestone unlocking.

```tsx
import { useRewards } from "@fractionalbase/sdk/hooks";

function RewardsDashboard({ programIds }) {
  const { grants, milestoneProgress, claimRewards, unlockMilestone } = useRewards(programIds);

  const handleClaimRewards = async (grantId: number) => {
    const signature = await claimRewards(grantId);
    console.log("Rewards claimed:", signature);
  };

  const handleUnlockStage = async (grantId: number, stage: number) => {
    const signature = await unlockMilestone(grantId, stage);
    console.log("Milestone unlocked:", signature);
  };

  return (
    <div>
      {milestoneProgress && (
        <div>
          <p>Trading Volume: {milestoneProgress.tradingVolume} $FRAC</p>
          <p>Staking Days: {milestoneProgress.stakingDays}</p>
          <p>Proposals Voted: {milestoneProgress.proposalsVoted}</p>
        </div>
      )}
      {grants.map((grant) => (
        <div key={grant.grantId}>
          <p>Total: {grant.totalAmount / 1e9} $FRAC</p>
          <p>Unlocked: {grant.unlockedAmount / 1e9} $FRAC</p>
          <button onClick={() => handleClaimRewards(grant.grantId)}>Claim</button>
        </div>
      ))}
    </div>
  );
}
```

### useEnterprise

Register and manage enterprise accounts.

```tsx
import { useEnterprise } from "@fractionalbase/sdk/hooks";

function EnterpriseDashboard({ programIds }) {
  const { enterprise, registerEnterprise, addCollateral } = useEnterprise(programIds);

  const handleRegister = async () => {
    const signature = await registerEnterprise(
      1_000_000, // 1M $FRAC collateral
      12 // 12-month lock
    );
    console.log("Enterprise registered:", signature);
  };

  const handleAddCollateral = async () => {
    const signature = await addCollateral(100_000); // Add 100k $FRAC
    console.log("Collateral added:", signature);
  };

  return (
    <div>
      {enterprise && (
        <div>
          <p>Tier: {enterprise.tier}</p>
          <p>Collateral: {enterprise.collateralAmount / 1e9} $FRAC</p>
          <p>Vault Discount: {enterprise.vaultDiscountBps / 100}%</p>
          <p>Trading Discount: {enterprise.tradingDiscountBps / 100}%</p>
        </div>
      )}
      <button onClick={handleRegister}>Register Enterprise</button>
      <button onClick={handleAddCollateral}>Add Collateral</button>
    </div>
  );
}
```

### useBridge

Bridge tokens across chains.

```tsx
import { useBridge } from "@fractionalbase/sdk/hooks";

function BridgeInterface({ programIds }) {
  const { bridgeOut, getTransferStatus } = useBridge(programIds);

  const handleBridge = async () => {
    const result = await bridgeOut({
      amount: 1000, // 1000 $FRAC
      targetChain: 2, // Ethereum
      recipientAddress: "0x1234567890abcdef1234567890abcdef12345678",
    });
    console.log("Transfer initiated:", result.transferNonce);
  };

  const handleCheckStatus = async (nonce: number) => {
    const status = await getTransferStatus(nonce);
    console.log("Status:", status.status);
  };

  return (
    <div>
      <button onClick={handleBridge}>Bridge to Ethereum</button>
    </div>
  );
}
```

## Direct SDK Usage (Without Hooks)

For non-React applications or more control:

```typescript
import { FractionalBaseSDK } from "@fractionalbase/sdk";

const sdk = new FractionalBaseSDK(connection, wallet, programIds);

// Get user balance
const balance = await sdk.getUserBalance(wallet.publicKey);

// Create stake
const signature = await sdk.staking.createStake(
  1000, // amount
  { flexible: {} }, // stake type
  0 // lock duration
);

// Create vault
const result = await sdk.fractionalOwnership.createVault({
  assetType: { nft: {} },
  totalShares: 1_000_000,
  valuationUsd: 100_000,
  metadataUri: "ipfs://QmExample...",
});

// Create proposal
const proposal = await sdk.governance.createProposal({
  proposalType: { emergency: {} },
  title: "Pause Trading",
  description: "Emergency pause due to exploit",
  targetProgram: programIds.fractionalOwnership,
  instructionData: Buffer.from([]),
});

// Check access tier
const tier = await sdk.accessControl.getUserTier(wallet.publicKey);
console.log("User tier:", tier.tierName);

// Claim rewards
const rewardSig = await sdk.rewards.claimRewards(grantId);

// Register enterprise
const enterpriseSig = await sdk.enterprise.registerEnterprise(1_000_000, 12);

// Bridge tokens
const bridgeResult = await sdk.bridge.bridgeOut({
  amount: 1000,
  targetChain: 2,
  recipientAddress: "0x...",
});
```

## Complete Examples

Check the `/examples` directory for complete UI components:

- `StakingComponent.tsx` - Full staking interface with APY display and rewards
- `VaultTradingComponent.tsx` - Vault creation and order book trading
- `GovernanceComponent.tsx` - Proposal creation and voting
- `RewardsComponent.tsx` - Milestone tracking and reward claims

## Types

The SDK exports all TypeScript types from the Anchor IDLs:

```typescript
import {
  StakeAccount,
  AssetVault,
  Proposal,
  RewardGrant,
  EnterpriseAccount,
} from "@fractionalbase/sdk";
```

## Constants

```typescript
// Stake types
import { StakingModule } from "@fractionalbase/sdk";
const FLEXIBLE = StakingModule.StakeType.Flexible;
const FIXED_TERM = StakingModule.StakeType.FixedTerm;

// Asset types
import { FractionalOwnershipModule } from "@fractionalbase/sdk";
const NFT = FractionalOwnershipModule.AssetType.NFT;
const REAL_ESTATE = FractionalOwnershipModule.AssetType.RealEstate;

// Proposal types
import { GovernanceModule } from "@fractionalbase/sdk";
const EMERGENCY = GovernanceModule.ProposalType.Emergency;
const PARAMETER_CHANGE = GovernanceModule.ProposalType.ParameterChange;

// Access tiers
import { AccessControlModule } from "@fractionalbase/sdk";
const PLATINUM = AccessControlModule.Tier.Platinum;

// Chains
import { BridgeModule } from "@fractionalbase/sdk";
const ETHEREUM = BridgeModule.Chain.Ethereum;
const BSC = BridgeModule.Chain.BSC;
```

## Error Handling

```typescript
try {
  await sdk.staking.createStake(amount, stakeType, duration);
} catch (error) {
  if (error.message.includes("StakeAmountTooLow")) {
    console.error("Minimum stake is 100 $FRAC");
  } else if (error.message.includes("InsufficientBalance")) {
    console.error("Not enough $FRAC tokens");
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Network Configuration

```typescript
// Devnet
const connection = new Connection("https://api.devnet.solana.com");

// Mainnet
const connection = new Connection("https://api.mainnet-beta.solana.com");

// Custom RPC
const connection = new Connection("https://your-rpc-endpoint.com");
```

## Wallet Integration

Compatible with all Solana wallet adapters:

```tsx
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

function App() {
  return (
    <div>
      <WalletMultiButton />
      {/* Your components */}
    </div>
  );
}
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and guidelines.

## License

MIT

## Support

- Documentation: https://docs.fractionalbase.com
- Discord: https://discord.gg/fractionalbase
- Twitter: @fractionalbase
- GitHub: https://github.com/fractionalbase/frac-contracts
