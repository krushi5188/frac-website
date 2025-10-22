# Integration Guide

How to integrate FractionalBase dApps into your website.

## Option 1: Use Complete Integrated App (Recommended)

The easiest way - use the complete app with all 6 dApps and navigation:

```tsx
// pages/_app.tsx or app/layout.tsx
import { FractionalBaseApp } from './dapps';
import '@solana/wallet-adapter-react-ui/styles.css';
import './dapps/App.css';

export default function App() {
  return <FractionalBaseApp />;
}
```

That's it! You now have all 6 dApps with:
- ✅ Wallet connection
- ✅ Navigation sidebar
- ✅ Network switching
- ✅ All features working

---

## Option 2: Use Individual dApps

Pick and choose specific dApps for your site:

```tsx
import { useState } from 'react';
import { WalletContextProvider, StakingDApp, VaultsDApp } from './dapps';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function MyApp() {
  const [network, setNetwork] = useState(WalletAdapterNetwork.Devnet);

  return (
    <WalletContextProvider network={network}>
      {/* Your custom navigation */}
      <nav>
        <a href="/staking">Staking</a>
        <a href="/vaults">Vaults</a>
      </nav>

      {/* Individual dApps */}
      <StakingDApp network={network} />
      <VaultsDApp network={network} />
    </WalletContextProvider>
  );
}
```

---

## Option 3: Use SDK Hooks Only

Build completely custom UI using just the hooks:

```tsx
import { useStaking, useUserBalance } from './dapps';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getProgramIds } from './dapps';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export function CustomStakingUI() {
  const { connected } = useWallet();
  const { balance } = useUserBalance();
  const programIds = getProgramIds(WalletAdapterNetwork.Devnet);
  const { stakes, createStake, claimRewards } = useStaking(programIds);

  if (!connected) {
    return <WalletMultiButton />;
  }

  return (
    <div className="my-custom-design">
      <h1>My Custom Staking</h1>
      <p>Balance: {balance} $FRAC</p>

      {stakes.map((stake, i) => (
        <div key={i}>
          <p>Staked: {stake.amount / 1e9} $FRAC</p>
          <button onClick={() => claimRewards(stake.publicKey)}>
            Claim Rewards
          </button>
        </div>
      ))}

      <button onClick={() => createStake(1000 * 1e9, {flexible: {}}, 0)}>
        Stake 1000 $FRAC
      </button>
    </div>
  );
}
```

---

## Next.js Integration

### 1. Install Dependencies

```bash
npm install @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/web3.js
```

### 2. Create Wallet Provider Component

```tsx
// components/WalletProvider.tsx
'use client'; // For Next.js 13+ App Router

import { WalletContextProvider } from '../dapps/WalletProvider';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export function AppWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WalletContextProvider network={WalletAdapterNetwork.Devnet}>
      {children}
    </WalletContextProvider>
  );
}
```

### 3. Wrap Your App

```tsx
// app/layout.tsx (Next.js 13+)
import { AppWalletProvider } from '@/components/WalletProvider';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
      </body>
    </html>
  );
}
```

### 4. Use in Pages

```tsx
// app/staking/page.tsx
'use client';

import { StakingDApp } from '@/dapps';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export default function StakingPage() {
  return <StakingDApp network={WalletAdapterNetwork.Devnet} />;
}
```

---

## React (Vite/CRA) Integration

### 1. Install Dependencies

```bash
npm install @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/web3.js
```

### 2. Setup in Main App

```tsx
// src/App.tsx
import { FractionalBaseApp } from './dapps';
import '@solana/wallet-adapter-react-ui/styles.css';
import './dapps/App.css';

function App() {
  return <FractionalBaseApp />;
}

export default App;
```

---

## Configuration

### Update Program IDs

After deploying smart contracts, update `dapps/config.ts`:

```typescript
const DEVNET_PROGRAM_IDS: ProgramIds = {
  fracToken: new PublicKey('FracToKENxxxYOUR_ACTUAL_ID_HERExxxx'),
  staking: new PublicKey('STAKingxxxxYOUR_ACTUAL_ID_HERExxxx'),
  // ... update all 8 program IDs
};
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_MAINNET_RPC=https://your-rpc-endpoint.com
NEXT_PUBLIC_DEVNET_RPC=https://api.devnet.solana.com
```

---

## Customization

### Change Colors

Edit `dapps/App.css`:

```css
/* Change primary color from purple to your brand color */
.btn-primary {
  background: #your-brand-color; /* Instead of #667eea */
}

.menu-item.active {
  background: rgba(your-r, your-g, your-b, 0.2);
  border-left: 3px solid #your-brand-color;
}
```

### Custom Navigation

Replace the sidebar with your own navigation:

```tsx
import { StakingDApp, VaultsDApp } from './dapps';

export function MyCustomApp() {
  const [currentPage, setCurrentPage] = useState('staking');

  return (
    <div>
      {/* Your custom navbar */}
      <nav className="my-navbar">
        <button onClick={() => setCurrentPage('staking')}>Staking</button>
        <button onClick={() => setCurrentPage('vaults')}>Vaults</button>
      </nav>

      {/* Render selected dApp */}
      {currentPage === 'staking' && <StakingDApp network={network} />}
      {currentPage === 'vaults' && <VaultsDApp network={network} />}
    </div>
  );
}
```

### Add Your Logo

Edit `dapps/App.tsx`:

```tsx
<div className="app-logo">
  <img src="/your-logo.svg" alt="Logo" />
  <span className="logo-text">Your Brand</span>
</div>
```

---

## Routing Examples

### Next.js App Router

```tsx
// app/staking/page.tsx
export default function Page() {
  return <StakingDApp network={WalletAdapterNetwork.Devnet} />;
}

// app/vaults/page.tsx
export default function Page() {
  return <VaultsDApp network={WalletAdapterNetwork.Devnet} />;
}
```

### React Router

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <WalletContextProvider network={WalletAdapterNetwork.Devnet}>
      <BrowserRouter>
        <Routes>
          <Route path="/staking" element={<StakingDApp network={network} />} />
          <Route path="/vaults" element={<VaultsDApp network={network} />} />
          <Route path="/governance" element={<GovernanceDApp network={network} />} />
        </Routes>
      </BrowserRouter>
    </WalletContextProvider>
  );
}
```

---

## Testing

### Test Wallet Connection

```tsx
import { useWallet } from '@solana/wallet-adapter-react';

function TestConnection() {
  const { connected, publicKey } = useWallet();

  return (
    <div>
      <p>Connected: {connected ? 'Yes' : 'No'}</p>
      <p>Address: {publicKey?.toBase58()}</p>
    </div>
  );
}
```

### Test Balance Fetch

```tsx
import { useUserBalance } from './dapps';

function TestBalance() {
  const { balance, loading, error } = useUserBalance();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return <p>Balance: {balance} $FRAC</p>;
}
```

---

## Troubleshooting

### "Module not found" errors

```bash
# Make sure you're in the right directory
cd frac-website/dapps
npm install

# If using TypeScript
npm install --save-dev @types/react @types/node
```

### Wallet not connecting

1. Check wallet extension is installed
2. Verify network matches (Devnet/Mainnet)
3. Clear browser cache
4. Try different wallet

### Transactions failing

1. Ensure program IDs are correct in `config.ts`
2. Verify contracts are deployed on the network you're using
3. Check sufficient SOL for gas fees
4. Check sufficient $FRAC balance

---

## Production Deployment

### Before Going Live

1. ✅ Update program IDs to mainnet addresses
2. ✅ Change network to `WalletAdapterNetwork.Mainnet`
3. ✅ Set up custom RPC endpoint (not free public RPCs)
4. ✅ Enable error tracking (Sentry, etc.)
5. ✅ Test all features on mainnet
6. ✅ Security audit completed
7. ✅ Legal compliance checked

### Deploy Commands

```bash
# Build for production
npm run build

# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# Custom server
npm run start
```

---

## Support

Need help integrating? Contact us:

- Discord: https://discord.gg/fractionalbase
- GitHub Issues: https://github.com/fractionalbase/issues
- Docs: https://docs.fractionalbase.com
