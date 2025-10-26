import { useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import toast from 'react-hot-toast';

export function useFaucet() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [isCreatingATA, setIsCreatingATA] = useState(false);

  /**
   * 创建 Associated Token Account (如果不存在)
   */
  const createATA = async (tokenMint: PublicKey): Promise<PublicKey | null> => {
    if (!wallet) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      setIsCreatingATA(true);

      // 计算 ATA 地址
      const ataAddress = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      // 检查账户是否已存在
      try {
        await getAccount(connection, ataAddress);
        console.log('ATA already exists:', ataAddress.toBase58());
        return ataAddress;
      } catch (error: any) {
        // 账户不存在，需要创建
        if (error.name === 'TokenAccountNotFoundError') {
          console.log('Creating ATA for token:', tokenMint.toBase58());

          // 创建 ATA 指令
          const instruction = createAssociatedTokenAccountInstruction(
            wallet.publicKey, // payer
            ataAddress, // associated token account
            wallet.publicKey, // owner
            tokenMint // token mint
          );

          // 发送交易
          const transaction = new Transaction().add(instruction);
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = wallet.publicKey;

          // 签名并发送
          const signed = await wallet.signTransaction(transaction);
          const signature = await connection.sendRawTransaction(
            signed.serialize()
          );

          // 确认交易
          await connection.confirmTransaction(signature, 'confirmed');

          toast.success('Token account created successfully!');
          return ataAddress;
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Error creating ATA:', error);
      toast.error(`Failed to create token account: ${error.message}`);
      return null;
    } finally {
      setIsCreatingATA(false);
    }
  };

  /**
   * 获取测试代币 (调用 faucet API)
   */
  const requestTestTokens = async (
    loanTokenMint: PublicKey,
    collateralTokenMint: PublicKey
  ) => {
    if (!wallet) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      toast.loading('Requesting test tokens...', { id: 'faucet-toast' });

      // 首先创建 ATAs（如果不存在）
      const loanATA = await createATA(loanTokenMint);
      const collateralATA = await createATA(collateralTokenMint);

      if (!loanATA || !collateralATA) {
        throw new Error('Failed to create token accounts');
      }

      // 调用 faucet API
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: wallet.publicKey.toBase58(),
          loanTokenMint: loanTokenMint.toBase58(),
          collateralTokenMint: collateralTokenMint.toBase58(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Faucet request failed');
      }

      const result = await response.json();
      console.log('Faucet result:', result);

      toast.success(
        `Received ${result.loanAmount} USDC and ${result.collateralAmount} SOL!`,
        { id: 'faucet-toast' }
      );

      return true;
    } catch (error: any) {
      console.error('Faucet error:', error);
      toast.error(`Faucet failed: ${error.message}`, { id: 'faucet-toast' });
      return false;
    }
  };

  return {
    createATA,
    requestTestTokens,
    isCreatingATA,
  };
}
