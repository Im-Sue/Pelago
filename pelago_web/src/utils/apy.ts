/**
 * APY (Annual Percentage Yield) 计算工具
 *
 * 基于合约实际参数:
 * - 固定借贷APY: 5% (FIXED_ANNUAL_RATE_WAD = 0.05)
 * - 供应APY = 借贷APY × 利用率
 *
 * 参考: pelago_contract/programs/pelago-solana/src/utils/interest.rs
 */

/**
 * 固定借贷年化利率 (来自合约)
 * 对应合约中的 FIXED_ANNUAL_RATE_WAD = 50_000_000_000_000_000 (0.05 in WAD)
 */
const FIXED_BORROW_APY = 5.0; // 5%

/**
 * 计算供应APY
 *
 * 供应者获得的利息 = 借款人支付的利息 × 利用率
 *
 * @param totalSupplyAssets - 总供应资产 (loan token base units)
 * @param totalBorrowAssets - 总借贷资产 (loan token base units)
 * @returns Supply APY 百分比值 (例: 3.5 表示 3.5%)
 *
 * @example
 * // 利用率 60% 的情况
 * calculateSupplyAPY(100000, 60000) // 返回 3.0 (3%)
 *
 * @example
 * // 利用率 80% 的情况
 * calculateSupplyAPY(100000, 80000) // 返回 4.0 (4%)
 */
export function calculateSupplyAPY(
  totalSupplyAssets: number,
  totalBorrowAssets: number
): number {
  // 防止除零错误
  if (totalSupplyAssets === 0) {
    return 0;
  }

  // 计算利用率
  const utilizationRate = totalBorrowAssets / totalSupplyAssets;

  // 供应APY = 借贷APY × 利用率
  // 例: 5% × 0.6 = 3%
  const supplyAPY = FIXED_BORROW_APY * utilizationRate;

  return supplyAPY;
}

/**
 * 计算借贷APY
 *
 * P1阶段: 固定利率 5%
 * P2阶段: 可能实现动态利率模型 (IRM)
 *
 * @returns Borrow APY 百分比值 (固定 5.0)
 */
export function calculateBorrowAPY(): number {
  return FIXED_BORROW_APY;
}

/**
 * 格式化APY显示
 *
 * @param apy - APY数值
 * @param decimals - 小数位数 (默认2位)
 * @returns 格式化的APY字符串 (例: "3.50%")
 *
 * @example
 * formatAPY(3.5) // "3.50%"
 * formatAPY(3.5, 1) // "3.5%"
 */
export function formatAPY(apy: number, decimals: number = 2): string {
  return apy.toFixed(decimals) + '%';
}

/**
 * 计算利用率
 *
 * @param totalSupplyAssets - 总供应资产
 * @param totalBorrowAssets - 总借贷资产
 * @returns 利用率百分比 (例: 60.00 表示 60%)
 */
export function calculateUtilizationRate(
  totalSupplyAssets: number,
  totalBorrowAssets: number
): number {
  if (totalSupplyAssets === 0) {
    return 0;
  }

  return (totalBorrowAssets / totalSupplyAssets) * 100;
}

/**
 * 根据利用率获取颜色状态
 *
 * @param utilizationRate - 利用率 (0-100)
 * @returns Tailwind CSS 颜色类名
 */
export function getUtilizationColor(utilizationRate: number): string {
  if (utilizationRate >= 90) {
    return 'text-status-danger';
  } else if (utilizationRate >= 75) {
    return 'text-orange-400';
  } else if (utilizationRate >= 50) {
    return 'text-solana-green';
  } else {
    return 'text-blue-400';
  }
}
