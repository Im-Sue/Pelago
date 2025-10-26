import { useState } from 'react';
import { useBorrow } from '../../hooks/useBorrow';
import { useHealthFactor } from '../../hooks/useHealthFactor';
import { useAppStore } from '../../stores/useAppStore';
import { ModeSwitch } from '../common/ModeSwitch';
import { StepHeader } from '../icons';

export function BorrowForm() {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'assets' | 'shares'>('assets');
  const { borrow, error, isLoading } = useBorrow();
  const { maxBorrowAmount } = useHealthFactor();
  const { currentStep } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    // P1: 使用双参数模式调用
    await borrow({ mode, amount: numAmount });
    setAmount('');
  };

  const handleMaxClick = () => {
    setAmount(maxBorrowAmount.toFixed(2));
  };

  const isActive = currentStep === 'borrow';
  const isSuccess = currentStep === 'success';

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="flex items-center justify-between mb-4">
        <StepHeader step="borrow" title="Borrow USDC" />
        {isActive && <div className="animate-pulse text-solana-green">Processing...</div>}
        {isSuccess && <div className="text-status-safe">✓ Success</div>}
      </div>

      {/* P1: 模式切换器 */}
      <ModeSwitch mode={mode} onModeChange={setMode} disabled={isLoading} />

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="stat-label">
            {mode === 'assets' ? 'Amount (USDC)' : 'Amount (Shares)'}
          </label>
          {/* MAX 按钮只在 assets 模式下显示 */}
          {mode === 'assets' && (
            <button
              type="button"
              onClick={handleMaxClick}
              className="text-xs text-solana-purple hover:text-solana-green transition-colors"
            >
              MAX: {maxBorrowAmount.toFixed(2)}
            </button>
          )}
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={mode === 'assets' ? '0.00' : '0'}
          className="input-field"
          disabled={isLoading || maxBorrowAmount <= 0}
          step={mode === 'assets' ? '0.01' : '1'}
          min="0"
          max={mode === 'assets' ? maxBorrowAmount : undefined}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-status-danger/20 border border-status-danger/50 rounded-lg text-sm text-status-danger">
          {error}
        </div>
      )}

      {maxBorrowAmount <= 0 && (
        <div className="mb-4 p-3 bg-status-warning/20 border border-status-warning/50 rounded-lg text-sm text-status-warning">
          ⚠️ Supply collateral first to enable borrowing
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxBorrowAmount}
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
            Borrowing...
          </span>
        ) : (
          'Borrow USDC'
        )}
      </button>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Borrow against your collateral at {maxBorrowAmount > 0 ? '80% LLTV' : 'N/A'}
      </div>
    </form>
  );
}
