import { useAppStore } from '../../stores/useAppStore';
import { formatUSDC } from '../../utils/formatting';
import { TokenIcon } from '../icons';

export function MarketStats() {
  const { marketData } = useAppStore();

  if (!marketData) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Market Overview</h3>
        <p className="text-gray-400">Loading market data...</p>
      </div>
    );
  }

  const utilization =
    marketData.totalSupplyAssets > 0
      ? (marketData.totalBorrowAssets / marketData.totalSupplyAssets) * 100
      : 0;

  return (
    <div className="card">
      {/* Header with Token Icons */}
      <div className="flex items-center gap-3 mb-6">
        <TokenIcon token="USDC" size={32} />
        <h3 className="text-xl font-bold">📊 Market Overview</h3>
        <span className="text-gray-500">×</span>
        <TokenIcon token="SOL" size={28} />
        <span className="text-sm text-gray-400">Collateral</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-solana-gray/50 rounded-lg p-4">
          <p className="stat-label">Total Supply</p>
          <p className="stat-value text-solana-green">
            {formatUSDC(marketData.totalSupplyAssets)}
          </p>
          <p className="text-xs text-gray-500 mt-1">USDC</p>
        </div>

        <div className="bg-solana-gray/50 rounded-lg p-4">
          <p className="stat-label">Total Borrow</p>
          <p className="stat-value text-solana-purple">
            {formatUSDC(marketData.totalBorrowAssets)}
          </p>
          <p className="text-xs text-gray-500 mt-1">USDC</p>
        </div>

        <div className="bg-solana-gray/50 rounded-lg p-4">
          <p className="stat-label">Utilization Rate</p>
          <p className="stat-value">
            {utilization.toFixed(2)}%
          </p>
        </div>

        <div className="bg-solana-gray/50 rounded-lg p-4">
          <p className="stat-label">LLTV</p>
          <p className="stat-value">
            {(marketData.lltv / 1_000_000 * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}
