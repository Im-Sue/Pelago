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
export interface RepayOptions {
  mode: 'assets' | 'shares';  // 用户选择的模式
  amount: number;              // 用户输入的数量
}

export function useRepay() {
  const program = usePelagoProgram();
  const wallet = useAnchorWallet();
  const { marketPda, marketData, setIsLoading, setCurrentStep, addTransaction, updateTransactionStatus } =
    useAppStore();
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);  // 防重复提交保护

  /**
   * P1 Repay: 支持双参数模式
   * @param options - 可以传入 RepayOptions (P1完整模式) 或 number (P0兼容模式)
   */
  const repay = async (options: RepayOptions | number) => {
    // 🛡️ 防重复提交检查 - 必须在最前面
    if (isProcessingRef.current) {
      console.warn('Repay already in progress, ignoring duplicate request');
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
      setCurrentStep('repay');
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
      const payerLoanAccount = await getAssociatedTokenAddress(
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
        type: 'repay',
        amount: amount,
        timestamp: Date.now(),
        signature: '',
        status: 'pending',
      });

      toast.loading('Repaying USDC...', { id: 'repay-toast' });

      // P1: 执行repay指令（双参数模式）
      const tx = await program.methods
        .repay(assets, shares)
        .accountsPartial({
          market: marketPda,
          borrowerPosition: userPositionPda,
          payer: wallet.publicKey,
          borrower: wallet.publicKey,  // 用户为自己还款
          payerTokenAccount: payerLoanAccount,
          loanVault: marketData.loanVault,
        })
        .rpc();

      // 更新交易状态
      updateTransactionStatus(txId, 'success');

      toast.success(`Repaid ${amount} USDC successfully!`, { id: 'repay-toast' });

      setCurrentStep('success');

      // 等待一下让UI更新
      setTimeout(() => setCurrentStep('idle'), 2000);

      return tx;

    } catch (err: any) {
      console.error('Repay failed:', err);
      let errorMsg = err.message || 'Repay transaction failed';

      // 🔍 智能错误处理：识别重复交易错误
      const isAlreadyProcessed = errorMsg.includes('already been processed');

      if (isAlreadyProcessed) {
        console.warn('Transaction already processed - likely a duplicate submission');
        toast.success('Repay completed (duplicate prevented)', { id: 'repay-toast' });
        updateTransactionStatus(txId, 'success');
      } else {
        // 解析特定错误
        if (errorMsg.includes('insufficient')) {
          errorMsg = 'Insufficient USDC balance for repayment';
        }

        setError(errorMsg);
        toast.error(errorMsg, { id: 'repay-toast' });
        updateTransactionStatus(txId, 'failed');
      }

      setCurrentStep('idle');
    } finally {
      // 🔓 释放处理锁（同步操作，立即生效）
      isProcessingRef.current = false;
      setIsLoading(false);
    }
  };

  return { repay, error, isLoading: useAppStore((s) => s.isLoading) };
}
