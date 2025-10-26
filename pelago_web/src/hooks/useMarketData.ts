import { useEffect } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { usePelagoProgram } from './usePelagoProgram';
import { useAppStore } from '../stores/useAppStore';
import { USDC_MINT, SOL_MINT } from '../utils/constants';

/**
 * 获取市场数据的hook
 *
 * 架构原则：以链上合约数据为唯一真实来源
 * - 优先使用用户选择的 market（来自 MarketCard）
 * - 仅在没有选择时使用默认配置
 * - 永不覆盖用户选择
 */
export function useMarketData(autoRefresh = true) {
  const program = usePelagoProgram();
  const wallet = useAnchorWallet();
  const { marketPda: selectedMarketPda, setMarketPda, setMarketData, setError } = useAppStore();

  useEffect(() => {
    if (!program || !wallet) return;

    const fetchMarketData = async () => {
      try {
        let marketPda: PublicKey;

        // 关键修改：优先使用用户选择的 market（来自链上）
        if (selectedMarketPda) {
          // 用户已选择 market，尊重用户选择
          marketPda = selectedMarketPda;
        } else {
          // 没有选择时，使用默认配置（仅用于首次加载）
          [marketPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('market'),
              USDC_MINT.toBuffer(),
              SOL_MINT.toBuffer(),
            ],
            program.programId
          );
          // 只在没有选择时才设置
          setMarketPda(marketPda);
        }

        // 从链上获取市场数据（唯一真实来源）
        const marketAccount = await program.account.market.fetch(marketPda);

        setMarketData({
          totalSupplyAssets: marketAccount.totalSupplyAssets.toNumber(),
          totalBorrowAssets: marketAccount.totalBorrowAssets.toNumber(),
          totalSupplyShares: marketAccount.totalSupplyShares.toNumber(),
          totalBorrowShares: marketAccount.totalBorrowShares.toNumber(),
          lltv: marketAccount.lltv.toNumber(),
          loanTokenMint: marketAccount.loanTokenMint,
          collateralTokenMint: marketAccount.collateralTokenMint,
          loanVault: marketAccount.loanVault,
          collateralVault: marketAccount.collateralVault,
        });

        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch market data:', err);

        // 如果market不存在,不显示错误(可能还没初始化)
        if (!err.message?.includes('Account does not exist')) {
          setError('Failed to load market data');
        }
      }
    };

    fetchMarketData();

    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(fetchMarketData, 5000); // 每5秒刷新
      return () => clearInterval(interval);
    }
  }, [program, wallet, selectedMarketPda, autoRefresh, setMarketPda, setMarketData, setError]);
}
