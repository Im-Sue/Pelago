// 优化版本：带缓存、过滤、刷新功能

import { useEffect, useState, useCallback } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from '../idl/pelago_solana.json';
import { PelagoSolana } from '../types/pelago_solana';

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

interface UseMarketsOptions {
  // 是否只获取我创建的市场
  onlyMyMarkets?: boolean;
  // 缓存时间（毫秒）
  cacheTime?: number;
  // 自动刷新间隔（毫秒）
  refreshInterval?: number;
}

// 简单的内存缓存
let cachedMarkets: Market[] | null = null;
let cacheTimestamp: number = 0;

export function useMarketsOptimized(options: UseMarketsOptions = {}) {
  const {
    onlyMyMarkets = false,
    cacheTime = 30000, // 默认缓存 30 秒
    refreshInterval = 0, // 默认不自动刷新
  } = options;

  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarkets = useCallback(async (forceRefresh = false) => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    try {
      // 检查缓存
      const now = Date.now();
      if (!forceRefresh && cachedMarkets && now - cacheTimestamp < cacheTime) {
        console.log('📦 Using cached markets');
        setMarkets(cachedMarkets);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      console.log('🔄 Fetching markets from chain...');

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

      let allMarkets;

      if (onlyMyMarkets) {
        // 只获取我创建的市场（使用过滤器）
        allMarkets = await program.account.market.all([
          {
            memcmp: {
              offset: 8, // 跳过 discriminator (8 bytes)
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ]);
      } else {
        // 获取所有市场
        allMarkets = await program.account.market.all();
      }

      const formattedMarkets = allMarkets.map(m => ({
        pda: m.publicKey,
        authority: m.account.authority,
        lltv: m.account.lltv.toNumber() / 1_000_000,
        loanTokenMint: m.account.loanTokenMint,
        collateralTokenMint: m.account.collateralTokenMint,
        totalSupplyAssets: m.account.totalSupplyAssets.toNumber() / 1e6,
        totalBorrowAssets: m.account.totalBorrowAssets.toNumber() / 1e6,
        loanVault: m.account.loanVault,
        collateralVault: m.account.collateralVault,
      }));

      // 更新缓存
      cachedMarkets = formattedMarkets;
      cacheTimestamp = now;

      setMarkets(formattedMarkets);
    } catch (err) {
      console.error('Failed to fetch markets:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, onlyMyMarkets, cacheTime]);

  // 初始加载
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // 自动刷新
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchMarkets(true);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchMarkets]);

  // 手动刷新函数
  const refresh = useCallback(() => {
    return fetchMarkets(true);
  }, [fetchMarkets]);

  return {
    markets,
    loading,
    error,
    refresh, // 暴露刷新函数
  };
}

// 使用示例组件
export function MarketListOptimized() {
  const { markets, loading, error, refresh } = useMarketsOptimized({
    onlyMyMarkets: false,
    cacheTime: 30000, // 缓存 30 秒
    refreshInterval: 60000, // 每分钟自动刷新
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading markets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <p>Failed to load markets: {error.message}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="empty">
        <p>No markets found</p>
        <button onClick={refresh}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="market-list">
      <div className="header">
        <h2>Available Markets ({markets.length})</h2>
        <button onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="markets-grid">
        {markets.map((market) => (
          <MarketCard key={market.pda.toBase58()} market={market} />
        ))}
      </div>
    </div>
  );
}

// 市场卡片组件
function MarketCard({ market }: { market: Market }) {
  // 计算利用率
  const utilization = market.totalSupplyAssets > 0
    ? (market.totalBorrowAssets / market.totalSupplyAssets) * 100
    : 0;

  return (
    <div className="market-card">
      <div className="card-header">
        <h3>Market</h3>
        <span className="lltv-badge">{market.lltv}% LLTV</span>
      </div>

      <div className="card-body">
        <div className="stat">
          <label>Total Supply</label>
          <value>{market.totalSupplyAssets.toLocaleString()} USDC</value>
        </div>

        <div className="stat">
          <label>Total Borrow</label>
          <value>{market.totalBorrowAssets.toLocaleString()} USDC</value>
        </div>

        <div className="stat">
          <label>Utilization</label>
          <value>{utilization.toFixed(2)}%</value>
        </div>

        <div className="tokens">
          <div className="token">
            <label>Loan Token</label>
            <code>{market.loanTokenMint.toBase58().slice(0, 8)}...</code>
          </div>
          <div className="token">
            <label>Collateral</label>
            <code>{market.collateralTokenMint.toBase58().slice(0, 8)}...</code>
          </div>
        </div>
      </div>

      <div className="card-footer">
        <button className="primary">Supply</button>
        <button className="secondary">Borrow</button>
      </div>
    </div>
  );
}

// 高级用法：带搜索和过滤
export function MarketListAdvanced() {
  const { markets, loading, error, refresh } = useMarketsOptimized();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLLTV, setFilterLLTV] = useState<number | null>(null);

  // 过滤市场
  const filteredMarkets = markets.filter(market => {
    // 按 token 地址搜索
    const matchesSearch = searchTerm === '' ||
      market.loanTokenMint.toBase58().includes(searchTerm) ||
      market.collateralTokenMint.toBase58().includes(searchTerm);

    // 按 LLTV 过滤
    const matchesLLTV = filterLLTV === null || market.lltv === filterLLTV;

    return matchesSearch && matchesLLTV;
  });

  // 获取所有唯一的 LLTV 值
  const uniqueLLTVs = [...new Set(markets.map(m => m.lltv))].sort((a, b) => a - b);

  return (
    <div className="market-list-advanced">
      <div className="filters">
        <input
          type="text"
          placeholder="Search by token address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={filterLLTV ?? ''}
          onChange={(e) => setFilterLLTV(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All LLTVs</option>
          {uniqueLLTVs.map(lltv => (
            <option key={lltv} value={lltv}>{lltv}%</option>
          ))}
        </select>

        <button onClick={refresh}>Refresh</button>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}

      <div className="results">
        <p>Showing {filteredMarkets.length} of {markets.length} markets</p>
      </div>

      <div className="markets-grid">
        {filteredMarkets.map((market) => (
          <MarketCard key={market.pda.toBase58()} market={market} />
        ))}
      </div>
    </div>
  );
}
