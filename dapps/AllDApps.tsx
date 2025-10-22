/**
 * All FractionalBase dApps - Complete Collection
 *
 * This file contains all 4 remaining dApps:
 * 1. Governance dApp - DAO proposals and voting
 * 2. Rewards dApp - Milestone tracking and claims
 * 3. Enterprise dApp - Business account management
 * 4. Bridge dApp - Cross-chain token transfers
 *
 * Plus the main App component that integrates everything
 */

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  useGovernance,
  useRewards,
  useEnterprise,
  useBridge,
  useAccessControl
} from '../frac-contracts/sdk/hooks';
import { getProgramIds, APP_CONFIG } from './config';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PublicKey } from '@solana/web3.js';

// ==================== GOVERNANCE DAPP ====================

export const GovernanceDApp: React.FC<{ network: WalletAdapterNetwork }> = ({ network }) => {
  const { publicKey, connected } = useWallet();
  const programIds = getProgramIds(network);
  const { proposals, votingPower, loading, createProposal, castVote } = useGovernance(programIds);

  const [activeTab, setActiveTab] = useState<'proposals' | 'create'>('proposals');
  const [proposalType, setProposalType] = useState<string>('emergency');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<any>(null);

  const handleCreateProposal = async () => {
    if (!connected || !publicKey) {
      alert('Please connect wallet');
      return;
    }

    if (!title || !description) {
      alert('Please fill all fields');
      return;
    }

    try {
      setIsProcessing(true);
      const typeEnum = {
        emergency: { emergency: {} },
        parameterChange: { parameterChange: {} },
        treasurySpending: { treasurySpending: {} },
        protocolUpgrade: { protocolUpgrade: {} },
      }[proposalType];

      const result = await createProposal({
        proposalType: typeEnum,
        title,
        description,
        targetProgram: programIds.staking,
        instructionData: Buffer.from([]),
      });

      alert(`Proposal created! ID: ${result.proposalId}`);
      setTitle('');
      setDescription('');
      setActiveTab('proposals');
    } catch (error: any) {
      alert(error.message || 'Failed to create proposal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVote = async (proposalId: number, approve: boolean) => {
    try {
      setIsProcessing(true);
      const vote = approve ? { approve: {} } : { reject: {} };
      const signature = await castVote(proposalId, vote);
      alert(`Vote cast! Tx: ${signature.slice(0, 8)}...`);
    } catch (error: any) {
      alert(error.message || 'Failed to vote');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dapp governance-dapp">
      <header className="dapp-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🗳️ Governance</h1>
            <p>Participate in DAO decision-making</p>
          </div>
          <div className="header-right">
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {!connected ? (
        <div className="not-connected">
          <div className="connect-card">
            <h2>Connect Your Wallet</h2>
            <p>Connect to participate in governance</p>
            <WalletMultiButton />
          </div>
        </div>
      ) : (
        <div className="dapp-content">
          <div className="voting-power-card">
            <h3>Your Voting Power</h3>
            <div className="voting-power-amount">{votingPower.toLocaleString()} $FRAC</div>
            <p>Based on your staked tokens + enterprise collateral</p>
          </div>

          <div className="tabs">
            <button className={`tab ${activeTab === 'proposals' ? 'active' : ''}`} onClick={() => setActiveTab('proposals')}>
              📋 Active Proposals ({proposals.length})
            </button>
            <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
              ➕ Create Proposal
            </button>
          </div>

          {activeTab === 'proposals' ? (
            <div className="proposals-list">
              {loading ? (
                <div className="loading-state">Loading proposals...</div>
              ) : proposals.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🗳️</div>
                  <h3>No Active Proposals</h3>
                  <p>Be the first to create a proposal</p>
                  <button onClick={() => setActiveTab('create')} className="btn-secondary">Create Proposal</button>
                </div>
              ) : (
                proposals.map((proposal, index) => (
                  <div key={index} className="proposal-card">
                    <div className="proposal-header">
                      <div className="proposal-type-badge">{proposal.type}</div>
                      <div className="proposal-id">#{proposal.proposalId}</div>
                    </div>
                    <h3>{proposal.title}</h3>
                    <p>{proposal.description}</p>
                    <div className="proposal-stats">
                      <div className="stat">
                        <span>Votes For</span>
                        <span className="votes-for">{proposal.votesFor.toLocaleString()}</span>
                      </div>
                      <div className="stat">
                        <span>Votes Against</span>
                        <span className="votes-against">{proposal.votesAgainst.toLocaleString()}</span>
                      </div>
                      <div className="stat">
                        <span>Quorum</span>
                        <span>{proposal.quorum}%</span>
                      </div>
                    </div>
                    <div className="proposal-progress">
                      <div className="progress-bar">
                        <div className="progress-for" style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="proposal-actions">
                      <button onClick={() => handleVote(proposal.proposalId, true)} disabled={isProcessing} className="btn-approve">
                        ✓ Approve
                      </button>
                      <button onClick={() => handleVote(proposal.proposalId, false)} disabled={isProcessing} className="btn-reject">
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="create-proposal-form">
              <h2>Create New Proposal</h2>
              <div className="form-group">
                <label>Proposal Type</label>
                <select value={proposalType} onChange={(e) => setProposalType(e.target.value)}>
                  <option value="emergency">Emergency (2 days, 10% quorum)</option>
                  <option value="parameterChange">Parameter Change (5 days, 15% quorum)</option>
                  <option value="treasurySpending">Treasury Spending (7 days, 20% quorum)</option>
                  <option value="protocolUpgrade">Protocol Upgrade (14 days, 25% quorum)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter proposal title" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your proposal..." rows={6} />
              </div>
              <div className="info-box">
                <p>⚠️ Minimum {APP_CONFIG.governance.minStakeToPropose.toLocaleString()} $FRAC staked required to create proposals</p>
              </div>
              <button onClick={handleCreateProposal} disabled={isProcessing || !title || !description} className="btn-primary btn-large">
                {isProcessing ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== REWARDS DAPP ====================

export const RewardsDApp: React.FC<{ network: WalletAdapterNetwork }> = ({ network }) => {
  const { publicKey, connected } = useWallet();
  const programIds = getProgramIds(network);
  const { grants, milestoneProgress, loading, claimRewards, unlockMilestone } = useRewards(programIds);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleClaimRewards = async (grantId: number) => {
    try {
      setIsProcessing(true);
      const signature = await claimRewards(grantId);
      alert(`Rewards claimed! Tx: ${signature.slice(0, 8)}...`);
    } catch (error: any) {
      alert(error.message || 'Failed to claim rewards');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlockMilestone = async (grantId: number, stage: number) => {
    try {
      setIsProcessing(true);
      const signature = await unlockMilestone(grantId, stage);
      alert(`Milestone unlocked! Tx: ${signature.slice(0, 8)}...`);
    } catch (error: any) {
      alert(error.message || 'Failed to unlock milestone');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dapp rewards-dapp">
      <header className="dapp-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🎁 Rewards</h1>
            <p>Track milestones and claim rewards</p>
          </div>
          <div className="header-right">
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {!connected ? (
        <div className="not-connected">
          <div className="connect-card">
            <h2>Connect Your Wallet</h2>
            <p>Connect to view your rewards</p>
            <WalletMultiButton />
          </div>
        </div>
      ) : (
        <div className="dapp-content">
          {/* Milestone Progress */}
          {milestoneProgress && (
            <div className="milestone-progress-card">
              <h2>Milestone Progress</h2>
              <div className="milestones-grid">
                <div className="milestone-item">
                  <div className="milestone-icon">📈</div>
                  <div className="milestone-info">
                    <div className="milestone-label">Trading Volume</div>
                    <div className="milestone-value">{milestoneProgress.tradingVolume.toLocaleString()} $FRAC</div>
                    <div className="milestone-target">Target: 10,000 $FRAC</div>
                  </div>
                </div>
                <div className="milestone-item">
                  <div className="milestone-icon">🔒</div>
                  <div className="milestone-info">
                    <div className="milestone-label">Staking Days</div>
                    <div className="milestone-value">{milestoneProgress.stakingDays} days</div>
                    <div className="milestone-target">Target: 180 days</div>
                  </div>
                </div>
                <div className="milestone-item">
                  <div className="milestone-icon">🗳️</div>
                  <div className="milestone-info">
                    <div className="milestone-label">Proposals Voted</div>
                    <div className="milestone-value">{milestoneProgress.proposalsVoted}</div>
                    <div className="milestone-target">Target: 3 proposals</div>
                  </div>
                </div>
                <div className="milestone-item">
                  <div className="milestone-icon">🏛️</div>
                  <div className="milestone-info">
                    <div className="milestone-label">Vaults Created</div>
                    <div className="milestone-value">{milestoneProgress.vaultsCreated}</div>
                    <div className="milestone-target">Target: 1 vault</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reward Grants */}
          <div className="grants-section">
            <h2>Your Reward Grants</h2>
            {loading ? (
              <div className="loading-state">Loading grants...</div>
            ) : grants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎁</div>
                <h3>No Reward Grants</h3>
                <p>Complete activities to earn rewards</p>
              </div>
            ) : (
              <div className="grants-grid">
                {grants.map((grant, index) => (
                  <div key={index} className="grant-card">
                    <div className="grant-header">
                      <div className="grant-category">{grant.category}</div>
                      <div className="vesting-type">{grant.vestingType}</div>
                    </div>
                    <div className="grant-amount">
                      <div className="total-amount">{(grant.totalAmount / 1e9).toLocaleString()} $FRAC</div>
                      <div className="amount-label">Total Grant</div>
                    </div>
                    <div className="grant-progress">
                      <div className="progress-label">
                        <span>Unlocked</span>
                        <span>{((grant.unlockedAmount / grant.totalAmount) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(grant.unlockedAmount / grant.totalAmount) * 100}%` }}></div>
                      </div>
                      <div className="amounts">
                        <span>Unlocked: {(grant.unlockedAmount / 1e9).toFixed(2)} $FRAC</span>
                        <span>Claimed: {(grant.claimedAmount / 1e9).toFixed(2)} $FRAC</span>
                      </div>
                    </div>
                    {grant.vestingType === 'milestone' && (
                      <div className="milestone-stages">
                        <div className={`stage ${grant.stage_1_unlocked ? 'unlocked' : 'locked'}`}>
                          Year 1: 10% {grant.stage_1_unlocked ? '✓' : '🔒'}
                        </div>
                        <div className={`stage ${grant.stage_2_unlocked ? 'unlocked' : 'locked'}`}>
                          Year 2: 30% {grant.stage_2_unlocked ? '✓' : '🔒'}
                        </div>
                        <div className={`stage ${grant.stage_3_unlocked ? 'unlocked' : 'locked'}`}>
                          Year 3: 60% {grant.stage_3_unlocked ? '✓' : '🔒'}
                        </div>
                      </div>
                    )}
                    <div className="grant-actions">
                      <button
                        onClick={() => handleClaimRewards(grant.grantId)}
                        disabled={isProcessing || grant.unlockedAmount === grant.claimedAmount}
                        className="btn-primary"
                      >
                        Claim Available
                      </button>
                      {grant.vestingType === 'milestone' && !grant.stage_3_unlocked && (
                        <button
                          onClick={() => handleUnlockMilestone(grant.grantId, grant.stage_1_unlocked ? (grant.stage_2_unlocked ? 3 : 2) : 1)}
                          disabled={isProcessing}
                          className="btn-secondary"
                        >
                          Unlock Next Stage
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== ENTERPRISE DAPP ====================

export const EnterpriseDApp: React.FC<{ network: WalletAdapterNetwork }> = ({ network }) => {
  const { publicKey, connected } = useWallet();
  const programIds = getProgramIds(network);
  const { enterprise, loading, registerEnterprise, addCollateral, requestWithdrawal } = useEnterprise(programIds);
  const [collateralAmount, setCollateralAmount] = useState<string>('');
  const [lockDuration, setLockDuration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleRegister = async () => {
    const amount = parseFloat(collateralAmount);
    if (isNaN(amount) || amount < 100_000) {
      alert('Minimum 100,000 $FRAC required');
      return;
    }

    try {
      setIsProcessing(true);
      const signature = await registerEnterprise(amount * 1e9, lockDuration);
      alert(`Enterprise registered! Tx: ${signature.slice(0, 8)}...`);
      setCollateralAmount('');
    } catch (error: any) {
      alert(error.message || 'Failed to register');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCollateral = async () => {
    const amount = parseFloat(collateralAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter valid amount');
      return;
    }

    try {
      setIsProcessing(true);
      const signature = await addCollateral(amount * 1e9);
      alert(`Collateral added! Tx: ${signature.slice(0, 8)}...`);
      setCollateralAmount('');
    } catch (error: any) {
      alert(error.message || 'Failed to add collateral');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dapp enterprise-dapp">
      <header className="dapp-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏢 Enterprise</h1>
            <p>Business account with premium benefits</p>
          </div>
          <div className="header-right">
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {!connected ? (
        <div className="not-connected">
          <div className="connect-card">
            <h2>Connect Your Wallet</h2>
            <p>Connect to manage enterprise account</p>
            <WalletMultiButton />
          </div>
        </div>
      ) : enterprise ? (
        /* Existing Enterprise */
        <div className="dapp-content">
          <div className="enterprise-overview-card">
            <h2>Your Enterprise Account</h2>
            <div className="enterprise-tier-display">
              <div className="tier-badge-large">Tier {enterprise.tier}</div>
              <div className="tier-name">{['', 'Starter', 'Business', 'Enterprise', 'Institutional'][enterprise.tier]}</div>
            </div>
            <div className="enterprise-stats">
              <div className="stat">
                <span>Collateral</span>
                <span>{(enterprise.collateralAmount / 1e9).toLocaleString()} $FRAC</span>
              </div>
              <div className="stat">
                <span>Lock Duration</span>
                <span>{enterprise.lockDurationMonths} months</span>
              </div>
              <div className="stat">
                <span>Vault Discount</span>
                <span>{enterprise.vaultDiscountBps / 100}%</span>
              </div>
              <div className="stat">
                <span>Trading Discount</span>
                <span>{enterprise.tradingDiscountBps / 100}%</span>
              </div>
            </div>
          </div>

          <div className="add-collateral-form">
            <h3>Add Collateral</h3>
            <div className="form-group">
              <input
                type="number"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                placeholder="Amount to add"
              />
            </div>
            <button onClick={handleAddCollateral} disabled={isProcessing} className="btn-primary">
              {isProcessing ? 'Adding...' : 'Add Collateral'}
            </button>
          </div>
        </div>
      ) : (
        /* Register Enterprise */
        <div className="dapp-content">
          <div className="register-enterprise-form">
            <h2>Register Enterprise Account</h2>
            <div className="tiers-info">
              {APP_CONFIG.enterpriseTiers.map((tier) => (
                <div key={tier.tier} className="tier-info-card">
                  <div className="tier-badge">Tier {tier.tier}</div>
                  <div className="tier-name">{tier.name}</div>
                  <div className="tier-requirement">{tier.collateral.toLocaleString()} $FRAC</div>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label>Collateral Amount</label>
              <input
                type="number"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                placeholder="Minimum 100,000 $FRAC"
                min="100000"
              />
            </div>
            <div className="form-group">
              <label>Lock Duration</label>
              <select value={lockDuration} onChange={(e) => setLockDuration(parseInt(e.target.value))}>
                <option value="0">No lock (1.0x multiplier)</option>
                <option value="6">6 months (1.3x multiplier)</option>
                <option value="12">12 months (1.6x multiplier)</option>
                <option value="24">24 months (2.0x multiplier)</option>
              </select>
            </div>
            <button onClick={handleRegister} disabled={isProcessing || !collateralAmount} className="btn-primary btn-large">
              {isProcessing ? 'Registering...' : 'Register Enterprise'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== BRIDGE DAPP ====================

export const BridgeDApp: React.FC<{ network: WalletAdapterNetwork }> = ({ network }) => {
  const { publicKey, connected } = useWallet();
  const programIds = getProgramIds(network);
  const { bridgeOut, getTransferStatus } = useBridge(programIds);
  const [amount, setAmount] = useState<string>('');
  const [targetChain, setTargetChain] = useState<number>(2);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleBridge = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < APP_CONFIG.bridge.minAmount) {
      alert(`Minimum ${APP_CONFIG.bridge.minAmount} $FRAC required`);
      return;
    }

    if (amt > APP_CONFIG.bridge.maxAmount) {
      alert(`Maximum ${APP_CONFIG.bridge.maxAmount} $FRAC per transfer`);
      return;
    }

    if (!recipientAddress) {
      alert('Please enter recipient address');
      return;
    }

    try {
      setIsProcessing(true);
      const result = await bridgeOut({
        amount: amt,
        targetChain,
        recipientAddress,
      });
      alert(`Bridge initiated! Transfer #${result.transferNonce}`);
      setAmount('');
      setRecipientAddress('');
    } catch (error: any) {
      alert(error.message || 'Bridge failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dapp bridge-dapp">
      <header className="dapp-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🌉 Bridge</h1>
            <p>Transfer $FRAC across chains</p>
          </div>
          <div className="header-right">
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {!connected ? (
        <div className="not-connected">
          <div className="connect-card">
            <h2>Connect Your Wallet</h2>
            <p>Connect to bridge tokens</p>
            <WalletMultiButton />
          </div>
        </div>
      ) : (
        <div className="dapp-content">
          <div className="bridge-form">
            <h2>Bridge $FRAC Tokens</h2>
            <div className="chain-selector">
              <div className="chain-from">
                <div className="chain-label">From</div>
                <div className="chain-name">Solana</div>
              </div>
              <div className="arrow">→</div>
              <div className="chain-to">
                <div className="chain-label">To</div>
                <select value={targetChain} onChange={(e) => setTargetChain(parseInt(e.target.value))}>
                  <option value="2">Ethereum</option>
                  <option value="4">BSC</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={APP_CONFIG.bridge.minAmount}
                max={APP_CONFIG.bridge.maxAmount}
              />
              <small>Min: {APP_CONFIG.bridge.minAmount} | Max: {APP_CONFIG.bridge.maxAmount.toLocaleString()} $FRAC</small>
            </div>
            <div className="form-group">
              <label>Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            {amount && (
              <div className="bridge-summary">
                <div className="summary-row">
                  <span>Amount</span>
                  <span>{parseFloat(amount).toLocaleString()} $FRAC</span>
                </div>
                <div className="summary-row">
                  <span>Bridge Fee</span>
                  <span>{APP_CONFIG.bridge.fee} $FRAC</span>
                </div>
                <div className="summary-row total">
                  <span>You'll Receive</span>
                  <span>{(parseFloat(amount) - APP_CONFIG.bridge.fee).toLocaleString()} $FRAC</span>
                </div>
              </div>
            )}
            <button onClick={handleBridge} disabled={isProcessing || !amount || !recipientAddress} className="btn-primary btn-large">
              {isProcessing ? 'Bridging...' : 'Bridge Tokens'}
            </button>
            <div className="info-box">
              <h4>Bridging Info</h4>
              <ul>
                <li>Powered by Wormhole protocol</li>
                <li>Typical transfer time: 5-15 minutes</li>
                <li>Fee: {APP_CONFIG.bridge.fee} $FRAC per transfer</li>
                <li>Ensure recipient address is correct - transfers are irreversible</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
