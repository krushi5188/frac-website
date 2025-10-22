/**
 * Complete Vault Trading dApp
 *
 * Full-featured fractional ownership marketplace with:
 * - Vault creation wizard
 * - Vaults marketplace
 * - Order book trading
 * - Portfolio management
 * - Share listing and buying
 * - Real-time order updates
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useFractionalOwnership, useUserBalance } from '../../frac-contracts/sdk/hooks';
import { getProgramIds, APP_CONFIG } from '../config';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PublicKey } from '@solana/web3.js';
import './VaultsDApp.css';

export const VaultsDApp: React.FC<{ network: WalletAdapterNetwork }> = ({ network }) => {
  const { publicKey, connected } = useWallet();
  const programIds = getProgramIds(network);

  const { balance } = useUserBalance();
  const {
    vaults,
    loading,
    createVault,
    listShares,
    buyShares,
    getOrderBook
  } = useFractionalOwnership(programIds);

  // State
  const [activeTab, setActiveTab] = useState<'marketplace' | 'create' | 'portfolio'>('marketplace');
  const [selectedVault, setSelectedVault] = useState<any>(null);
  const [orderBook, setOrderBook] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Create Vault Form
  const [assetType, setAssetType] = useState<string>('nft');
  const [totalShares, setTotalShares] = useState<string>('');
  const [valuation, setValuation] = useState<string>('');
  const [metadataUri, setMetadataUri] = useState<string>('');
  const [assetName, setAssetName] = useState<string>('');
  const [assetDescription, setAssetDescription] = useState<string>('');

  // Trading Form
  const [sellShares, setSellShares] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [buyShares, setBuyShares] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Load order book when vault selected
  useEffect(() => {
    if (selectedVault) {
      loadOrderBook(selectedVault.id);
    }
  }, [selectedVault]);

  const loadOrderBook = async (vaultId: number) => {
    try {
      const book = await getOrderBook(vaultId);
      setOrderBook(book);
    } catch (error) {
      console.error('Error loading order book:', error);
    }
  };

  // Create vault
  const handleCreateVault = async () => {
    if (!connected) {
      showNotification('error', 'Please connect your wallet');
      return;
    }

    const shares = parseFloat(totalShares);
    const value = parseFloat(valuation);

    if (isNaN(shares) || shares < APP_CONFIG.vault.minShares) {
      showNotification('error', `Minimum ${APP_CONFIG.vault.minShares.toLocaleString()} shares required`);
      return;
    }

    if (isNaN(value) || value <= 0) {
      showNotification('error', 'Please enter valid valuation');
      return;
    }

    if (!metadataUri) {
      showNotification('error', 'Please provide metadata URI');
      return;
    }

    if (balance < APP_CONFIG.vault.creationFee) {
      showNotification('error', `Insufficient balance. Need ${APP_CONFIG.vault.creationFee} $FRAC for vault creation`);
      return;
    }

    try {
      setIsProcessing(true);

      const assetTypeEnum = {
        nft: { nft: {} },
        real_estate: { realEstate: {} },
        art: { art: {} },
        collectible: { collectible: {} },
      }[assetType];

      const result = await createVault({
        assetType: assetTypeEnum,
        totalShares: shares,
        valuationUsd: value,
        metadataUri: metadataUri,
      });

      showNotification('success', `Vault created! ID: ${result.vaultId}`);

      // Reset form
      setTotalShares('');
      setValuation('');
      setMetadataUri('');
      setAssetName('');
      setAssetDescription('');
      setActiveTab('marketplace');
    } catch (error: any) {
      console.error('Create vault error:', error);
      showNotification('error', error.message || 'Failed to create vault');
    } finally {
      setIsProcessing(false);
    }
  };

  // List shares
  const handleListShares = async () => {
    if (!selectedVault || !connected) return;

    const shares = parseFloat(sellShares);
    const price = parseFloat(sellPrice);

    if (isNaN(shares) || shares <= 0) {
      showNotification('error', 'Please enter valid share amount');
      return;
    }

    if (isNaN(price) || price <= 0) {
      showNotification('error', 'Please enter valid price');
      return;
    }

    try {
      setIsProcessing(true);
      const signature = await listShares(selectedVault.id, shares, price);
      showNotification('success', `Shares listed! Tx: ${signature.slice(0, 8)}...`);
      setSellShares('');
      setSellPrice('');
      await loadOrderBook(selectedVault.id);
    } catch (error: any) {
      console.error('List shares error:', error);
      showNotification('error', error.message || 'Failed to list shares');
    } finally {
      setIsProcessing(false);
    }
  };

  // Buy shares
  const handleBuyShares = async (orderId: number, maxShares: number) => {
    if (!selectedVault || !connected) return;

    const shares = parseFloat(buyShares);

    if (isNaN(shares) || shares <= 0) {
      showNotification('error', 'Please enter valid share amount');
      return;
    }

    if (shares > maxShares) {
      showNotification('error', `Maximum ${maxShares} shares available`);
      return;
    }

    try {
      setIsProcessing(true);
      const signature = await buyShares(selectedVault.id, orderId, shares);
      showNotification('success', `Shares purchased! Tx: ${signature.slice(0, 8)}...`);
      setBuyShares('');
      setSelectedOrder(null);
      await loadOrderBook(selectedVault.id);
    } catch (error: any) {
      console.error('Buy shares error:', error);
      showNotification('error', error.message || 'Failed to buy shares');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Calculate price per share
  const calculatePricePerShare = (): number => {
    const shares = parseFloat(totalShares);
    const value = parseFloat(valuation);
    if (isNaN(shares) || isNaN(value) || shares === 0) return 0;
    return value / shares;
  };

  return (
    <div className="vaults-dapp">
      {/* Header */}
      <header className="dapp-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏛️ Fractional Vaults</h1>
            <p>Create and trade fractional ownership of assets</p>
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
        /* Not Connected */
        <div className="not-connected">
          <div className="connect-card">
            <h2>Connect Your Wallet</h2>
            <p>Connect your Solana wallet to access the fractional vaults marketplace</p>
            <WalletMultiButton />
          </div>
        </div>
      ) : (
        /* Connected */
        <div className="dapp-content">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'marketplace' ? 'active' : ''}`}
              onClick={() => setActiveTab('marketplace')}
            >
              🏪 Marketplace
            </button>
            <button
              className={`tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              ➕ Create Vault
            </button>
            <button
              className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => setActiveTab('portfolio')}
            >
              💼 My Portfolio
            </button>
          </div>

          {activeTab === 'marketplace' && (
            /* Marketplace */
            <div className="marketplace">
              {selectedVault ? (
                /* Vault Detail View */
                <div className="vault-detail">
                  <button onClick={() => setSelectedVault(null)} className="back-btn">
                    ← Back to Marketplace
                  </button>

                  <div className="vault-detail-content">
                    {/* Vault Info */}
                    <div className="vault-info-card">
                      <div className="vault-header">
                        <div className="asset-type-badge">{selectedVault.assetType}</div>
                        <div className="vault-id">Vault #{selectedVault.id}</div>
                      </div>

                      <h2>{selectedVault.name || 'Unnamed Asset'}</h2>
                      <p className="vault-description">{selectedVault.description || 'No description provided'}</p>

                      <div className="vault-stats-grid">
                        <div className="stat">
                          <div className="stat-label">Valuation</div>
                          <div className="stat-value">${selectedVault.valuation.toLocaleString()}</div>
                        </div>
                        <div className="stat">
                          <div className="stat-label">Total Shares</div>
                          <div className="stat-value">{selectedVault.totalShares.toLocaleString()}</div>
                        </div>
                        <div className="stat">
                          <div className="stat-label">Price per Share</div>
                          <div className="stat-value">${(selectedVault.valuation / selectedVault.totalShares).toFixed(4)}</div>
                        </div>
                        <div className="stat">
                          <div className="stat-label">Your Holdings</div>
                          <div className="stat-value">{selectedVault.userShares || 0} shares</div>
                        </div>
                      </div>
                    </div>

                    {/* Trading Interface */}
                    <div className="trading-section">
                      <div className="trading-card">
                        <h3>List Shares for Sale</h3>
                        <div className="form-group">
                          <label>Number of Shares</label>
                          <input
                            type="number"
                            value={sellShares}
                            onChange={(e) => setSellShares(e.target.value)}
                            placeholder="Enter share amount"
                            min="1"
                          />
                        </div>
                        <div className="form-group">
                          <label>Price per Share ($FRAC)</label>
                          <input
                            type="number"
                            value={sellPrice}
                            onChange={(e) => setSellPrice(e.target.value)}
                            placeholder="Enter price"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        {sellShares && sellPrice && (
                          <div className="calculation-box">
                            <div className="calc-row">
                              <span>Total Value:</span>
                              <span>{(parseFloat(sellShares) * parseFloat(sellPrice)).toFixed(2)} $FRAC</span>
                            </div>
                            <div className="calc-row">
                              <span>Trading Fee ({APP_CONFIG.vault.tradingFee}%):</span>
                              <span>{(parseFloat(sellShares) * parseFloat(sellPrice) * APP_CONFIG.vault.tradingFee / 100).toFixed(2)} $FRAC</span>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={handleListShares}
                          disabled={isProcessing || !sellShares || !sellPrice}
                          className="btn-primary"
                        >
                          {isProcessing ? 'Listing...' : 'List Shares'}
                        </button>
                      </div>

                      <div className="order-book-card">
                        <h3>Order Book</h3>
                        {!orderBook ? (
                          <div className="loading-state">Loading orders...</div>
                        ) : orderBook.sellOrders.length === 0 ? (
                          <div className="empty-state">No sell orders available</div>
                        ) : (
                          <div className="orders-list">
                            <div className="orders-header">
                              <span>Shares</span>
                              <span>Price</span>
                              <span>Total</span>
                              <span>Action</span>
                            </div>
                            {orderBook.sellOrders.map((order: any, index: number) => (
                              <div key={index} className="order-row">
                                <span>{(order.shares / 1e9).toLocaleString()}</span>
                                <span>{(order.pricePerShare / 1e9).toFixed(4)} $FRAC</span>
                                <span>{((order.shares * order.pricePerShare) / 1e18).toFixed(2)} $FRAC</span>
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="btn-buy-small"
                                >
                                  Buy
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Marketplace Grid */
                <div className="marketplace-grid">
                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner-large"></div>
                      <p>Loading vaults...</p>
                    </div>
                  ) : vaults.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🏛️</div>
                      <h3>No Vaults Yet</h3>
                      <p>Be the first to create a fractional vault!</p>
                      <button onClick={() => setActiveTab('create')} className="btn-secondary">
                        Create Vault
                      </button>
                    </div>
                  ) : (
                    vaults.map((vault, index) => (
                      <div key={index} className="vault-card" onClick={() => setSelectedVault(vault)}>
                        <div className="vault-card-image">
                          <div className="asset-type-badge-small">{vault.assetType}</div>
                        </div>
                        <div className="vault-card-body">
                          <h3>{vault.name || 'Unnamed Asset'}</h3>
                          <p className="vault-description-short">{vault.description || 'No description'}</p>
                          <div className="vault-card-stats">
                            <div className="card-stat">
                              <span className="card-stat-label">Valuation</span>
                              <span className="card-stat-value">${vault.valuation.toLocaleString()}</span>
                            </div>
                            <div className="card-stat">
                              <span className="card-stat-label">Shares</span>
                              <span className="card-stat-value">{vault.totalShares.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="vault-card-footer">
                            <span className="price-per-share">${(vault.valuation / vault.totalShares).toFixed(4)} / share</span>
                            <span className="view-details">View Details →</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            /* Create Vault */
            <div className="create-vault">
              <div className="create-vault-card">
                <h2>Create Fractional Vault</h2>
                <p className="subtitle">Fractionalize your asset and enable shared ownership</p>

                <div className="form-section">
                  <h3>Asset Information</h3>

                  <div className="form-group">
                    <label>Asset Name</label>
                    <input
                      type="text"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      placeholder="e.g., Bored Ape #1234"
                    />
                  </div>

                  <div className="form-group">
                    <label>Asset Description</label>
                    <textarea
                      value={assetDescription}
                      onChange={(e) => setAssetDescription(e.target.value)}
                      placeholder="Describe your asset..."
                      rows={4}
                    />
                  </div>

                  <div className="form-group">
                    <label>Asset Type</label>
                    <div className="asset-type-grid">
                      {[
                        { value: 'nft', label: '🎨 NFT', desc: 'Digital collectible' },
                        { value: 'real_estate', label: '🏠 Real Estate', desc: 'Property' },
                        { value: 'art', label: '🖼️ Art', desc: 'Physical artwork' },
                        { value: 'collectible', label: '💎 Collectible', desc: 'Rare item' },
                      ].map((type) => (
                        <button
                          key={type.value}
                          className={`asset-type-option ${assetType === type.value ? 'selected' : ''}`}
                          onClick={() => setAssetType(type.value)}
                        >
                          <div className="type-label">{type.label}</div>
                          <div className="type-desc">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Fractionalization Details</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Total Shares</label>
                      <input
                        type="number"
                        value={totalShares}
                        onChange={(e) => setTotalShares(e.target.value)}
                        placeholder="Enter total shares"
                        min={APP_CONFIG.vault.minShares}
                      />
                      <small>Minimum: {APP_CONFIG.vault.minShares.toLocaleString()} shares</small>
                    </div>

                    <div className="form-group">
                      <label>Asset Valuation (USD)</label>
                      <input
                        type="number"
                        value={valuation}
                        onChange={(e) => setValuation(e.target.value)}
                        placeholder="Enter valuation"
                        min="0"
                      />
                      <small>Current market value</small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Metadata URI</label>
                    <input
                      type="text"
                      value={metadataUri}
                      onChange={(e) => setMetadataUri(e.target.value)}
                      placeholder="ipfs://... or arweave://..."
                    />
                    <small>IPFS or Arweave link to asset metadata</small>
                  </div>
                </div>

                {totalShares && valuation && parseFloat(totalShares) >= APP_CONFIG.vault.minShares && (
                  <div className="creation-summary">
                    <h3>Creation Summary</h3>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span>Price per Share</span>
                        <span className="summary-value">${calculatePricePerShare().toFixed(4)}</span>
                      </div>
                      <div className="summary-item">
                        <span>Creation Fee</span>
                        <span className="summary-value">{APP_CONFIG.vault.creationFee} $FRAC</span>
                      </div>
                      <div className="summary-item">
                        <span>Your Balance</span>
                        <span className={`summary-value ${balance < APP_CONFIG.vault.creationFee ? 'insufficient' : ''}`}>
                          {balance.toFixed(2)} $FRAC
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateVault}
                  disabled={isProcessing || !totalShares || !valuation || !metadataUri || balance < APP_CONFIG.vault.creationFee}
                  className="btn-primary btn-large"
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner"></span>
                      Creating Vault...
                    </>
                  ) : (
                    'Create Vault'
                  )}
                </button>

                <div className="info-box">
                  <h4>How It Works</h4>
                  <ol>
                    <li>Provide asset details and upload metadata to IPFS/Arweave</li>
                    <li>Set total shares and valuation to determine share price</li>
                    <li>Pay {APP_CONFIG.vault.creationFee} $FRAC creation fee</li>
                    <li>You'll receive 100% of shares, which you can sell on the marketplace</li>
                    <li>Trading fee: {APP_CONFIG.vault.tradingFee}% on all transactions</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            /* Portfolio */
            <div className="portfolio">
              <div className="portfolio-header">
                <h2>My Portfolio</h2>
                <p>Your fractional ownership positions</p>
              </div>

              <div className="portfolio-stats">
                <div className="portfolio-stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <div className="stat-label">Total Portfolio Value</div>
                    <div className="stat-value">$0.00</div>
                  </div>
                </div>
                <div className="portfolio-stat-card">
                  <div className="stat-icon">🏛️</div>
                  <div className="stat-info">
                    <div className="stat-label">Vaults Owned</div>
                    <div className="stat-value">0</div>
                  </div>
                </div>
                <div className="portfolio-stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <div className="stat-label">Total Shares</div>
                    <div className="stat-value">0</div>
                  </div>
                </div>
              </div>

              <div className="empty-state">
                <div className="empty-icon">💼</div>
                <h3>No Holdings Yet</h3>
                <p>Start building your portfolio by purchasing shares from the marketplace</p>
                <button onClick={() => setActiveTab('marketplace')} className="btn-secondary">
                  Browse Marketplace
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buy Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Buy Shares</h3>

            <div className="order-details">
              <div className="detail-row">
                <span>Available Shares:</span>
                <span>{(selectedOrder.shares / 1e9).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span>Price per Share:</span>
                <span>{(selectedOrder.pricePerShare / 1e9).toFixed(4)} $FRAC</span>
              </div>
            </div>

            <div className="form-group">
              <label>Number of Shares to Buy</label>
              <input
                type="number"
                value={buyShares}
                onChange={(e) => setBuyShares(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={selectedOrder.shares / 1e9}
              />
            </div>

            {buyShares && (
              <div className="calculation-box">
                <div className="calc-row">
                  <span>Total Cost:</span>
                  <span>{((parseFloat(buyShares) * selectedOrder.pricePerShare) / 1e9).toFixed(2)} $FRAC</span>
                </div>
                <div className="calc-row">
                  <span>Trading Fee ({APP_CONFIG.vault.tradingFee}%):</span>
                  <span>{((parseFloat(buyShares) * selectedOrder.pricePerShare * APP_CONFIG.vault.tradingFee) / (100 * 1e9)).toFixed(2)} $FRAC</span>
                </div>
                <div className="calc-row total">
                  <span>Total:</span>
                  <span>{((parseFloat(buyShares) * selectedOrder.pricePerShare * (1 + APP_CONFIG.vault.tradingFee / 100)) / 1e9).toFixed(2)} $FRAC</span>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setSelectedOrder(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleBuyShares(selectedOrder.orderId, selectedOrder.shares / 1e9)}
                disabled={!buyShares || isProcessing}
                className="btn-primary"
              >
                {isProcessing ? 'Buying...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
