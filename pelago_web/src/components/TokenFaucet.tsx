import { useState } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useFaucet } from '../hooks/useFaucet';
import { useAppStore } from '../stores/useAppStore';
import toast from 'react-hot-toast';

export function TokenFaucet() {
  const wallet = useAnchorWallet();
  const { marketData } = useAppStore();
  const { createATA, isCreatingATA } = useFaucet();
  const [atasCreated, setAtasCreated] = useState(false);

  // 检测 Loan Token (USDC) 余额
  const loanBalance = useTokenBalance(marketData?.loanTokenMint);

  // 检测 Collateral Token (SOL) 余额
  const collateralBalance = useTokenBalance(marketData?.collateralTokenMint);

  const needsTokens =
    !loanBalance.loading &&
    !collateralBalance.loading &&
    (loanBalance.balance === 0 || collateralBalance.balance === 0);

  const handlePrepareAccounts = async () => {
    if (!marketData) return;

    try {
      toast.loading('Preparing token accounts...', { id: 'prepare-toast' });

      // 创建 ATAs（如果不存在）
      await createATA(marketData.loanTokenMint);
      await createATA(marketData.collateralTokenMint);

      setAtasCreated(true);
      toast.success('Token accounts ready! Run the command below.', {
        id: 'prepare-toast',
      });
    } catch (error) {
      toast.error('Failed to prepare accounts', { id: 'prepare-toast' });
    }
  };

  const copyCommand = () => {
    if (!wallet || !marketData) return;

    const { marketPda } = useAppStore.getState();

    const command = `cd /home/sue/web3/solana_251023_sz/Pelago && MARKET=${marketPda?.toBase58() || 'ERROR'} RECIPIENT=${wallet.publicKey.toBase58()} npm run faucet:universal

# Market Info:
# Market PDA: ${marketPda?.toBase58() || 'ERROR'}
# Loan Token Mint: ${marketData.loanTokenMint.toBase58()}
# Collateral Token Mint: ${marketData.collateralTokenMint.toBase58()}`;

    navigator.clipboard.writeText(command);
    toast.success('Command copied! Includes market address.');
  };

  if (!wallet || !marketData || !needsTokens) {
    return null;
  }

  return (
    <div className="token-faucet">
      <div className="faucet-alert">
        <div className="alert-icon">⚠️</div>
        <div className="alert-content">
          <h3>Test Tokens Required</h3>
          <p>You need test tokens to use this market:</p>
          <ul>
            <li>10,000 USDC (Loan Token)</li>
            <li>100 SOL (Collateral Token)</li>
          </ul>
          <div className="market-info">
            <p className="market-info-title">Current Market:</p>
            <p className="market-info-detail">
              Loan: {marketData.loanTokenMint.toBase58().slice(0, 8)}...
            </p>
            <p className="market-info-detail">
              Collateral: {marketData.collateralTokenMint.toBase58().slice(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      <div className="faucet-steps">
        {/* Step 1: Prepare Accounts */}
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Prepare Token Accounts</h4>
            <button
              className="prepare-button"
              onClick={handlePrepareAccounts}
              disabled={isCreatingATA || atasCreated}
            >
              {isCreatingATA ? (
                <>
                  <span className="spinner"></span>
                  Creating Accounts...
                </>
              ) : atasCreated ? (
                <>
                  <span className="check-icon">✅</span>
                  Accounts Ready
                </>
              ) : (
                <>
                  <span className="icon">🔧</span>
                  Prepare Accounts
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 2: Run Command */}
        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Run Faucet Command (Market-Specific)</h4>
            <div className="command-box">
              <code className="command">
                MARKET={useAppStore.getState().marketPda?.toBase58().substring(0, 8)}...{' '}
                RECIPIENT={wallet.publicKey.toBase58().substring(0, 8)}...{' '}
                npm run faucet:universal
              </code>
              <button
                className="copy-button"
                onClick={copyCommand}
                title="Copy full command with market address"
              >
                📋
              </button>
            </div>
            <p className="command-hint">
              Run this in the <code>Pelago</code> directory. This command will mint tokens specifically for your selected market.
            </p>
          </div>
        </div>
      </div>

      <div className="faucet-info">
        <p className="info-text">
          💡 <strong>Note:</strong> This is a test environment. Tokens have no
          real value.
        </p>
      </div>

      <style>{`
        .token-faucet {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 24px;
          margin: 20px 0;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }

        .faucet-alert {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          backdrop-filter: blur(10px);
        }

        .alert-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .alert-content h3 {
          color: white;
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .alert-content p {
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 12px 0;
          font-size: 14px;
        }

        .alert-content ul {
          margin: 0;
          padding-left: 20px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }

        .alert-content li {
          margin: 4px 0;
        }

        .market-info {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .market-info-title {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          margin: 0 0 6px 0;
          font-weight: 600;
        }

        .market-info-detail {
          color: rgba(255, 255, 255, 0.9);
          font-size: 11px;
          font-family: 'Monaco', 'Courier New', monospace;
          margin: 2px 0;
        }

        .faucet-steps {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .step {
          display: flex;
          gap: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          backdrop-filter: blur(10px);
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: white;
          color: #667eea;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
        }

        .step-content h4 {
          color: white;
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .prepare-button {
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .prepare-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .prepare-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .icon,
        .check-icon {
          font-size: 16px;
        }

        .command-box {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .command {
          flex: 1;
          color: #9ca3af;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          overflow-x: auto;
          white-space: nowrap;
        }

        .copy-button {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .copy-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .command-hint {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          margin: 0;
        }

        .command-hint code {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(102, 126, 234, 0.3);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .faucet-info {
          margin-top: 16px;
          text-align: center;
        }

        .info-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
