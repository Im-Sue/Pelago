import { useState, useEffect } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

export interface TokenBalanceInfo {
  balance: number;
  exists: boolean;
  loading: boolean;
  ataAddress: PublicKey | null;
}

export function useTokenBalance(tokenMint: PublicKey | null | undefined) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [balanceInfo, setBalanceInfo] = useState<TokenBalanceInfo>({
    balance: 0,
    exists: false,
    loading: true,
    ataAddress: null,
  });

  useEffect(() => {
    if (!wallet || !tokenMint) {
      setBalanceInfo({
        balance: 0,
        exists: false,
        loading: false,
        ataAddress: null,
      });
      return;
    }

    const fetchBalance = async () => {
      try {
        setBalanceInfo((prev) => ({ ...prev, loading: true }));

        // 计算 ATA 地址
        const ataAddress = await getAssociatedTokenAddress(
          tokenMint,
          wallet.publicKey
        );

        // 尝试获取账户信息
        try {
          const accountInfo = await getAccount(connection, ataAddress);

          setBalanceInfo({
            balance: Number(accountInfo.amount),
            exists: true,
            loading: false,
            ataAddress,
          });
        } catch (error: any) {
          // 账户不存在
          if (error.name === 'TokenAccountNotFoundError') {
            setBalanceInfo({
              balance: 0,
              exists: false,
              loading: false,
              ataAddress,
            });
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error('Error fetching token balance:', error);
        setBalanceInfo({
          balance: 0,
          exists: false,
          loading: false,
          ataAddress: null,
        });
      }
    };

    fetchBalance();

    // 定期刷新余额（每 10 秒）
    const interval = setInterval(fetchBalance, 10000);

    return () => clearInterval(interval);
  }, [connection, wallet, tokenMint]);

  return balanceInfo;
}
