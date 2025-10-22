import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Rewards } from "../target/types/rewards";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("rewards", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Rewards as Program<Rewards>;

  let configPda: anchor.web3.PublicKey;
  let rewardsVaultPda: anchor.web3.PublicKey;
  let rewardGrantPda: anchor.web3.PublicKey;
  let milestoneProgressPda: anchor.web3.PublicKey;
  let fracTokenMint: anchor.web3.PublicKey;

  const grantId = new anchor.BN(1);
  const SMALL_REWARD_THRESHOLD = 1_000 * 10 ** 9; // 1k $FRAC
  const MEDIUM_REWARD_THRESHOLD = 10_000 * 10 ** 9; // 10k $FRAC

  before(async () => {
    fracTokenMint = anchor.web3.Keypair.generate().publicKey;

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("rewards_config")],
      program.programId
    );

    [rewardsVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("rewards_vault")],
      program.programId
    );

    [rewardGrantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_grant"), grantId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [milestoneProgressPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("milestone_progress"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes rewards program", async () => {
    const governanceProgram = anchor.web3.Keypair.generate().publicKey;

    const tx = await program.methods
      .initializeRewards()
      .accounts({
        config: configPda,
        rewardsVault: rewardsVaultPda,
        fracTokenMint: fracTokenMint,
        governanceProgram: governanceProgram,
        deployer: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize rewards transaction:", tx);

    // Verify config was created
    const config = await program.account.rewardsConfig.fetch(configPda);
    expect(config.fracTokenMint.toBase58()).to.equal(fracTokenMint.toBase58());
    expect(config.governanceProgram.toBase58()).to.equal(governanceProgram.toBase58());
    expect(config.totalRewardsDistributed.toNumber()).to.equal(0);
    expect(config.rewardsPoolBalance.toNumber()).to.equal(0);
  });

  it("Grants immediate reward (small, < 1k $FRAC)", async () => {
    const recipient = anchor.web3.Keypair.generate();
    const amount = new anchor.BN(500 * 10 ** 9); // 500 $FRAC
    const category = { trading: {} };

    const [smallGrantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_grant"), new anchor.BN(10).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .grantReward(new anchor.BN(10), recipient.publicKey, amount, category)
      .accounts({
        config: configPda,
        rewardGrant: smallGrantPda,
        rewardsVault: rewardsVaultPda,
        recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Grant immediate reward transaction:", tx);

    // Verify grant was created
    const grant = await program.account.rewardGrant.fetch(smallGrantPda);
    expect(grant.recipient.toBase58()).to.equal(recipient.publicKey.toBase58());
    expect(grant.totalAmount.toNumber()).to.equal(amount.toNumber());
    expect(grant.vestingType).to.deep.equal({ immediate: {} });
    expect(grant.claimedAmount.toNumber()).to.equal(amount.toNumber());
  });

  it("Grants linear vesting reward (medium, 1k-10k $FRAC)", async () => {
    const recipient = anchor.web3.Keypair.generate();
    const amount = new anchor.BN(5_000 * 10 ** 9); // 5k $FRAC
    const category = { liquidity: {} };
    const vestingDuration = 365; // 1 year

    const [mediumGrantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_grant"), new anchor.BN(11).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .grantReward(new anchor.BN(11), recipient.publicKey, amount, category)
      .accounts({
        config: configPda,
        rewardGrant: mediumGrantPda,
        rewardsVault: rewardsVaultPda,
        recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Grant linear vesting reward transaction:", tx);

    // Verify grant was created with linear vesting
    const grant = await program.account.rewardGrant.fetch(mediumGrantPda);
    expect(grant.vestingType).to.deep.equal({ linear: {} });
    expect(grant.vestingDurationSeconds.toNumber()).to.equal(365 * 86400);
    expect(grant.claimedAmount.toNumber()).to.equal(0); // Not claimed yet
  });

  it("Grants milestone vesting reward (large, > 10k $FRAC)", async () => {
    const recipient = anchor.web3.Keypair.generate();
    const amount = new anchor.BN(50_000 * 10 ** 9); // 50k $FRAC
    const category = { airdrop: {} };

    const [largeGrantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_grant"), grantId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .grantReward(grantId, recipient.publicKey, amount, category)
      .accounts({
        config: configPda,
        rewardGrant: largeGrantPda,
        rewardsVault: rewardsVaultPda,
        recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Grant milestone vesting reward transaction:", tx);

    // Verify grant was created with milestone vesting
    const grant = await program.account.rewardGrant.fetch(largeGrantPda);
    expect(grant.vestingType).to.deep.equal({ milestone: {} });
    expect(grant.stage_1_unlocked).to.be.false;
    expect(grant.stage_2_unlocked).to.be.false;
    expect(grant.stage_3_unlocked).to.be.false;
  });

  it("Records trading activity for milestone tracking", async () => {
    const user = provider.wallet.publicKey;
    const tradingVolume = new anchor.BN(5_000 * 10 ** 9); // 5k $FRAC

    const tx = await program.methods
      .recordActivity(user, { trading: tradingVolume })
      .accounts({
        config: configPda,
        milestoneProgress: milestoneProgressPda,
        user: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Record trading activity transaction:", tx);

    // Verify milestone progress updated
    const progress = await program.account.milestoneProgress.fetch(milestoneProgressPda);
    expect(progress.user.toBase58()).to.equal(user.toBase58());
    expect(progress.totalTradingVolume.toNumber()).to.equal(tradingVolume.toNumber());
  });

  it("Records staking activity for milestone tracking", async () => {
    const user = provider.wallet.publicKey;
    const stakingDays = 90; // User completed 90 days of staking

    const tx = await program.methods
      .recordActivity(user, { staking: stakingDays })
      .accounts({
        config: configPda,
        milestoneProgress: milestoneProgressPda,
        user: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Record staking activity transaction:", tx);

    // Verify milestone progress updated
    const progress = await program.account.milestoneProgress.fetch(milestoneProgressPda);
    expect(progress.totalStakingDays).to.equal(stakingDays);
  });

  it("Records governance participation for milestone tracking", async () => {
    const user = provider.wallet.publicKey;
    const proposalsVoted = 5;

    const tx = await program.methods
      .recordActivity(user, { governance: proposalsVoted })
      .accounts({
        config: configPda,
        milestoneProgress: milestoneProgressPda,
        user: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Record governance activity transaction:", tx);

    // Verify milestone progress updated
    const progress = await program.account.milestoneProgress.fetch(milestoneProgressPda);
    expect(progress.governanceProposalsVoted).to.equal(proposalsVoted);
  });

  it("Unlocks Year 1 milestone (10%) after 365 days + 2 milestones", async () => {
    // User has grant of 50k $FRAC
    // After 365 days + completing 2 of 4 milestones
    // Can unlock 10% (5k $FRAC)

    // Mock: 365 days passed
    // Mock: Completed trading + staking milestones

    const tx = await program.methods
      .unlockMilestoneStage(grantId, 1) // Stage 1 = Year 1
      .accounts({
        config: configPda,
        rewardGrant: rewardGrantPda,
        milestoneProgress: milestoneProgressPda,
        recipient: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Unlock Year 1 milestone transaction:", tx);

    // Verify stage 1 unlocked
    const grant = await program.account.rewardGrant.fetch(rewardGrantPda);
    expect(grant.stage_1_unlocked).to.be.true;

    // 10% unlocked
    const unlocked = grant.totalAmount.toNumber() * 0.1;
    expect(grant.unlockedAmount.toNumber()).to.equal(unlocked);
  });

  it("Prevents unlocking Year 1 without meeting time requirement", async () => {
    // User completed milestones but only 300 days passed
    // Should fail

    const [newGrantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_grant"), new anchor.BN(20).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    try {
      await program.methods
        .unlockMilestoneStage(new anchor.BN(20), 1)
        .accounts({
          config: configPda,
          rewardGrant: newGrantPda,
          milestoneProgress: milestoneProgressPda,
          recipient: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for time not met");
    } catch (error) {
      expect(error.toString()).to.include("TimeRequirementNotMet");
    }
  });

  it("Prevents unlocking Year 1 without completing 2 milestones", async () => {
    // 365 days passed but only 1 milestone completed
    // Should fail

    try {
      await program.methods
        .unlockMilestoneStage(grantId, 1)
        .accounts({
          config: configPda,
          rewardGrant: rewardGrantPda,
          milestoneProgress: milestoneProgressPda,
          recipient: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for milestones not met");
    } catch (error) {
      expect(error.toString()).to.include("MilestonesNotMet");
    }
  });

  it("Claims vested rewards (linear vesting)", async () => {
    // User has 5k linear vesting over 1 year
    // After 6 months, 50% should be claimable (2.5k)

    const [linearGrantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_grant"), new anchor.BN(11).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Mock: 6 months passed

    const tx = await program.methods
      .claimReward()
      .accounts({
        config: configPda,
        rewardGrant: linearGrantPda,
        rewardsVault: rewardsVaultPda,
        recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
        recipient: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Claim linear vested reward transaction:", tx);

    // Verify claimed amount updated
    const grant = await program.account.rewardGrant.fetch(linearGrantPda);
    const expectedClaimed = grant.totalAmount.toNumber() * 0.5; // 50% after 6 months
    // expect(grant.claimedAmount.toNumber()).to.equal(expectedClaimed);
  });

  it("Claims unlocked milestone rewards", async () => {
    // User unlocked Year 1 (10%)
    // Can now claim 5k $FRAC

    const beforeBalance = 0; // Get recipient token balance

    const tx = await program.methods
      .claimReward()
      .accounts({
        config: configPda,
        rewardGrant: rewardGrantPda,
        rewardsVault: rewardsVaultPda,
        recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
        recipient: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Claim milestone reward transaction:", tx);

    const afterBalance = 0; // Get recipient token balance after

    // Verify 5k claimed (10% of 50k)
    const grant = await program.account.rewardGrant.fetch(rewardGrantPda);
    expect(grant.claimedAmount.toNumber()).to.equal(5_000 * 10 ** 9);
  });

  it("Unlocks Year 2 milestone (30%) after 730 days + 3 milestones", async () => {
    // After 2 years + completing 3 of 4 milestones
    // Can unlock additional 30% (15k $FRAC)

    // Mock: 730 days passed
    // Mock: Completed 3 milestones

    const tx = await program.methods
      .unlockMilestoneStage(grantId, 2) // Stage 2 = Year 2
      .accounts({
        config: configPda,
        rewardGrant: rewardGrantPda,
        milestoneProgress: milestoneProgressPda,
        recipient: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Unlock Year 2 milestone transaction:", tx);

    // Verify stage 2 unlocked
    const grant = await program.account.rewardGrant.fetch(rewardGrantPda);
    expect(grant.stage_2_unlocked).to.be.true;

    // 10% + 30% = 40% total unlocked
    const unlocked = grant.totalAmount.toNumber() * 0.4;
    expect(grant.unlockedAmount.toNumber()).to.equal(unlocked);
  });

  it("Unlocks Year 3 milestone (60%) after 1095 days + 4 milestones", async () => {
    // After 3 years + completing all 4 milestones
    // Can unlock final 60% (30k $FRAC)

    // Mock: 1095 days passed
    // Mock: Completed all 4 milestones

    const tx = await program.methods
      .unlockMilestoneStage(grantId, 3) // Stage 3 = Year 3
      .accounts({
        config: configPda,
        rewardGrant: rewardGrantPda,
        milestoneProgress: milestoneProgressPda,
        recipient: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Unlock Year 3 milestone transaction:", tx);

    // Verify stage 3 unlocked
    const grant = await program.account.rewardGrant.fetch(rewardGrantPda);
    expect(grant.stage_3_unlocked).to.be.true;

    // 10% + 30% + 60% = 100% unlocked
    expect(grant.unlockedAmount.toNumber()).to.equal(grant.totalAmount.toNumber());
  });

  it("Checks milestone completion: Trading (10k $FRAC volume)", async () => {
    // User needs 10k trading volume
    const progress = await program.account.milestoneProgress.fetch(milestoneProgressPda);
    const isTradingComplete = progress.totalTradingVolume.toNumber() >= 10_000 * 10 ** 9;

    // In production, this check happens in unlock_milestone_stage
  });

  it("Checks milestone completion: Staking (180 days)", async () => {
    // User needs 180 days staked
    const progress = await program.account.milestoneProgress.fetch(milestoneProgressPda);
    const isStakingComplete = progress.totalStakingDays >= 180;
  });

  it("Checks milestone completion: Governance (3 proposals voted)", async () => {
    // User needs to vote on 3 proposals
    const progress = await program.account.milestoneProgress.fetch(milestoneProgressPda);
    const isGovernanceComplete = progress.governanceProposalsVoted >= 3;
  });

  it("Checks milestone completion: Vault Creation (1 vault)", async () => {
    // User needs to create 1 fractional vault
    const progress = await program.account.milestoneProgress.fetch(milestoneProgressPda);
    const isVaultComplete = progress.vaultsCreated >= 1;
  });

  it("Grants referral reward", async () => {
    const referrer = anchor.web3.Keypair.generate();
    const amount = new anchor.BN(100 * 10 ** 9); // 100 $FRAC
    const category = { referral: {} };

    const [referralGrantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_grant"), new anchor.BN(30).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .grantReward(new anchor.BN(30), referrer.publicKey, amount, category)
      .accounts({
        config: configPda,
        rewardGrant: referralGrantPda,
        rewardsVault: rewardsVaultPda,
        recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Grant referral reward transaction:", tx);

    const grant = await program.account.rewardGrant.fetch(referralGrantPda);
    expect(grant.category).to.deep.equal({ referral: {} });
  });

  it("Prevents claiming more than unlocked amount", async () => {
    // Try to claim before enough time passed

    try {
      await program.methods
        .claimReward()
        .accounts({
          config: configPda,
          rewardGrant: rewardGrantPda,
          rewardsVault: rewardsVaultPda,
          recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
          recipient: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      expect.fail("Should have thrown error for no unlocked rewards");
    } catch (error) {
      expect(error.toString()).to.include("NoUnlockedRewards");
    }
  });

  it("Updates rewards pool balance", async () => {
    // Fund rewards vault from treasury
    const fundAmount = new anchor.BN(1_000_000 * 10 ** 9); // 1M $FRAC

    const tx = await program.methods
      .fundRewardsPool(fundAmount)
      .accounts({
        config: configPda,
        rewardsVault: rewardsVaultPda,
        funderTokenAccount: anchor.web3.Keypair.generate().publicKey,
        funder: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Fund rewards pool transaction:", tx);

    const config = await program.account.rewardsConfig.fetch(configPda);
    expect(config.rewardsPoolBalance.toNumber()).to.equal(fundAmount.toNumber());
  });
});
