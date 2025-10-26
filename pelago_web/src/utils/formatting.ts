import { USDC_DECIMALS, SOL_DECIMALS } from './constants';

/**
 * 格式化USDC金额(6位小数)
 */
export function formatUSDC(amount: number): string {
  return (amount / Math.pow(10, USDC_DECIMALS)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化SOL金额(9位小数)
 */
export function formatSOL(amount: number): string {
  return (amount / Math.pow(10, SOL_DECIMALS)).toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

/**
 * USDC金额转换为最小单位
 */
export function toUSDCAmount(uiAmount: number): number {
  return Math.floor(uiAmount * Math.pow(10, USDC_DECIMALS));
}

/**
 * SOL金额转换为最小单位
 */
export function toSOLAmount(uiAmount: number): number {
  return Math.floor(uiAmount * Math.pow(10, SOL_DECIMALS));
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * 缩短地址显示
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
