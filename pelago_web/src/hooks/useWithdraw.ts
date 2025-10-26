import { useState, useRef } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { usePelagoProgram } from './usePelagoProgram';
import { useAppStore } from '../stores/useAppStore';
import { toUSDCAmount } from '../utils/formatting';
import toast from 'react-hot-toast';

/**
 * P1: 双参数模式选项
 */
export interface WithdrawOptions {
  mode: 'assets' | 'shares';  // 用户选择的模式
  amount: number;              // 用户输入的数量
}

export function useWithdraw() {
  const program = usePelagoProgram();
  const wallet = useAnchorWallet();
  const { marketPda, marketData, setIsLoading, setCurrentStep, addTransaction, updateTransactionStatus } =
    useAppStore();
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);  // 防重复提交保护

  /**
   * P1 Withdraw: 支持双参数模式
   * @param options - 可以传入 WithdrawOptions (P1完整模式) 或 number (P0兼容模式)
   */
  const withdraw = async (options: WithdrawOptions | number) => {
    // 🛡️ 防重复提交检查 - 必须在最前面
    if (isProcessingRef.current) {
      console.warn('Withdraw already in progress, ignoring duplicate request');
      return;
    }

    // P0兼容：如果传入的是number，转换为默认的assets模式
    const { mode, amount } = typeof options === 'number'
      ? { mode: 'assets' as const, amount: options }
      : options;

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
      setCurrentStep('withdraw');
      setError(null);

      // P1: 根据模式决定参数
      let assets: BN, shares: BN;

      if (mode === 'assets') {
        // Mode 1: 用户指定 assets，shares 为 0
        assets = new BN(toUSDCAmount(amount));
        shares = new BN(0);
      } else {
        // Mode 2: 用户指定 shares，assets 为 0
        // 注意：shares是大整数，不需要小数转换
        assets = new BN(0);
        shares = new BN(Math.floor(amount));
      }

      // 获取用户的USDC token账户
      const receiverLoanAccount = await getAssociatedTokenAddress(
        marketData.loanTokenMint,
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
        type: 'withdraw',
        amount: amount,
        timestamp: Date.now(),
        signature: '',
        status: 'pending',
      });

      toast.loading('Withdrawing USDC...', { id: 'withdraw-toast' });

      // P1: 执行withdraw指令（双参数模式）
      const tx = await program.methods
        .withdraw(assets, shares)
        .accountsPartial({
          market: marketPda,
          userPosition: userPositionPda,
          loanVault: marketData.loanVault,
          receiverTokenAccount: receiverLoanAccount,
          user: wallet.publicKey,
        })
        .rpc();

      // 更新交易状态
      updateTransactionStatus(txId, 'success');

      toast.success(`Withdrew ${amount} USDC successfully!`, { id: 'withdraw-toast' });

      setCurrentStep('success');

      // 等待一下让UI更新
      setTimeout(() => setCurrentStep('idle'), 2000);

      return tx;

    } catch (err: any) {
      console.error('Withdraw failed:', err);

      // 🔍 智能错误处理：识别重复交易错误
      const errorMsg = err.message || 'Withdraw transaction failed';
      const isAlreadyProcessed = errorMsg.includes('already been processed');

      if (isAlreadyProcessed) {
        // 交易可能已经成功，只是被重复检测到
        console.warn('Transaction already processed - likely a duplicate submission');
        toast.success('Withdraw completed (duplicate prevented)', { id: 'withdraw-toast' });
        updateTransactionStatus(txId, 'success');
      } else {
        // 真正的错误
        setError(errorMsg);
        toast.error(errorMsg, { id: 'withdraw-toast' });
        updateTransactionStatus(txId, 'failed');
      }

      setCurrentStep('idle');
    } finally {
      // 🔓 释放处理锁（同步操作，立即生效）
      isProcessingRef.current = false;
      setIsLoading(false);
    }
  };

  return { withdraw, error, isLoading: useAppStore((s) => s.isLoading) };
}
