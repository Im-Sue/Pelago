import * as dotenv from "dotenv";
import * as anchor from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import idl from "../target/idl/pelago_solana.json";
import type { PelagoSolana } from "../target/types/pelago_solana";

// Load environment variables from .env file
dotenv.config();

/**
 * 通用 Faucet 脚本 - 为任意市场 mint 测试代币
 *
 * 使用方法：
 * MARKET=<market_address> RECIPIENT=<用户钱包地址> npm run faucet:universal
 *
 * 如果不指定 MARKET，将从 market-config.json 读取
 */

async function main() {
  console.log("🚰 Pelago Solana Universal Token Faucet\n");

  // 配置 provider（需要使用有 mint authority 的钱包）
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const authority = provider.wallet as anchor.Wallet;
  const program = new anchor.Program<PelagoSolana>(
    idl as any,
    provider
  );

  // 获取市场地址
  let marketAddress: string;
  if (process.env.MARKET) {
    marketAddress = process.env.MARKET;
    console.log("📍 使用环境变量指定的市场");
  } else {
    // 尝试从 market-config.json 读取
    try {
      const fs = await import("fs");
      const marketConfig = JSON.parse(fs.readFileSync("market-config.json", "utf-8"));
      marketAddress = marketConfig.marketPda;
      console.log("📍 使用 market-config.json 中的市场");
    } catch (error) {
      throw new Error("❌ 请通过 MARKET 环境变量指定市场地址，或确保 market-config.json 存在");
    }
  }

  const marketPda = new PublicKey(marketAddress);
  console.log(`  Market: ${marketPda.toBase58()}\n`);

  // 从链上读取市场配置
  console.log("🔍 正在从链上读取市场配置...");
  const marketAccount = await program.account.market.fetch(marketPda);

  const loanTokenMint = marketAccount.loanTokenMint;
  const collateralTokenMint = marketAccount.collateralTokenMint;

  console.log("📋 市场配置:");
  console.log(`  Loan Token Mint: ${loanTokenMint.toBase58()}`);
  console.log(`  Collateral Token Mint: ${collateralTokenMint.toBase58()}`);
  console.log(`  Mint Authority: ${authority.publicKey.toBase58()}\n`);

  // 获取接收者地址（从环境变量或默认值）
  const recipientAddress = process.env.RECIPIENT || authority.publicKey.toBase58();
  const recipient = new PublicKey(recipientAddress);

  console.log(`🎯 接收者钱包: ${recipient.toBase58()}\n`);

  // Step 1: 创建或获取 Loan Token Account
  console.log("📦 Step 1: 创建 Loan Token Account...");
  const recipientLoanAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    authority.payer,
    loanTokenMint,
    recipient
  );
  console.log(`  ✅ Account: ${recipientLoanAccount.address.toBase58()}`);

  // Step 2: 创建或获取 Collateral Token Account
  console.log("\n📦 Step 2: 创建 Collateral Token Account...");
  const recipientCollateralAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    authority.payer,
    collateralTokenMint,
    recipient
  );
  console.log(`  ✅ Account: ${recipientCollateralAccount.address.toBase58()}`);

  // Step 3: Mint Loan Tokens (USDC)
  const loanAmount = 10_000_000_000; // 10,000 tokens (assuming 6 decimals)
  console.log("\n💰 Step 3: Minting Loan Tokens...");
  console.log(`  Amount: ${loanAmount / 1_000_000} tokens`);

  try {
    const loanTx = await mintTo(
      provider.connection,
      authority.payer,
      loanTokenMint,
      recipientLoanAccount.address,
      authority.publicKey,
      loanAmount
    );
    console.log(`  ✅ Transaction: ${loanTx}`);
  } catch (error: any) {
    console.log(`  ⚠️ Mint failed: ${error.message}`);
    console.log(`  提示: 确保你的钱包是该 token 的 mint authority`);
  }

  // Step 4: Mint Collateral Tokens (SOL)
  const collateralAmount = 100_000_000_000; // 100 tokens (assuming 9 decimals)
  console.log("\n💰 Step 4: Minting Collateral Tokens...");
  console.log(`  Amount: ${collateralAmount / 1_000_000_000} tokens`);

  try {
    const collateralTx = await mintTo(
      provider.connection,
      authority.payer,
      collateralTokenMint,
      recipientCollateralAccount.address,
      authority.publicKey,
      collateralAmount
    );
    console.log(`  ✅ Transaction: ${collateralTx}`);
  } catch (error: any) {
    console.log(`  ⚠️ Mint failed: ${error.message}`);
    console.log(`  提示: 确保你的钱包是该 token 的 mint authority`);
  }

  // 验证余额
  console.log("\n🔍 验证余额...");

  const loanBalance = await provider.connection.getTokenAccountBalance(
    recipientLoanAccount.address
  );
  console.log(`  Loan Token: ${loanBalance.value.uiAmount}`);

  const collateralBalance = await provider.connection.getTokenAccountBalance(
    recipientCollateralAccount.address
  );
  console.log(`  Collateral Token: ${collateralBalance.value.uiAmount}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Faucet 完成！");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 账户信息:");
  console.log(`  用户钱包: ${recipient.toBase58()}`);
  console.log(`  Market: ${marketPda.toBase58()}`);
  console.log(`  Loan Token Account: ${recipientLoanAccount.address.toBase58()}`);
  console.log(`  Collateral Token Account: ${recipientCollateralAccount.address.toBase58()}`);
  console.log("\n💡 现在可以在前端使用这个钱包进行测试了！\n");
}

main()
  .then(() => {
    console.log("✅ Faucet 执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Faucet 执行失败:", error);
    process.exit(1);
  });
