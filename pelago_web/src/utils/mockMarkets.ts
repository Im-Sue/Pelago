/**
 * Mock Markets 数据生成工具
 *
 * 用于首页Market List展示丰富的市场数据
 * Market ID 3giBwhMkepTgVPtHBDzZu3c3yRcciGFq34Zq1dVdYybo 使用真实数据
 */

import { PublicKey, SystemProgram } from '@solana/web3.js';

/**
 * 真实市场ID - 此市场使用真实数据，不进行mock
 */
export const REAL_MARKET_ID = '3giBwhMkepTgVPtHBDzZu3c3yRcciGFq34Zq1dVdYybo';

/**
 * Mock市场数据接口
 */
export interface MockMarket {
  pda: PublicKey;
  authority: PublicKey;
  lltv: number;
  loanTokenMint: PublicKey;
  collateralTokenMint: PublicKey;
  totalSupplyAssets: number;
  totalBorrowAssets: number;
  loanVault: PublicKey;
  collateralVault: PublicKey;
  loanTokenSymbol: string;
  collateralTokenSymbol: string;
}

/**
 * Mock市场配置模板
 */
interface MockMarketTemplate {
  loanToken: string;
  collateralToken: string;
  lltv: number;
  supplyRange: [number, number];
  utilizationRange: [number, number];
  loanTokenSymbol: string;
  collateralTokenSymbol: string;
}

const MOCK_MARKET_TEMPLATES: MockMarketTemplate[] = [
  // 稳定币市场
  {
    loanToken: 'USDC',
    collateralToken: 'USDT',
    loanTokenSymbol: 'USDC',
    collateralTokenSymbol: 'USDT',
    lltv: 0.95,
    supplyRange: [50000, 200000],
    utilizationRange: [0.6, 0.8],
  },
  {
    loanToken: 'USDC',
    collateralToken: 'RAY',
    loanTokenSymbol: 'USDC',
    collateralTokenSymbol: 'RAY',
    lltv: 0.65,
    supplyRange: [20000, 80000],
    utilizationRange: [0.3, 0.6],
  },
  // 主流代币
  {
    loanToken: 'USDC',
    collateralToken: 'JUP',
    loanTokenSymbol: 'USDC',
    collateralTokenSymbol: 'JUP',
    lltv: 0.70,
    supplyRange: [30000, 100000],
    utilizationRange: [0.4, 0.7],
  },
  // Meme币
  {
    loanToken: 'USDC',
    collateralToken: 'BONK',
    loanTokenSymbol: 'USDC',
    collateralTokenSymbol: 'BONK',
    lltv: 0.50,
    supplyRange: [15000, 50000],
    utilizationRange: [0.2, 0.5],
  },
  {
    loanToken: 'USDC',
    collateralToken: 'WIF',
    loanTokenSymbol: 'USDC',
    collateralTokenSymbol: 'WIF',
    lltv: 0.55,
    supplyRange: [10000, 40000],
    utilizationRange: [0.25, 0.55],
  },
  // DeFi代币
  {
    loanToken: 'USDC',
    collateralToken: 'PYTH',
    loanTokenSymbol: 'USDC',
    collateralTokenSymbol: 'PYTH',
    lltv: 0.68,
    supplyRange: [25000, 90000],
    utilizationRange: [0.35, 0.65],
  },
  {
    loanToken: 'USDC',
    collateralToken: 'JTO',
    loanTokenSymbol: 'USDC',
    collateralTokenSymbol: 'JTO',
    lltv: 0.72,
    supplyRange: [18000, 70000],
    utilizationRange: [0.3, 0.6],
  },
];

/**
 * 生成确定性随机数
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(Math.sin(hash));
}

/**
 * 生成mock PublicKey
 * 使用 findProgramAddressSync 生成确定性的有效 PDA
 */
function generateMockPublicKey(seed: string): PublicKey {
  try {
    // 使用 PDA (Program Derived Address) 生成确定性的有效地址
    // 将 seed 字符串转换为 Buffer
    const seedBuffer = Buffer.from(seed);
    const [pda] = PublicKey.findProgramAddressSync(
      [seedBuffer],
      SystemProgram.programId
    );
    return pda;
  } catch {
    return PublicKey.default;
  }
}

/**
 * 生成单个mock市场
 */
function generateMockMarket(template: MockMarketTemplate, index: number): MockMarket {
  const seed = `${template.loanToken}-${template.collateralToken}-${index}`;

  const supplyRandom = seededRandom(seed + '-supply');
  const totalSupplyAssets = Math.floor(
    template.supplyRange[0] +
    supplyRandom * (template.supplyRange[1] - template.supplyRange[0])
  )*100000;

  const utilizationRandom = seededRandom(seed + '-utilization');
  const utilization =
    template.utilizationRange[0] +
    utilizationRandom * (template.utilizationRange[1] - template.utilizationRange[0]);

  const totalBorrowAssets = Math.floor(totalSupplyAssets * utilization);

  return {
    pda: generateMockPublicKey(seed + '-pda'),
    authority: generateMockPublicKey(seed + '-authority'),
    lltv: template.lltv,
    loanTokenMint: generateMockPublicKey(seed + '-loan-mint'),
    collateralTokenMint: generateMockPublicKey(seed + '-collateral-mint'),
    totalSupplyAssets,
    totalBorrowAssets,
    loanVault: generateMockPublicKey(seed + '-loan-vault'),
    collateralVault: generateMockPublicKey(seed + '-collateral-vault'),
    loanTokenSymbol: template.loanToken,
    collateralTokenSymbol: template.collateralToken,
  };
}

/**
 * 生成所有mock市场
 */
export function generateMockMarkets(): MockMarket[] {
  return MOCK_MARKET_TEMPLATES.map((template, index) =>
    generateMockMarket(template, index)
  );
}

/**
 * 检查是否为真实市场
 */
export function isRealMarket(marketPda: PublicKey): boolean {
  return marketPda.toBase58() === REAL_MARKET_ID;
}

/**
 * 合并真实市场和mock市场
 * 真实市场排在第一位
 */
export function mergeRealAndMockMarkets<T extends { pda: PublicKey }>(
  realMarkets: T[],
  mockMarkets: MockMarket[]
): Array<T | MockMarket> {
  const realMarket = realMarkets.find(m => isRealMarket(m.pda));
  const result: Array<T | MockMarket> = [];

  if (realMarket) {
    result.push(realMarket);
  }

  result.push(...mockMarkets);

  return result;
}
