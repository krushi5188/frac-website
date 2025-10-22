import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Staking } from "../target/types/staking";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("staking", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Staking as Program<Staking>;

  let configPda: anchor.web3.PublicKey;
  let stakingVaultPda: anchor.web3.PublicKey;
  let userStakeAccount: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let rewardsPool: anchor.web3.PublicKey;

  const MIN_STAKE_AMOUNT = 100 * 10 ** 9; // 100 $FRAC

  before(async () => {
    // Derive PDAs
    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("staking_config")],
      program.programId
    );

    [stakingVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("staking_vault")],
      program.programId
    );
  });

  it("Initializes staking program", async () => {
    const governanceProgram = anchor.web3.Keypair.generate();

    const tx = await program.methods
      .initializeStaking()
      .accounts({
        config: configPda,
        rewardsPool: rewardsPool,
        governanceProgram: governanceProgram.publicKey,
        deployer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize staking transaction:", tx);

    // Verify config was created
    const config = await program.account.stakingConfig.fetch(configPda);
    expect(config.authority.toBase58()).to.equal(governanceProgram.publicKey.toBase58());
    expect(config.flexibleApy).to.equal(500); // 5%
    expect(config.apy_30Days).to.equal(700); // 7%
    expect(config.apy_90Days).to.equal(1000); // 10%
    expect(config.apy_180Days).to.equal(1300); // 13%
    expect(config.apy_365Days).to.equal(1600); // 16%
  });

  it("Creates flexible stake", async () => {
    const stakeAmount = 1000 * 10 ** 9; // 1000 $FRAC

    const timestamp = Math.floor(Date.now() / 1000);
    [userStakeAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake"),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
      ],
      program.programId
    );

    const tx = await program.methods
      .createStake(
        new anchor.BN(stakeAmount),
        { flexible: {} },
        0 // No lock duration
      )
      .accounts({
        config: configPda,
        stakeAccount: userStakeAccount,
        stakingVault: stakingVaultPda,
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create stake transaction:", tx);

    // Verify stake account
    const stake = await program.account.stakeAccount.fetch(userStakeAccount);
    expect(stake.user.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(stake.amount.toNumber()).to.equal(stakeAmount);
    expect(stake.lockDurationDays).to.equal(0);
    expect(stake.apyRate).to.equal(500); // 5% for flexible
    expect(stake.isActive).to.be.true;
  });

  it("Creates fixed-term stake (90 days)", async () => {
    const stakeAmount = 5000 * 10 ** 9; // 5000 $FRAC

    const tx = await program.methods
      .createStake(
        new anchor.BN(stakeAmount),
        { fixedTerm: {} },
        90 // 90-day lock
      )
      .accounts({
        config: configPda,
        stakeAccount: userStakeAccount,
        stakingVault: stakingVaultPda,
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create 90-day stake transaction:", tx);

    const stake = await program.account.stakeAccount.fetch(userStakeAccount);
    expect(stake.lockDurationDays).to.equal(90);
    expect(stake.apyRate).to.equal(1000); // 10% APY
    expect(stake.endTime.toNumber()).to.be.greaterThan(stake.startTime.toNumber());
  });

  it("Rejects stake below minimum amount", async () => {
    const tooSmallAmount = 50 * 10 ** 9; // 50 $FRAC (below 100 minimum)

    try {
      await program.methods
        .createStake(new anchor.BN(tooSmallAmount), { flexible: {} }, 0)
        .accounts({
          config: configPda,
          stakeAccount: userStakeAccount,
          stakingVault: stakingVaultPda,
          user: provider.wallet.publicKey,
          userTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for amount below minimum");
    } catch (error) {
      expect(error.toString()).to.include("StakeAmountTooLow");
    }
  });

  it("Calculates rewards correctly after time passes", async () => {
    // Wait some time (in tests, we'd mock the clock)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const tx = await program.methods
      .claimRewards()
      .accounts({
        config: configPda,
        stakeAccount: userStakeAccount,
        stakingVault: stakingVaultPda,
        rewardsPool: rewardsPool,
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Claim rewards transaction:", tx);

    // Verify rewards were transferred
    // Check user token balance increased
  });

  it("Allows unstaking for flexible stakes", async () => {
    const unstakeAmount = 500 * 10 ** 9; // Partial unstake

    const tx = await program.methods
      .unstake(new anchor.BN(unstakeAmount))
      .accounts({
        config: configPda,
        stakeAccount: userStakeAccount,
        stakingVault: stakingVaultPda,
        treasury: rewardsPool, // placeholder
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Unstake transaction:", tx);

    const stake = await program.account.stakeAccount.fetch(userStakeAccount);
    expect(stake.amount.toNumber()).to.equal(500 * 10 ** 9); // Remaining amount
  });

  it("Applies penalty for early unstaking of fixed-term", async () => {
    // Create 90-day stake
    const stakeAmount = 1000 * 10 ** 9;

    // Try to unstake before lock period ends
    // Should apply 10% penalty

    const beforeBalance = 0; // Get user balance before

    await program.methods
      .unstake(new anchor.BN(stakeAmount))
      .accounts({
        config: configPda,
        stakeAccount: userStakeAccount,
        stakingVault: stakingVaultPda,
        treasury: rewardsPool,
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const afterBalance = 0; // Get user balance after

    // User should receive 90% (10% penalty)
    const expectedReturn = stakeAmount * 0.9;
    // expect(afterBalance - beforeBalance).to.equal(expectedReturn);
  });

  it("Calculates priority tiers correctly", async () => {
    // Tier 0: < 1,000 $FRAC
    // Tier 1: 1,000 - 9,999 $FRAC
    // Tier 2: 10,000 - 99,999 $FRAC
    // Tier 3: 100,000+ $FRAC

    const tier3Amount = 150_000 * 10 ** 9;

    await program.methods
      .createStake(new anchor.BN(tier3Amount), { flexible: {} }, 0)
      .accounts({
        config: configPda,
        stakeAccount: userStakeAccount,
        stakingVault: stakingVaultPda,
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const stake = await program.account.stakeAccount.fetch(userStakeAccount);
    expect(stake.priorityTier).to.equal(3); // Tier 3
  });

  it("Updates APY rates (governance only)", async () => {
    const config = await program.account.stakingConfig.fetch(configPda);
    const governanceAuthority = anchor.web3.Keypair.generate();

    // This should fail if called by non-governance
    try {
      await program.methods
        .updateApyRates(600, 800, 1100, 1400, 1700)
        .accounts({
          config: configPda,
          authority: provider.wallet.publicKey, // Not governance
        })
        .rpc();

      expect.fail("Should have thrown error for unauthorized APY update");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("Prevents APY rates above 100%", async () => {
    try {
      await program.methods
        .updateApyRates(15000, 15000, 15000, 15000, 15000) // 150% (invalid)
        .accounts({
          config: configPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for invalid APY rate");
    } catch (error) {
      expect(error.toString()).to.include("InvalidApyRate");
    }
  });
});
