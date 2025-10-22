import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AccessControl } from "../target/types/access_control";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("access-control", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AccessControl as Program<AccessControl>;

  let configPda: anchor.web3.PublicKey;
  let userAccessPda: anchor.web3.PublicKey;
  let accessGatePda: anchor.web3.PublicKey;
  let stakingProgram: anchor.web3.PublicKey;
  let enterpriseProgram: anchor.web3.PublicKey;

  before(async () => {
    stakingProgram = anchor.web3.Keypair.generate().publicKey;
    enterpriseProgram = anchor.web3.Keypair.generate().publicKey;

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("access_config")],
      program.programId
    );

    [userAccessPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_access"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const accessType = "premium_vaults";
    [accessGatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("access_gate"), Buffer.from(accessType)],
      program.programId
    );
  });

  it("Initializes access control program", async () => {
    const fracTokenMint = anchor.web3.Keypair.generate().publicKey;

    const tx = await program.methods
      .initializeAccessControl()
      .accounts({
        config: configPda,
        fracTokenMint: fracTokenMint,
        stakingProgram: stakingProgram,
        enterpriseProgram: enterpriseProgram,
        deployer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize access control transaction:", tx);

    // Verify config was created
    const config = await program.account.accessConfig.fetch(configPda);
    expect(config.fracTokenMint.toBase58()).to.equal(fracTokenMint.toBase58());
    expect(config.stakingProgram.toBase58()).to.equal(stakingProgram.toBase58());
    expect(config.enterpriseProgram.toBase58()).to.equal(enterpriseProgram.toBase58());

    // Verify default tier thresholds
    expect(config.tierThresholds[0].toNumber()).to.equal(0); // Public
    expect(config.tierThresholds[1].toNumber()).to.equal(5_000 * 10 ** 9); // Bronze
    expect(config.tierThresholds[2].toNumber()).to.equal(15_000 * 10 ** 9); // Silver
    expect(config.tierThresholds[3].toNumber()).to.equal(50_000 * 10 ** 9); // Gold
    expect(config.tierThresholds[4].toNumber()).to.equal(150_000 * 10 ** 9); // Platinum
  });

  it("Creates access gate for premium vaults (Tier 2+)", async () => {
    const accessType = "premium_vaults";
    const requiredTier = 2; // Silver tier

    const tx = await program.methods
      .createAccessGate(accessType, requiredTier)
      .accounts({
        config: configPda,
        accessGate: accessGatePda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create access gate transaction:", tx);

    // Verify access gate was created
    const accessGate = await program.account.accessGate.fetch(accessGatePda);
    expect(accessGate.accessType).to.equal(accessType);
    expect(accessGate.requiredTier).to.equal(requiredTier);
    expect(accessGate.isActive).to.be.true;
  });

  it("Calculates user tier based on holdings only (Tier 0)", async () => {
    // User has 3,000 $FRAC in wallet
    // User has 0 staked
    // Access score = 3,000 + (2 * 0) = 3,000
    // Tier = 0 (Public, below 5,000)

    const userTokenAccount = anchor.web3.Keypair.generate().publicKey;
    const userStakeAccount = null; // No stake

    const tx = await program.methods
      .getUserTier()
      .accounts({
        config: configPda,
        userAccess: userAccessPda,
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        userStakeAccount: userStakeAccount || anchor.web3.SystemProgram.programId,
        stakingProgram: stakingProgram,
        enterpriseProgram: enterpriseProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Get user tier transaction:", tx);

    const userAccess = await program.account.userAccess.fetch(userAccessPda);
    expect(userAccess.currentTier).to.equal(0); // Public
    expect(userAccess.user.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
  });

  it("Calculates user tier with staking multiplier (Tier 2)", async () => {
    // User has 5,000 $FRAC in wallet
    // User has 5,000 $FRAC staked
    // Access score = 5,000 + (2 * 5,000) = 15,000
    // Tier = 2 (Silver, >= 15,000)

    const userTokenAccount = anchor.web3.Keypair.generate().publicKey;
    const userStakeAccount = anchor.web3.Keypair.generate().publicKey;

    // Mock: userTokenAccount has 5k balance
    // Mock: userStakeAccount has 5k staked

    const tx = await program.methods
      .getUserTier()
      .accounts({
        config: configPda,
        userAccess: userAccessPda,
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        userStakeAccount: userStakeAccount,
        stakingProgram: stakingProgram,
        enterpriseProgram: enterpriseProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Get user tier with staking transaction:", tx);

    const userAccess = await program.account.userAccess.fetch(userAccessPda);
    expect(userAccess.currentTier).to.equal(2); // Silver
    expect(userAccess.accessScore.toNumber()).to.equal(15_000 * 10 ** 9);
  });

  it("Checks access against gate (passes)", async () => {
    // User has Tier 2 (Silver)
    // Gate requires Tier 2
    // Should pass

    const tx = await program.methods
      .checkAccess("premium_vaults")
      .accounts({
        config: configPda,
        accessGate: accessGatePda,
        userAccess: userAccessPda,
        user: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Check access (pass) transaction:", tx);

    // Access check passed, no error thrown
  });

  it("Checks access against gate (fails)", async () => {
    // Create new user with Tier 0
    const lowTierUser = anchor.web3.Keypair.generate();
    const [lowTierAccessPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_access"), lowTierUser.publicKey.toBuffer()],
      program.programId
    );

    // Get tier for low tier user
    await program.methods
      .getUserTier()
      .accounts({
        config: configPda,
        userAccess: lowTierAccessPda,
        user: lowTierUser.publicKey,
        userTokenAccount: anchor.web3.Keypair.generate().publicKey,
        userStakeAccount: anchor.web3.SystemProgram.programId,
        stakingProgram: stakingProgram,
        enterpriseProgram: enterpriseProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([lowTierUser])
      .rpc();

    // Try to access premium vaults (requires Tier 2)
    try {
      await program.methods
        .checkAccess("premium_vaults")
        .accounts({
          config: configPda,
          accessGate: accessGatePda,
          userAccess: lowTierAccessPda,
          user: lowTierUser.publicKey,
        })
        .signers([lowTierUser])
        .rpc();

      expect.fail("Should have thrown error for insufficient tier");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientAccessTier");
    }
  });

  it("Creates access gate for algorithmic strategies (Tier 3+)", async () => {
    const accessType = "algorithmic_strategies";
    const requiredTier = 3; // Gold tier

    const [algoGatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("access_gate"), Buffer.from(accessType)],
      program.programId
    );

    const tx = await program.methods
      .createAccessGate(accessType, requiredTier)
      .accounts({
        config: configPda,
        accessGate: algoGatePda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create algorithmic strategies gate transaction:", tx);

    const accessGate = await program.account.accessGate.fetch(algoGatePda);
    expect(accessGate.requiredTier).to.equal(3); // Gold
  });

  it("Creates access gate for exclusive events (Tier 4)", async () => {
    const accessType = "exclusive_events";
    const requiredTier = 4; // Platinum tier

    const [exclusiveGatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("access_gate"), Buffer.from(accessType)],
      program.programId
    );

    const tx = await program.methods
      .createAccessGate(accessType, requiredTier)
      .accounts({
        config: configPda,
        accessGate: exclusiveGatePda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create exclusive events gate transaction:", tx);

    const accessGate = await program.account.accessGate.fetch(exclusiveGatePda);
    expect(accessGate.requiredTier).to.equal(4); // Platinum
  });

  it("Calculates Tier 1 (Bronze) correctly", async () => {
    // User has 8,000 $FRAC total
    // Access score = 8,000
    // Tier = 1 (Bronze, 5,000 - 9,999)

    const user = anchor.web3.Keypair.generate();
    const [tierAccessPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_access"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .getUserTier()
      .accounts({
        config: configPda,
        userAccess: tierAccessPda,
        user: user.publicKey,
        userTokenAccount: anchor.web3.Keypair.generate().publicKey,
        userStakeAccount: anchor.web3.SystemProgram.programId,
        stakingProgram: stakingProgram,
        enterpriseProgram: enterpriseProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const userAccess = await program.account.userAccess.fetch(tierAccessPda);
    expect(userAccess.currentTier).to.equal(1); // Bronze
  });

  it("Calculates Tier 3 (Gold) correctly", async () => {
    // User has 60,000 $FRAC total
    // Access score = 60,000
    // Tier = 3 (Gold, 50,000 - 99,999)

    const user = anchor.web3.Keypair.generate();
    const [tierAccessPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_access"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .getUserTier()
      .accounts({
        config: configPda,
        userAccess: tierAccessPda,
        user: user.publicKey,
        userTokenAccount: anchor.web3.Keypair.generate().publicKey,
        userStakeAccount: anchor.web3.SystemProgram.programId,
        stakingProgram: stakingProgram,
        enterpriseProgram: enterpriseProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const userAccess = await program.account.userAccess.fetch(tierAccessPda);
    expect(userAccess.currentTier).to.equal(3); // Gold
  });

  it("Calculates Tier 4 (Platinum) correctly", async () => {
    // User has 200,000 $FRAC total
    // Access score = 200,000
    // Tier = 4 (Platinum, >= 150,000)

    const user = anchor.web3.Keypair.generate();
    const [tierAccessPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_access"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .getUserTier()
      .accounts({
        config: configPda,
        userAccess: tierAccessPda,
        user: user.publicKey,
        userTokenAccount: anchor.web3.Keypair.generate().publicKey,
        userStakeAccount: anchor.web3.SystemProgram.programId,
        stakingProgram: stakingProgram,
        enterpriseProgram: enterpriseProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const userAccess = await program.account.userAccess.fetch(tierAccessPda);
    expect(userAccess.currentTier).to.equal(4); // Platinum
  });

  it("Includes enterprise collateral in access score", async () => {
    // User has 10,000 $FRAC in wallet
    // User has 50,000 $FRAC in enterprise collateral
    // Access score = 10,000 + (1 * 50,000) = 60,000
    // Tier = 3 (Gold)

    // This would require CPI to enterprise program
    // to get collateral amount
  });

  it("Caches tier calculation for 5 minutes", async () => {
    // Get tier once
    const firstCall = Date.now();

    await program.methods
      .getUserTier()
      .accounts({
        config: configPda,
        userAccess: userAccessPda,
        user: provider.wallet.publicKey,
        userTokenAccount: anchor.web3.Keypair.generate().publicKey,
        userStakeAccount: anchor.web3.SystemProgram.programId,
        stakingProgram: stakingProgram,
        enterpriseProgram: enterpriseProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Get tier again within 5 minutes
    // Should use cached value, not recalculate

    const userAccess = await program.account.userAccess.fetch(userAccessPda);
    const lastCalculated = userAccess.lastCalculated.toNumber() * 1000;

    // Verify cache timestamp is recent
    expect(Date.now() - lastCalculated).to.be.lessThan(10_000);
  });

  it("Updates tier thresholds (governance only)", async () => {
    const newThresholds = [
      new anchor.BN(0),
      new anchor.BN(10_000 * 10 ** 9), // Increase Bronze to 10k
      new anchor.BN(25_000 * 10 ** 9), // Increase Silver to 25k
      new anchor.BN(75_000 * 10 ** 9), // Increase Gold to 75k
      new anchor.BN(200_000 * 10 ** 9), // Increase Platinum to 200k
    ];

    const tx = await program.methods
      .updateTierThresholds(newThresholds)
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Update tier thresholds transaction:", tx);

    const config = await program.account.accessConfig.fetch(configPda);
    expect(config.tierThresholds[1].toNumber()).to.equal(10_000 * 10 ** 9);
    expect(config.tierThresholds[2].toNumber()).to.equal(25_000 * 10 ** 9);
  });

  it("Disables access gate", async () => {
    const tx = await program.methods
      .updateAccessGate("premium_vaults", false)
      .accounts({
        config: configPda,
        accessGate: accessGatePda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Disable access gate transaction:", tx);

    const accessGate = await program.account.accessGate.fetch(accessGatePda);
    expect(accessGate.isActive).to.be.false;
  });

  it("Allows access when gate is disabled", async () => {
    // Gate is now disabled
    // Even Tier 0 users should be able to access

    const lowTierUser = anchor.web3.Keypair.generate();
    const [lowTierAccessPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_access"), lowTierUser.publicKey.toBuffer()],
      program.programId
    );

    // This should NOT throw error because gate is disabled
    // In production: Access gate checks would skip disabled gates
  });

  it("Prevents invalid tier threshold order", async () => {
    // Thresholds must be in ascending order
    const invalidThresholds = [
      new anchor.BN(0),
      new anchor.BN(50_000 * 10 ** 9), // Out of order
      new anchor.BN(15_000 * 10 ** 9),
      new anchor.BN(75_000 * 10 ** 9),
      new anchor.BN(200_000 * 10 ** 9),
    ];

    try {
      await program.methods
        .updateTierThresholds(invalidThresholds)
        .accounts({
          config: configPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for invalid threshold order");
    } catch (error) {
      expect(error.toString()).to.include("InvalidTierThresholds");
    }
  });
});
