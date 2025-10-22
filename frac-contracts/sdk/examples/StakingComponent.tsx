/**
 * Example Staking Component
 *
 * Demonstrates how to use the staking hooks for a complete staking interface
 */

import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useStaking, useUserBalance, useStakingConfig } from "../hooks";
import { ProgramIds } from "../index";

interface StakingComponentProps {
  programIds: ProgramIds;
}

export function StakingComponent({ programIds }: StakingComponentProps) {
  const { balance, loading: balanceLoading } = useUserBalance();
  const { stakes, loading, createStake, claimRewards, unstake } = useStaking(programIds);
  const { config } = useStakingConfig(programIds);

  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [isStaking, setIsStaking] = useState<boolean>(false);

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > balance) {
      alert("Insufficient balance");
      return;
    }

    try {
      setIsStaking(true);

      const stakeType =
        selectedDuration === 0
          ? { flexible: {} }
          : { fixedTerm: {} };

      const signature = await createStake(amount, stakeType, selectedDuration);

      alert(`Stake created successfully! Transaction: ${signature}`);
      setStakeAmount("");
    } catch (error) {
      console.error("Error creating stake:", error);
      alert("Failed to create stake");
    } finally {
      setIsStaking(false);
    }
  };

  const handleClaimRewards = async (stakeAccount: string) => {
    try {
      const signature = await claimRewards(new PublicKey(stakeAccount));
      alert(`Rewards claimed! Transaction: ${signature}`);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      alert("Failed to claim rewards");
    }
  };

  const handleUnstake = async (stakeAccount: string, amount: number) => {
    try {
      const signature = await unstake(new PublicKey(stakeAccount), amount);
      alert(`Unstaked successfully! Transaction: ${signature}`);
    } catch (error) {
      console.error("Error unstaking:", error);
      alert("Failed to unstake");
    }
  };

  const getApyForDuration = (days: number): number => {
    if (!config) return 0;
    if (days === 0) return config.flexibleApy;
    if (days === 30) return config.apy30Days;
    if (days === 90) return config.apy90Days;
    if (days === 180) return config.apy180Days;
    if (days === 365) return config.apy365Days;
    return config.flexibleApy;
  };

  return (
    <div className="staking-container">
      <h1>Stake $FRAC Tokens</h1>

      {/* Balance Display */}
      <div className="balance-card">
        <h3>Your Balance</h3>
        {balanceLoading ? (
          <p>Loading...</p>
        ) : (
          <p className="balance-amount">{balance.toLocaleString()} $FRAC</p>
        )}
      </div>

      {/* Staking Form */}
      <div className="stake-form">
        <h3>Create New Stake</h3>

        <div className="form-group">
          <label>Amount to Stake</label>
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="Enter amount"
            min="100"
            step="1"
          />
          <small>Minimum: 100 $FRAC</small>
        </div>

        <div className="form-group">
          <label>Lock Duration</label>
          <select
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
          >
            <option value="0">Flexible (5% APY)</option>
            <option value="30">30 Days (7% APY)</option>
            <option value="90">90 Days (10% APY)</option>
            <option value="180">180 Days (13% APY)</option>
            <option value="365">365 Days (16% APY)</option>
          </select>
        </div>

        <div className="apy-info">
          <p>
            <strong>APY:</strong> {getApyForDuration(selectedDuration)}%
          </p>
          <p>
            <strong>Type:</strong> {selectedDuration === 0 ? "Flexible" : "Fixed-Term"}
          </p>
          {selectedDuration > 0 && (
            <p className="warning">
              ⚠️ Early unstaking incurs 10% penalty
            </p>
          )}
        </div>

        <button
          onClick={handleStake}
          disabled={isStaking || balanceLoading || !stakeAmount}
          className="btn-primary"
        >
          {isStaking ? "Staking..." : "Stake Tokens"}
        </button>
      </div>

      {/* Active Stakes */}
      <div className="stakes-list">
        <h3>Your Active Stakes</h3>

        {loading ? (
          <p>Loading stakes...</p>
        ) : stakes.length === 0 ? (
          <p>No active stakes</p>
        ) : (
          <div className="stakes-grid">
            {stakes.map((stake, index) => (
              <div key={index} className="stake-card">
                <div className="stake-header">
                  <h4>
                    {stake.lockDurationDays === 0 ? "Flexible Stake" : `${stake.lockDurationDays}-Day Stake`}
                  </h4>
                  <span className={`badge ${stake.isActive ? "active" : "inactive"}`}>
                    {stake.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="stake-details">
                  <p>
                    <strong>Amount:</strong> {(stake.amount / 1e9).toLocaleString()} $FRAC
                  </p>
                  <p>
                    <strong>APY:</strong> {(stake.apyRate / 100).toFixed(2)}%
                  </p>
                  <p>
                    <strong>Priority Tier:</strong> {stake.priorityTier}
                  </p>
                  <p>
                    <strong>Start Date:</strong>{" "}
                    {new Date(stake.startTime * 1000).toLocaleDateString()}
                  </p>
                  {stake.lockDurationDays > 0 && (
                    <p>
                      <strong>End Date:</strong>{" "}
                      {new Date(stake.endTime * 1000).toLocaleDateString()}
                    </p>
                  )}
                  <p>
                    <strong>Pending Rewards:</strong> {stake.pendingRewards || 0} $FRAC
                  </p>
                </div>

                <div className="stake-actions">
                  <button
                    onClick={() => handleClaimRewards(stake.publicKey)}
                    className="btn-secondary"
                    disabled={!stake.pendingRewards || stake.pendingRewards === 0}
                  >
                    Claim Rewards
                  </button>
                  <button
                    onClick={() => handleUnstake(stake.publicKey, stake.amount)}
                    className="btn-danger"
                  >
                    Unstake
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staking Information */}
      <div className="info-section">
        <h3>About Staking</h3>
        <ul>
          <li>Minimum stake: 100 $FRAC</li>
          <li>Flexible staking: No lock period, 5% APY, unstake anytime</li>
          <li>Fixed-term staking: Higher APY, early unstaking incurs 10% penalty</li>
          <li>Staked tokens count 2x toward your Access Control tier</li>
          <li>Staked tokens provide voting power in Governance</li>
        </ul>
      </div>
    </div>
  );
}

// Styles (would be in a separate CSS file)
const styles = `
.staking-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.balance-amount {
  font-size: 2.5rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.stake-form {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
}

.apy-info {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.warning {
  color: #e53e3e;
  font-weight: 600;
}

.btn-primary {
  background: #667eea;
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-primary:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.stakes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.stake-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stake-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge.active {
  background: #c6f6d5;
  color: #22543d;
}

.stake-details p {
  margin: 0.5rem 0;
}

.stake-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-secondary {
  flex: 1;
  background: #48bb78;
  color: white;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-danger {
  flex: 1;
  background: #f56565;
  color: white;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.info-section {
  background: #edf2f7;
  padding: 2rem;
  border-radius: 12px;
  margin-top: 2rem;
}

.info-section ul {
  list-style-position: inside;
}

.info-section li {
  margin: 0.5rem 0;
}
`;
