interface ModeSwitchProps {
  mode: 'assets' | 'shares';
  onModeChange: (mode: 'assets' | 'shares') => void;
  disabled?: boolean;
}

export function ModeSwitch({ mode, onModeChange, disabled = false }: ModeSwitchProps) {
  return (
    <div className="mb-4">
      <label className="stat-label mb-2">Mode</label>
      <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          type="button"
          onClick={() => onModeChange('assets')}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            mode === 'assets'
              ? 'bg-solana-green text-gray-900 shadow-lg shadow-solana-green/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Assets (USDC)
        </button>
        <button
          type="button"
          onClick={() => onModeChange('shares')}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            mode === 'shares'
              ? 'bg-solana-purple text-white shadow-lg shadow-solana-purple/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Shares
        </button>
      </div>

      {/* 简单的模式说明 */}
      <div className="mt-2 text-xs text-gray-400">
        {mode === 'assets' ? (
          <span>💵 Specify amount in USDC tokens</span>
        ) : (
          <span>📊 Specify amount in protocol shares</span>
        )}
      </div>
    </div>
  );
}
