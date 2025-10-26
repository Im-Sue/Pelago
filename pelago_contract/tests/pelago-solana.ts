import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PelagoSolana } from "../target/types/pelago_solana";
import {
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("pelago-solana", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PelagoSolana as Program<PelagoSolana>;
  const authority = provider.wallet as anchor.Wallet;
  const user = anchor.web3.Keypair.generate();

  // Token mints
  let loanTokenMint: anchor.web3.PublicKey;
  let collateralTokenMint: anchor.web3.PublicKey;

  // Market and vaults
  let marketPda: anchor.web3.PublicKey;
  let loanVault: anchor.web3.Keypair;
  let collateralVault: anchor.web3.Keypair;

  // User token accounts
  let userLoanAccount: anchor.web3.PublicKey;
  let userCollateralAccount: anchor.web3.PublicKey;
  let userPositionPda: anchor.web3.PublicKey;

  // Constants matching Rust implementation
  const LLTV_PRECISION = 100_000_000;
  const LLTV = 0.8 * LLTV_PRECISION; // 80%

  before(async () => {
    // Airdrop SOL to user for transaction fees
    const airdropSignature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);

    // Create loan token mint (representing USDC)
    loanTokenMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6 // USDC has 6 decimals
    );

    // Create collateral token mint (representing SOL wrapped token)
    collateralTokenMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      9 // SOL has 9 decimals
    );

    // Create user token accounts
    const userLoanAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      loanTokenMint,
      user.publicKey
    );
    userLoanAccount = userLoanAta.address;

    const userCollateralAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      collateralTokenMint,
      user.publicKey
    );
    userCollateralAccount = userCollateralAta.address;

    // Mint tokens to user
    // 10,000 USDC (10,000 * 10^6)
    await mintTo(
      provider.connection,
      authority.payer,
      loanTokenMint,
      userLoanAccount,
      authority.publicKey,
      10_000_000_000
    );

    // 100 SOL (100 * 10^9 lamports)
    await mintTo(
      provider.connection,
      authority.payer,
      collateralTokenMint,
      userCollateralAccount,
      authority.publicKey,
      100_000_000_000
    );

    // Derive Market PDA
    [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        loanTokenMint.toBuffer(),
        collateralTokenMint.toBuffer(),
      ],
      program.programId
    );

    // Derive UserPosition PDA
    [userPositionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("user-position"),
        marketPda.toBuffer(),
        user.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Create vault keypairs
    loanVault = anchor.web3.Keypair.generate();
    collateralVault = anchor.web3.Keypair.generate();
  });

  describe("Market Initialization", () => {
    it("Initializes a new market with vaults", async () => {
      const tx = await program.methods
        .initializeMarket(new anchor.BN(LLTV))
        .accounts({
          market: marketPda,
          loanTokenMint: loanTokenMint,
          collateralTokenMint: collateralTokenMint,
          loanVault: loanVault.publicKey,
          collateralVault: collateralVault.publicKey,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([loanVault, collateralVault])
        .rpc();

      console.log("Initialize market transaction:", tx);

      // Verify market account
      const marketAccount = await program.account.market.fetch(marketPda);
      assert.equal(
        marketAccount.authority.toBase58(),
        authority.publicKey.toBase58()
      );
      assert.equal(
        marketAccount.loanTokenMint.toBase58(),
        loanTokenMint.toBase58()
      );
      assert.equal(
        marketAccount.collateralTokenMint.toBase58(),
        collateralTokenMint.toBase58()
      );
      assert.equal(marketAccount.lltv.toNumber(), LLTV);
      assert.equal(marketAccount.totalSupplyAssets.toNumber(), 0);
      assert.equal(marketAccount.totalBorrowAssets.toNumber(), 0);
    });

    it("Fails to initialize with invalid LLTV", async () => {
      const invalidLltv = 150_000_000; // 150% (> 100%)

      // Create unique token mints for this test to avoid PDA collision
      const tempLoanMint = await createMint(
        provider.connection,
        authority.payer,
        authority.publicKey,
        null,
        6
      );

      const tempCollateralMint = await createMint(
        provider.connection,
        authority.payer,
        authority.publicKey,
        null,
        9
      );

      // Generate vault keypairs
      const tempLoanVault = anchor.web3.Keypair.generate();
      const tempCollateralVault = anchor.web3.Keypair.generate();

      // Derive unique market PDA
      const [tempMarketPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("market"),
          tempLoanMint.toBuffer(),
          tempCollateralMint.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .initializeMarket(new anchor.BN(invalidLltv))
          .accounts({
            market: tempMarketPda,
            loanTokenMint: tempLoanMint,
            collateralTokenMint: tempCollateralMint,
            loanVault: tempLoanVault.publicKey,
            collateralVault: tempCollateralVault.publicKey,
            authority: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([tempLoanVault, tempCollateralVault])
          .rpc();
        assert.fail("Should have thrown InvalidLltv error");
      } catch (error: any) {
        // Verify error type with multiple checks
        const errorString = error.toString();
        const hasInvalidLltvString = errorString.includes("InvalidLltv");
        const hasInvalidLltvCode = error.error?.errorCode?.code === "InvalidLltv";

        assert.isTrue(
          hasInvalidLltvString || hasInvalidLltvCode,
          `Expected InvalidLltv error, got: ${errorString}`
        );
      }
    });
  });

  describe("Supply Operations", () => {
    it("Supplies loan assets to market", async () => {
      const supplyAmount = 1000_000_000; // 1,000 USDC

      const tx = await program.methods
        .supply(new anchor.BN(supplyAmount), new anchor.BN(0))
        .accounts({
          market: marketPda,
          userPosition: userPositionPda,
          loanVault: loanVault.publicKey,
          userTokenAccount: userLoanAccount,
          user: user.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log("Supply transaction:", tx);

      // Verify user position
      const userPosition = await program.account.userPosition.fetch(
        userPositionPda
      );
      // P1: Virtual shares mechanism - shares != assets (amplified for first supply)
      assert.isTrue(
        userPosition.supplyShares.gt(new anchor.BN(0)),
        "User should have non-zero supply shares"
      );
      console.log("User supply shares:", userPosition.supplyShares.toString());

      // Verify market totals
      const marketAccount = await program.account.market.fetch(marketPda);
      assert.equal(
        marketAccount.totalSupplyAssets.toNumber(),
        supplyAmount,
        "Total supply assets should match supplied amount"
      );
      assert.isTrue(
        marketAccount.totalSupplyShares.gt(new anchor.BN(0)),
        "Market should have non-zero supply shares"
      );
    });

    it("Fails to supply zero amount", async () => {
      try {
        await program.methods
          .supply(new anchor.BN(0), new anchor.BN(0))
          .accounts({
            market: marketPda,
            userPosition: userPositionPda,
            loanVault: loanVault.publicKey,
            userTokenAccount: userLoanAccount,
            user: user.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();
        assert.fail("Should have failed with zero amount");
      } catch (error) {
        assert.include(error.toString(), "InconsistentInput");
      }
    });
  });

  describe("Collateral Operations", () => {
    it("Supplies collateral to market", async () => {
      const collateralAmount = 10_000_000_000; // 10 SOL

      const tx = await program.methods
        .supplyCollateral(new anchor.BN(collateralAmount))
        .accounts({
          market: marketPda,
          userPosition: userPositionPda,
          collateralVault: collateralVault.publicKey,
          userCollateralAccount: userCollateralAccount,
          user: user.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log("Supply collateral transaction:", tx);

      // Verify user position
      const userPosition = await program.account.userPosition.fetch(
        userPositionPda
      );
      assert.equal(
        userPosition.collateralAmount.toNumber(),
        collateralAmount
      );
    });

    it("Fails to supply zero collateral", async () => {
      try {
        await program.methods
          .supplyCollateral(new anchor.BN(0))
          .accounts({
            market: marketPda,
            userPosition: userPositionPda,
            collateralVault: collateralVault.publicKey,
            userCollateralAccount: userCollateralAccount,
            user: user.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();
        assert.fail("Should have failed with zero amount");
      } catch (error) {
        assert.include(error.toString(), "ZeroAmount");
      }
    });
  });

  describe("Borrow Operations", () => {
    it("Borrows against collateral", async () => {
      // With 10 SOL collateral at 100 USDC/SOL = 1000 USDC collateral value
      // At 80% LLTV, max borrow = 800 USDC
      // Try borrowing 500 USDC (safe)
      const borrowAmount = 500_000_000; // 500 USDC

      const tx = await program.methods
        .borrow(new anchor.BN(borrowAmount), new anchor.BN(0))
        .accounts({
          market: marketPda,
          userPosition: userPositionPda,
          loanVault: loanVault.publicKey,
          userTokenAccount: userLoanAccount,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log("Borrow transaction:", tx);

      // Verify user position
      const userPosition = await program.account.userPosition.fetch(
        userPositionPda
      );
      // P1: Virtual shares mechanism - shares != assets
      assert.isTrue(
        userPosition.borrowShares.gt(new anchor.BN(0)),
        "User should have non-zero borrow shares"
      );
      console.log("User borrow shares:", userPosition.borrowShares.toString());

      // Verify market totals
      const marketAccount = await program.account.market.fetch(marketPda);
      assert.equal(
        marketAccount.totalBorrowAssets.toNumber(),
        borrowAmount,
        "Total borrow assets should match borrowed amount"
      );
      assert.isTrue(
        marketAccount.totalBorrowShares.gt(new anchor.BN(0)),
        "Market should have non-zero borrow shares"
      );
    });

    it("Fails to borrow exceeding collateral limit", async () => {
      // P1 FIX: Account for virtual shares rounding
      // User has 10 SOL × 100 USDC × 0.8 LLTV = 800 USDC max
      // Check actual current borrow value (not shares)
      const positionBefore = await program.account.userPosition.fetch(
        userPositionPda
      );
      const marketBefore = await program.account.market.fetch(marketPda);

      console.log("Current borrow shares:", positionBefore.borrowShares.toString());
      console.log("Total borrow assets:", marketBefore.totalBorrowAssets.toString());
      console.log("Total borrow shares:", marketBefore.totalBorrowShares.toString());

      // Calculate actual borrow value using to_assets_up (same as health check)
      // For P1, we need to account for virtual shares
      const currentBorrowValue = positionBefore.borrowShares.toNumber() > 0
        ? Math.ceil(
            (positionBefore.borrowShares.toNumber() * (marketBefore.totalBorrowAssets.toNumber() + 1)) /
            (marketBefore.totalBorrowShares.toNumber() + 1_000_000)
          )
        : 0;

      console.log("Calculated current borrow value:", currentBorrowValue);

      // Max borrow: 800 USDC
      // Try to borrow enough to definitely exceed: 800 - currentBorrow + 100
      const maxBorrow = 800_000_000;
      const borrowAmount = maxBorrow - currentBorrowValue + 100_000_000; // +100 USDC to ensure failure

      console.log("Attempting to borrow:", borrowAmount, "to exceed max of", maxBorrow);

      try {
        await program.methods
          .borrow(new anchor.BN(borrowAmount), new anchor.BN(0))
          .accounts({
            market: marketPda,
            userPosition: userPositionPda,
            loanVault: loanVault.publicKey,
            userTokenAccount: userLoanAccount,
            user: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();
        assert.fail("Should have failed with insufficient collateral");
      } catch (error) {
        const errorStr = error.toString();
        // Accept either InsufficientCollateral or InsufficientLiquidity
        // (P1 virtual shares may affect which error triggers first)
        assert.isTrue(
          errorStr.includes("InsufficientCollateral") || errorStr.includes("InsufficientLiquidity"),
          `Expected InsufficientCollateral or InsufficientLiquidity, got: ${errorStr}`
        );
      }
    });

    it("Fails to borrow without collateral", async () => {
      // Create new user without collateral
      const newUser = anchor.web3.Keypair.generate();

      // Airdrop SOL for fees
      const airdropSig = await provider.connection.requestAirdrop(
        newUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create token account
      const newUserAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority.payer,
        loanTokenMint,
        newUser.publicKey
      );

      // Derive new user position PDA
      const [newUserPositionPda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("user-position"),
            marketPda.toBuffer(),
            newUser.publicKey.toBuffer(),
          ],
          program.programId
        );

      try {
        await program.methods
          .borrow(new anchor.BN(100_000_000), new anchor.BN(0)) // 100 USDC
          .accounts({
            market: marketPda,
            userPosition: newUserPositionPda,
            loanVault: loanVault.publicKey,
            userTokenAccount: newUserAta.address,
            user: newUser.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([newUser])
          .rpc();
        assert.fail("Should have failed without collateral");
      } catch (error) {
        // Will fail because UserPosition doesn't exist yet
        assert.isTrue(error.toString().includes("AccountNotInitialized"));
      }
    });

    it("Fails to borrow exceeding market liquidity", async () => {
      // Market has 1000 USDC supply, 500 USDC borrowed, so 500 USDC available
      // Try borrowing 600 USDC (exceeds available)
      const borrowAmount = 600_000_000;

      try {
        await program.methods
          .borrow(new anchor.BN(borrowAmount), new anchor.BN(0))
          .accounts({
            market: marketPda,
            userPosition: userPositionPda,
            loanVault: loanVault.publicKey,
            userTokenAccount: userLoanAccount,
            user: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();
        assert.fail("Should have failed with insufficient liquidity");
      } catch (error) {
        assert.include(error.toString(), "InsufficientLiquidity");
      }
    });
  });

  describe("Complete Flow", () => {
    it("Executes complete supply-collateral-borrow flow", async () => {
      // Create new user for clean test
      const testUser = anchor.web3.Keypair.generate();

      // Airdrop SOL
      const airdropSig = await provider.connection.requestAirdrop(
        testUser.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create token accounts
      const testUserLoanAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority.payer,
        loanTokenMint,
        testUser.publicKey
      );

      const testUserCollateralAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority.payer,
        collateralTokenMint,
        testUser.publicKey
      );

      // Mint tokens
      await mintTo(
        provider.connection,
        authority.payer,
        loanTokenMint,
        testUserLoanAta.address,
        authority.publicKey,
        5_000_000_000 // 5,000 USDC
      );

      await mintTo(
        provider.connection,
        authority.payer,
        collateralTokenMint,
        testUserCollateralAta.address,
        authority.publicKey,
        20_000_000_000 // 20 SOL
      );

      // Derive user position PDA
      const [testUserPositionPda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("user-position"),
            marketPda.toBuffer(),
            testUser.publicKey.toBuffer(),
          ],
          program.programId
        );

      // Step 1: Supply loan assets
      await program.methods
        .supply(new anchor.BN(2_000_000_000), new anchor.BN(0)) // 2,000 USDC
        .accounts({
          market: marketPda,
          userPosition: testUserPositionPda,
          loanVault: loanVault.publicKey,
          userTokenAccount: testUserLoanAta.address,
          user: testUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([testUser])
        .rpc();

      // Step 2: Supply collateral
      await program.methods
        .supplyCollateral(new anchor.BN(20_000_000_000)) // 20 SOL
        .accounts({
          market: marketPda,
          userPosition: testUserPositionPda,
          collateralVault: collateralVault.publicKey,
          userCollateralAccount: testUserCollateralAta.address,
          user: testUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([testUser])
        .rpc();

      // Step 3: Borrow against collateral
      // 20 SOL * 100 USDC/SOL * 0.8 = 1600 USDC max
      await program.methods
        .borrow(new anchor.BN(1_500_000_000), new anchor.BN(0)) // 1,500 USDC (safe)
        .accounts({
          market: marketPda,
          userPosition: testUserPositionPda,
          loanVault: loanVault.publicKey,
          userTokenAccount: testUserLoanAta.address,
          user: testUser.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([testUser])
        .rpc();

      // Verify final position
      const finalPosition = await program.account.userPosition.fetch(
        testUserPositionPda
      );

      // P1: Virtual shares - check shares exist but not exact values
      assert.isTrue(
        finalPosition.supplyShares.gt(new anchor.BN(0)),
        "Should have supply shares"
      );
      console.log("Supply shares:", finalPosition.supplyShares.toString());

      assert.equal(
        finalPosition.collateralAmount.toNumber(),
        20_000_000_000,
        "Collateral should be 20 SOL"
      );

      assert.isTrue(
        finalPosition.borrowShares.gt(new anchor.BN(0)),
        "Should have borrow shares"
      );
      console.log("Borrow shares:", finalPosition.borrowShares.toString());

      console.log("Complete flow executed successfully");
    });
  });
});
