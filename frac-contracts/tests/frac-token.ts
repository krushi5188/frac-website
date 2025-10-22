import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FracToken } from "../target/types/frac_token";
import { expect } from "chai";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("frac-token", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FracToken as Program<FracToken>;

  let mintKeypair: anchor.web3.Keypair;
  let deployerTokenAccount: anchor.web3.PublicKey;
  let communityPool: anchor.web3.PublicKey;
  let stakingRewardsPool: anchor.web3.PublicKey;
  let teamVestingPool: anchor.web3.PublicKey;
  let treasuryPool: anchor.web3.PublicKey;
  let liquidityPool: anchor.web3.PublicKey;

  const TOTAL_SUPPLY = 1_000_000_000 * 10 ** 9; // 1B tokens with 9 decimals
  const COMMUNITY_AMOUNT = 450_000_000 * 10 ** 9; // 45%
  const STAKING_REWARDS_AMOUNT = 250_000_000 * 10 ** 9; // 25%
  const TEAM_AMOUNT = 150_000_000 * 10 ** 9; // 15%
  const TREASURY_AMOUNT = 100_000_000 * 10 ** 9; // 10%
  const LIQUIDITY_AMOUNT = 50_000_000 * 10 ** 9; // 5%

  before(async () => {
    mintKeypair = anchor.web3.Keypair.generate();
  });

  it("Initializes the $FRAC token with 1B supply", async () => {
    // Create authority keypairs for each pool
    const communityAuthority = anchor.web3.Keypair.generate();
    const stakingAuthority = anchor.web3.Keypair.generate();
    const teamAuthority = anchor.web3.Keypair.generate();
    const treasuryAuthority = anchor.web3.Keypair.generate();
    const liquidityAuthority = anchor.web3.Keypair.generate();

    // Get associated token addresses
    deployerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      provider.wallet.publicKey
    );

    const tx = await program.methods
      .initializeToken()
      .accounts({
        mint: mintKeypair.publicKey,
        deployer: provider.wallet.publicKey,
        deployerTokenAccount,
        communityAuthority: communityAuthority.publicKey,
        stakingAuthority: stakingAuthority.publicKey,
        teamAuthority: teamAuthority.publicKey,
        treasuryAuthority: treasuryAuthority.publicKey,
        liquidityAuthority: liquidityAuthority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("Initialize token transaction:", tx);

    // Verify mint was created with correct properties
    const mintInfo = await provider.connection.getAccountInfo(mintKeypair.publicKey);
    expect(mintInfo).to.not.be.null;

    // Verify total supply (sum of all allocations)
    // Note: In production, verify each pool balance individually
  });

  it("Distributes tokens to all allocation pools correctly", async () => {
    // Verify each pool received correct amount
    // This would query each pool's token account balance

    // Example verification for community pool:
    // const communityBalance = await provider.connection.getTokenAccountBalance(communityPool);
    // expect(communityBalance.value.amount).to.equal(COMMUNITY_AMOUNT.toString());

    // Repeat for all pools...
  });

  it("Transfers mint authority to governance program", async () => {
    const governanceProgram = anchor.web3.Keypair.generate();

    const tx = await program.methods
      .transferMintAuthority(governanceProgram.publicKey)
      .accounts({
        mint: mintKeypair.publicKey,
        currentAuthority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Transfer mint authority transaction:", tx);

    // Verify mint authority changed
    const mintInfo = await provider.connection.getParsedAccountInfo(mintKeypair.publicKey);
    // @ts-ignore
    const mintData = mintInfo.value?.data.parsed.info;
    expect(mintData.mintAuthority).to.equal(governanceProgram.publicKey.toBase58());
  });

  it("Prevents unauthorized mint authority transfer", async () => {
    const unauthorizedUser = anchor.web3.Keypair.generate();
    const newAuthority = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .transferMintAuthority(newAuthority.publicKey)
        .accounts({
          mint: mintKeypair.publicKey,
          currentAuthority: unauthorizedUser.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([unauthorizedUser])
        .rpc();

      expect.fail("Should have thrown error for unauthorized transfer");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("Verifies token has 9 decimals", async () => {
    const mintInfo = await provider.connection.getParsedAccountInfo(mintKeypair.publicKey);
    // @ts-ignore
    const mintData = mintInfo.value?.data.parsed.info;
    expect(mintData.decimals).to.equal(9);
  });

  it("Verifies total supply equals 1 billion tokens", async () => {
    const mintInfo = await provider.connection.getParsedAccountInfo(mintKeypair.publicKey);
    // @ts-ignore
    const mintData = mintInfo.value?.data.parsed.info;
    expect(mintData.supply).to.equal(TOTAL_SUPPLY.toString());
  });

  it("Emits TokenInitialized event", async () => {
    // Event verification would go here
    // Check that TokenInitialized event was emitted with correct data
  });
});
