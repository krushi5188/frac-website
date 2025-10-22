# FractionalBase dApps

Complete decentralized application suite for FractionalBase - enabling fractional asset ownership on Solana.

## 🎯 What's Included

This directory contains **6 fully-functional dApps**:

### 1. 🪙 Staking dApp
**Location:** `staking/StakingDApp.tsx`

Complete staking interface with:
- Flexible staking (5% APY, no lock)
- Fixed-term staking (7-16% APY, 30-365 days)
- Real-time rewards calculation
- Priority tier system (0-3)
- Compound rewards
- Active stakes management
- Claim rewards & unstake functionality

### 2. 🏛️ Vaults dApp
**Location:** `vaults/VaultsDApp.tsx`

Fractional ownership marketplace with:
- Asset fractionalization (NFTs, Real Estate, Art, Collectibles)
- Vault creation wizard
- On-chain order book trading
- Share listing & buying
- Portfolio management
- 0.25% trading fee
- Enterprise discounts

### 3. 🗳️ Governance dApp
**Location:** `AllDApps.tsx` (GovernanceDApp)

DAO governance interface with:
- 4 proposal types (Emergency, Parameter Change, Treasury Spending, Protocol Upgrade)
- Tiered quorum requirements (10-25%)
- Snapshot-based voting
- Voting power display
- Proposal creation form
- Approve/Reject voting

### 4. 🎁 Rewards dApp
**Location:** `AllDApps.tsx` (RewardsDApp)

Milestone tracking and rewards with:
- 4 milestone activities (Trading, Staking, Governance, Vaults)
- 3 vesting types (Immediate, Linear, Milestone)
- 3-year milestone unlock system (10% / 30% / 60%)
- Progress tracking
- Reward claims
- Grant management

### 5. 🏢 Enterprise dApp
**Location:** `AllDApps.tsx` (EnterpriseDApp)

Business account management with:
- 4 enterprise tiers (Starter, Business, Enterprise, Institutional)
- Collateral management (100k - 5M $FRAC)
- Lock duration multipliers (1.0x - 2.0x)
- Vault creation discounts (25-90% off)
- Trading fee discounts (0.25% → 0.05%)
- 7-day withdrawal delay

### 6. 🌉 Bridge dApp
**Location:** `AllDApps.tsx` (BridgeDApp)

Cross-chain token transfers with:
- Wormhole integration
- Ethereum & BSC support
- Min 10 $FRAC / Max 1M $FRAC per transfer
- 1 $FRAC bridge fee
- Transfer status tracking
- Recipient address validation

---

## 📁 Project Structure

```
dapps/
├── App.tsx                    # Main app with navigation & routing
├── App.css                    # Shared styles for all dApps
├── WalletProvider.tsx         # Wallet adapter configuration
├── config.ts                  # Program IDs & configuration
├── package.json               # Dependencies
├── README.md                  # This file
│
├── staking/
│   ├── StakingDApp.tsx       # Complete staking interface
│   └── StakingDApp.css       # Staking-specific styles
│
├── vaults/
│   ├── VaultsDApp.tsx        # Complete vaults marketplace
│   └── VaultsDApp.css        # Vaults-specific styles
│
└── AllDApps.tsx              # Governance, Rewards, Enterprise, Bridge dApps
```

---

## 🚀 Quick Start

### 1. Installation

```bash
cd frac-website/dapps
npm install
```

### 2. Configuration

Update program IDs in `config.ts` after deploying smart contracts:

```typescript
// config.ts
const DEVNET_PROGRAM_IDS: ProgramIds = {
  fracToken: new PublicKey('YOUR_DEPLOYED_FRAC_TOKEN_ID'),
  staking: new PublicKey('YOUR_DEPLOYED_STAKING_ID'),
  fractionalOwnership: new PublicKey('YOUR_DEPLOYED_FRACTIONAL_ID'),
  governance: new PublicKey('YOUR_DEPLOYED_GOVERNANCE_ID'),
  accessControl: new PublicKey('YOUR_DEPLOYED_ACCESS_ID'),
  rewards: new PublicKey('YOUR_DEPLOYED_REWARDS_ID'),
  enterprise: new PublicKey('YOUR_DEPLOYED_ENTERPRISE_ID'),
  bridge: new PublicKey('YOUR_DEPLOYED_BRIDGE_ID'),
};
```

### 3. Run Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000`

---

## 🎨 Features

### Wallet Integration
- **Supported Wallets:** Phantom, Solflare, Backpack, Ledger
- **Auto-connect:** Automatically reconnects on page reload
- **Network Switching:** Toggle between Mainnet, Devnet, Testnet

### Responsive Design
- **Mobile-first:** Works on all screen sizes
- **Touch-friendly:** Optimized for mobile interactions
- **Adaptive layouts:** Grid systems adapt to viewport

### Real-time Updates
- **Balance updates:** Auto-refresh every 10 seconds
- **Transaction notifications:** Success/error alerts
- **Loading states:** Skeleton loaders and spinners

### User Experience
- **Intuitive navigation:** Sidebar menu with active states
- **Form validation:** Real-time input validation
- **Error handling:** Clear error messages
- **Confirmation dialogs:** Important actions require confirmation

---

## 🔧 Development

### File Structure

Each dApp follows this pattern:
- **Component file** (`.tsx`): React component with full logic
- **Styles file** (`.css`): Component-specific styles
- **Hooks**: Uses SDK hooks from `../frac-contracts/sdk/hooks`

### Adding a New dApp

1. Create new directory: `dapps/my-feature/`
2. Create component: `MyFeatureDApp.tsx`
3. Create styles: `MyFeatureDApp.css`
4. Add to navigation in `App.tsx`
5. Import and route in main component

### Styling Guidelines

- **Base styles:** Use `App.css` for shared components
- **Component styles:** Create separate CSS files
- **Color scheme:**
  - Primary: `#667eea` (Purple)
  - Success: `#10b981` (Green)
  - Error: `#ef4444` (Red)
  - Warning: `#f59e0b` (Orange)

### TypeScript

All components are fully typed:
```typescript
interface MyDAppProps {
  network: WalletAdapterNetwork;
}

export const MyDApp: React.FC<MyDAppProps> = ({ network }) => {
  // Component logic
};
```

---

## 📚 SDK Integration

All dApps use the TypeScript SDK located in `../frac-contracts/sdk/`:

### Available Hooks

```typescript
// Get user balance
const { balance, loading, refresh } = useUserBalance();

// Staking operations
const { stakes, createStake, claimRewards, unstake } = useStaking(programIds);

// Vault operations
const { vaults, createVault, listShares, buyShares } = useFractionalOwnership(programIds);

// Governance operations
const { proposals, votingPower, createProposal, castVote } = useGovernance(programIds);

// Access control
const { tier, checkAccess } = useAccessControl(programIds);

// Rewards
const { grants, milestoneProgress, claimRewards } = useRewards(programIds);

// Enterprise
const { enterprise, registerEnterprise, addCollateral } = useEnterprise(programIds);

// Bridge
const { bridgeOut, getTransferStatus } = useBridge(programIds);
```

---

## 🧪 Testing

### Manual Testing Checklist

**Wallet Connection:**
- [ ] Connect with Phantom wallet
- [ ] Connect with Solflare wallet
- [ ] Disconnect wallet
- [ ] Switch networks

**Staking:**
- [ ] Create flexible stake
- [ ] Create fixed-term stake (30/90/180/365 days)
- [ ] Claim rewards
- [ ] Unstake tokens
- [ ] Verify APY calculations

**Vaults:**
- [ ] Create new vault
- [ ] List shares for sale
- [ ] Buy shares from order book
- [ ] View vault details
- [ ] Check portfolio

**Governance:**
- [ ] Create proposal
- [ ] Vote on proposal
- [ ] View voting power
- [ ] Check proposal status

**Rewards:**
- [ ] View milestone progress
- [ ] Claim rewards
- [ ] Unlock milestone stages
- [ ] Check grant details

**Enterprise:**
- [ ] Register enterprise account
- [ ] Add collateral
- [ ] Request withdrawal
- [ ] View benefits

**Bridge:**
- [ ] Bridge to Ethereum
- [ ] Bridge to BSC
- [ ] Check transfer status
- [ ] Verify fees

---

## 🐛 Troubleshooting

### Wallet Connection Issues

**Problem:** Wallet doesn't connect
**Solution:**
1. Ensure wallet extension is installed
2. Refresh the page
3. Try different wallet
4. Check browser console for errors

### Transaction Failures

**Problem:** Transaction fails
**Solution:**
1. Check sufficient SOL for gas fees
2. Verify sufficient $FRAC balance
3. Ensure correct network (Devnet/Mainnet)
4. Check program IDs in config.ts

### SDK Errors

**Problem:** Hook returns undefined
**Solution:**
1. Verify program IDs are correct
2. Ensure smart contracts are deployed
3. Check network connection
4. Rebuild TypeScript types (`anchor build`)

---

## 🚢 Deployment

### Build for Production

```bash
npm run build
npm run start
```

### Deploy to Vercel

```bash
vercel --prod
```

### Deploy to Netlify

```bash
netlify deploy --prod
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_MAINNET_RPC=https://your-mainnet-rpc.com
NEXT_PUBLIC_DEVNET_RPC=https://api.devnet.solana.com
```

---

## 📊 Performance

### Optimization Tips

1. **Lazy Loading:** Use `React.lazy()` for code splitting
2. **Memoization:** Use `useMemo` and `useCallback` for expensive computations
3. **Polling:** Reduce polling frequency for balance updates
4. **Caching:** Cache tier calculations (5-minute default)

### Bundle Size

Estimated production build sizes:
- Main bundle: ~400KB (gzipped)
- Staking dApp: ~50KB
- Vaults dApp: ~60KB
- Other dApps: ~40KB each

---

## 🔐 Security

### Best Practices

1. **Never store private keys** in the frontend
2. **Validate all inputs** before sending transactions
3. **Use program-derived addresses** (PDAs) for security
4. **Implement rate limiting** for API calls
5. **Sanitize user inputs** to prevent XSS

### Audit Checklist

- [ ] All transactions require wallet approval
- [ ] No hardcoded private keys
- [ ] Input validation on all forms
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS only in production

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support

- **Documentation:** https://docs.fractionalbase.com
- **Discord:** https://discord.gg/fractionalbase
- **Twitter:** @fractionalbase
- **GitHub Issues:** https://github.com/fractionalbase/issues

---

**Built with ❤️ by the FractionalBase Team**
