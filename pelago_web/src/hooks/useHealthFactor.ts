import { useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { FIXED_PRICE, LLTV_PRECISION, SOL_DECIMALS, USDC_DECIMALS } from '../utils/constants';

export function useHealthFactor() {
  const { marketData, userPosition } = useAppStore();

  const healthFactor = useMemo(() => {
    if (!marketData || !userPosition) return 0;
    if (userPosition.borrowShares === 0) return 999; // 无借款,健康度无限大

    // P0简化: 1:1份额映射
    const borrowedAssets = userPosition.borrowShares / Math.pow(10, USDC_DECIMALS);

    // 计算抵押品价值 (SOL * 100 USDC)
    // 注意: userPosition.collateral 是原始数值,需要除以 decimals
    const collateralInSOL = userPosition.collateral / Math.pow(10, SOL_DECIMALS);
    const collateralValue = collateralInSOL * FIXED_PRICE;

    // 计算最大可借款
    const maxBorrow = (collateralValue * marketData.lltv) / LLTV_PRECISION;

    // 健康度 = (最大可借款 / 实际借款) * 100
    const health = (maxBorrow / borrowedAssets) * 100;

    return Math.round(health);
  }, [marketData, userPosition]);

  const maxBorrowAmount = useMemo(() => {
    if (!marketData || !userPosition) return 0;

    // 正确处理 decimals
    const collateralInSOL = userPosition.collateral / Math.pow(10, SOL_DECIMALS);
    const collateralValue = collateralInSOL * FIXED_PRICE;
    const maxBorrow = (collateralValue * marketData.lltv) / LLTV_PRECISION;
    const currentBorrow = userPosition.borrowShares / Math.pow(10, USDC_DECIMALS); // P0简化: 1:1映射

    return Math.max(0, maxBorrow - currentBorrow);
  }, [marketData, userPosition]);

  const status: 'safe' | 'warning' | 'danger' = useMemo(() => {
    if (healthFactor >= 150) return 'safe';
    if (healthFactor >= 100) return 'warning';
    return 'danger';
  }, [healthFactor]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'safe':
        return '✅ Very Safe';
      case 'warning':
        return '⚠️ Moderate Risk';
      case 'danger':
        return '🚨 Liquidation Risk';
    }
  }, [status]);

  return {
    healthFactor,
    maxBorrowAmount,
    status,
    statusLabel,
  };
}
