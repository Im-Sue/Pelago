import { useEffect } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { usePelagoProgram } from './usePelagoProgram';
import { useAppStore } from '../stores/useAppStore';

/**
 * 获取用户仓位数据的hook
 */
export function useUserPosition(autoRefresh = true) {
  const program = usePelagoProgram();
  const wallet = useAnchorWallet();
  const { marketPda, setUserPositionPda, setUserPosition } = useAppStore();

  useEffect(() => {
    if (!program || !wallet || !marketPda) return;

    const fetchUserPosition = async () => {
      try {
        // 派生UserPosition PDA (使用正确的seed)
        const [userPositionPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('user-position'),
            marketPda.toBuffer(),
            wallet.publicKey.toBuffer(),
          ],
          program.programId
        );

        setUserPositionPda(userPositionPda);

        // 获取用户仓位
        const positionAccount = await program.account.userPosition.fetch(userPositionPda);

        setUserPosition({
          supplyShares: positionAccount.supplyShares.toNumber(),
          borrowShares: positionAccount.borrowShares.toNumber(),
          collateral: positionAccount.collateralAmount.toNumber(),
        });
      } catch (err: any) {
        // 如果position不存在,设置为0(新用户)
        if (err.message?.includes('Account does not exist')) {
          setUserPosition({
            supplyShares: 0,
            borrowShares: 0,
            collateral: 0,
          });
        } else {
          console.error('Failed to fetch user position:', err);
        }
      }
    };

    fetchUserPosition();

    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(fetchUserPosition, 3000); // 每3秒刷新
      return () => clearInterval(interval);
    }
  }, [program, wallet, marketPda, autoRefresh, setUserPositionPda, setUserPosition]);
}
