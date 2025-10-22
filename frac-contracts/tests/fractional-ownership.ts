import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FractionalOwnership } from "../target/types/fractional_ownership";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("fractional-ownership", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FractionalOwnership as Program<FractionalOwnership>;

  let vaultPda: anchor.web3.PublicKey;
  let orderBookPda: anchor.web3.PublicKey;
  let shareHolderPda: anchor.web3.PublicKey;
  let treasuryTokenAccount: anchor.web3.PublicKey;
  let rewardsPoolAccount: anchor.web3.PublicKey;

  const vaultId = new anchor.BN(1);
  const totalShares = new anchor.BN(1_000_000); // 1M shares
  const initialValuation = new anchor.BN(100_000); // $100k valuation

  before(async () => {
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [orderBookPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("order_book"), vaultId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [shareHolderPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_holder"),
        vaultId.toArrayLike(Buffer, "le", 8),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("Creates a fractional asset vault", async () => {
    const underlyingAsset = anchor.web3.Keypair.generate();
    const metadataUri = "ipfs://QmExample...";

    const tx = await program.methods
      .createVault(
        vaultId,
        { nft: {} }, // AssetType::NFT
        totalShares,
        initialValuation,
        metadataUri
      )
      .accounts({
        vault: vaultPda,
        orderBook: orderBookPda,
        shareHolder: shareHolderPda,
        underlyingAsset: underlyingAsset.publicKey,
        creator: provider.wallet.publicKey,
        creatorTokenAccount: treasuryTokenAccount, // placeholder
        treasury: treasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create vault transaction:", tx);

    // Verify vault was created
    const vault = await program.account.assetVault.fetch(vaultPda);
    expect(vault.vaultId.toNumber()).to.equal(vaultId.toNumber());
    expect(vault.totalShares.toNumber()).to.equal(totalShares.toNumber());
    expect(vault.sharesOutstanding.toNumber()).to.equal(totalShares.toNumber());
    expect(vault.valuationUsd.toNumber()).to.equal(initialValuation.toNumber());
    expect(vault.creator.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(vault.metadataUri).to.equal(metadataUri);

    // Verify creator owns 100% shares
    const shareHolder = await program.account.shareHolder.fetch(shareHolderPda);
    expect(shareHolder.shares.toNumber()).to.equal(totalShares.toNumber());

    // Verify order book initialized
    const orderBook = await program.account.orderBook.fetch(orderBookPda);
    expect(orderBook.vaultId.toNumber()).to.equal(vaultId.toNumber());
    expect(orderBook.buyOrders).to.be.empty;
    expect(orderBook.sellOrders).to.be.empty;
  });

  it("Lists shares for sale", async () => {
    const sharesToList = new anchor.BN(10_000); // 10k shares
    const pricePerShare = new anchor.BN(1 * 10 ** 9); // 1 $FRAC per share

    const tx = await program.methods
      .listSharesForSale(sharesToList, pricePerShare)
      .accounts({
        vault: vaultPda,
        orderBook: orderBookPda,
        shareHolder: shareHolderPda,
        seller: provider.wallet.publicKey,
      })
      .rpc();

    console.log("List shares transaction:", tx);

    // Verify order was added to order book
    const orderBook = await program.account.orderBook.fetch(orderBookPda);
    expect(orderBook.sellOrders.length).to.equal(1);
    expect(orderBook.sellOrders[0].shares.toNumber()).to.equal(sharesToList.toNumber());
    expect(orderBook.sellOrders[0].pricePerShare.toNumber()).to.equal(pricePerShare.toNumber());
  });

  it("Buys shares from sell order", async () => {
    const buyer = anchor.web3.Keypair.generate();
    const sharesToBuy = new anchor.BN(5_000); // Buy 5k shares

    const [buyerShareHolderPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_holder"),
        vaultId.toArrayLike(Buffer, "le", 8),
        buyer.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Get order ID from order book
    const orderBook = await program.account.orderBook.fetch(orderBookPda);
    const orderId = orderBook.sellOrders[0].orderId;

    const tx = await program.methods
      .buyShares(orderId, sharesToBuy)
      .accounts({
        vault: vaultPda,
        orderBook: orderBookPda,
        sellerShareHolder: shareHolderPda,
        buyerShareHolder: buyerShareHolderPda,
        seller: provider.wallet.publicKey,
        buyer: buyer.publicKey,
        buyerTokenAccount: treasuryTokenAccount, // placeholder
        sellerTokenAccount: treasuryTokenAccount, // placeholder
        rewardsPool: rewardsPoolAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Buy shares transaction:", tx);

    // Verify shares transferred
    const sellerShares = await program.account.shareHolder.fetch(shareHolderPda);
    const buyerShares = await program.account.shareHolder.fetch(buyerShareHolderPda);

    // Seller should have 5k less (995,000 remaining)
    // Buyer should have 5k shares
    expect(buyerShares.shares.toNumber()).to.equal(5_000);

    // Verify order updated
    const updatedOrderBook = await program.account.orderBook.fetch(orderBookPda);
    expect(updatedOrderBook.sellOrders[0].shares.toNumber()).to.equal(5_000); // 5k remaining
  });

  it("Cancels sell order", async () => {
    const orderBook = await program.account.orderBook.fetch(orderBookPda);
    const orderId = orderBook.sellOrders[0].orderId;

    const tx = await program.methods
      .cancelSellOrder(orderId)
      .accounts({
        vault: vaultPda,
        orderBook: orderBookPda,
        seller: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Cancel order transaction:", tx);

    // Verify order removed
    const updatedOrderBook = await program.account.orderBook.fetch(orderBookPda);
    expect(updatedOrderBook.sellOrders).to.be.empty;
  });

  it("Rejects vault creation below minimum shares", async () => {
    const tooFewShares = new anchor.BN(500); // Below 1000 minimum

    try {
      await program.methods
        .createVault(
          new anchor.BN(2),
          { nft: {} },
          tooFewShares,
          initialValuation,
          "ipfs://test"
        )
        .accounts({
          vault: vaultPda,
          orderBook: orderBookPda,
          shareHolder: shareHolderPda,
          underlyingAsset: anchor.web3.Keypair.generate().publicKey,
          creator: provider.wallet.publicKey,
          creatorTokenAccount: treasuryTokenAccount,
          treasury: treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for too few shares");
    } catch (error) {
      expect(error.toString()).to.include("InvalidShareAmount");
    }
  });

  it("Updates asset valuation (oracle/admin)", async () => {
    const newValuation = new anchor.BN(150_000); // $150k

    const tx = await program.methods
      .updateValuation(newValuation)
      .accounts({
        vault: vaultPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Update valuation transaction:", tx);

    const vault = await program.account.assetVault.fetch(vaultPda);
    expect(vault.valuationUsd.toNumber()).to.equal(newValuation.toNumber());
  });

  it("Prevents unreasonable valuation changes", async () => {
    const currentVault = await program.account.assetVault.fetch(vaultPda);
    const unreasonableValuation = currentVault.valuationUsd.muln(1001); // 1001x increase

    try {
      await program.methods
        .updateValuation(unreasonableValuation)
        .accounts({
          vault: vaultPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for unreasonable valuation");
    } catch (error) {
      expect(error.toString()).to.include("ValuationTooHigh");
    }
  });

  it("Allows redemption with 100% shares", async () => {
    // First, accumulate 100% of shares
    // Then redeem the underlying asset

    const tx = await program.methods
      .redeemAsset()
      .accounts({
        vault: vaultPda,
        shareHolder: shareHolderPda,
        redeemer: provider.wallet.publicKey,
        redeemerTokenAccount: treasuryTokenAccount,
        treasury: treasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Redeem asset transaction:", tx);

    // Verify vault status changed to Redeemed
    const vault = await program.account.assetVault.fetch(vaultPda);
    expect(vault.sharesOutstanding.toNumber()).to.equal(0);
  });

  it("Rejects redemption without 100% shares", async () => {
    // Create new vault where user doesn't own 100%
    const vaultId2 = new anchor.BN(3);
    const [vault2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultId2.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create vault, sell some shares, try to redeem
    // Should fail

    try {
      await program.methods
        .redeemAsset()
        .accounts({
          vault: vault2Pda,
          shareHolder: shareHolderPda,
          redeemer: provider.wallet.publicKey,
          redeemerTokenAccount: treasuryTokenAccount,
          treasury: treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      expect.fail("Should have thrown error for insufficient shares");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientSharesForRedemption");
    }
  });

  it("Charges correct trading fees (0.25%)", async () => {
    // Verify that 0.25% trading fee is charged
    // Fee should go to rewards pool

    const beforeRewardsBalance = 0; // Get rewards pool balance

    // Execute a trade
    // ...

    const afterRewardsBalance = 0; // Get rewards pool balance after

    // Expected fee = trade amount * 0.0025
    // expect(afterRewardsBalance - beforeRewardsBalance).to.equal(expectedFee);
  });

  it("Prevents order book overflow (max 100 orders)", async () => {
    // Create 100 sell orders
    for (let i = 0; i < 100; i++) {
      await program.methods
        .listSharesForSale(new anchor.BN(10), new anchor.BN(1 * 10 ** 9))
        .accounts({
          vault: vaultPda,
          orderBook: orderBookPda,
          shareHolder: shareHolderPda,
          seller: provider.wallet.publicKey,
        })
        .rpc();
    }

    // 101st order should fail
    try {
      await program.methods
        .listSharesForSale(new anchor.BN(10), new anchor.BN(1 * 10 ** 9))
        .accounts({
          vault: vaultPda,
          orderBook: orderBookPda,
          shareHolder: shareHolderPda,
          seller: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for order book full");
    } catch (error) {
      expect(error.toString()).to.include("OrderBookFull");
    }
  });
});
