import { useState } from 'react';
import { useSupplyCollateral } from '../../hooks/useSupplyCollateral';
import { useWithdrawCollateral } from '../../hooks/useWithdrawCollateral';
import { useAppStore } from '../../stores/useAppStore';
import { StepHeader } from '../icons';

type CollateralMode = 'supply' | 'withdraw';

export function CollateralForm() {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<CollateralMode>('supply');
  const { supplyCollateral, error: supplyError, isLoading: supplyLoading } = useSupplyCollateral();
  const { withdrawCollateral, error: withdrawError, isLoading: withdrawLoading } = useWithdrawCollateral();
  const { currentStep } = useAppStore();

  const isLoading = supplyLoading || withdrawLoading;
  const error = supplyError || withdrawError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    if (mode === 'supply') {
      await supplyCollateral(numAmount);
    } else {
      await withdrawCollateral(numAmount);
    }
    setAmount('');
  };

  const isActive = currentStep === 'collateral' || currentStep === 'withdrawCollateral';
  const isSuccess = currentStep === 'success';

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="flex items-center justify-between mb-4">
        <StepHeader step="collateral" title="Collateral (SOL)" />
        {isActive && <div className="animate-pulse text-solana-green">Processing...</div>}
        {isSuccess && <div className="text-status-safe">✓ Success</div>}
      </div>

      {/* P1: Supply/Withdraw 模式切换 */}
      <div className="mb-4">
        <label className="stat-label mb-2">Action</label>
        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg border border-gray-700">
          <button
            type="button"
            onClick={() => setMode('supply')}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              mode === 'supply'
                ? 'bg-solana-green text-gray-900 shadow-lg shadow-solana-green/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Supply
          </button>
          <button
            type="button"
            onClick={() => setMode('withdraw')}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              mode === 'withdraw'
                ? 'bg-solana-purple text-white shadow-lg shadow-solana-purple/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="stat-label">Amount (SOL)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0000"
          className="input-field"
          disabled={isLoading}
          step="0.01"
          min="0"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-status-danger/20 border border-status-danger/50 rounded-lg text-sm text-status-danger">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !amount || parseFloat(amount) <= 0}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
            {mode === 'supply' ? 'Supplying...' : 'Withdrawing...'}
          </span>
        ) : (
          mode === 'supply' ? 'Supply Collateral' : 'Withdraw Collateral'
        )}
      </button>

      <div className="mt-3 text-xs text-gray-400 text-center">
        {mode === 'supply'
          ? 'Deposit SOL as collateral to enable borrowing'
          : 'Withdraw SOL collateral (must maintain health factor)'}
      </div>
    </form>
  );
}
