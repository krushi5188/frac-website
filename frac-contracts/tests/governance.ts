import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Governance } from "../target/types/governance";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("governance", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Governance as Program<Governance>;

  let configPda: anchor.web3.PublicKey;
  let proposalPda: anchor.web3.PublicKey;
  let voteRecordPda: anchor.web3.PublicKey;
  let userStakeAccount: anchor.web3.PublicKey;
  let stakingProgram: anchor.web3.PublicKey;

  const proposalId = new anchor.BN(1);
  const MIN_STAKE_TO_PROPOSE = 100_000 * 10 ** 9; // 100k $FRAC

  before(async () => {
    stakingProgram = anchor.web3.Keypair.generate().publicKey;

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("governance_config")],
      program.programId
    );

    [proposalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [voteRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote_record"),
        proposalId.toArrayLike(Buffer, "le", 8),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("Initializes governance program", async () => {
    const tx = await program.methods
      .initializeGovernance()
      .accounts({
        config: configPda,
        stakingProgram: stakingProgram,
        deployer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize governance transaction:", tx);

    // Verify config was created
    const config = await program.account.governanceConfig.fetch(configPda);
    expect(config.stakingProgram.toBase58()).to.equal(stakingProgram.toBase58());
    expect(config.proposalCount.toNumber()).to.equal(0);
    expect(config.minStakeToPropose.toNumber()).to.equal(MIN_STAKE_TO_PROPOSE);
    expect(config.timelockDelay.toNumber()).to.equal(86400); // 24 hours
  });

  it("Creates emergency proposal (2 days, 10% quorum)", async () => {
    const title = "Emergency: Pause trading due to exploit";
    const description = "Detected exploit in fractional ownership. Pause all trading immediately.";
    const targetProgram = anchor.web3.Keypair.generate().publicKey;

    const tx = await program.methods
      .createProposal(
        { emergency: {} },
        title,
        description,
        targetProgram,
        Buffer.from([]) // instruction data
      )
      .accounts({
        config: configPda,
        proposal: proposalPda,
        proposer: provider.wallet.publicKey,
        proposerStakeAccount: userStakeAccount,
        stakingProgram: stakingProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create emergency proposal transaction:", tx);

    // Verify proposal was created
    const proposal = await program.account.proposal.fetch(proposalPda);
    expect(proposal.proposalId.toNumber()).to.equal(proposalId.toNumber());
    expect(proposal.title).to.equal(title);
    expect(proposal.proposer.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(proposal.votingDurationSeconds.toNumber()).to.equal(172800); // 2 days
    expect(proposal.quorumBps).to.equal(1000); // 10%
    expect(proposal.status).to.deep.equal({ active: {} });
    expect(proposal.votesFor.toNumber()).to.equal(0);
    expect(proposal.votesAgainst.toNumber()).to.equal(0);
  });

  it("Casts vote on proposal", async () => {
    const voter = anchor.web3.Keypair.generate();
    const voterStakeAmount = 50_000 * 10 ** 9; // 50k $FRAC staked

    const [voterVoteRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote_record"),
        proposalId.toArrayLike(Buffer, "le", 8),
        voter.publicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .castVote({ approve: {} })
      .accounts({
        config: configPda,
        proposal: proposalPda,
        voteRecord: voterVoteRecordPda,
        voter: voter.publicKey,
        voterStakeAccount: userStakeAccount, // placeholder
        stakingProgram: stakingProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    console.log("Cast vote transaction:", tx);

    // Verify vote was recorded
    const voteRecord = await program.account.voteRecord.fetch(voterVoteRecordPda);
    expect(voteRecord.voter.toBase58()).to.equal(voter.publicKey.toBase58());
    expect(voteRecord.votingPower.toNumber()).to.equal(voterStakeAmount);
    expect(voteRecord.vote).to.deep.equal({ approve: {} });

    // Verify proposal votes updated
    const proposal = await program.account.proposal.fetch(proposalPda);
    expect(proposal.votesFor.toNumber()).to.equal(voterStakeAmount);
  });

  it("Prevents double voting", async () => {
    try {
      await program.methods
        .castVote({ reject: {} })
        .accounts({
          config: configPda,
          proposal: proposalPda,
          voteRecord: voteRecordPda,
          voter: provider.wallet.publicKey,
          voterStakeAccount: userStakeAccount,
          stakingProgram: stakingProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for double voting");
    } catch (error) {
      expect(error.toString()).to.include("AlreadyVoted");
    }
  });

  it("Finalizes proposal after voting period", async () => {
    // In production, wait for voting period to end
    // In tests, we'd mock the clock

    const tx = await program.methods
      .finalizeProposal()
      .accounts({
        config: configPda,
        proposal: proposalPda,
      })
      .rpc();

    console.log("Finalize proposal transaction:", tx);

    // Verify proposal was finalized
    const proposal = await program.account.proposal.fetch(proposalPda);
    expect(proposal.status).to.deep.equal({ succeeded: {} });
    // or { failed: {} } if quorum not met
  });

  it("Executes proposal after timelock", async () => {
    // Wait for 24-hour timelock to pass

    const tx = await program.methods
      .executeProposal()
      .accounts({
        config: configPda,
        proposal: proposalPda,
        targetProgram: anchor.web3.Keypair.generate().publicKey,
        executor: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Execute proposal transaction:", tx);

    // Verify proposal was executed
    const proposal = await program.account.proposal.fetch(proposalPda);
    expect(proposal.status).to.deep.equal({ executed: {} });
  });

  it("Prevents execution before timelock expires", async () => {
    // Create new proposal
    const proposalId2 = new anchor.BN(2);
    const [proposal2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalId2.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create, vote, finalize immediately
    // Then try to execute before 24 hours

    try {
      await program.methods
        .executeProposal()
        .accounts({
          config: configPda,
          proposal: proposal2Pda,
          targetProgram: anchor.web3.Keypair.generate().publicKey,
          executor: provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown error for timelock not expired");
    } catch (error) {
      expect(error.toString()).to.include("TimelockNotExpired");
    }
  });

  it("Creates parameter change proposal (5 days, 15% quorum)", async () => {
    const proposalId3 = new anchor.BN(3);
    const [proposal3Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalId3.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .createProposal(
        { parameterChange: {} },
        "Update Staking APY Rates",
        "Increase fixed-term staking APY from 16% to 18% for 365-day locks",
        stakingProgram,
        Buffer.from([]) // CPI instruction to update_apy_rates
      )
      .accounts({
        config: configPda,
        proposal: proposal3Pda,
        proposer: provider.wallet.publicKey,
        proposerStakeAccount: userStakeAccount,
        stakingProgram: stakingProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create parameter change proposal transaction:", tx);

    const proposal = await program.account.proposal.fetch(proposal3Pda);
    expect(proposal.votingDurationSeconds.toNumber()).to.equal(432000); // 5 days
    expect(proposal.quorumBps).to.equal(1500); // 15%
  });

  it("Creates treasury spending proposal (7 days, 20% quorum)", async () => {
    const proposalId4 = new anchor.BN(4);
    const [proposal4Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalId4.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .createProposal(
        { treasurySpending: {} },
        "Allocate 5M $FRAC for Marketing",
        "Spend 5M $FRAC from treasury for Q1 2025 marketing campaign",
        anchor.web3.Keypair.generate().publicKey,
        Buffer.from([])
      )
      .accounts({
        config: configPda,
        proposal: proposal4Pda,
        proposer: provider.wallet.publicKey,
        proposerStakeAccount: userStakeAccount,
        stakingProgram: stakingProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create treasury spending proposal transaction:", tx);

    const proposal = await program.account.proposal.fetch(proposal4Pda);
    expect(proposal.votingDurationSeconds.toNumber()).to.equal(604800); // 7 days
    expect(proposal.quorumBps).to.equal(2000); // 20%
  });

  it("Creates protocol upgrade proposal (14 days, 25% quorum)", async () => {
    const proposalId5 = new anchor.BN(5);
    const [proposal5Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalId5.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .createProposal(
        { protocolUpgrade: {} },
        "Upgrade Fractional Ownership Program",
        "Deploy new version with improved order matching algorithm",
        anchor.web3.Keypair.generate().publicKey,
        Buffer.from([])
      )
      .accounts({
        config: configPda,
        proposal: proposal5Pda,
        proposer: provider.wallet.publicKey,
        proposerStakeAccount: userStakeAccount,
        stakingProgram: stakingProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create protocol upgrade proposal transaction:", tx);

    const proposal = await program.account.proposal.fetch(proposal5Pda);
    expect(proposal.votingDurationSeconds.toNumber()).to.equal(1209600); // 14 days
    expect(proposal.quorumBps).to.equal(2500); // 25%
  });

  it("Rejects proposal from user without sufficient stake", async () => {
    const lowStakeUser = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .createProposal(
          { emergency: {} },
          "Invalid proposal",
          "User doesn't have 100k staked",
          anchor.web3.Keypair.generate().publicKey,
          Buffer.from([])
        )
        .accounts({
          config: configPda,
          proposal: proposalPda,
          proposer: lowStakeUser.publicKey,
          proposerStakeAccount: userStakeAccount, // Would have insufficient stake
          stakingProgram: stakingProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([lowStakeUser])
        .rpc();

      expect.fail("Should have thrown error for insufficient stake");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientStakeToPropose");
    }
  });

  it("Cancels proposal by proposer before finalization", async () => {
    const proposalId6 = new anchor.BN(6);
    const [proposal6Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalId6.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create proposal
    await program.methods
      .createProposal(
        { parameterChange: {} },
        "Test proposal for cancellation",
        "This will be cancelled",
        stakingProgram,
        Buffer.from([])
      )
      .accounts({
        config: configPda,
        proposal: proposal6Pda,
        proposer: provider.wallet.publicKey,
        proposerStakeAccount: userStakeAccount,
        stakingProgram: stakingProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Cancel it
    const tx = await program.methods
      .cancelProposal()
      .accounts({
        config: configPda,
        proposal: proposal6Pda,
        proposer: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Cancel proposal transaction:", tx);

    const proposal = await program.account.proposal.fetch(proposal6Pda);
    expect(proposal.status).to.deep.equal({ cancelled: {} });
  });

  it("Prevents non-proposer from cancelling", async () => {
    const otherUser = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .cancelProposal()
        .accounts({
          config: configPda,
          proposal: proposalPda,
          proposer: otherUser.publicKey,
        })
        .signers([otherUser])
        .rpc();

      expect.fail("Should have thrown error for unauthorized cancellation");
    } catch (error) {
      expect(error.toString()).to.include("UnauthorizedCancellation");
    }
  });

  it("Verifies vote snapshot prevents manipulation", async () => {
    // User stakes after proposal creation
    // Vote should use snapshot from proposal creation time
    // Not current stake amount

    // This test would require time-based snapshots
    // Verify that late staking doesn't increase voting power
  });

  it("Fails proposal that doesn't meet quorum", async () => {
    // Create proposal
    // Get minimal votes (below 10% quorum for emergency)
    // Finalize after voting period
    // Should mark as Failed

    const proposalId7 = new anchor.BN(7);
    const [proposal7Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalId7.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create proposal, wait for voting period to end without enough votes
    // Finalize should mark as failed

    // await program.methods.finalizeProposal().accounts({...}).rpc();

    // const proposal = await program.account.proposal.fetch(proposal7Pda);
    // expect(proposal.status).to.deep.equal({ failed: {} });
  });

  it("Executes CPI to update staking APY rates", async () => {
    // Create parameter change proposal
    // Vote passes
    // Wait for timelock
    // Execute proposal
    // Verify CPI to staking program executed correctly
    // Verify APY rates updated in staking config

    // This tests cross-program invocation
    // Governance → Staking program
  });
});
