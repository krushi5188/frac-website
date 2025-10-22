/**
 * Main FractionalBase App
 *
 * Integrates all 6 dApps with routing and navigation:
 * 1. Staking
 * 2. Vaults
 * 3. Governance
 * 4. Rewards
 * 5. Enterprise
 * 6. Bridge
 */

import React, { useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletContextProvider, NetworkSelector } from './WalletProvider';
import { StakingDApp } from './staking/StakingDApp';
import { VaultsDApp } from './vaults/VaultsDApp';
import { GovernanceDApp, RewardsDApp, EnterpriseDApp, BridgeDApp } from './AllDApps';
import { useAccessControl } from '../frac-contracts/sdk/hooks';
import { getProgramIds, APP_CONFIG } from './config';
import './App.css';

type DAppView = 'staking' | 'vaults' | 'governance' | 'rewards' | 'enterprise' | 'bridge';

const FractionalBaseApp: React.FC = () => {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet);
  const [currentView, setCurrentView] = useState<DAppView>('staking');

  return (
    <WalletContextProvider network={network}>
      <div className="fractionalbase-app">
        {/* Navigation Sidebar */}
        <nav className="app-sidebar">
          <div className="sidebar-header">
            <div className="app-logo">
              <span className="logo-icon">⚡</span>
              <span className="logo-text">FractionalBase</span>
            </div>
            <div className="network-selector-container">
              <NetworkSelector value={network} onChange={setNetwork} />
            </div>
          </div>

          <div className="sidebar-menu">
            <button
              className={`menu-item ${currentView === 'staking' ? 'active' : ''}`}
              onClick={() => setCurrentView('staking')}
            >
              <span className="menu-icon">🪙</span>
              <span className="menu-label">Staking</span>
            </button>
            <button
              className={`menu-item ${currentView === 'vaults' ? 'active' : ''}`}
              onClick={() => setCurrentView('vaults')}
            >
              <span className="menu-icon">🏛️</span>
              <span className="menu-label">Vaults</span>
            </button>
            <button
              className={`menu-item ${currentView === 'governance' ? 'active' : ''}`}
              onClick={() => setCurrentView('governance')}
            >
              <span className="menu-icon">🗳️</span>
              <span className="menu-label">Governance</span>
            </button>
            <button
              className={`menu-item ${currentView === 'rewards' ? 'active' : ''}`}
              onClick={() => setCurrentView('rewards')}
            >
              <span className="menu-icon">🎁</span>
              <span className="menu-label">Rewards</span>
            </button>
            <button
              className={`menu-item ${currentView === 'enterprise' ? 'active' : ''}`}
              onClick={() => setCurrentView('enterprise')}
            >
              <span className="menu-icon">🏢</span>
              <span className="menu-label">Enterprise</span>
            </button>
            <button
              className={`menu-item ${currentView === 'bridge' ? 'active' : ''}`}
              onClick={() => setCurrentView('bridge')}
            >
              <span className="menu-icon">🌉</span>
              <span className="menu-label">Bridge</span>
            </button>
          </div>

          <div className="sidebar-footer">
            <div className="social-links">
              <a href={APP_CONFIG.social.twitter} target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href={APP_CONFIG.social.discord} target="_blank" rel="noopener noreferrer">Discord</a>
              <a href={APP_CONFIG.social.docs} target="_blank" rel="noopener noreferrer">Docs</a>
            </div>
            <div className="version">v1.0.0</div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="app-main">
          {currentView === 'staking' && <StakingDApp network={network} />}
          {currentView === 'vaults' && <VaultsDApp network={network} />}
          {currentView === 'governance' && <GovernanceDApp network={network} />}
          {currentView === 'rewards' && <RewardsDApp network={network} />}
          {currentView === 'enterprise' && <EnterpriseDApp network={network} />}
          {currentView === 'bridge' && <BridgeDApp network={network} />}
        </main>
      </div>
    </WalletContextProvider>
  );
};

export default FractionalBaseApp;
