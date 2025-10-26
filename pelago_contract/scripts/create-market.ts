import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PelagoSolana } from "../target/types/pelago_solana";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";

// LLTV: 80% (即需要 125% 超额抵押)
const LLTV = 80_000_000; // 80% in basis points (100_000_000 = 100%)

async function main() {
  console.log("🚀 开始创建 Pelago Solana 测试市场...\n");

  // 配置 provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PelagoSolana as Program<PelagoSolana>;
  const authority = provider.wallet as anchor.Wallet;

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
    6 // USDC decimals
  );
  console.log(`  ✅ Loan Token Mint: ${loanTokenMint.toBase58()}`);

  console.log("  创建 Collateral Token (模拟 SOL, 9 decimals)...");
  const collateralTokenMint = await createMint(
    provider.connection,
    authority.payer,
    authority.publicKey,
    null,
    9 // SOL decimals
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

  // Mint 100,000 USDC (100,000 * 10^6)
  await mintTo(
    provider.connection,
    authority.payer,
    loanTokenMint,
    userLoanAccount.address,
    authority.publicKey,
    100_000_000_000
  );
  console.log(`  ✅ Minted 100,000 USDC (Loan Token)`);

  // Mint 1,000 SOL (1,000 * 10^9)
  await mintTo(
    provider.connection,
    authority.payer,
    collateralTokenMint,
    userCollateralAccount.address,
    authority.publicKey,
    1_000_000_000_000
  );
  console.log(`  ✅ Minted 1,000 SOL (Collateral Token)\n`);

  // Step 3: 计算 Market PDA
  console.log("📦 Step 3: 计算 Market PDA...");
  const [marketPda] = PublicKey.findProgramAddressSync(
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
  const loanVault = Keypair.generate();
  const collateralVault = Keypair.generate();
  console.log(`  ✅ Loan Vault: ${loanVault.publicKey.toBase58()}`);
  console.log(`  ✅ Collateral Vault: ${collateralVault.publicKey.toBase58()}\n`);

  // Step 5: 初始化市场
  console.log("📦 Step 5: 初始化市场...");
  try {
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

    // 等待确认
    await provider.connection.confirmTransaction(tx, "confirmed");

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
    };

    fs.writeFileSync(
      "market-config.json",
      JSON.stringify(marketConfig, null, 2)
    );
    console.log("💾 市场配置已保存到: market-config.json\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 市场创建成功！");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📋 快速测试指令:\n");
    console.log("查看市场信息:");
    console.log(`  solana account ${marketPda.toBase58()} --url devnet\n`);
    console.log("查看你的 token 余额:");
    console.log(`  spl-token balance ${loanTokenMint.toBase58()} --owner ${authority.publicKey.toBase58()} --url devnet`);
    console.log(`  spl-token balance ${collateralTokenMint.toBase58()} --owner ${authority.publicKey.toBase58()} --url devnet\n`);
    console.log("Solana Explorer:");
    console.log(`  https://explorer.solana.com/address/${marketPda.toBase58()}?cluster=devnet\n`);

  } catch (error) {
    console.error("❌ 创建市场失败:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("✅ 脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });
