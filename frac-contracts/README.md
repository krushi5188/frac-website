# FractionalBase Solana Smart Contracts

Complete smart contract suite for the FractionalBase fractional asset ownership platform on Solana blockchain.

## Overview

FractionalBase enables fractional ownership of real-world assets (real estate, art, commodities) and digital assets (NFTs, IP, metaverse assets) through 8 interconnected Solana programs built with Anchor Framework.

**Total Supply:** 1,000,000,000 $FRAC tokens (capped)
**Blockchain:** Solana
**Framework:** Anchor v0.30+

## Programs

### 1. **frac-token** - $FRAC SPL Token
- SPL Token implementation with 1B fixed supply
- 9 decimals (Solana standard)
- Initial distribution: Community (45%), Staking Rewards (25%), Team (15%), Treasury (10%), Liquidity (5%)
- Mint authority transferable to governance

**Key Instructions:**
- `initialize_token` - Mint 1B tokens and distribute to allocation pools
- `transfer_mint_authority` - Transfer mint control to governance

### 2. **fractional-ownership** - Asset Fractionalization
- Fractionalize NFTs and RWAs into tradeable shares
- On-chain order book for share trading (limit orders)
- All transactions denominated in $FRAC
- 100% share accumulation allows asset redemption

**Key Instructions:**
- `create_vault` - Lock asset and create fractional shares
- `list_shares_for_sale` - Create sell order
- `buy_shares` - Purchase shares with $FRAC
- `redeem_asset` - Redeem underlying asset with 100% shares
- `update_valuation` - Update asset valuation (oracle/admin)

**Fees:**
- Vault creation: 100 $FRAC
- Trading fee: 0.25% (goes to rewards pool)
- Redemption: 50 $FRAC

### 3. **staking** - Dual Staking System
- Flexible staking (no lock, 5% APY)
- Fixed-term staking (30/90/180/365 days with 7%/10%/13%/16% APY)
- Per-second reward accrual
- Priority tier system (0-3) based on stake amount
- 10% early unstaking penalty for fixed-term

**Key Instructions:**
- `initialize_staking` - Initialize with 250M token rewards pool
- `create_stake` - Stake tokens (flexible or fixed-term)
- `claim_rewards` - Claim accumulated rewards
- `unstake` - Unstake tokens (penalty if early)
- `update_apy_rates` - Update APY rates (governance only)
- `get_user_priority_tier` - Query user's priority tier

**Priority Tiers:**
- Tier 0: < 1,000 $FRAC
- Tier 1: 1,000 - 9,999 $FRAC (24hr early access)
- Tier 2: 10,000 - 99,999 $FRAC (48hr early access, 0.20% fees)
- Tier 3: 100,000+ $FRAC (72hr early access, 0.15% fees, premium vaults)

### 4. **governance** - DAO Voting
- Snapshot-based voting from staked tokens
- 4 proposal types with tiered durations and quorum requirements
- 24-hour timelock after voting ends
- Executable actions via CPI to other programs

**Proposal Types:**
- Emergency (2 days, 10% quorum)
- Parameter Change (5 days, 15% quorum)
- Treasury Spending (7 days, 20% quorum)
- Protocol Upgrade (14 days, 25% quorum)

**Key Instructions:**
- `initialize_governance` - Initialize DAO
- `create_proposal` - Create proposal (requires 100k staked)
- `cast_vote` - Vote for/against/abstain
- `finalize_proposal` - Finalize after voting ends
- `execute_proposal` - Execute passed proposal (after timelock)
- `cancel_proposal` - Cancel proposal (proposer or admin)

### 5. **access-control** - Token-Gated Access
- Tiered access based on holdings + (2x staked)
- 5 tiers: Public (0), Bronze (5k), Silver (15k), Gold (50k), Platinum (150k)
- 5-minute access score caching
- Whitelist/blacklist per gate

**Key Instructions:**
- `initialize_access_control` - Initialize program
- `create_access_gate` - Create new access gate
- `check_access` - Verify user access (called by other programs)
- `get_user_tier` - Query user's tier and progress
- `add_to_whitelist/blacklist` - Manually grant/revoke access
- `update_tier_thresholds` - Update tier requirements (governance)

### 6. **rewards** - Rewards Distribution
- 450M token rewards pool
- Tiered vesting: Immediate (<1k), Linear (1k-10k), Milestone 3-year (>10k)
- 7 reward categories: Trading, Liquidity, Referrals, Governance, Vaults, Airdrops, Grants
- Milestone-based unlocking for large rewards

**Milestone System:**
- Year 1 (10%): 2 of 4 milestones (365 days + activity)
- Year 2 (30%): 3 of 5 milestones (730 days + activity)
- Year 3 (60%): 3 of 6 milestones (1095 days + activity)

**Key Instructions:**
- `initialize_rewards` - Initialize with 450M tokens
- `grant_reward` - Create reward grant
- `claim_reward` - Claim vested rewards
- `record_activity` - Track user activity for milestones
- `unlock_milestone_stage` - Unlock next stage when requirements met
- `create_referral_code` - Generate referral code

### 7. **enterprise** - Business Collateral
- Lock $FRAC as collateral for commercial benefits
- 4 tiers: Starter (100k), Business (500k), Enterprise (1M), Institutional (5M)
- Lock duration multipliers: 0mo (1.0x), 6mo (1.3x), 12mo (1.6x), 24mo (2.0x)
- Benefits: Fee discounts, featured listings, reward multipliers

**Benefits:**
- Vault creation discounts (25% to 100% waived)
- Trading fee reductions (0.20% to 0.05%)
- Featured vault slots (1 to unlimited)
- Reward multipliers (1.1x to 4.0x with duration)

**Key Instructions:**
- `initialize_enterprise` - Initialize program
- `register_enterprise` - Register and deposit collateral
- `add_collateral` - Increase collateral (may upgrade tier)
- `initiate_withdrawal` - Start withdrawal process (7-day delay)
- `complete_withdrawal` - Complete withdrawal after delay
- `get_enterprise_discount` - Query enterprise benefits

### 8. **bridge** - Cross-Chain Bridge
- Wormhole integration for $FRAC cross-chain transfers
- Supported chains: Solana, Ethereum, BSC
- V1: Token bridging only (shares remain on Solana)
- V2-ready architecture for custom bridge migration

**Limits:**
- Min: 10 $FRAC per transfer
- Max: 1M $FRAC per transfer
- Fee: 1 $FRAC

**Key Instructions:**
- `initialize_bridge` - Initialize with Wormhole
- `bridge_tokens_out` - Bridge $FRAC to another chain
- `complete_transfer_in` - Complete inbound bridge transfer
- `get_bridge_status` - Query transfer status
- `pause_bridge` - Emergency pause
- `migrate_to_custom_bridge` - Switch to custom bridge (V2)

## Cross-Program Architecture

Programs interact via Cross-Program Invocations (CPIs):

- **Fractional Ownership** → Rewards (trading fees), Access Control (gate checks)
- **Staking** → Rewards (penalties), Access Control (tier queries)
- **Governance** → All programs (parameter updates), Staking (voting power)
- **Rewards** → All programs (activity recording)
- **Enterprise** → Fractional Ownership (fee discounts), Rewards (multipliers)

## Development Setup

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Verify installations
rustc --version
solana --version
anchor --version
```

### Build

```bash
cd fractionalbase-contracts

# Build all programs
anchor build

# Build specific program
anchor build -p frac-token
```

### Test

```bash
# Run tests (requires localnet)
anchor test

# Run tests with logs
anchor test -- --features debug
```

### Deploy

#### Localnet (Development)

```bash
# Start local validator
solana-test-validator

# Deploy
anchor deploy
```

#### Devnet (Testing)

```bash
# Configure devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

#### Mainnet-beta (Production)

```bash
# Configure mainnet
solana config set --url mainnet-beta

# Deploy (requires sufficient SOL)
anchor deploy --provider.cluster mainnet-beta
```

## Deployment Sequence

Programs must be deployed and initialized in this order:

1. **frac-token** - Deploy and initialize (mint 1B tokens)
2. **staking** - Deploy and initialize (transfer 250M tokens)
3. **governance** - Deploy and initialize (transfer 100M to treasury)
4. **access-control** - Deploy and initialize
5. **rewards** - Deploy and initialize (transfer 450M tokens)
6. **enterprise** - Deploy and initialize
7. **fractional-ownership** - Deploy and initialize
8. **bridge** - Deploy and initialize

After deployment:
- Transfer mint authority from deployer to governance program
- Update program IDs in Anchor.toml
- Update cross-program dependencies

## Security Considerations

### Auditing
- All programs should be audited before mainnet deployment
- Recommend at least 2 independent security audits
- Focus areas: CPI security, account validation, arithmetic operations

### Access Control
- Governance program controls most admin functions
- Multi-sig recommended for initial deployer wallet
- Emergency pause mechanisms in critical programs

### Testing
- Comprehensive unit tests for each program
- Integration tests for cross-program interactions
- Fuzz testing for arithmetic operations
- Mainnet simulation with realistic data

## Token Economics

**Total Supply:** 1,000,000,000 $FRAC

**Distribution:**
- Community & Ecosystem: 450M (45%)
- Staking Rewards: 250M (25%)
- Team & Advisors: 150M (15%) - 24-month linear vest
- Treasury/DAO: 100M (10%)
- Initial Liquidity: 50M (5%)

**Circulating Supply Management:**
- Staking locks tokens (priority access incentive)
- Enterprise collateral locks tokens (commercial benefits)
- 3-year vesting for large rewards (prevents dumps)
- Trading fees create buy pressure

## License

Proprietary - All Rights Reserved

## Support

- Documentation: [Link to docs]
- Issues: [GitHub Issues]
- Discord: [Community Discord]

---

Built with ⚡ on Solana using Anchor Framework
