import * as anchor from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";

/**
 * Faucet 脚本 - 为测试用户 mint 测试代币
 *
 * 使用方法：
 * RECIPIENT=<用户钱包地址> npm run faucet
 *
 * 或者在代码中修改 RECIPIENT_ADDRESS
 */

async function main() {
  console.log("🚰 Pelago Solana Token Faucet\n");

  // 配置 provider（需要使用有 mint authority 的钱包）
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const authority = provider.wallet as anchor.Wallet;

  // 读取市场配置
  const marketConfigPath = "market-config.json";
  if (!fs.existsSync(marketConfigPath)) {
    throw new Error("❌ 找不到 market-config.json，请先运行 create-market 脚本");
  }

  const marketConfig = JSON.parse(fs.readFileSync(marketConfigPath, "utf-8"));
  const loanTokenMint = new PublicKey(marketConfig.loanTokenMint);
  const collateralTokenMint = new PublicKey(marketConfig.collateralTokenMint);

  console.log("📋 市场配置:");
  console.log(`  Loan Token (USDC): ${loanTokenMint.toBase58()}`);
  console.log(`  Collateral Token (SOL): ${collateralTokenMint.toBase58()}`);
  console.log(`  Mint Authority: ${authority.publicKey.toBase58()}\n`);

  // 获取接收者地址（从环境变量或默认值）
  const recipientAddress = process.env.RECIPIENT || authority.publicKey.toBase58();
  const recipient = new PublicKey(recipientAddress);

  console.log(`🎯 接收者钱包: ${recipient.toBase58()}\n`);

  // Step 1: 创建或获取 Loan Token Account
  console.log("📦 Step 1: 创建 Loan Token Account (USDC)...");
  const recipientLoanAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    authority.payer,
    loanTokenMint,
    recipient
  );
  console.log(`  ✅ Account: ${recipientLoanAccount.address.toBase58()}`);

  // Step 2: 创建或获取 Collateral Token Account
  console.log("\n📦 Step 2: 创建 Collateral Token Account (SOL)...");
  const recipientCollateralAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    authority.payer,
    collateralTokenMint,
    recipient
  );
  console.log(`  ✅ Account: ${recipientCollateralAccount.address.toBase58()}`);

  // Step 3: Mint Loan Tokens (USDC)
  const loanAmount = 10_000_000_000; // 10,000 USDC (6 decimals)
  console.log("\n💰 Step 3: Minting Loan Tokens (USDC)...");
  console.log(`  Amount: ${loanAmount / 1_000_000} USDC`);

  const loanTx = await mintTo(
    provider.connection,
    authority.payer,
    loanTokenMint,
    recipientLoanAccount.address,
    authority.publicKey,
    loanAmount
  );
  console.log(`  ✅ Transaction: ${loanTx}`);

  // Step 4: Mint Collateral Tokens (SOL)
  const collateralAmount = 100_000_000_000; // 100 SOL (9 decimals)
  console.log("\n💰 Step 4: Minting Collateral Tokens (SOL)...");
  console.log(`  Amount: ${collateralAmount / 1_000_000_000} SOL`);

  const collateralTx = await mintTo(
    provider.connection,
    authority.payer,
    collateralTokenMint,
    recipientCollateralAccount.address,
    authority.publicKey,
    collateralAmount
  );
  console.log(`  ✅ Transaction: ${collateralTx}`);

  // 验证余额
  console.log("\n🔍 验证余额...");

  const loanBalance = await provider.connection.getTokenAccountBalance(
    recipientLoanAccount.address
  );
  console.log(`  Loan Token (USDC): ${loanBalance.value.uiAmount} USDC`);

  const collateralBalance = await provider.connection.getTokenAccountBalance(
    recipientCollateralAccount.address
  );
  console.log(`  Collateral Token (SOL): ${collateralBalance.value.uiAmount} SOL`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Faucet 完成！");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 账户信息:");
  console.log(`  用户钱包: ${recipient.toBase58()}`);
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
