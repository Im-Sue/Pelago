/**
 * Mock APY数据工具 - 黑客松演示专用
 *
 * 为不同市场生成合理的APY展示数据
 * 注意: 仅用于UI展示,不影响实际合约计算
 */

export interface MockAPYData {
  supplyAPY: number;
  borrowAPY: number;
}

/**
 * 市场规模Mock数据接口
 */
export interface MockMarketData {
  totalSupplyAssets: number;
  totalBorrowAssets: number;
  utilizationRate: number;
}

/**
 * 基于Market ID生成稳定的Mock APY数据
 *
 * 使用Market ID的哈希值生成确定性的APY值
 * 保证同一个Market ID每次生成的APY相同
 *
 * @param marketId - Market的公钥字符串
 * @param excludeMarketId - 不应用mock的Market ID (USDC/SOL市场保持真实APY)
 * @returns Mock APY数据或null(如果是排除的市场)
 */
export function getMockAPYForMarket(
  marketId: string,
  excludeMarketId?: string
): MockAPYData | null {
  // USDC/SOL市场(3giBwhMkepTgVPtHBDzZu3c3yRcciGFq34Zq1dVdYybo)不使用mock
  if (excludeMarketId && marketId === excludeMarketId) {
    return null;
  }

  // 使用Market ID生成确定性的哈希值
  const hash = simpleHash(marketId);

  // 根据哈希值生成APY范围
  // Borrow APY: 3% - 12% (合理的借贷利率区间)
  // Supply APY: 1% - 8% (供应利率通常低于借贷利率)

  const borrowAPY = 3 + (hash % 900) / 100; // 3.00% - 11.99%
  const supplyAPY = 1 + (hash % 700) / 100; // 1.00% - 7.99%

  // 确保Supply APY < Borrow APY (经济学合理性)
  const adjustedSupplyAPY = Math.min(supplyAPY, borrowAPY - 0.5);

  return {
    supplyAPY: Number(adjustedSupplyAPY.toFixed(2)),
    borrowAPY: Number(borrowAPY.toFixed(2)),
  };
}

/**
 * 简单哈希函数
 *
 * 将字符串转换为数值哈希
 * 用于生成确定性的随机数
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * 预设的市场类型Mock配置
 *
 * 根据代币对类型提供更有针对性的APY范围和市场规模
 */
const MARKET_TYPE_CONFIG: Record<
  string,
  {
    borrowRange: [number, number];
    supplyRange: [number, number];
    // 市场规模范围 (USDC, 单位: 个)
    supplyRange_Amount: [number, number];
    // 利用率目标范围
    utilizationRange: [number, number];
  }
> = {
  // 稳定币市场 (低风险,低利率,超大规模)
  'USDC/USDT': {
    borrowRange: [2, 5],
    supplyRange: [1, 3],
    supplyRange_Amount: [5000000, 25000000], // 500万-2500万 USDC (顶级规模)
    utilizationRange: [60, 85], // 高利用率
  },
  'USDT/USDC': {
    borrowRange: [2, 5],
    supplyRange: [1, 3],
    supplyRange_Amount: [5000000, 25000000], // 500万-2500万 USDC
    utilizationRange: [60, 85],
  },

  // 主流币市场 (中等风险,中等利率,大规模)
  'USDC/SOL': {
    borrowRange: [4, 8],
    supplyRange: [2, 5],
    supplyRange_Amount: [3000000, 15000000], // 300万-1500万 USDC (主流规模)
    utilizationRange: [50, 75],
  },
  'USDT/SOL': {
    borrowRange: [4, 8],
    supplyRange: [2, 5],
    supplyRange_Amount: [3000000, 15000000], // 300万-1500万 USDC
    utilizationRange: [50, 75],
  },

  // Meme币市场 (高风险,高利率,中等规模)
  'USDC/BONK': {
    borrowRange: [8, 15],
    supplyRange: [4, 9],
    supplyRange_Amount: [1000000, 5000000], // 100万-500万 USDC (Meme币热门)
    utilizationRange: [30, 60], // 较低利用率(高风险)
  },
  'USDC/WIF': {
    borrowRange: [8, 15],
    supplyRange: [4, 9],
    supplyRange_Amount: [1000000, 5000000], // 100万-500万 USDC
    utilizationRange: [30, 60],
  },

  // DeFi代币市场 (中高风险,中高利率,中大规模)
  'USDC/JUP': {
    borrowRange: [6, 12],
    supplyRange: [3, 7],
    supplyRange_Amount: [2000000, 10000000], // 200万-1000万 USDC (DeFi蓝筹)
    utilizationRange: [40, 70],
  },
  'USDC/RAY': {
    borrowRange: [6, 12],
    supplyRange: [3, 7],
    supplyRange_Amount: [2000000, 10000000], // 200万-1000万 USDC
    utilizationRange: [40, 70],
  },
  'USDC/PYTH': {
    borrowRange: [6, 12],
    supplyRange: [3, 7],
    supplyRange_Amount: [2000000, 10000000], // 200万-1000万 USDC
    utilizationRange: [40, 70],
  },
  'USDC/JTO': {
    borrowRange: [6, 12],
    supplyRange: [3, 7],
    supplyRange_Amount: [2000000, 10000000], // 200万-1000万 USDC
    utilizationRange: [40, 70],
  },
};

/**
 * 根据代币对类型生成Mock APY
 *
 * @param loanToken - 借贷代币符号
 * @param collateralToken - 抵押代币符号
 * @param marketId - Market ID (用于确定性)
 * @returns Mock APY数据
 */
export function getMockAPYByTokenPair(
  loanToken: string,
  collateralToken: string,
  marketId: string
): MockAPYData {
  const pairKey = `${loanToken}/${collateralToken}`;
  const config = MARKET_TYPE_CONFIG[pairKey];

  if (!config) {
    // 使用通用逻辑
    return getMockAPYForMarket(marketId) || { supplyAPY: 3.5, borrowAPY: 6.0 };
  }

  // 使用Market ID生成范围内的确定性值
  const hash = simpleHash(marketId);
  const borrowRange = config.borrowRange[1] - config.borrowRange[0];
  const supplyRange = config.supplyRange[1] - config.supplyRange[0];

  const borrowAPY =
    config.borrowRange[0] + (hash % (borrowRange * 100)) / 100;
  const supplyAPY =
    config.supplyRange[0] +
    ((hash * 7) % (supplyRange * 100)) / 100; // 使用不同的种子

  return {
    supplyAPY: Number(supplyAPY.toFixed(2)),
    borrowAPY: Number(borrowAPY.toFixed(2)),
  };
}

/**
 * 根据代币对类型生成Mock市场规模数据
 *
 * @param loanToken - 借贷代币符号
 * @param collateralToken - 抵押代币符号
 * @param marketId - Market ID (用于确定性)
 * @returns Mock市场规模数据
 */
export function getMockMarketDataByTokenPair(
  loanToken: string,
  collateralToken: string,
  marketId: string
): MockMarketData {
  const pairKey = `${loanToken}/${collateralToken}`;
  const config = MARKET_TYPE_CONFIG[pairKey];

  // 默认配置 (未知代币对使用中等规模)
  const defaultConfig = {
    supplyRange_Amount: [2000000, 8000000] as [number, number], // 200万-800万 USDC (中等规模)
    utilizationRange: [40, 70] as [number, number],
  };

  const activeConfig = config || defaultConfig;

  // 使用Market ID生成确定性的市场规模
  const hash = simpleHash(marketId);

  // 生成Total Supply (在配置范围内)
  const supplyAmountRange =
    activeConfig.supplyRange_Amount[1] - activeConfig.supplyRange_Amount[0];
  const totalSupplyAssets =
    activeConfig.supplyRange_Amount[0] +
    (hash % Math.floor(supplyAmountRange));

  // 生成Utilization Rate (在配置范围内)
  const utilizationRangeSpan =
    activeConfig.utilizationRange[1] - activeConfig.utilizationRange[0];
  const utilizationRate =
    activeConfig.utilizationRange[0] +
    ((hash * 13) % Math.floor(utilizationRangeSpan * 100)) / 100;

  // 根据利用率计算Total Borrow
  const totalBorrowAssets = Math.floor(
    totalSupplyAssets * (utilizationRate / 100)
  );

  return {
    totalSupplyAssets,
    totalBorrowAssets,
    utilizationRate: Number(utilizationRate.toFixed(2)),
  };
}

/**
 * 格式化Mock APY显示
 *
 * @param apy - APY数值
 * @param showMockIndicator - 是否显示Mock标记 (开发模式)
 * @returns 格式化的APY字符串
 */
export function formatMockAPY(
  apy: number,
  showMockIndicator: boolean = false
): string {
  const formatted = apy.toFixed(2) + '%';
  return showMockIndicator ? `${formatted} 📊` : formatted;
}

/**
 * 检查是否应该使用Mock APY
 *
 * @param marketId - Market ID
 * @param excludeMarketId - 排除的Market ID
 * @returns 是否使用Mock
 */
export function shouldUseMockAPY(
  marketId: string,
  excludeMarketId?: string
): boolean {
  return excludeMarketId !== marketId;
}

// 黑客松演示配置
export const HACKATHON_CONFIG = {
  // USDC/SOL市场保持真实APY计算
  REAL_APY_MARKET_ID: '3giBwhMkepTgVPtHBDzZu3c3yRcciGFq34Zq1dVdYybo',

  // 是否在UI上显示Mock标记 (调试用)
  SHOW_MOCK_INDICATOR: false,
};
