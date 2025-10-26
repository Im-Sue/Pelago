import { useState, useRef } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { usePelagoProgram } from './usePelagoProgram';
import { useAppStore } from '../stores/useAppStore';
import toast from 'react-hot-toast';

export function useWithdrawCollateral() {
  const program = usePelagoProgram();
  const wallet = useAnchorWallet();
  const { marketPda, marketData, setIsLoading, setCurrentStep, addTransaction, updateTransactionStatus } =
    useAppStore();
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);  // 防重复提交保护

  /**
   * P1 WithdrawCollateral: 单参数模式（抵押品不使用虚拟份额）
   * @param amount - 要提取的抵押品数量（SOL，以 lamports 为单位）
   */
  const withdrawCollateral = async (amount: number) => {
    // 🛡️ 防重复提交检查 - 必须在最前面
    if (isProcessingRef.current) {
      console.warn('WithdrawCollateral already in progress, ignoring duplicate request');
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

    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    const txId = Date.now().toString();

    try {
      // 🔒 立即标记为正在处理（同步操作，无延迟）
      isProcessingRef.current = true;
      setIsLoading(true);
      setCurrentStep('withdrawCollateral');
      setError(null);

      // 抵押品是 SOL，以 lamports 为单位（1 SOL = 1e9 lamports）
      const assets = new BN(amount * 1e9);

      // 获取用户的SOL token账户
      const receiverCollateralAccount = await getAssociatedTokenAddress(
        marketData.collateralTokenMint,
        wallet.publicKey
      );

      // 派生UserPosition PDA
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
        type: 'withdrawCollateral',
        amount: amount,
        timestamp: Date.now(),
        signature: '',
        status: 'pending',
      });

      toast.loading('Withdrawing collateral...', { id: 'withdraw-collateral-toast' });

      // P1: 执行withdrawCollateral指令（单参数）
      const tx = await program.methods
        .withdrawCollateral(assets)
        .accountsPartial({
          market: marketPda,
          userPosition: userPositionPda,
          user: wallet.publicKey,
          receiverCollateralAccount: receiverCollateralAccount,
          collateralVault: marketData.collateralVault,
        })
        .rpc();

      // 更新交易状态
      updateTransactionStatus(txId, 'success');

      toast.success(`Withdrew ${amount} SOL collateral successfully!`, { id: 'withdraw-collateral-toast' });

      setCurrentStep('success');

      // 等待一下让UI更新
      setTimeout(() => setCurrentStep('idle'), 2000);

      return tx;

    } catch (err: any) {
      console.error('Withdraw collateral failed:', err);
      let errorMsg = err.message || 'Withdraw collateral transaction failed';

      // 🔍 智能错误处理：识别重复交易错误
      const isAlreadyProcessed = errorMsg.includes('already been processed');

      if (isAlreadyProcessed) {
        console.warn('Transaction already processed - likely a duplicate submission');
        toast.success('Collateral withdrawn (duplicate prevented)', { id: 'withdraw-collateral-toast' });
        updateTransactionStatus(txId, 'success');
      } else {
        // 解析特定错误
        if (errorMsg.includes('InsufficientCollateral')) {
          errorMsg = 'Insufficient collateral or withdrawal would violate health factor';
        }

        setError(errorMsg);
        toast.error(errorMsg, { id: 'withdraw-collateral-toast' });
        updateTransactionStatus(txId, 'failed');
      }

      setCurrentStep('idle');
    } finally {
      // 🔓 释放处理锁（同步操作，立即生效）
      isProcessingRef.current = false;
      setIsLoading(false);
    }
  };

  return { withdrawCollateral, error, isLoading: useAppStore((s) => s.isLoading) };
}
