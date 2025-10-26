import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PelagoSolana } from "../target/types/pelago_solana";
import { PublicKey } from "@solana/web3.js";

describe("Check Market on Devnet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PelagoSolana as Program<PelagoSolana>;

  it("查询并显示市场详细信息", async () => {
    const marketPda = new PublicKey("75vz6kox2refLiDxem5zQ7y5upGaFMycSVWjLpFgvsc");

    console.log("\n🔍 查询市场信息...\n");
    console.log(`Market PDA: ${marketPda.toBase58()}`);
    console.log(`Program ID: ${program.programId.toBase58()}\n`);

    try {
      // 获取市场账户数据
      const marketAccount = await program.account.market.fetch(marketPda);

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📊 市场详细信息");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      console.log("🔑 权限与配置:");
      console.log(`  Authority: ${marketAccount.authority.toBase58()}`);
      console.log(`  LLTV: ${marketAccount.lltv.toNumber() / 1_000_000}%\n`);

      console.log("💰 Token 配置:");
      console.log(`  Loan Token Mint: ${marketAccount.loanTokenMint.toBase58()}`);
      console.log(`  Collateral Token Mint: ${marketAccount.collateralTokenMint.toBase58()}\n`);

      console.log("🏦 Vault 地址:");
      console.log(`  Loan Vault: ${marketAccount.loanVault.toBase58()}`);
      console.log(`  Collateral Vault: ${marketAccount.collateralVault.toBase58()}\n`);

      console.log("📈 市场状态:");
      console.log(`  Total Supply Assets: ${marketAccount.totalSupplyAssets.toNumber() / 1e6} USDC`);
      console.log(`  Total Supply Shares: ${marketAccount.totalSupplyShares.toNumber()}`);
      console.log(`  Total Borrow Assets: ${marketAccount.totalBorrowAssets.toNumber() / 1e6} USDC`);
      console.log(`  Total Borrow Shares: ${marketAccount.totalBorrowShares.toNumber()}\n`);

      // 获取 Vault 账户信息
      const loanVaultInfo = await provider.connection.getAccountInfo(marketAccount.loanVault);
      const collateralVaultInfo = await provider.connection.getAccountInfo(marketAccount.collateralVault);

      console.log("🔐 Vault 状态:");
      console.log(`  Loan Vault 存在: ${loanVaultInfo ? '✅' : '❌'}`);
      console.log(`  Collateral Vault 存在: ${collateralVaultInfo ? '✅' : '❌'}\n`);

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ 市场验证成功！");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      // 链上验证
      console.log("🔗 区块链浏览器链接:");
      console.log(`  https://explorer.solana.com/address/${marketPda.toBase58()}?cluster=devnet\n`);

    } catch (error) {
      console.error("❌ 查询失败:", error);
      throw error;
    }
  });
});
