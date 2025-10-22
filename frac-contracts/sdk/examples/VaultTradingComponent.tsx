/**
 * Example Vault Trading Component
 *
 * Demonstrates fractional ownership vault creation and share trading
 */

import React, { useState, useEffect } from "react";
import { useFractionalOwnership, useUserBalance } from "../hooks";
import { ProgramIds } from "../index";

interface VaultTradingComponentProps {
  programIds: ProgramIds;
  vaultId: number;
}

export function VaultTradingComponent({ programIds, vaultId }: VaultTradingComponentProps) {
  const { balance } = useUserBalance();
  const { loading, listShares, buyShares, getOrderBook } = useFractionalOwnership(programIds);

  const [orderBook, setOrderBook] = useState<any>(null);
  const [sellAmount, setSellAmount] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [buyAmount, setBuyAmount] = useState<string>("");

  useEffect(() => {
    loadOrderBook();
  }, [vaultId]);

  const loadOrderBook = async () => {
    try {
      const book = await getOrderBook(vaultId);
      setOrderBook(book);
    } catch (error) {
      console.error("Error loading order book:", error);
    }
  };

  const handleListShares = async () => {
    const shares = parseFloat(sellAmount);
    const price = parseFloat(sellPrice);

    if (isNaN(shares) || shares <= 0) {
      alert("Please enter valid share amount");
      return;
    }

    if (isNaN(price) || price <= 0) {
      alert("Please enter valid price");
      return;
    }

    try {
      const signature = await listShares(vaultId, shares, price);
      alert(`Shares listed successfully! Transaction: ${signature}`);
      setSellAmount("");
      setSellPrice("");
      await loadOrderBook();
    } catch (error) {
      console.error("Error listing shares:", error);
      alert("Failed to list shares");
    }
  };

  const handleBuyShares = async (orderId: number, maxShares: number) => {
    const shares = parseFloat(buyAmount);

    if (isNaN(shares) || shares <= 0) {
      alert("Please enter valid share amount");
      return;
    }

    if (shares > maxShares) {
      alert(`Maximum ${maxShares} shares available`);
      return;
    }

    try {
      const signature = await buyShares(vaultId, orderId, shares);
      alert(`Shares purchased successfully! Transaction: ${signature}`);
      setBuyAmount("");
      setSelectedOrder(null);
      await loadOrderBook();
    } catch (error) {
      console.error("Error buying shares:", error);
      alert("Failed to buy shares");
    }
  };

  return (
    <div className="vault-trading-container">
      <h1>Vault #{vaultId} - Share Trading</h1>

      <div className="trading-layout">
        {/* Sell Shares Section */}
        <div className="trading-card">
          <h2>List Shares for Sale</h2>

          <div className="form-group">
            <label>Number of Shares</label>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
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

          {sellAmount && sellPrice && (
            <div className="calculation">
              <p>
                <strong>Total Value:</strong>{" "}
                {(parseFloat(sellAmount) * parseFloat(sellPrice)).toFixed(2)} $FRAC
              </p>
              <p>
                <strong>Trading Fee (0.25%):</strong>{" "}
                {(parseFloat(sellAmount) * parseFloat(sellPrice) * 0.0025).toFixed(2)} $FRAC
              </p>
            </div>
          )}

          <button
            onClick={handleListShares}
            disabled={loading || !sellAmount || !sellPrice}
            className="btn-primary"
          >
            {loading ? "Listing..." : "List Shares"}
          </button>
        </div>

        {/* Order Book Display */}
        <div className="order-book-container">
          <h2>Order Book</h2>

          {!orderBook ? (
            <p>Loading order book...</p>
          ) : (
            <>
              {/* Sell Orders */}
              <div className="orders-section">
                <h3>Sell Orders</h3>
                {orderBook.sellOrders.length === 0 ? (
                  <p className="empty-state">No sell orders</p>
                ) : (
                  <div className="orders-list">
                    <div className="orders-header">
                      <span>Shares</span>
                      <span>Price</span>
                      <span>Total</span>
                      <span>Action</span>
                    </div>
                    {orderBook.sellOrders.map((order: any, index: number) => (
                      <div key={index} className="order-row sell-order">
                        <span>{(order.shares / 1e9).toLocaleString()}</span>
                        <span>{(order.pricePerShare / 1e9).toFixed(4)} $FRAC</span>
                        <span>
                          {((order.shares * order.pricePerShare) / 1e18).toFixed(2)} $FRAC
                        </span>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setBuyAmount("");
                          }}
                          className="btn-buy"
                        >
                          Buy
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buy Orders (if implemented) */}
              <div className="orders-section">
                <h3>Buy Orders</h3>
                {orderBook.buyOrders.length === 0 ? (
                  <p className="empty-state">No buy orders</p>
                ) : (
                  <div className="orders-list">
                    {orderBook.buyOrders.map((order: any, index: number) => (
                      <div key={index} className="order-row buy-order">
                        <span>{(order.shares / 1e9).toLocaleString()} shares</span>
                        <span>@ {(order.pricePerShare / 1e9).toFixed(4)} $FRAC</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Buy Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Buy Shares</h3>

            <div className="order-details">
              <p>
                <strong>Available Shares:</strong> {(selectedOrder.shares / 1e9).toLocaleString()}
              </p>
              <p>
                <strong>Price per Share:</strong>{" "}
                {(selectedOrder.pricePerShare / 1e9).toFixed(4)} $FRAC
              </p>
            </div>

            <div className="form-group">
              <label>Number of Shares to Buy</label>
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={selectedOrder.shares / 1e9}
              />
            </div>

            {buyAmount && (
              <div className="calculation">
                <p>
                  <strong>Total Cost:</strong>{" "}
                  {(
                    (parseFloat(buyAmount) * selectedOrder.pricePerShare) /
                    1e9
                  ).toFixed(2)}{" "}
                  $FRAC
                </p>
                <p>
                  <strong>Trading Fee (0.25%):</strong>{" "}
                  {(
                    (parseFloat(buyAmount) * selectedOrder.pricePerShare * 0.0025) /
                    1e9
                  ).toFixed(2)}{" "}
                  $FRAC
                </p>
                <p>
                  <strong>Your Balance:</strong> {balance.toFixed(2)} $FRAC
                </p>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setSelectedOrder(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleBuyShares(selectedOrder.orderId, selectedOrder.shares / 1e9)}
                disabled={!buyAmount || loading}
                className="btn-primary"
              >
                {loading ? "Buying..." : "Confirm Purchase"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trading Information */}
      <div className="info-section">
        <h3>Trading Information</h3>
        <ul>
          <li>Trading fee: 0.25% of transaction value</li>
          <li>Fees are distributed to rewards pool</li>
          <li>Maximum 100 orders per vault</li>
          <li>Orders can be cancelled anytime before filling</li>
          <li>Enterprise accounts receive discounted trading fees</li>
        </ul>
      </div>
    </div>
  );
}

// Vault Creation Component
export function CreateVaultComponent({ programIds }: { programIds: ProgramIds }) {
  const { createVault, loading } = useFractionalOwnership(programIds);
  const [assetType, setAssetType] = useState<string>("nft");
  const [totalShares, setTotalShares] = useState<string>("");
  const [valuation, setValuation] = useState<string>("");
  const [metadataUri, setMetadataUri] = useState<string>("");

  const handleCreateVault = async () => {
    const shares = parseFloat(totalShares);
    const value = parseFloat(valuation);

    if (isNaN(shares) || shares < 1000) {
      alert("Minimum 1,000 shares required");
      return;
    }

    if (isNaN(value) || value <= 0) {
      alert("Please enter valid valuation");
      return;
    }

    if (!metadataUri) {
      alert("Please provide metadata URI");
      return;
    }

    const assetTypeEnum = {
      nft: { nft: {} },
      real_estate: { realEstate: {} },
      art: { art: {} },
      collectible: { collectible: {} },
    }[assetType];

    try {
      const result = await createVault({
        assetType: assetTypeEnum,
        totalShares: shares,
        valuationUsd: value,
        metadataUri: metadataUri,
      });

      alert(`Vault created! Vault ID: ${result.vaultId}, Transaction: ${result.signature}`);

      // Reset form
      setTotalShares("");
      setValuation("");
      setMetadataUri("");
    } catch (error) {
      console.error("Error creating vault:", error);
      alert("Failed to create vault");
    }
  };

  return (
    <div className="create-vault-container">
      <h1>Create Fractional Vault</h1>

      <div className="vault-form">
        <div className="form-group">
          <label>Asset Type</label>
          <select value={assetType} onChange={(e) => setAssetType(e.target.value)}>
            <option value="nft">NFT</option>
            <option value="real_estate">Real Estate</option>
            <option value="art">Art</option>
            <option value="collectible">Collectible</option>
          </select>
        </div>

        <div className="form-group">
          <label>Total Shares</label>
          <input
            type="number"
            value={totalShares}
            onChange={(e) => setTotalShares(e.target.value)}
            placeholder="Enter total shares"
            min="1000"
          />
          <small>Minimum: 1,000 shares</small>
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
        </div>

        <div className="form-group">
          <label>Metadata URI (IPFS or Arweave)</label>
          <input
            type="text"
            value={metadataUri}
            onChange={(e) => setMetadataUri(e.target.value)}
            placeholder="ipfs://..."
          />
        </div>

        {totalShares && valuation && (
          <div className="calculation">
            <p>
              <strong>Price per Share:</strong> ${(parseFloat(valuation) / parseFloat(totalShares)).toFixed(2)}
            </p>
            <p>
              <strong>Creation Fee:</strong> 100 $FRAC
            </p>
          </div>
        )}

        <button
          onClick={handleCreateVault}
          disabled={loading || !totalShares || !valuation || !metadataUri}
          className="btn-primary"
        >
          {loading ? "Creating..." : "Create Vault"}
        </button>
      </div>
    </div>
  );
}

// Additional styles
const styles = `
.vault-trading-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.trading-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.trading-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.order-book-container {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.orders-section {
  margin-bottom: 2rem;
}

.orders-list {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.orders-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 100px;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #f7fafc;
  font-weight: 600;
}

.order-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 100px;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid #e2e8f0;
  align-items: center;
}

.order-row.sell-order {
  background: #fff5f5;
}

.order-row.buy-order {
  background: #f0fff4;
}

.btn-buy {
  background: #48bb78;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-buy:hover {
  background: #38a169;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-actions button {
  flex: 1;
}

.calculation {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.calculation p {
  margin: 0.5rem 0;
}

.empty-state {
  text-align: center;
  color: #a0aec0;
  padding: 2rem;
}
`;
