import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useMarkets } from '../hooks/useMarkets';
import { MarketCard } from '../components/display/MarketCard';
import { USDC_MINT, SOL_MINT } from '../utils/constants';

export function MarketListPage() {
  const { connected } = useWallet();
  const { markets, loading, error } = useMarkets();

  // 获取Token名称（支持mock市场）
  const getTokenName = (mint: string, market?: any) => {
    // Mock市场有symbol字段，直接使用
    if (market?.loanTokenSymbol && mint === market.loanTokenMint.toBase58()) {
      return market.loanTokenSymbol;
    }
    if (market?.collateralTokenSymbol && mint === market.collateralTokenMint.toBase58()) {
      return market.collateralTokenSymbol;
    }

    // 真实市场使用mint地址匹配
    if (mint === USDC_MINT.toBase58()) return 'USDC';
    if (mint === SOL_MINT.toBase58()) return 'SOL';
    return mint.slice(0, 4);
  };

  return (
    <div className="min-h-screen bg-solana-gray">
      {/* Header */}
      <header className="bg-gradient-to-r from-solana-dark to-solana-darker border-b border-solana-purple/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
                🌊 Pelago
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                Next-Generation Isolated Lending Protocol on Solana
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="text-gray-400">Network</p>
                <p className="text-solana-green font-semibold">Devnet</p>
              </div>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!connected ? (
          <motion.div
            className="card text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl font-bold mb-4">Welcome to Pelago 🌊</h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Advanced isolated lending markets with superior capital efficiency on Solana.
              Connect your wallet to explore available markets and start lending or borrowing.
            </p>
            <WalletMultiButton />

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
              <div className="bg-solana-gray/50 rounded-lg p-6">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-bold mb-2">Lightning Fast</h3>
                <p className="text-sm text-gray-400">
                  Sub-second transactions on Solana vs 15-30s on Ethereum
                </p>
              </div>
              <div className="bg-solana-gray/50 rounded-lg p-6">
                <div className="text-3xl mb-3">💎</div>
                <h3 className="font-bold mb-2">Minimal Fees</h3>
                <p className="text-sm text-gray-400">
                  ~$0.0001 per transaction vs $30-$100 on Ethereum
                </p>
              </div>
              <div className="bg-solana-gray/50 rounded-lg p-6">
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="font-bold mb-2">Battle-Tested</h3>
                <p className="text-sm text-gray-400">
                  Battle-tested architecture optimized for Solana's performance
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div>
            {/* Market List Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Available Markets</h2>
              <p className="text-gray-400">
                Select a market to start lending or borrowing
              </p>
            </div>

            {/* Platform Overview */}
            {!loading && markets.length > 0 && (
              <div className="mb-8 card">
                <h3 className="text-xl font-bold mb-6">Platform Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="stat-label">Total Markets</p>
                    <p className="stat-value text-solana-purple">{markets.length}</p>
                  </div>
                  <div>
                    <p className="stat-label">Total Value Locked</p>
                    <p className="stat-value text-solana-green">
                      ${markets.reduce((sum, m) => sum + m.totalSupplyAssets, 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="stat-label">Total Borrowed</p>
                    <p className="stat-value text-white">
                      ${markets.reduce((sum, m) => sum + m.totalBorrowAssets, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <svg
                    className="animate-spin h-12 w-12 text-solana-purple mx-auto mb-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-gray-400">Loading markets...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="card bg-status-danger/10 border-status-danger/50">
                <h3 className="font-bold text-status-danger mb-2">Failed to load markets</h3>
                <p className="text-sm text-gray-400">{error.message}</p>
              </div>
            )}

            {/* Markets Grid */}
            {!loading && !error && markets.length === 0 && (
              <div className="card text-center py-12">
                <div className="text-4xl mb-4">🏝️</div>
                <h3 className="text-xl font-bold mb-2">No Markets Found</h3>
                <p className="text-gray-400 mb-6">
                  There are no active markets on Devnet yet.
                </p>
                <p className="text-sm text-gray-500">
                  Run the market initialization script to create a test market.
                </p>
              </div>
            )}

            {!loading && !error && markets.length > 0 && (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {markets.map((market, index) => (
                  <motion.div
                    key={market.pda.toBase58()}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MarketCard
                      pda={market.pda}
                      loanTokenName={getTokenName(market.loanTokenMint.toBase58(), market)}
                      collateralTokenName={getTokenName(market.collateralTokenMint.toBase58(), market)}
                      lltv={market.lltv}
                      totalSupplyAssets={market.totalSupplyAssets}
                      totalBorrowAssets={market.totalBorrowAssets}
                      loanTokenMint={market.loanTokenMint}
                      collateralTokenMint={market.collateralTokenMint}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-solana-darker border-t border-solana-purple/20 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-400">
          <p>
            Program ID:{' '}
            <span className="text-solana-purple font-mono">5Y6KqLPs2DGRBzg4ybG9KfkyM5vTt8ZDELy9YwF8rGJq</span>
          </p>
          <p className="mt-2">🚧 P0 Phase - MVP Demo | Built for Solana Hackathon 2025</p>
        </div>
      </footer>
    </div>
  );
}
