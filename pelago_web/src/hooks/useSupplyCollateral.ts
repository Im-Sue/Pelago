import { useState, useRef } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { usePelagoProgram } from './usePelagoProgram';
import { useAppStore } from '../stores/useAppStore';
import { toSOLAmount } from '../utils/formatting';
import toast from 'react-hot-toast';

export function useSupplyCollateral() {
  const program = usePelagoProgram();
  const wallet = useAnchorWallet();
  const { marketPda, marketData, setIsLoading, setCurrentStep, addTransaction, updateTransactionStatus } =
    useAppStore();
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);  // 防重复提交保护

  const supplyCollateral = async (uiAmount: number) => {
    // 🛡️ 防重复提交检查 - 必须在最前面
    if (isProcessingRef.current) {
      console.warn('SupplyCollateral already in progress, ignoring duplicate request');
      return;
    }

    if (!program || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!marketPda || !marketData) {
      toast.error('Market not loaded');
      return;
    }

    if (uiAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    const txId = Date.now().toString();

    try {
      // 🔒 立即标记为正在处理（同步操作，无延迟）
      isProcessingRef.current = true;
      setIsLoading(true);
      setCurrentStep('collateral');
      setError(null);

      // 转换金额
      const amount = new BN(toSOLAmount(uiAmount));

      // 获取用户的SOL token账户(Wrapped SOL)
      const userCollateralAccount = await getAssociatedTokenAddress(
        marketData.collateralTokenMint,
        wallet.publicKey
      );

      // 派生UserPosition PDA (使用正确的seed)
      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('user-position'),
          marketPda.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

      // 添加待处理交易
      addTransaction({
        id: txId,
        type: 'collateral',
        amount: uiAmount,
        timestamp: Date.now(),
        signature: '',
        status: 'pending',
      });

      toast.loading('Supplying collateral...', { id: 'collateral-toast' });

      // 执行supply_collateral指令
      const tx = await program.methods
        .supplyCollateral(amount)
        .accountsPartial({
          market: marketPda,
          userPosition: userPositionPda,
          collateralVault: marketData.collateralVault,
          userCollateralAccount,
          user: wallet.publicKey,
        })
        .rpc();

      // 更新交易状态
      updateTransactionStatus(txId, 'success');

      toast.success(`Supplied ${uiAmount} SOL collateral!`, { id: 'collateral-toast' });

      setCurrentStep('success');

      setTimeout(() => setCurrentStep('idle'), 2000);

      return tx;

    } catch (err: any) {
      console.error('Supply collateral failed:', err);

      // 🔍 智能错误处理：识别重复交易错误
      const errorMsg = err.message || 'Supply collateral transaction failed';
      const isAlreadyProcessed = errorMsg.includes('already been processed');

      if (isAlreadyProcessed) {
        console.warn('Transaction already processed - likely a duplicate submission');
        toast.success('Collateral supplied (duplicate prevented)', { id: 'collateral-toast' });
        updateTransactionStatus(txId, 'success');
      } else {
        setError(errorMsg);
        toast.error(errorMsg, { id: 'collateral-toast' });
        updateTransactionStatus(txId, 'failed');
      }

      setCurrentStep('idle');
    } finally {
      // 🔓 释放处理锁（同步操作，立即生效）
      isProcessingRef.current = false;
      setIsLoading(false);
    }
  };

  return { supplyCollateral, error, isLoading: useAppStore((s) => s.isLoading) };
}
