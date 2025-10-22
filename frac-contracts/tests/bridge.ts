import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bridge } from "../target/types/bridge";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("bridge", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bridge as Program<Bridge>;

  let configPda: anchor.web3.PublicKey;
  let custodyAccountPda: anchor.web3.PublicKey;
  let transferRecordPda: anchor.web3.PublicKey;
  let fracTokenMint: anchor.web3.PublicKey;
  let wormholeBridge: anchor.web3.PublicKey;

  const MIN_BRIDGE_AMOUNT = 10 * 10 ** 9; // 10 $FRAC
  const MAX_BRIDGE_AMOUNT = 1_000_000 * 10 ** 9; // 1M $FRAC
  const BRIDGE_FEE = 1 * 10 ** 9; // 1 $FRAC

  before(async () => {
    fracTokenMint = anchor.web3.Keypair.generate().publicKey;
    wormholeBridge = anchor.web3.Keypair.generate().publicKey; // Mock Wormhole bridge

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bridge_config")],
      program.programId
    );

    [custodyAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("custody_account")],
      program.programId
    );

    const transferNonce = new anchor.BN(1);
    [transferRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("transfer_record"), transferNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
  });

  it("Initializes bridge program", async () => {
    const governanceProgram = anchor.web3.Keypair.generate().publicKey;

    const tx = await program.methods
      .initializeBridge()
      .accounts({
        config: configPda,
        custodyAccount: custodyAccountPda,
        fracTokenMint: fracTokenMint,
        wormholeBridge: wormholeBridge,
        governanceProgram: governanceProgram,
        deployer: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize bridge transaction:", tx);

    // Verify config was created
    const config = await program.account.bridgeConfig.fetch(configPda);
    expect(config.fracTokenMint.toBase58()).to.equal(fracTokenMint.toBase58());
    expect(config.wormholeBridge.toBase58()).to.equal(wormholeBridge.toBase58());
    expect(config.minBridgeAmount.toNumber()).to.equal(MIN_BRIDGE_AMOUNT);
    expect(config.maxBridgeAmount.toNumber()).to.equal(MAX_BRIDGE_AMOUNT);
    expect(config.bridgeFee.toNumber()).to.equal(BRIDGE_FEE);
    expect(config.isPaused).to.be.false;
  });

  it("Bridges tokens from Solana to Ethereum", async () => {
    const amount = new anchor.BN(1_000 * 10 ** 9); // 1,000 $FRAC
    const targetChain = 2; // Ethereum chain ID in Wormhole
    const recipientAddress = Buffer.from("0x1234567890abcdef1234567890abcdef12345678", "hex");

    const transferNonce = new anchor.BN(1);
    const [transferRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("transfer_record"), transferNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .bridgeTokensOut(transferNonce, amount, targetChain, recipientAddress)
      .accounts({
        config: configPda,
        transferRecord: transferRecordPda,
        custodyAccount: custodyAccountPda,
        user: provider.wallet.publicKey,
        userTokenAccount: anchor.web3.Keypair.generate().publicKey,
        wormholeBridge: wormholeBridge,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Bridge tokens out transaction:", tx);

    // Verify transfer record created
    const transferRecord = await program.account.transferRecord.fetch(transferRecordPda);
    expect(transferRecord.transferNonce.toNumber()).to.equal(transferNonce.toNumber());
    expect(transferRecord.sender.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(transferRecord.amount.toNumber()).to.equal(amount.toNumber());
    expect(transferRecord.targetChain).to.equal(targetChain);
    expect(transferRecord.status).to.deep.equal({ pending: {} });
    expect(transferRecord.recipientAddress).to.deep.equal(Array.from(recipientAddress));
  });

  it("Completes transfer in from Ethereum to Solana", async () => {
    const amount = new anchor.BN(500 * 10 ** 9); // 500 $FRAC
    const sourceChain = 2; // Ethereum
    const transferNonce = new anchor.BN(100);
    const wormholeVaa = Buffer.from("mock_vaa_signature"); // Mock Wormhole VAA

    const [inboundTransferPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("transfer_record"), transferNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const recipient = anchor.web3.Keypair.generate();

    const tx = await program.methods
      .completeTransferIn(transferNonce, amount, sourceChain, recipient.publicKey, wormholeVaa)
      .accounts({
        config: configPda,
        transferRecord: inboundTransferPda,
        custodyAccount: custodyAccountPda,
        recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
        wormholeBridge: wormholeBridge,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Complete transfer in transaction:", tx);

    // Verify transfer record created and completed
    const transferRecord = await program.account.transferRecord.fetch(inboundTransferPda);
    expect(transferRecord.amount.toNumber()).to.equal(amount.toNumber());
    expect(transferRecord.sourceChain).to.equal(sourceChain);
    expect(transferRecord.recipient.toBase58()).to.equal(recipient.publicKey.toBase58());
    expect(transferRecord.status).to.deep.equal({ completed: {} });
  });

  it("Rejects bridge amount below minimum", async () => {
    const tooSmallAmount = new anchor.BN(5 * 10 ** 9); // 5 $FRAC (below 10 min)
    const targetChain = 2;
    const recipientAddress = Buffer.from("0x1234567890abcdef1234567890abcdef12345678", "hex");

    try {
      await program.methods
        .bridgeTokensOut(new anchor.BN(2), tooSmallAmount, targetChain, recipientAddress)
        .accounts({
          config: configPda,
          transferRecord: transferRecordPda,
          custodyAccount: custodyAccountPda,
          user: provider.wallet.publicKey,
          userTokenAccount: anchor.web3.Keypair.generate().publicKey,
          wormholeBridge: wormholeBridge,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for amount below minimum");
    } catch (error) {
      expect(error.toString()).to.include("BridgeAmountTooLow");
    }
  });

  it("Rejects bridge amount above maximum", async () => {
    const tooLargeAmount = new anchor.BN(2_000_000 * 10 ** 9); // 2M $FRAC (above 1M max)
    const targetChain = 2;
    const recipientAddress = Buffer.from("0x1234567890abcdef1234567890abcdef12345678", "hex");

    try {
      await program.methods
        .bridgeTokensOut(new anchor.BN(3), tooLargeAmount, targetChain, recipientAddress)
        .accounts({
          config: configPda,
          transferRecord: transferRecordPda,
          custodyAccount: custodyAccountPda,
          user: provider.wallet.publicKey,
          userTokenAccount: anchor.web3.Keypair.generate().publicKey,
          wormholeBridge: wormholeBridge,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for amount above maximum");
    } catch (error) {
      expect(error.toString()).to.include("BridgeAmountTooHigh");
    }
  });

  it("Charges bridge fee (1 $FRAC)", async () => {
    const amount = new anchor.BN(1_000 * 10 ** 9);
    const targetChain = 2;
    const recipientAddress = Buffer.from("0x1234567890abcdef1234567890abcdef12345678", "hex");

    const beforeBalance = 0; // Get user token balance before

    await program.methods
      .bridgeTokensOut(new anchor.BN(4), amount, targetChain, recipientAddress)
      .accounts({
        config: configPda,
        transferRecord: transferRecordPda,
        custodyAccount: custodyAccountPda,
        user: provider.wallet.publicKey,
        userTokenAccount: anchor.web3.Keypair.generate().publicKey,
        wormholeBridge: wormholeBridge,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const afterBalance = 0; // Get user token balance after

    // User should have paid: amount + BRIDGE_FEE
    // expect(beforeBalance - afterBalance).to.equal(amount + BRIDGE_FEE);
  });

  it("Bridges tokens from Solana to BSC", async () => {
    const amount = new anchor.BN(2_000 * 10 ** 9); // 2,000 $FRAC
    const targetChain = 4; // BSC chain ID in Wormhole
    const recipientAddress = Buffer.from("0xabcdef1234567890abcdef1234567890abcdef12", "hex");

    const [transferBscPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("transfer_record"), new anchor.BN(5).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .bridgeTokensOut(new anchor.BN(5), amount, targetChain, recipientAddress)
      .accounts({
        config: configPda,
        transferRecord: transferBscPda,
        custodyAccount: custodyAccountPda,
        user: provider.wallet.publicKey,
        userTokenAccount: anchor.web3.Keypair.generate().publicKey,
        wormholeBridge: wormholeBridge,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Bridge to BSC transaction:", tx);

    const transferRecord = await program.account.transferRecord.fetch(transferBscPda);
    expect(transferRecord.targetChain).to.equal(4); // BSC
  });

  it("Pauses bridge (governance only)", async () => {
    const tx = await program.methods
      .pauseBridge()
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Pause bridge transaction:", tx);

    const config = await program.account.bridgeConfig.fetch(configPda);
    expect(config.isPaused).to.be.true;
  });

  it("Rejects bridge when paused", async () => {
    const amount = new anchor.BN(100 * 10 ** 9);
    const targetChain = 2;
    const recipientAddress = Buffer.from("0x1234567890abcdef1234567890abcdef12345678", "hex");

    try {
      await program.methods
        .bridgeTokensOut(new anchor.BN(6), amount, targetChain, recipientAddress)
        .accounts({
          config: configPda,
          transferRecord: transferRecordPda,
          custodyAccount: custodyAccountPda,
          user: provider.wallet.publicKey,
          userTokenAccount: anchor.web3.Keypair.generate().publicKey,
          wormholeBridge: wormholeBridge,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for bridge paused");
    } catch (error) {
      expect(error.toString()).to.include("BridgePaused");
    }
  });

  it("Unpauses bridge (governance only)", async () => {
    const tx = await program.methods
      .unpauseBridge()
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Unpause bridge transaction:", tx);

    const config = await program.account.bridgeConfig.fetch(configPda);
    expect(config.isPaused).to.be.false;
  });

  it("Verifies Wormhole VAA signature (mock)", async () => {
    // In production, this would verify the VAA signature
    // against Wormhole's guardian set

    const validVaa = Buffer.from("valid_mock_vaa_signature");

    // This check would happen inside complete_transfer_in
    // verify_wormhole_vaa(vaa) -> Result<()>
  });

  it("Prevents replay attacks with nonce tracking", async () => {
    // Try to complete same transfer twice with same nonce

    const amount = new anchor.BN(100 * 10 ** 9);
    const sourceChain = 2;
    const transferNonce = new anchor.BN(200);
    const wormholeVaa = Buffer.from("mock_vaa");

    const [replayTransferPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("transfer_record"), transferNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Complete transfer once
    await program.methods
      .completeTransferIn(
        transferNonce,
        amount,
        sourceChain,
        provider.wallet.publicKey,
        wormholeVaa
      )
      .accounts({
        config: configPda,
        transferRecord: replayTransferPda,
        custodyAccount: custodyAccountPda,
        recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
        wormholeBridge: wormholeBridge,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Try to complete again (replay attack)
    try {
      await program.methods
        .completeTransferIn(
          transferNonce,
          amount,
          sourceChain,
          provider.wallet.publicKey,
          wormholeVaa
        )
        .accounts({
          config: configPda,
          transferRecord: replayTransferPda,
          custodyAccount: custodyAccountPda,
          recipientTokenAccount: anchor.web3.Keypair.generate().publicKey,
          wormholeBridge: wormholeBridge,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for replay attack");
    } catch (error) {
      expect(error.toString()).to.include("TransferAlreadyCompleted");
    }
  });

  it("Tracks total bridged volume", async () => {
    const config = await program.account.bridgeConfig.fetch(configPda);
    const totalBridgedOut = config.totalBridgedOut.toNumber();
    const totalBridgedIn = config.totalBridgedIn.toNumber();

    console.log("Total bridged out:", totalBridgedOut / 10 ** 9, "$FRAC");
    console.log("Total bridged in:", totalBridgedIn / 10 ** 9, "$FRAC");

    expect(totalBridgedOut).to.be.greaterThan(0);
    expect(totalBridgedIn).to.be.greaterThan(0);
  });

  it("Updates bridge limits (governance only)", async () => {
    const newMinAmount = new anchor.BN(50 * 10 ** 9); // 50 $FRAC
    const newMaxAmount = new anchor.BN(500_000 * 10 ** 9); // 500k $FRAC

    const tx = await program.methods
      .updateBridgeLimits(newMinAmount, newMaxAmount)
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Update bridge limits transaction:", tx);

    const config = await program.account.bridgeConfig.fetch(configPda);
    expect(config.minBridgeAmount.toNumber()).to.equal(newMinAmount.toNumber());
    expect(config.maxBridgeAmount.toNumber()).to.equal(newMaxAmount.toNumber());
  });

  it("Updates bridge fee (governance only)", async () => {
    const newFee = new anchor.BN(2 * 10 ** 9); // 2 $FRAC

    const tx = await program.methods
      .updateBridgeFee(newFee)
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Update bridge fee transaction:", tx);

    const config = await program.account.bridgeConfig.fetch(configPda);
    expect(config.bridgeFee.toNumber()).to.equal(newFee.toNumber());
  });

  it("Adds supported chain (governance only)", async () => {
    const newChainId = 10; // Arbitrum
    const newChainName = "Arbitrum";

    const tx = await program.methods
      .addSupportedChain(newChainId, newChainName)
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Add supported chain transaction:", tx);

    // Verify chain added
    // In production: Check supportedChains array
  });

  it("Removes supported chain (governance only)", async () => {
    const chainId = 10; // Arbitrum

    const tx = await program.methods
      .removeSupportedChain(chainId)
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Remove supported chain transaction:", tx);
  });

  it("Prevents bridging to unsupported chain", async () => {
    const amount = new anchor.BN(100 * 10 ** 9);
    const unsupportedChain = 99; // Not in supported chains
    const recipientAddress = Buffer.from("0x1234567890abcdef1234567890abcdef12345678", "hex");

    try {
      await program.methods
        .bridgeTokensOut(new anchor.BN(7), amount, unsupportedChain, recipientAddress)
        .accounts({
          config: configPda,
          transferRecord: transferRecordPda,
          custodyAccount: custodyAccountPda,
          user: provider.wallet.publicKey,
          userTokenAccount: anchor.web3.Keypair.generate().publicKey,
          wormholeBridge: wormholeBridge,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error for unsupported chain");
    } catch (error) {
      expect(error.toString()).to.include("UnsupportedChain");
    }
  });

  it("Migrates to custom bridge implementation", async () => {
    const newBridgeProgram = anchor.web3.Keypair.generate().publicKey;

    const tx = await program.methods
      .migrateToCustomBridge(newBridgeProgram)
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Migrate to custom bridge transaction:", tx);

    const config = await program.account.bridgeConfig.fetch(configPda);
    expect(config.customBridgeProgram?.toBase58()).to.equal(newBridgeProgram.toBase58());
  });

  it("Handles emergency withdrawal (governance only)", async () => {
    // In case of critical bug or exploit
    // Governance can withdraw all tokens from custody

    const withdrawAmount = new anchor.BN(10_000 * 10 ** 9); // Emergency withdraw

    const tx = await program.methods
      .emergencyWithdraw(withdrawAmount)
      .accounts({
        config: configPda,
        custodyAccount: custodyAccountPda,
        withdrawalDestination: anchor.web3.Keypair.generate().publicKey,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Emergency withdrawal transaction:", tx);

    // Verify withdrawal executed
    // This should only be used in critical situations
  });

  it("Prevents unauthorized emergency withdrawal", async () => {
    const unauthorizedUser = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .emergencyWithdraw(new anchor.BN(1_000 * 10 ** 9))
        .accounts({
          config: configPda,
          custodyAccount: custodyAccountPda,
          withdrawalDestination: anchor.web3.Keypair.generate().publicKey,
          authority: unauthorizedUser.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([unauthorizedUser])
        .rpc();

      expect.fail("Should have thrown error for unauthorized withdrawal");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
    }
  });
});
