// React Hook 示例：获取所有市场列表

import { useEffect, useState } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from '../idl/pelago_solana.json';
import { PelagoSolana } from '../types/pelago_solana';

// 市场信息类型
interface Market {
  pda: PublicKey;
  authority: PublicKey;
  lltv: number;
  loanTokenMint: PublicKey;
  collateralTokenMint: PublicKey;
  totalSupplyAssets: number;
  totalBorrowAssets: number;
  loanVault: PublicKey;
  collateralVault: PublicKey;
}

export function useMarkets() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(null);

        // 创建 Provider 和 Program
        const provider = new AnchorProvider(
          connection,
          wallet,
          { commitment: 'confirmed' }
        );

        const programId = new PublicKey(idl.address);
        const program = new Program<PelagoSolana>(
          idl as any,
          programId,
          provider
        );

        // 方法 1: 获取所有市场（最简单）
        const allMarkets = await program.account.market.all();

        // 转换为前端需要的格式
        const formattedMarkets = allMarkets.map(m => ({
          pda: m.publicKey,
          authority: m.account.authority,
          lltv: m.account.lltv.toNumber() / 1_000_000, // 转换为百分比
          loanTokenMint: m.account.loanTokenMint,
          collateralTokenMint: m.account.collateralTokenMint,
          totalSupplyAssets: m.account.totalSupplyAssets.toNumber() / 1e6,
          totalBorrowAssets: m.account.totalBorrowAssets.toNumber() / 1e6,
          loanVault: m.account.loanVault,
          collateralVault: m.account.collateralVault,
        }));

        setMarkets(formattedMarkets);
      } catch (err) {
        console.error('Failed to fetch markets:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [connection, wallet]);

  return { markets, loading, error };
}

// 使用示例组件
export function MarketList() {
  const { markets, loading, error } = useMarkets();

  if (loading) {
    return <div>Loading markets...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (markets.length === 0) {
    return <div>No markets found</div>;
  }

  return (
    <div className="market-list">
      <h2>Available Markets ({markets.length})</h2>
      {markets.map((market) => (
        <div key={market.pda.toBase58()} className="market-card">
          <h3>Market {market.pda.toBase58().slice(0, 8)}...</h3>
          <p>LLTV: {market.lltv}%</p>
          <p>Total Supply: {market.totalSupplyAssets.toLocaleString()} USDC</p>
          <p>Total Borrow: {market.totalBorrowAssets.toLocaleString()} USDC</p>
          <p>Loan Token: {market.loanTokenMint.toBase58().slice(0, 8)}...</p>
          <p>Collateral Token: {market.collateralTokenMint.toBase58().slice(0, 8)}...</p>
          <button>View Details</button>
        </div>
      ))}
    </div>
  );
}
