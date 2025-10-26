const { Connection, PublicKey } = require('@solana/web3.js');
const { BorshCoder } = require('@coral-xyz/anchor');
const idl = require('../target/idl/pelago_solana.json');

async function listMarkets() {
  const connection = new Connection(
    'https://devnet.helius-rpc.com/?api-key=86103c49-61f2-43d6-a803-9fc0dadcdb2f',
    'confirmed'
  );

  const programId = new PublicKey('5Y6KqLPs2DGRBzg4ybG9KfkyM5vTt8ZDELy9YwF8rGJq');

  console.log('🔍 Fetching all Market accounts on-chain...\n');

  try {
    // Get all accounts owned by the program
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          // Market account has discriminator at the beginning
          // We can filter by account size (Market::LEN = 217 bytes)
          dataSize: 217,
        },
      ],
    });

    if (accounts.length === 0) {
      console.log('❌ No markets found on-chain');
      return;
    }

    console.log(`✅ Found ${accounts.length} market(s):\n`);

    const coder = new BorshCoder(idl);

    accounts.forEach((account, index) => {
      try {
        const market = coder.accounts.decode('Market', account.account.data);

        console.log(`📍 Market #${index + 1}`);
        console.log(`   Address: ${account.pubkey.toBase58()}`);
        console.log(`   Short ID: ${account.pubkey.toBase58().slice(0, 8)}...`);
        console.log(`   Loan Token: ${market.loanTokenMint.toBase58()}`);
        console.log(`   Collateral Token: ${market.collateralTokenMint.toBase58()}`);
        console.log(`   Loan Vault: ${market.loanVault.toBase58()}`);
        console.log(`   Collateral Vault: ${market.collateralVault.toBase58()}`);
        console.log(`   LLTV: ${market.lltv.toNumber() / 1_000_000}%`);
        console.log(`   Total Supply: ${market.totalSupplyAssets.toString()}`);
        console.log(`   Total Borrow: ${market.totalBorrowAssets.toString()}`);
        console.log('');
      } catch (error) {
        console.log(`   ❌ Failed to decode: ${error.message}`);
      }
    });
  } catch (error) {
    console.error('❌ Error fetching markets:', error.message);
  }
}

listMarkets().catch(console.error);
