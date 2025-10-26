import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PelagoSolana } from "../target/types/pelago_solana";

describe("List All Markets", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PelagoSolana as Program<PelagoSolana>;

  it("查询所有市场", async () => {
    console.log("\n🔍 查询 Devnet 上的所有市场...\n");
    console.log(`Program ID: ${program.programId.toBase58()}\n`);

    try {
      // 方法 1: 使用 Anchor 的 .all() - 最简单
      console.log("📋 方法 1: program.account.market.all()\n");

      const allMarkets = await program.account.market.all();

      console.log(`找到 ${allMarkets.length} 个市场\n`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      allMarkets.forEach((market, index) => {
        console.log(`📊 市场 #${index + 1}`);
        console.log(`  PDA: ${market.publicKey.toBase58()}`);
        console.log(`  Authority: ${market.account.authority.toBase58()}`);
        console.log(`  LLTV: ${market.account.lltv.toNumber() / 1_000_000}%`);
        console.log(`  Loan Token: ${market.account.loanTokenMint.toBase58()}`);
        console.log(`  Collateral Token: ${market.account.collateralTokenMint.toBase58()}`);
        console.log(`  Total Supply: ${market.account.totalSupplyAssets.toNumber() / 1e6} USDC`);
        console.log(`  Total Borrow: ${market.account.totalBorrowAssets.toNumber() / 1e6} USDC`);
        console.log(`  Explorer: https://explorer.solana.com/address/${market.publicKey.toBase58()}?cluster=devnet`);
        console.log("");
      });

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      // 方法 2: 使用过滤器 - 更高级
      console.log("📋 方法 2: 使用过滤器查询（演示）\n");

      // 示例：只查询特定 authority 的市场
      const myAuthority = provider.wallet.publicKey;

      const myMarkets = await program.account.market.all([
        {
          memcmp: {
            offset: 8, // 跳过 discriminator (8 bytes)
            bytes: myAuthority.toBase58(),
          },
        },
      ]);

      console.log(`你创建的市场: ${myMarkets.length} 个\n`);

      // 方法 3: 使用 Connection.getProgramAccounts - 最底层
      console.log("📋 方法 3: 原生 getProgramAccounts API\n");

      const accounts = await provider.connection.getProgramAccounts(
        program.programId,
        {
          filters: [
            {
              dataSize: 217, // Market 账户大小 (从 solana account 看到的)
            },
          ],
        }
      );

      console.log(`原生 API 找到 ${accounts.length} 个 Market 账户\n`);

      // 解析数据（Anchor 会自动做这个）
      accounts.forEach((account, index) => {
        console.log(`  账户 #${index + 1}: ${account.pubkey.toBase58()}`);
      });

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ 查询完成！");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    } catch (error) {
      console.error("❌ 查询失败:", error);
      throw error;
    }
  });
});
