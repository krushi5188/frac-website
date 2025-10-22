# FractionalBase Smart Contracts - Development Setup Guide

Complete guide to set up your development environment, build, test, and deploy the FractionalBase Solana smart contracts.

## Prerequisites

### System Requirements
- **OS**: Linux, macOS, or Windows (WSL2 recommended)
- **RAM**: Minimum 8GB, 16GB+ recommended
- **Disk**: 20GB+ free space
- **CPU**: Multi-core processor recommended

### Required Software

1. **Rust** (v1.75+)
2. **Solana CLI** (v1.18+)
3. **Anchor Framework** (v0.30+)
4. **Node.js** (v18+)
5. **Yarn** or **npm**
6. **Git**

---

## Installation Steps

### 1. Install Rust

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Configure current shell
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### 2. Install Solana CLI

```bash
# Install Solana CLI tools
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version

# Configure CLI for localnet (development)
solana config set --url localhost

# For devnet testing
# solana config set --url devnet

# For mainnet (production)
# solana config set --url mainnet-beta
```

### 3. Install Anchor Framework

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor version
avm install latest
avm use latest

# Verify installation
anchor --version
# Should output: anchor-cli 0.30.1 (or later)
```

### 4. Install Node.js Dependencies

```bash
# Navigate to frac-contracts directory
cd frac-contracts

# Install dependencies
npm install
# or
yarn install
```

### 5. Generate Keypair (for local testing)

```bash
# Generate a new keypair
solana-keygen new

# Check your address
solana address

# Check balance
solana balance
```

---

## Project Structure

```
frac-contracts/
├── programs/                   # Smart contract programs
│   ├── frac-token/            # SPL token (1B supply)
│   ├── fractional-ownership/  # Asset fractionalization
│   ├── staking/              # Dual staking system
│   ├── governance/           # DAO voting
│   ├── access-control/       # Token-gated access
│   ├── rewards/              # Rewards distribution
│   ├── enterprise/           # Business collateral
│   └── bridge/               # Cross-chain bridge
├── tests/                    # Test files
│   ├── frac-token.ts
│   ├── staking.ts
│   ├── fractional-ownership.ts
│   ├── governance.ts
│   └── integration.ts        # Cross-program tests
├── scripts/                  # Deployment scripts
│   └── deploy.ts            # Main deployment script
├── Anchor.toml              # Anchor configuration
├── Cargo.toml               # Rust workspace
└── package.json             # Node dependencies
```

---

## Building the Contracts

### Build All Programs

```bash
# Build all 8 programs
anchor build

# This will:
# 1. Compile all Rust programs
# 2. Generate IDL files
# 3. Create program binaries (.so files)
# 4. Output to target/ directory
```

**Build artifacts:**
- `target/deploy/*.so` - Program binaries
- `target/idl/*.json` - Interface Definition Language files
- `target/types/*.ts` - TypeScript type definitions

### Build Individual Program

```bash
# Build specific program
anchor build -p frac-token
anchor build -p staking
anchor build -p governance
# etc.
```

### Common Build Issues

**Issue**: "error: linker `cc` not found"
```bash
# Solution: Install build essentials
# Ubuntu/Debian:
sudo apt-get install build-essential

# macOS:
xcode-select --install
```

**Issue**: "Anchor.toml not found"
```bash
# Solution: Ensure you're in the frac-contracts directory
cd frac-contracts
```

**Issue**: Compilation takes too long
```bash
# Solution: Use parallel compilation
CARGO_BUILD_JOBS=8 anchor build
```

---

## Running Tests

### Start Local Validator

```bash
# In a separate terminal, start local validator
solana-test-validator

# Check it's running
solana cluster-version
```

### Run All Tests

```bash
# Run complete test suite
anchor test

# This will:
# 1. Build all programs
# 2. Start local validator
# 3. Deploy programs
# 4. Run all tests
# 5. Clean up
```

### Run Specific Tests

```bash
# Test frac-token only
anchor test --skip-local-validator tests/frac-token.ts

# Test staking only
anchor test --skip-local-validator tests/staking.ts

# Test cross-program interactions
anchor test --skip-local-validator tests/integration.ts
```

### Run Tests with Logs

```bash
# See detailed logs
anchor test -- --features "debug"

# Or
RUST_LOG=debug anchor test
```

### Test Coverage

```bash
# Install tarpaulin (Rust code coverage)
cargo install cargo-tarpaulin

# Run coverage
cargo tarpaulin --workspace --timeout 300
```

---

## Deployment

### Localnet (Development)

```bash
# 1. Start local validator
solana-test-validator

# 2. Airdrop SOL for deployment
solana airdrop 10

# 3. Deploy all programs
anchor deploy

# 4. Run initialization script
npm run deploy:localnet
# or
ts-node scripts/deploy.ts
```

### Devnet (Testing)

```bash
# 1. Switch to devnet
solana config set --url devnet

# 2. Airdrop SOL (limited on devnet)
solana airdrop 2

# 3. Deploy programs
anchor deploy --provider.cluster devnet

# 4. Run initialization
npm run deploy:devnet
```

**Note**: Devnet airdrops are rate-limited. For more SOL:
- Use [Solana Faucet](https://faucet.solana.com/)
- Or use [QuickNode Faucet](https://faucet.quicknode.com/solana/devnet)

### Mainnet (Production)

⚠️ **IMPORTANT**: Only deploy to mainnet after:
1. ✅ Complete security audit
2. ✅ Thorough devnet testing
3. ✅ Multi-sig setup for authorities
4. ✅ Emergency response plan

```bash
# 1. Switch to mainnet
solana config set --url mainnet-beta

# 2. Ensure sufficient SOL (5-10 SOL recommended)
solana balance

# 3. Deploy programs (IRREVERSIBLE)
anchor deploy --provider.cluster mainnet-beta

# 4. Run initialization
npm run deploy:mainnet
```

---

## Generating Program IDs

Before deployment, generate program keypairs:

```bash
# Generate keypairs for all programs
anchor keys list

# This creates keypairs in target/deploy/

# Update Anchor.toml with generated IDs
# Then rebuild
anchor build
```

---

## IDL Management

### Generate IDL Files

```bash
# IDLs are auto-generated during build
anchor build

# IDL files location:
# target/idl/*.json
```

### Initialize IDL on-chain

```bash
# After deployment, upload IDL
anchor idl init -f target/idl/frac_token.json <PROGRAM_ID>

# Upgrade IDL
anchor idl upgrade -f target/idl/frac_token.json <PROGRAM_ID>
```

### TypeScript Types

```bash
# Generate TypeScript types from IDL
anchor build

# Types generated in:
# target/types/*.ts
```

---

## Development Workflow

### Standard Development Loop

```bash
# 1. Make code changes in programs/

# 2. Build
anchor build

# 3. Test
anchor test

# 4. Deploy to localnet
anchor deploy

# 5. Test manually
npm run test:manual

# 6. Repeat
```

### Hot Reload Development

```bash
# Terminal 1: Run validator
solana-test-validator --reset

# Terminal 2: Watch and rebuild
cargo watch -x 'build-bpf'

# Terminal 3: Run tests
anchor test --skip-deploy
```

---

## Environment Variables

Create `.env` file:

```bash
# Network configuration
ANCHOR_PROVIDER_URL=http://localhost:8899
ANCHOR_WALLET=~/.config/solana/id.json

# Program IDs (update after deployment)
FRAC_TOKEN_PROGRAM_ID=
STAKING_PROGRAM_ID=
GOVERNANCE_PROGRAM_ID=
ACCESS_CONTROL_PROGRAM_ID=
REWARDS_PROGRAM_ID=
ENTERPRISE_PROGRAM_ID=
FRACTIONAL_OWNERSHIP_PROGRAM_ID=
BRIDGE_PROGRAM_ID=

# Wormhole (for bridge)
WORMHOLE_BRIDGE_DEVNET=3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5
WORMHOLE_BRIDGE_MAINNET=worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth
```

---

## Common Commands

```bash
# Build
anchor build                # Build all programs
anchor build -p <program>   # Build specific program

# Test
anchor test                 # Run all tests
anchor test <file>          # Run specific test file

# Deploy
anchor deploy               # Deploy all programs
anchor deploy <program>     # Deploy specific program

# Clean
anchor clean                # Remove build artifacts
cargo clean                 # Clean Rust build cache

# Verify
solana program show <ID>    # Show program info
solana account <ID>         # Show account info

# Logs
solana logs                 # Stream program logs
solana logs | grep <PROG>   # Filter by program
```

---

## Troubleshooting

### "Program <ID> is not upgradeable"

```bash
# Solution: Deploy with upgrade authority
anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/id.json
```

### "Transaction simulation failed"

```bash
# Solution: Check program logs
solana logs

# Or increase compute units
# Add to program code:
# #[instruction(/* params */)]
# pub fn my_function(ctx: Context<MyAccounts>) -> Result<()> {
#     solana_program::log::sol_log_compute_units();
#     // ...
# }
```

### "Account allocation failed"

```bash
# Solution: Increase account size in code
# Or ensure sufficient SOL balance
solana balance
```

### "Build takes forever"

```bash
# Solution: Use parallel builds
CARGO_BUILD_JOBS=8 anchor build

# Or use incremental compilation
export CARGO_INCREMENTAL=1
```

### Tests fail with "Account not found"

```bash
# Solution: Ensure validator is running and funded
solana-test-validator --reset
solana airdrop 10
```

---

## Performance Optimization

### Faster Builds

```bash
# Add to ~/.cargo/config.toml
[build]
jobs = 8

[term]
verbose = false
```

### Faster Tests

```bash
# Run tests in parallel
anchor test --skip-local-validator --parallel

# Skip build if no changes
anchor test --skip-build
```

### Reduce Program Size

```bash
# Add to Cargo.toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
```

---

## Security Checklist

Before deploying to mainnet:

- [ ] Complete security audit by 2+ firms
- [ ] 100% test coverage
- [ ] Fuzz testing for arithmetic operations
- [ ] Multi-sig for upgrade authority
- [ ] Emergency pause mechanisms tested
- [ ] Rate limiting verified
- [ ] Access control reviewed
- [ ] Cross-program invocation security checked
- [ ] Account validation comprehensive
- [ ] Error handling complete
- [ ] Mainnet simulation with realistic data
- [ ] Incident response plan documented

---

## Resources

**Official Documentation:**
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Program Library](https://spl.solana.com/)

**Developer Tools:**
- [Solana Explorer](https://explorer.solana.com/)
- [Solana Beach](https://solanabeach.io/)
- [Solana FM](https://solana.fm/)
- [Anchor Playground](https://beta.solpg.io/)

**Community:**
- [Solana Discord](https://discord.gg/solana)
- [Anchor Discord](https://discord.gg/anchorlang)
- [Solana Stack Exchange](https://solana.stackexchange.com/)

---

## Next Steps

After successful setup:

1. ✅ Run `anchor build` to ensure everything compiles
2. ✅ Run `anchor test` to verify tests pass
3. ✅ Deploy to localnet and test manually
4. ✅ Deploy to devnet for public testing
5. ✅ Start frontend integration (see main README.md)
6. ✅ Prepare for security audit
7. ✅ Plan mainnet deployment

---

**Questions?** Check the main [README.md](./README.md) or [DEPLOYMENT.md](./DEPLOYMENT.md)

**Issues?** Report at: [GitHub Issues](#)
