import { motion } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { formatUSDC } from '../../utils/formatting';
import { useAppStore } from '../../stores/useAppStore';
import toast from 'react-hot-toast';
import { TokenPairIcon } from '../icons';
import { calculateSupplyAPY, calculateBorrowAPY, formatAPY } from '../../utils/apy';

interface MarketCardProps {
  pda: PublicKey;
  loanTokenName: string;
  collateralTokenName: string;
  lltv: number;
  totalSupplyAssets: number;
  totalBorrowAssets: number;
  loanTokenMint: PublicKey;
  collateralTokenMint: PublicKey;
}

export function MarketCard({
  pda,
  loanTokenName,
  collateralTokenName,
  lltv,
  totalSupplyAssets,
  totalBorrowAssets,
  loanTokenMint,
  collateralTokenMint,
}: MarketCardProps) {
  const { setCurrentPage, setSelectedMarketId, setMarketPda } = useAppStore();

  // 使用真实合约数据
  const displayTotalSupply = totalSupplyAssets;
  const displayTotalBorrow = totalBorrowAssets;
  const displayUtilizationRate =
    totalSupplyAssets > 0
      ? (totalBorrowAssets / totalSupplyAssets) * 100
      : 0;

  const supplyAPY = calculateSupplyAPY(totalSupplyAssets, totalBorrowAssets);
  const borrowAPY = calculateBorrowAPY();

  const handleSelectMarket = () => {
    setSelectedMarketId(pda.toBase58());
    setMarketPda(pda);
    setCurrentPage('detail');
  };

  return (
    <motion.div
      className="card cursor-pointer hover:border-solana-purple/50 transition-all"
      onClick={handleSelectMarket}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Market Name with Token Icons */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TokenPairIcon
            loanToken={loanTokenName}
            collateralToken={collateralTokenName}
            size={36}
          />
          <h3 className="text-2xl font-bold bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
            {loanTokenName} / {collateralTokenName}
          </h3>
        </div>
        <div className="bg-solana-purple/20 px-3 py-1 rounded-full">
          <span className="text-sm text-solana-purple font-semibold">
            LLTV: {lltv}%
          </span>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-solana-gray/50 rounded-lg p-3">
          <p className="stat-label">Total Supply</p>
          <p className="stat-value text-solana-green text-lg">
            {formatUSDC(displayTotalSupply)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{loanTokenName}</p>
        </div>

        <div className="bg-solana-gray/50 rounded-lg p-3">
          <p className="stat-label">Total Borrow</p>
          <p className="stat-value text-white text-lg">
            {formatUSDC(displayTotalBorrow)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{loanTokenName}</p>
        </div>
      </div>

      {/* Utilization Rate */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Utilization Rate</span>
          <span className="text-sm font-semibold text-solana-green">
            {displayUtilizationRate.toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-solana-gray rounded-full h-2">
          <div
            className="bg-gradient-to-r from-solana-purple to-solana-green h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(displayUtilizationRate, 100)}%` }}
          />
        </div>
      </div>

      {/* APY Display - Real Calculation */}
      <div className="bg-gradient-to-br from-solana-purple/10 to-solana-green/10 rounded-lg p-4 border border-solana-purple/20">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Supply APY</p>
            <p className="text-lg font-bold text-solana-green">
              {formatAPY(supplyAPY)}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Earn from lending
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Borrow APY</p>
            <p className="text-lg font-bold text-solana-purple">
              {formatAPY(borrowAPY)}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Fixed rate
            </p>
          </div>
        </div>
      </div>

      {/* Market ID with Copy */}
      <div className="mt-3 pt-3 border-t border-solana-purple/10">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-500">Market ID</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(pda.toBase58());
              toast.success('Market ID copied!');
            }}
            className="text-solana-purple hover:text-solana-green transition-colors text-xs font-semibold"
            title="Copy full Market ID"
          >
            📋 Copy
          </button>
        </div>
        <div className="bg-solana-gray/30 rounded px-2 py-1">
          <span className="text-gray-400 font-mono text-[10px] break-all leading-tight">
            {pda.toBase58()}
          </span>
        </div>
      </div>

      {/* Token Mints */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Loan Token:</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(loanTokenMint.toBase58());
              toast.success('Loan Token Mint copied!');
            }}
            className="text-gray-400 hover:text-solana-purple transition-colors font-mono"
            title="Copy Loan Token Mint"
          >
            {loanTokenMint.toBase58().slice(0, 8)}... 📋
          </button>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Collateral Token:</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(collateralTokenMint.toBase58());
              toast.success('Collateral Token Mint copied!');
            }}
            className="text-gray-400 hover:text-solana-purple transition-colors font-mono"
            title="Copy Collateral Token Mint"
          >
            {collateralTokenMint.toBase58().slice(0, 8)}... 📋
          </button>
        </div>
      </div>

      {/* Click to Enter Hint */}
      <div className="mt-4 text-center">
        <span className="text-sm text-solana-purple hover:text-solana-green transition-colors">
          Click to enter market →
        </span>
      </div>
    </motion.div>
  );
}
