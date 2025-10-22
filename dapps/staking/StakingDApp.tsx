/**
 * Complete Staking dApp
 *
 * Full-featured staking interface with:
 * - Wallet connection
 * - Balance display
 * - Stake creation (flexible & fixed-term)
 * - Active stakes management
 * - Rewards claiming
 * - Unstaking
 * - Real-time APY display
 * - Transaction history
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useStaking, useUserBalance, useStakingConfig } from '../../frac-contracts/sdk/hooks';
import { getProgramIds, APP_CONFIG } from '../config';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PublicKey } from '@solana/web3.js';
import './StakingDApp.css';

export const StakingDApp: React.FC<{ network: WalletAdapterNetwork }> = ({ network }) => {
  const { publicKey, connected } = useWallet();
  const programIds = getProgramIds(network);

  const { balance, loading: balanceLoading, refresh: refreshBalance } = useUserBalance();
  const { stakes, loading: stakesLoading, createStake, claimRewards, unstake, refresh: refreshStakes } = useStaking(programIds);
  const { config: stakingConfig } = useStakingConfig(programIds);

  // Form state
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [lockDuration, setLockDuration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'stake' | 'manage'>('stake');

  // Calculate estimated rewards
  const calculateEstimatedRewards = (amount: number, duration: number): number => {
    if (!stakingConfig) return 0;

    let apy = stakingConfig.flexibleApy;
    if (duration === 30) apy = stakingConfig.apy30Days;
    else if (duration === 90) apy = stakingConfig.apy90Days;
    else if (duration === 180) apy = stakingConfig.apy180Days;
    else if (duration === 365) apy = stakingConfig.apy365Days;

    const daysToCalculate = duration === 0 ? 365 : duration;
    return (amount * apy * daysToCalculate) / (100 * 365);
  };

  // Handle stake creation
  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);

    // Validation
    if (!connected || !publicKey) {
      showNotification('error', 'Please connect your wallet first');
      return;
    }

    if (isNaN(amount) || amount < APP_CONFIG.staking.minStake) {
      showNotification('error', `Minimum stake is ${APP_CONFIG.staking.minStake} $FRAC`);
      return;
    }

    if (amount > balance) {
      showNotification('error', 'Insufficient balance');
      return;
    }

    try {
      setIsProcessing(true);

      const stakeType = lockDuration === 0 ? { flexible: {} } : { fixedTerm: {} };
      const signature = await createStake(amount * 1e9, stakeType, lockDuration);

      showNotification('success', `Successfully staked ${amount} $FRAC! Tx: ${signature.slice(0, 8)}...`);
      setStakeAmount('');
      refreshBalance();
      refreshStakes();
    } catch (error: any) {
      console.error('Stake error:', error);
      showNotification('error', error.message || 'Failed to create stake');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle rewards claim
  const handleClaimRewards = async (stakeAccount: string) => {
    if (!connected) return;

    try {
      setIsProcessing(true);
      const signature = await claimRewards(new PublicKey(stakeAccount));
      showNotification('success', `Rewards claimed! Tx: ${signature.slice(0, 8)}...`);
      refreshBalance();
      refreshStakes();
    } catch (error: any) {
      console.error('Claim error:', error);
      showNotification('error', error.message || 'Failed to claim rewards');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle unstake
  const handleUnstake = async (stakeAccount: string, amount: number) => {
    if (!connected) return;

    try {
      setIsProcessing(true);
      const signature = await unstake(new PublicKey(stakeAccount), amount);
      showNotification('success', `Successfully unstaked! Tx: ${signature.slice(0, 8)}...`);
      refreshBalance();
      refreshStakes();
    } catch (error: any) {
      console.error('Unstake error:', error);
      showNotification('error', error.message || 'Failed to unstake');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Get APY for duration
  const getApyForDuration = (days: number): number => {
    if (!stakingConfig) return 0;
    if (days === 0) return stakingConfig.flexibleApy;
    if (days === 30) return stakingConfig.apy30Days;
    if (days === 90) return stakingConfig.apy90Days;
    if (days === 180) return stakingConfig.apy180Days;
    if (days === 365) return stakingConfig.apy365Days;
    return stakingConfig.flexibleApy;
  };

  // Calculate pending rewards for a stake
  const calculatePendingRewards = (stake: any): number => {
    if (!stake) return 0;
    const now = Date.now() / 1000;
    const elapsed = now - stake.startTime;
    const apy = stake.apyRate / 10000; // Convert from basis points
    const amount = stake.amount / 1e9;
    return (amount * apy * elapsed) / (365 * 86400);
  };

  return (
    <div className="staking-dapp">
      {/* Header */}
      <header className="dapp-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🪙 Staking</h1>
            <p>Stake $FRAC tokens and earn rewards</p>
          </div>
          <div className="header-right">
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
          <button onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      {!connected ? (
        /* Not Connected State */
        <div className="not-connected">
          <div className="connect-card">
            <h2>Connect Your Wallet</h2>
            <p>Connect your Solana wallet to start staking $FRAC tokens</p>
            <WalletMultiButton />
          </div>
        </div>
      ) : (
        /* Connected State */
        <div className="dapp-content">
          {/* Balance Card */}
          <div className="balance-card">
            <div className="balance-header">
              <h3>Your Balance</h3>
              <button onClick={refreshBalance} className="refresh-btn" disabled={balanceLoading}>
                🔄 Refresh
              </button>
            </div>
            <div className="balance-amount">
              {balanceLoading ? (
                <div className="skeleton-loader"></div>
              ) : (
                <span>{balance.toLocaleString()} $FRAC</span>
              )}
            </div>
            <div className="balance-details">
              <div className="detail-item">
                <span className="detail-label">Wallet Address</span>
                <span className="detail-value">{publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'stake' ? 'active' : ''}`}
              onClick={() => setActiveTab('stake')}
            >
              New Stake
            </button>
            <button
              className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              My Stakes ({stakes.length})
            </button>
          </div>

          {activeTab === 'stake' ? (
            /* Stake Creation Form */
            <div className="stake-form">
              <h2>Create New Stake</h2>

              {/* Amount Input */}
              <div className="form-group">
                <label>Amount to Stake</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="Enter amount"
                    min={APP_CONFIG.staking.minStake}
                    step="1"
                    disabled={isProcessing}
                  />
                  <button
                    className="max-btn"
                    onClick={() => setStakeAmount(balance.toString())}
                    disabled={isProcessing}
                  >
                    MAX
                  </button>
                </div>
                <small>Minimum: {APP_CONFIG.staking.minStake} $FRAC</small>
              </div>

              {/* Lock Duration Selection */}
              <div className="form-group">
                <label>Lock Duration</label>
                <div className="duration-grid">
                  {[
                    { days: 0, label: 'Flexible', apy: APP_CONFIG.staking.apyRates.flexible },
                    { days: 30, label: '30 Days', apy: APP_CONFIG.staking.apyRates.fixed30 },
                    { days: 90, label: '90 Days', apy: APP_CONFIG.staking.apyRates.fixed90 },
                    { days: 180, label: '180 Days', apy: APP_CONFIG.staking.apyRates.fixed180 },
                    { days: 365, label: '365 Days', apy: APP_CONFIG.staking.apyRates.fixed365 },
                  ].map((option) => (
                    <button
                      key={option.days}
                      className={`duration-option ${lockDuration === option.days ? 'selected' : ''}`}
                      onClick={() => setLockDuration(option.days)}
                      disabled={isProcessing}
                    >
                      <div className="option-label">{option.label}</div>
                      <div className="option-apy">{option.apy}% APY</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Summary */}
              {stakeAmount && parseFloat(stakeAmount) >= APP_CONFIG.staking.minStake && (
                <div className="stake-summary">
                  <h3>Stake Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Amount</span>
                      <span className="summary-value">{parseFloat(stakeAmount).toLocaleString()} $FRAC</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">APY</span>
                      <span className="summary-value">{getApyForDuration(lockDuration)}%</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Type</span>
                      <span className="summary-value">{lockDuration === 0 ? 'Flexible' : 'Fixed-Term'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Est. Rewards (1 Year)</span>
                      <span className="summary-value highlight">
                        {calculateEstimatedRewards(parseFloat(stakeAmount), lockDuration).toFixed(2)} $FRAC
                      </span>
                    </div>
                  </div>

                  {lockDuration > 0 && (
                    <div className="warning-box">
                      <span className="warning-icon">⚠️</span>
                      <span>Early unstaking incurs a {APP_CONFIG.staking.earlyUnstakePenalty}% penalty</span>
                    </div>
                  )}
                </div>
              )}

              {/* Stake Button */}
              <button
                onClick={handleStake}
                disabled={isProcessing || !stakeAmount || parseFloat(stakeAmount) < APP_CONFIG.staking.minStake}
                className="btn-primary btn-large"
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  'Stake Tokens'
                )}
              </button>

              {/* Information */}
              <div className="info-box">
                <h4>About Staking</h4>
                <ul>
                  <li>Minimum stake: {APP_CONFIG.staking.minStake} $FRAC</li>
                  <li>Flexible staking: No lock period, unstake anytime</li>
                  <li>Fixed-term staking: Higher APY, early unstaking penalty applies</li>
                  <li>Staked tokens count 2× toward your Access Tier</li>
                  <li>Staked tokens provide voting power in Governance</li>
                  <li>Rewards are automatically compounded</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Active Stakes Management */
            <div className="stakes-management">
              <div className="management-header">
                <h2>Active Stakes</h2>
                <button onClick={refreshStakes} className="refresh-btn" disabled={stakesLoading}>
                  🔄 Refresh
                </button>
              </div>

              {stakesLoading ? (
                <div className="loading-state">
                  <div className="spinner-large"></div>
                  <p>Loading stakes...</p>
                </div>
              ) : stakes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <h3>No Active Stakes</h3>
                  <p>Create your first stake to start earning rewards</p>
                  <button onClick={() => setActiveTab('stake')} className="btn-secondary">
                    Create Stake
                  </button>
                </div>
              ) : (
                <div className="stakes-grid">
                  {stakes.map((stake, index) => {
                    const pendingRewards = calculatePendingRewards(stake);
                    const isFlexible = stake.lockDurationDays === 0;
                    const progress = isFlexible ? 0 : ((Date.now() / 1000 - stake.startTime) / (stake.endTime - stake.startTime)) * 100;

                    return (
                      <div key={index} className="stake-card">
                        <div className="stake-card-header">
                          <div className="stake-type">
                            <span className={`type-badge ${isFlexible ? 'flexible' : 'fixed'}`}>
                              {isFlexible ? 'Flexible' : `${stake.lockDurationDays}-Day Fixed`}
                            </span>
                            <span className={`status-badge ${stake.isActive ? 'active' : 'inactive'}`}>
                              {stake.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="stake-apy">
                            {(stake.apyRate / 100).toFixed(2)}% APY
                          </div>
                        </div>

                        <div className="stake-card-body">
                          <div className="stake-amount-large">
                            {(stake.amount / 1e9).toLocaleString()} $FRAC
                          </div>

                          <div className="stake-details">
                            <div className="detail-row">
                              <span>Priority Tier</span>
                              <span className="tier-badge">Tier {stake.priorityTier}</span>
                            </div>
                            <div className="detail-row">
                              <span>Start Date</span>
                              <span>{new Date(stake.startTime * 1000).toLocaleDateString()}</span>
                            </div>
                            {!isFlexible && (
                              <>
                                <div className="detail-row">
                                  <span>End Date</span>
                                  <span>{new Date(stake.endTime * 1000).toLocaleDateString()}</span>
                                </div>
                                <div className="progress-bar">
                                  <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                </div>
                                <div className="progress-label">
                                  {Math.min(progress, 100).toFixed(1)}% Complete
                                </div>
                              </>
                            )}
                          </div>

                          <div className="rewards-section">
                            <div className="rewards-label">Pending Rewards</div>
                            <div className="rewards-amount">
                              {pendingRewards.toFixed(4)} $FRAC
                            </div>
                          </div>
                        </div>

                        <div className="stake-card-footer">
                          <button
                            onClick={() => handleClaimRewards(stake.publicKey)}
                            disabled={isProcessing || pendingRewards < 0.0001}
                            className="btn-secondary"
                          >
                            Claim Rewards
                          </button>
                          <button
                            onClick={() => handleUnstake(stake.publicKey, stake.amount)}
                            disabled={isProcessing}
                            className="btn-danger"
                          >
                            Unstake
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary Stats */}
              {stakes.length > 0 && (
                <div className="stats-summary">
                  <div className="stat-card">
                    <div className="stat-label">Total Staked</div>
                    <div className="stat-value">
                      {stakes.reduce((sum, s) => sum + s.amount / 1e9, 0).toLocaleString()} $FRAC
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Pending Rewards</div>
                    <div className="stat-value">
                      {stakes.reduce((sum, s) => sum + calculatePendingRewards(s), 0).toFixed(4)} $FRAC
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Active Stakes</div>
                    <div className="stat-value">
                      {stakes.filter(s => s.isActive).length}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
