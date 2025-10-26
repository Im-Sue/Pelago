import { useAppStore } from '../../stores/useAppStore';
import { formatUSDC, formatSOL } from '../../utils/formatting';
import { FIXED_PRICE } from '../../utils/constants';

export function UserPosition() {
  const { userPosition } = useAppStore();

  if (!userPosition) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Your Position</h3>
        <p className="text-gray-400">Connect wallet to view your position</p>
      </div>
    );
  }

  const hasPosition =
    userPosition.supplyShares > 0 ||
    userPosition.collateral > 0 ||
    userPosition.borrowShares > 0;

  if (!hasPosition) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">💼 Your Position</h3>
        <p className="text-gray-400 text-center py-4">
          No active position yet.<br />
          Start by supplying USDC or collateral above 👆
        </p>
      </div>
    );
  }

  const collateralValueUSDC = userPosition.collateral * FIXED_PRICE;

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-6">💼 Your Position</h3>

      <div className="space-y-3">
        <div className="bg-solana-gray/50 rounded-lg p-4">
          <p className="stat-label">Supplied</p>
          <p className="stat-value text-solana-green">
            {formatUSDC(userPosition.supplyShares)} <span className="text-sm">USDC</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Earning interest (P1 feature)
          </p>
        </div>

        <div className="bg-solana-gray/50 rounded-lg p-4">
          <p className="stat-label">Collateral</p>
          <p className="stat-value text-solana-purple">
            {formatSOL(userPosition.collateral)} <span className="text-sm">SOL</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ≈ ${collateralValueUSDC.toFixed(2)} USDC
          </p>
        </div>

        <div className="bg-solana-gray/50 rounded-lg p-4">
          <p className="stat-label">Borrowed</p>
          <p className="stat-value text-white">
            {formatUSDC(userPosition.borrowShares)} <span className="text-sm">USDC</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Accruing interest (P1 feature)
          </p>
        </div>
      </div>
    </div>
  );
}
