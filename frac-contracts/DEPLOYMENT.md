# FractionalBase Deployment Guide

Complete step-by-step guide for deploying the FractionalBase smart contract suite to Solana.

## Prerequisites

- Solana CLI v1.18+
- Anchor CLI v0.30+
- Node.js v18+
- Sufficient SOL for deployment (varies by network)

## Network Configuration

### Localnet (Development)
```bash
solana config set --url localhost
solana-test-validator
```

### Devnet (Testing)
```bash
solana config set --url devnet
solana airdrop 2
```

### Mainnet-beta (Production)
```bash
solana config set --url mainnet-beta
# Ensure wallet has sufficient SOL (5-10 SOL recommended)
```

## Pre-Deployment Checklist

- [ ] All programs built successfully (`anchor build`)
- [ ] Tests pass (`anchor test`)
- [ ] Security audit completed (mainnet only)
- [ ] Update program IDs in Anchor.toml
- [ ] Prepare deployment wallet (multi-sig recommended for mainnet)
- [ ] Prepare token allocation wallets

## Step-by-Step Deployment

### Phase 1: Deploy All Programs

```bash
# Build all programs
anchor build

# Deploy all programs
anchor deploy

# Verify deployment
solana program show <PROGRAM_ID>
```

**Program Deployment Order:**
1. frac-token
2. staking
3. governance
4. access-control
5. rewards
6. enterprise
7. fractional-ownership
8. bridge

Record all program IDs for initialization.

### Phase 2: Initialize frac-token Program

```bash
# Initialize the $FRAC token mint
anchor run initialize-frac-token
```

**Initialization Parameters:**
- Mint decimals: 9
- Total supply: 1,000,000,000 * 10^9
- Mint authority: Deployer (will be transferred to governance later)

**Expected Distribution:**
- Community Pool: 450,000,000 $FRAC (45%)
- Staking Rewards Pool: 250,000,000 $FRAC (25%)
- Team Vesting: 150,000,000 $FRAC (15%)
- Treasury: 100,000,000 $FRAC (10%)
- Liquidity Pool: 50,000,000 $FRAC (5%)

**Verify:**
```bash
# Check mint account
spl-token display <MINT_ADDRESS>

# Check pool balances
spl-token balance <POOL_TOKEN_ACCOUNT>
```

### Phase 3: Initialize Staking Program

```bash
# Initialize staking program
anchor run initialize-staking
```

**Parameters:**
- Rewards pool: 250M $FRAC token account
- Initial APY rates:
  - Flexible: 5% (500 bps)
  - 30-day: 7% (700 bps)
  - 90-day: 10% (1000 bps)
  - 180-day: 13% (1300 bps)
  - 365-day: 16% (1600 bps)

**Verify:**
```bash
# Query staking config
anchor idl accounts staking StakingConfig
```

### Phase 4: Initialize Governance Program

```bash
# Initialize governance DAO
anchor run initialize-governance
```

**Parameters:**
- Treasury wallet: 100M $FRAC token account
- Min stake to propose: 100,000 $FRAC
- Initial authority: Deployer

**Verify:**
```bash
# Query governance config
anchor idl accounts governance GovernanceConfig
```

### Phase 5: Initialize Access Control

```bash
# Initialize access control
anchor run initialize-access-control
```

**Parameters:**
- Tier thresholds: [0, 5k, 15k, 50k, 150k] $FRAC
- Authority: Governance program

**Create Access Gates:**
```bash
# Create gates for premium features
anchor run create-access-gate --gate-id "premium_vaults" --tier 2
anchor run create-access-gate --gate-id "ultra_premium_vaults" --tier 3
anchor run create-access-gate --gate-id "invitation_only_vaults" --tier 4
```

### Phase 6: Initialize Rewards Program

```bash
# Initialize rewards program
anchor run initialize-rewards
```

**Parameters:**
- Rewards pool: 450M $FRAC token account
- Small reward threshold: 1,000 $FRAC
- Medium reward threshold: 10,000 $FRAC

**Verify:**
```bash
# Query rewards config
anchor idl accounts rewards RewardsConfig
```

### Phase 7: Initialize Enterprise Program

```bash
# Initialize enterprise program
anchor run initialize-enterprise
```

**Parameters:**
- Tier thresholds: [100k, 500k, 1M, 5M] $FRAC
- Duration multipliers: [100, 130, 160, 200] bps
- Authority: Governance program

### Phase 8: Initialize Fractional Ownership

```bash
# Initialize fractional ownership
anchor run initialize-fractional-ownership
```

**Configuration:**
- Vault creation fee: 100 $FRAC
- Trading fee: 0.25% (25 bps)
- Redemption fee: 50 $FRAC

### Phase 9: Initialize Bridge Program

```bash
# Initialize cross-chain bridge
anchor run initialize-bridge
```

**Parameters:**
- Bridge implementation: Wormhole
- Wormhole program ID: [Wormhole mainnet/devnet program]
- Supported chains: Solana, Ethereum, BSC
- Bridge fee: 1 $FRAC

### Phase 10: Transfer Authorities

**CRITICAL: Transfer control from deployer to governance**

```bash
# 1. Transfer frac-token mint authority to governance
anchor run transfer-mint-authority --new-authority <GOVERNANCE_PROGRAM_ID>

# 2. Verify mint authority transfer
spl-token display <MINT_ADDRESS>
# Should show: Mint authority: <GOVERNANCE_PROGRAM_ID>

# 3. Each program's authority should be governance (done during init)
```

### Phase 11: Configure Cross-Program Permissions

```bash
# Whitelist programs for access control checks
anchor run whitelist-program --program-id <FRACTIONAL_OWNERSHIP_ID>
anchor run whitelist-program --program-id <STAKING_ID>

# Whitelist programs for rewards activity recording
anchor run whitelist-rewards-caller --program-id <FRACTIONAL_OWNERSHIP_ID>
anchor run whitelist-rewards-caller --program-id <STAKING_ID>
anchor run whitelist-rewards-caller --program-id <GOVERNANCE_ID>
```

## Post-Deployment Verification

### 1. Token Distribution Check
```bash
# Verify all pool balances
spl-token accounts <MINT_ADDRESS>

# Expected:
# - Community pool: 450M $FRAC
# - Staking rewards pool: 250M $FRAC
# - Team vesting: 150M $FRAC
# - Treasury: 100M $FRAC
# - Liquidity: 50M $FRAC
```

### 2. Authority Verification
```bash
# All programs should have governance as authority
anchor idl accounts staking StakingConfig
anchor idl accounts governance GovernanceConfig
anchor idl accounts access-control AccessControlConfig
anchor idl accounts rewards RewardsConfig
anchor idl accounts enterprise EnterpriseConfig
anchor idl accounts bridge BridgeConfig
```

### 3. Functional Testing

**Test staking:**
```bash
anchor run test-create-stake --amount 1000
anchor run test-claim-rewards
anchor run test-unstake --amount 500
```

**Test vault creation:**
```bash
anchor run test-create-vault --shares 1000000
anchor run test-list-shares --shares 1000 --price 1000
```

**Test governance:**
```bash
anchor run test-create-proposal --type ParameterChange
anchor run test-cast-vote --proposal-id 0 --choice For
```

### 4. Security Checks

- [ ] Mint authority transferred to governance
- [ ] All programs owned by upgrade authority (multi-sig recommended)
- [ ] No deployer-controlled backdoors
- [ ] Emergency pause functions accessible
- [ ] All PDAs derived correctly

## Mainnet-Specific Steps

### Pre-Mainnet

1. **Complete Security Audit**
   - Minimum 2 independent audits
   - Address all critical and high severity issues
   - Document all accepted risks

2. **Set Up Multi-Sig**
   - Create Squads multi-sig wallet
   - Transfer all authorities to multi-sig
   - Test multi-sig operations on devnet

3. **Prepare Treasury**
   - Set up secure cold storage
   - Distribute initial liquidity
   - Prepare team vesting contracts

### Mainnet Deployment

```bash
# 1. Final build
anchor build --verifiable

# 2. Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta --program-keypair <KEYPAIR>

# 3. Initialize all programs (follow Phase 1-9)

# 4. Transfer to multi-sig
# Use multi-sig to control all admin functions

# 5. Announce deployment
# Publish verified program IDs
# Share IDL files
```

### Post-Mainnet

1. **Monitor Programs**
   - Set up monitoring for all programs
   - Track transaction success rates
   - Monitor account sizes and rent

2. **Create Liquidity**
   - Add liquidity to DEXs (Raydium, Orca)
   - Pair with SOL, USDC

3. **Enable Features Gradually**
   - Start with basic staking
   - Enable vault creation after testing
   - Launch governance after community growth

## Rollback Plan

If critical issues discovered:

```bash
# 1. Pause affected programs
anchor run pause-program --program <AFFECTED_PROGRAM>

# 2. Close vulnerable accounts (if possible)

# 3. Deploy fixed version
anchor build
anchor upgrade <PROGRAM_ID> <NEW_PROGRAM_PATH>

# 4. Resume operations
anchor run unpause-program --program <FIXED_PROGRAM>
```

## Troubleshooting

### Deployment Failures

**Error: Insufficient funds**
```bash
# Check balance
solana balance

# Request airdrop (devnet only)
solana airdrop 2
```

**Error: Program account not rent exempt**
```bash
# Increase account size or add more SOL
solana transfer <PROGRAM_ACCOUNT> 1 --allow-unfunded-recipient
```

### Initialization Failures

**Error: Account already initialized**
- Program was already initialized
- Either continue or close and reinitialize (devnet only)

**Error: Mint authority mismatch**
- Ensure deployer wallet is mint authority before transfer
- Check wallet keypair is correct

## Support

For deployment issues:
- GitHub Issues: [Issues Link]
- Discord: [Community Discord]
- Email: support@fractionalbase.com

---

**IMPORTANT:** Never deploy to mainnet without:
1. Complete security audits
2. Comprehensive testing on devnet
3. Multi-sig setup for authorities
4. Emergency response plan
