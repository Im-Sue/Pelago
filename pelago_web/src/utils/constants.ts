import { PublicKey } from '@solana/web3.js';

// ========================================
// 环境变量配置 (支持 Vercel 部署)
// ========================================

// RPC配置 (优先使用环境变量，否则使用默认值)
// ⚠️ 注意: Vercel 部署时需要配置 VITE_RPC_ENDPOINT 环境变量
// 当前 fallback 值用于快速演示，生产环境建议使用环境变量
export const RPC_ENDPOINT = import.meta.env.VITE_RPC_ENDPOINT || 'https://devnet.helius-rpc.com/?api-key=86103c49-61f2-43d6-a803-9fc0dadcdb2f';
export const COMMITMENT = (import.meta.env.VITE_COMMITMENT || 'confirmed') as 'confirmed';

// Program ID (实际部署的Program ID)
export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || '5Y6KqLPs2DGRBzg4ybG9KfkyM5vTt8ZDELy9YwF8rGJq'
);

// Token Mints (从 market-config.json 同步的实际地址)
export const USDC_MINT = new PublicKey(
  import.meta.env.VITE_USDC_MINT || 'C4Btg7bvjcru688Rp1hCfghfaVPs8Cs2mxh37egiqbkn'
); // Loan Token (测试 USDC)
export const SOL_MINT = new PublicKey(
  import.meta.env.VITE_SOL_MINT || 'gjhf1YzbMN1yVJ35LsoLWiJpPefWUzMWJoWQX3fqMEK'
); // Collateral Token (测试 SOL)

// 固定价格 (P0简化: 100 USDC per SOL)
export const FIXED_PRICE = Number(import.meta.env.VITE_FIXED_PRICE) || 100; // 1 SOL = 100 USDC
export const PRICE_DECIMALS = Number(import.meta.env.VITE_PRICE_DECIMALS) || 8; // 价格精度

// LLTV精度
export const LLTV_PRECISION = 1_000_000; // 1e6
export const WAD = 1_000_000_000_000_000_000n; // 1e18

// Token精度
export const USDC_DECIMALS = Number(import.meta.env.VITE_USDC_DECIMALS) || 6;
export const SOL_DECIMALS = Number(import.meta.env.VITE_SOL_DECIMALS) || 9;

// 健康度阈值
export const HEALTH_SAFE_THRESHOLD = Number(import.meta.env.VITE_HEALTH_SAFE_THRESHOLD) || 150; // 150%以上为安全
export const HEALTH_WARNING_THRESHOLD = Number(import.meta.env.VITE_HEALTH_WARNING_THRESHOLD) || 100; // 100-150%为警告
