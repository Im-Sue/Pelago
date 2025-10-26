import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useMarketData } from '../hooks/useMarketData';
import { useUserPosition } from '../hooks/useUserPosition';
import { useAppStore } from '../stores/useAppStore';
import toast from 'react-hot-toast';
import { SupplyForm } from '../components/forms/SupplyForm';
import { WithdrawForm } from '../components/forms/WithdrawForm';
import { CollateralForm } from '../components/forms/CollateralForm';
import { BorrowForm } from '../components/forms/BorrowForm';
import { RepayForm } from '../components/forms/RepayForm';
import { HealthMeter } from '../components/display/HealthMeter';
import { MarketStats } from '../components/display/MarketStats';
import { UserPosition } from '../components/display/UserPosition';
import { TokenFaucet } from '../components/TokenFaucet';

export function DemoPage() {
  const { connected } = useWallet();
  const { setCurrentPage, marketData, marketPda } = useAppStore();

  const handleBackToList = () => {
    setCurrentPage('list');
  };

  // 自动获取市场数据和用户仓位
  useMarketData(connected);
  useUserPosition(connected);

  return (
    <div className="min-h-screen bg-solana-gray">
      {/* Header */}
      <header className="bg-gradient-to-r from-solana-dark to-solana-darker border-b border-solana-purple/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={handleBackToList}
                className="text-solana-purple hover:text-solana-green transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="text-sm font-semibold">Back to Markets</span>
              </button>

              <div className="border-l border-solana-purple/30 h-8"></div>

              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
                  {marketData ? 'USDC / SOL Market' : '🌊 Pelago'}
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Pelago Protocol - P1 (Full Features)
                </p>
                {/* Market ID Display */}
                {marketPda && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Market ID:</span>
                    <code className="text-xs font-mono text-gray-300 bg-solana-gray/30 px-2 py-0.5 rounded">
                      {marketPda.toBase58().slice(0, 16)}...
                    </code>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(marketPda.toBase58());
                        toast.success('Market ID copied to clipboard!');
                      }}
                      className="text-solana-purple hover:text-solana-green transition-colors text-xs"
                      title="Copy full Market ID"
                    >
                      📋
                    </button>
                  </div>
                )}
              </div>
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
          <div className="card text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Welcome to Pelago 🌊</h2>
            <p className="text-gray-400 mb-6">
              Connect your wallet to start using Pelago - Advanced Isolated Lending on Solana
            </p>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Operation Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Token Faucet */}
              <TokenFaucet />

              {/* P1: 完整功能 - Supply & Withdraw */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SupplyForm />
                <WithdrawForm />
              </div>

              {/* P1: 完整功能 - Collateral, Borrow & Repay */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CollateralForm />
                <BorrowForm />
                <RepayForm />
              </div>

              <HealthMeter />
            </div>

            {/* Right: Data Display */}
            <div className="space-y-6">
              <MarketStats />
              <UserPosition />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-solana-darker border-t border-solana-purple/20 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-400">
          <p>
            Program ID: <span className="text-solana-purple font-mono">5Y6KqLPs2DGRBzg4ybG9KfkyM5vTt8ZDELy9YwF8rGJq</span>
          </p>
          <p className="mt-2">
            ✨ P1 Phase - Full Features (Dual-Parameter API, Virtual Shares, Interest Accrual) | Solana Devnet
          </p>
        </div>
      </footer>
    </div>
  );
}
