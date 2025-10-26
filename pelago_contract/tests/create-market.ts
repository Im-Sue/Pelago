import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PelagoSolana } from "../target/types/pelago_solana";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";

// LLTV: 80% (即需要 125% 超额抵押)
const LLTV = 80_000_000;

describe("Create Market for Testing", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PelagoSolana as Program<PelagoSolana>;
  const authority = provider.wallet as anchor.Wallet;

  it("创建测试市场", async () => {
    console.log("\n🚀 开始创建 Pelago Solana 测试市场...\n");

    console.log("📋 配置信息:");
    console.log(`  钱包地址: ${authority.publicKey.toBase58()}`);
    console.log(`  Program ID: ${program.programId.toBase58()}`);
    console.log(`  RPC URL: ${provider.connection.rpcEndpoint}`);
    console.log(`  LLTV: ${LLTV / 1_000_000}%\n`);

    // 检查余额
    const balance = await provider.connection.getBalance(authority.publicKey);
    console.log(`💰 当前余额: ${balance / 1e9} SOL\n`);

    if (balance < 0.5 * 1e9) {
      throw new Error("❌ 余额不足！至少需要 0.5 SOL 来创建市场");
    }

    // Step 1: 创建测试代币 Mints
    console.log("📦 Step 1: 创建测试代币 Mints...");

    console.log("  创建 Loan Token (模拟 USDC, 6 decimals)...");
    const loanTokenMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6
    );
    console.log(`  ✅ Loan Token Mint: ${loanTokenMint.toBase58()}`);

    console.log("  创建 Collateral Token (模拟 SOL, 9 decimals)...");
    const collateralTokenMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      9
    );
    console.log(`  ✅ Collateral Token Mint: ${collateralTokenMint.toBase58()}\n`);

    // Step 2: 为钱包创建 token 账户并 mint 测试代币
    console.log("📦 Step 2: 创建 Token 账户并 mint 测试代币...");

    const userLoanAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      loanTokenMint,
      authority.publicKey
    );
    console.log(`  ✅ User Loan Token Account: ${userLoanAccount.address.toBase58()}`);

    const userCollateralAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      collateralTokenMint,
      authority.publicKey
    );
    console.log(`  ✅ User Collateral Token Account: ${userCollateralAccount.address.toBase58()}\n`);

    // Mint 测试代币给用户
    console.log("  Minting 测试代币给你的钱包...");

    await mintTo(
      provider.connection,
      authority.payer,
      loanTokenMint,
      userLoanAccount.address,
      authority.publicKey,
      100_000_000_000 // 100,000 USDC
    );
    console.log(`  ✅ Minted 100,000 USDC (Loan Token)`);

    await mintTo(
      provider.connection,
      authority.payer,
      collateralTokenMint,
      userCollateralAccount.address,
      authority.publicKey,
      1_000_000_000_000 // 1,000 SOL
    );
    console.log(`  ✅ Minted 1,000 SOL (Collateral Token)\n`);

    // Step 3: 计算 Market PDA
    console.log("📦 Step 3: 计算 Market PDA...");
    const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        loanTokenMint.toBuffer(),
        collateralTokenMint.toBuffer(),
      ],
      program.programId
    );
    console.log(`  ✅ Market PDA: ${marketPda.toBase58()}\n`);

    // Step 4: 生成 Vault Keypairs
    console.log("📦 Step 4: 生成 Vault Keypairs...");
    const loanVault = anchor.web3.Keypair.generate();
    const collateralVault = anchor.web3.Keypair.generate();
    console.log(`  ✅ Loan Vault: ${loanVault.publicKey.toBase58()}`);
    console.log(`  ✅ Collateral Vault: ${collateralVault.publicKey.toBase58()}\n`);

    // Step 5: 初始化市场
    console.log("📦 Step 5: 初始化市场...");
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

    console.log(`  ✅ 交易签名: ${tx}\n`);

    // Step 6: 验证市场创建
    console.log("📦 Step 6: 验证市场创建...");
    const marketAccount = await program.account.market.fetch(marketPda);

    console.log("  ✅ 市场信息:");
    console.log(`    Authority: ${marketAccount.authority.toBase58()}`);
    console.log(`    Loan Token Mint: ${marketAccount.loanTokenMint.toBase58()}`);
    console.log(`    Collateral Token Mint: ${marketAccount.collateralTokenMint.toBase58()}`);
    console.log(`    Loan Vault: ${marketAccount.loanVault.toBase58()}`);
    console.log(`    Collateral Vault: ${marketAccount.collateralVault.toBase58()}`);
    console.log(`    LLTV: ${marketAccount.lltv.toNumber() / 1_000_000}%`);
    console.log(`    Total Supply: ${marketAccount.totalSupplyAssets.toNumber()}`);
    console.log(`    Total Borrow: ${marketAccount.totalBorrowAssets.toNumber()}\n`);

    // 保存市场配置到文件
    const marketConfig = {
      marketPda: marketPda.toBase58(),
      loanTokenMint: loanTokenMint.toBase58(),
      collateralTokenMint: collateralTokenMint.toBase58(),
      loanVault: loanVault.publicKey.toBase58(),
      collateralVault: collateralVault.publicKey.toBase58(),
      lltv: LLTV,
      authority: authority.publicKey.toBase58(),
      userLoanAccount: userLoanAccount.address.toBase58(),
      userCollateralAccount: userCollateralAccount.address.toBase58(),
      createdAt: new Date().toISOString(),
      transactionSignature: tx,
      network: "devnet",
      rpcUrl: provider.connection.rpcEndpoint,
    };

    fs.writeFileSync(
      "market-config.json",
      JSON.stringify(marketConfig, null, 2)
    );
    console.log("💾 市场配置已保存到: market-config.json\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 市场创建成功！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📋 Solana Explorer:");
    console.log(`  Market: https://explorer.solana.com/address/${marketPda.toBase58()}?cluster=devnet`);
    console.log(`  Loan Token: https://explorer.solana.com/address/${loanTokenMint.toBase58()}?cluster=devnet`);
    console.log(`  Collateral Token: https://explorer.solana.com/address/${collateralTokenMint.toBase58()}?cluster=devnet\n`);
  });
});
