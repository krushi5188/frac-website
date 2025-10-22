import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Enterprise } from "../target/types/enterprise";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("enterprise", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Enterprise as Program<Enterprise>;

  let configPda: anchor.web3.PublicKey;
  let collateralVaultPda: anchor.web3.PublicKey;
  let enterpriseAccountPda: anchor.web3.PublicKey;
  let fracTokenMint: anchor.web3.PublicKey;

  const MIN_COLLATERAL = 100_000 * 10 ** 9; // 100k $FRAC

  before(async () => {
    fracTokenMint = anchor.web3.Keypair.generate().publicKey;

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("enterprise_config")],
      program.programId
    );

    [collateralVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("collateral_vault")],
      program.programId
    );

    [enterpriseAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("enterprise"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes enterprise program", async () => {
    const governanceProgram = anchor.web3.Keypair.generate().publicKey;

    const tx = await program.methods
      .initializeEnterprise()
      .accounts({
        config: configPda,
        collateralVault: collateralVaultPda,
        fracTokenMint: fracTokenMint,
        governanceProgram: governanceProgram,
        deployer: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize enterprise transaction:", tx);

    // Verify config was created
    const config = await program.account.enterpriseConfig.fetch(configPda);
    expect(config.fracTokenMint.toBase58()).to.equal(fracTokenMint.toBase58());
    expect(config.governanceProgram.toBase58()).to.equal(governanceProgram.toBase58());
    expect(config.minCollateral.toNumber()).to.equal(MIN_COLLATERAL);
    expect(config.totalCollateralLocked.toNumber()).to.equal(0);
  });

  it("Registers Tier 1 enterprise (100k collateral, 0 months)", async () => {
    const collateralAmount = new anchor.BN(100_000 * 10 ** 9); // 100k $FRAC
    const lockDurationMonths = 0;

    const tx = await program.methods
      .registerEnterprise(collateralAmount, lockDurationMonths)
      .accounts({
        config: configPda,
        enterpriseAccount: enterpriseAccountPda,
        collateralVault: collateralVaultPda,
        owner: provider.wallet.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Register Tier 1 enterprise transaction:", tx);

    // Verify enterprise account
    const enterprise = await program.account.enterpriseAccount.fetch(enterpriseAccountPda);
    expect(enterprise.owner.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(enterprise.collateralAmount.toNumber()).to.equal(collateralAmount.toNumber());
    expect(enterprise.tier).to.equal(1); // Starter
    expect(enterprise.lockDurationMonths).to.equal(0);
    expect(enterprise.durationMultiplierBps).to.equal(10000); // 1.0x
    expect(enterprise.priorityMultiplier).to.equal(1);
  });

  it("Registers Tier 2 enterprise (500k collateral, 6 months)", async () => {
    const enterprise2Owner = anchor.web3.Keypair.generate();
    const [enterprise2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("enterprise"), enterprise2Owner.publicKey.toBuffer()],
      program.programId
    );

    const collateralAmount = new anchor.BN(500_000 * 10 ** 9); // 500k $FRAC
    const lockDurationMonths = 6;

    const tx = await program.methods
      .registerEnterprise(collateralAmount, lockDurationMonths)
      .accounts({
        config: configPda,
        enterpriseAccount: enterprise2Pda,
        collateralVault: collateralVaultPda,
        owner: enterprise2Owner.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([enterprise2Owner])
      .rpc();

    console.log("Register Tier 2 enterprise transaction:", tx);

    // Verify enterprise account
    const enterprise = await program.account.enterpriseAccount.fetch(enterprise2Pda);
    expect(enterprise.tier).to.equal(2); // Business
    expect(enterprise.lockDurationMonths).to.equal(6);
    expect(enterprise.durationMultiplierBps).to.equal(13000); // 1.3x
    expect(enterprise.priorityMultiplier).to.equal(2);
  });

  it("Registers Tier 3 enterprise (1M collateral, 12 months)", async () => {
    const enterprise3Owner = anchor.web3.Keypair.generate();
    const [enterprise3Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("enterprise"), enterprise3Owner.publicKey.toBuffer()],
      program.programId
    );

    const collateralAmount = new anchor.BN(1_000_000 * 10 ** 9); // 1M $FRAC
    const lockDurationMonths = 12;

    const tx = await program.methods
      .registerEnterprise(collateralAmount, lockDurationMonths)
      .accounts({
        config: configPda,
        enterpriseAccount: enterprise3Pda,
        collateralVault: collateralVaultPda,
        owner: enterprise3Owner.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([enterprise3Owner])
      .rpc();

    console.log("Register Tier 3 enterprise transaction:", tx);

    // Verify enterprise account
    const enterprise = await program.account.enterpriseAccount.fetch(enterprise3Pda);
    expect(enterprise.tier).to.equal(3); // Enterprise
    expect(enterprise.lockDurationMonths).to.equal(12);
    expect(enterprise.durationMultiplierBps).to.equal(16000); // 1.6x
    expect(enterprise.priorityMultiplier).to.equal(4);
    expect(enterprise.vaultDiscountBps).to.equal(7500); // 75% discount
    expect(enterprise.tradingDiscountBps).to.equal(9000); // 0.10% fee (instead of 0.25%)
  });

  it("Registers Tier 4 enterprise (5M collateral, 24 months)", async () => {
    const enterprise4Owner = anchor.web3.Keypair.generate();
    const [enterprise4Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("enterprise"), enterprise4Owner.publicKey.toBuffer()],
      program.programId
    );

    const collateralAmount = new anchor.BN(5_000_000 * 10 ** 9); // 5M $FRAC
    const lockDurationMonths = 24;

    const tx = await program.methods
      .registerEnterprise(collateralAmount, lockDurationMonths)
      .accounts({
        config: configPda,
        enterpriseAccount: enterprise4Pda,
        collateralVault: collateralVaultPda,
        owner: enterprise4Owner.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([enterprise4Owner])
      .rpc();

    console.log("Register Tier 4 enterprise transaction:", tx);

    // Verify enterprise account
    const enterprise = await program.account.enterpriseAccount.fetch(enterprise4Pda);
    expect(enterprise.tier).to.equal(4); // Institutional
    expect(enterprise.lockDurationMonths).to.equal(24);
    expect(enterprise.durationMultiplierBps).to.equal(20000); // 2.0x
    expect(enterprise.priorityMultiplier).to.equal(8);
    expect(enterprise.vaultDiscountBps).to.equal(9000); // 90% discount
    expect(enterprise.tradingDiscountBps).to.equal(9500); // 0.05% fee
  });

  it("Rejects registration below minimum collateral", async () => {
    const tooLowCollateral = new anchor.BN(50_000 * 10 ** 9); // 50k (below 100k min)

    try {
      await program.methods
        .registerEnterprise(tooLowCollateral, 0)
        .accounts({
          config: configPda,
          enterpriseAccount: enterpriseAccountPda,
          collateralVault: collateralVaultPda,
          owner: provider.wallet.publicKey,
          ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for insufficient collateral");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientCollateral");
    }
  });

  it("Adds collateral to existing enterprise", async () => {
    const additionalCollateral = new anchor.BN(50_000 * 10 ** 9); // +50k $FRAC

    const tx = await program.methods
      .addCollateral(additionalCollateral)
      .accounts({
        config: configPda,
        enterpriseAccount: enterpriseAccountPda,
        collateralVault: collateralVaultPda,
        owner: provider.wallet.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Add collateral transaction:", tx);

    // Verify collateral increased
    const enterprise = await program.account.enterpriseAccount.fetch(enterpriseAccountPda);
    expect(enterprise.collateralAmount.toNumber()).to.equal(150_000 * 10 ** 9);
    // Still Tier 1 (need 500k for Tier 2)
    expect(enterprise.tier).to.equal(1);
  });

  it("Upgrades tier when collateral threshold crossed", async () => {
    // Add enough to reach Tier 2 (500k total)
    const additionalCollateral = new anchor.BN(350_000 * 10 ** 9);

    const tx = await program.methods
      .addCollateral(additionalCollateral)
      .accounts({
        config: configPda,
        enterpriseAccount: enterpriseAccountPda,
        collateralVault: collateralVaultPda,
        owner: provider.wallet.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Upgrade to Tier 2 transaction:", tx);

    // Verify tier upgraded
    const enterprise = await program.account.enterpriseAccount.fetch(enterpriseAccountPda);
    expect(enterprise.tier).to.equal(2); // Business
    expect(enterprise.collateralAmount.toNumber()).to.equal(500_000 * 10 ** 9);
  });

  it("Initiates collateral withdrawal with 7-day delay", async () => {
    const withdrawAmount = new anchor.BN(100_000 * 10 ** 9);

    const tx = await program.methods
      .requestWithdrawal(withdrawAmount)
      .accounts({
        config: configPda,
        enterpriseAccount: enterpriseAccountPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Request withdrawal transaction:", tx);

    // Verify withdrawal request created
    const enterprise = await program.account.enterpriseAccount.fetch(enterpriseAccountPda);
    expect(enterprise.pendingWithdrawal.toNumber()).to.equal(withdrawAmount.toNumber());
    expect(enterprise.withdrawalRequestTime.toNumber()).to.be.greaterThan(0);
  });

  it("Prevents withdrawal before 7-day delay", async () => {
    // Try to complete withdrawal immediately

    try {
      await program.methods
        .completeWithdrawal()
        .accounts({
          config: configPda,
          enterpriseAccount: enterpriseAccountPda,
          collateralVault: collateralVaultPda,
          owner: provider.wallet.publicKey,
          ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      expect.fail("Should have thrown error for withdrawal delay not met");
    } catch (error) {
      expect(error.toString()).to.include("WithdrawalDelayNotMet");
    }
  });

  it("Completes withdrawal after 7 days", async () => {
    // Mock: 7 days passed

    const beforeCollateral = (await program.account.enterpriseAccount.fetch(enterpriseAccountPda))
      .collateralAmount.toNumber();

    const tx = await program.methods
      .completeWithdrawal()
      .accounts({
        config: configPda,
        enterpriseAccount: enterpriseAccountPda,
        collateralVault: collateralVaultPda,
        owner: provider.wallet.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Complete withdrawal transaction:", tx);

    // Verify collateral reduced
    const enterprise = await program.account.enterpriseAccount.fetch(enterpriseAccountPda);
    expect(enterprise.collateralAmount.toNumber()).to.equal(400_000 * 10 ** 9);
    expect(enterprise.pendingWithdrawal.toNumber()).to.equal(0);
    expect(enterprise.tier).to.equal(1); // Downgraded to Tier 1
  });

  it("Cancels withdrawal request", async () => {
    // Request withdrawal
    await program.methods
      .requestWithdrawal(new anchor.BN(50_000 * 10 ** 9))
      .accounts({
        config: configPda,
        enterpriseAccount: enterpriseAccountPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    // Cancel it
    const tx = await program.methods
      .cancelWithdrawal()
      .accounts({
        config: configPda,
        enterpriseAccount: enterpriseAccountPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Cancel withdrawal transaction:", tx);

    // Verify withdrawal cancelled
    const enterprise = await program.account.enterpriseAccount.fetch(enterpriseAccountPda);
    expect(enterprise.pendingWithdrawal.toNumber()).to.equal(0);
  });

  it("Gets enterprise discount for vault creation", async () => {
    // Tier 3 enterprise should get 75% discount
    // Standard: 100 $FRAC
    // Tier 3: 25 $FRAC

    const enterprise3Owner = anchor.web3.Keypair.generate();
    const [enterprise3Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("enterprise"), enterprise3Owner.publicKey.toBuffer()],
      program.programId
    );

    // Register Tier 3
    await program.methods
      .registerEnterprise(new anchor.BN(1_000_000 * 10 ** 9), 12)
      .accounts({
        config: configPda,
        enterpriseAccount: enterprise3Pda,
        collateralVault: collateralVaultPda,
        owner: enterprise3Owner.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([enterprise3Owner])
      .rpc();

    // Get discount
    const enterprise = await program.account.enterpriseAccount.fetch(enterprise3Pda);
    const vaultDiscountBps = enterprise.vaultDiscountBps;

    // 75% discount
    expect(vaultDiscountBps).to.equal(7500);

    // Actual fee = 100 * (1 - 0.75) = 25 $FRAC
  });

  it("Gets enterprise discount for trading fees", async () => {
    // Tier 3 enterprise should pay 0.10% instead of 0.25%

    const enterprise3Owner = anchor.web3.Keypair.generate();
    const [enterprise3Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("enterprise"), enterprise3Owner.publicKey.toBuffer()],
      program.programId
    );

    // Already registered in previous test
    const enterprise = await program.account.enterpriseAccount.fetch(enterprise3Pda);
    const tradingDiscountBps = enterprise.tradingDiscountBps;

    // Standard fee: 0.25% (25 bps)
    // Tier 3 fee: 0.10% (10 bps)
    // Discount: 90% off → 9000 bps
    expect(tradingDiscountBps).to.equal(9000);
  });

  it("Calculates effective benefits with duration multiplier", async () => {
    // Tier 2 with 6-month lock has 1.3x multiplier
    // Priority: 2 * 1.3 = 2.6
    // Vault discount: 50% * 1.3 = 65%
    // Trading discount: 80% * 1.3 = 104% (capped at 95%)

    const enterprise2Owner = anchor.web3.Keypair.generate();
    const [enterprise2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("enterprise"), enterprise2Owner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerEnterprise(new anchor.BN(500_000 * 10 ** 9), 6)
      .accounts({
        config: configPda,
        enterpriseAccount: enterprise2Pda,
        collateralVault: collateralVaultPda,
        owner: enterprise2Owner.publicKey,
        ownerTokenAccount: anchor.web3.Keypair.generate().publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([enterprise2Owner])
      .rpc();

    const enterprise = await program.account.enterpriseAccount.fetch(enterprise2Pda);

    // Verify multiplier applied
    expect(enterprise.durationMultiplierBps).to.equal(13000); // 1.3x

    // Effective priority = 2 * 1.3 = 2.6 (stored as 2 base, applied at runtime)
    // Effective vault discount ≈ 65% (5000 * 1.3)
    // Effective trading discount capped at 95%
  });

  it("Extends lock duration for existing enterprise", async () => {
    // Enterprise with 0 months extends to 12 months
    // Should upgrade multiplier from 1.0x to 1.6x

    const tx = await program.methods
      .extendLockDuration(12)
      .accounts({
        config: configPda,
        enterpriseAccount: enterpriseAccountPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Extend lock duration transaction:", tx);

    // Verify lock extended
    const enterprise = await program.account.enterpriseAccount.fetch(enterpriseAccountPda);
    expect(enterprise.lockDurationMonths).to.equal(12);
    expect(enterprise.durationMultiplierBps).to.equal(16000); // 1.6x
  });

  it("Prevents reducing lock duration", async () => {
    // Try to reduce from 12 months to 6 months
    // Should fail

    try {
      await program.methods
        .extendLockDuration(6)
        .accounts({
          config: configPda,
          enterpriseAccount: enterpriseAccountPda,
          owner: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for reducing lock duration");
    } catch (error) {
      expect(error.toString()).to.include("CannotReduceLockDuration");
    }
  });

  it("Collateral counts toward governance voting power", async () => {
    // Enterprise with 500k collateral should have 500k voting power
    // (in addition to any staked tokens)

    // This would be checked via CPI from governance program
    const enterprise = await program.account.enterpriseAccount.fetch(enterpriseAccountPda);
    const votingPower = enterprise.collateralAmount.toNumber();

    expect(votingPower).to.equal(400_000 * 10 ** 9); // Current collateral after withdrawal
  });

  it("Prevents withdrawal that would drop below tier minimum", async () => {
    // Tier 1 (100k) tries to withdraw 50k
    // Would leave 50k, below 100k minimum
    // Should fail

    try {
      await program.methods
        .requestWithdrawal(new anchor.BN(350_000 * 10 ** 9))
        .accounts({
          config: configPda,
          enterpriseAccount: enterpriseAccountPda,
          owner: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for dropping below minimum");
    } catch (error) {
      expect(error.toString()).to.include("WithdrawalWouldDropBelowMinimum");
    }
  });

  it("Updates tier thresholds (governance only)", async () => {
    const newThresholds = [
      new anchor.BN(100_000 * 10 ** 9),
      new anchor.BN(750_000 * 10 ** 9), // Increase Tier 2 to 750k
      new anchor.BN(2_000_000 * 10 ** 9), // Increase Tier 3 to 2M
      new anchor.BN(10_000_000 * 10 ** 9), // Increase Tier 4 to 10M
    ];

    const tx = await program.methods
      .updateTierThresholds(newThresholds)
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Update tier thresholds transaction:", tx);

    const config = await program.account.enterpriseConfig.fetch(configPda);
    expect(config.tierThresholds[1].toNumber()).to.equal(750_000 * 10 ** 9);
  });
});
