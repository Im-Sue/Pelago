/**
 * 代币图标映射工具
 *
 * 提供代币图标URL和元数据
 * 支持真实代币(USDC/SOL)和测试代币的图标获取
 */

export interface TokenInfo {
  name: string;
  symbol: string;
  iconUrl: string;
  color: string; // Tailwind CSS 颜色类名
}

/**
 * 已知代币图标映射
 *
 * 使用Solana Token List的官方图标
 * 真实代币使用mainnet的图标URL,即使在devnet也能显示
 */
const KNOWN_TOKENS: Record<string, TokenInfo> = {
  // USDC - 使用官方Solana Token List图标
  USDC: {
    name: 'USD Coin',
    symbol: 'USDC',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    color: 'text-blue-500',
  },

  // SOL - 使用官方Solana图标
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    color: 'text-solana-purple',
  },

  // USDT - Tether USD
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
    color: 'text-green-500',
  },

  // BONK - Bonk Token
  BONK: {
    name: 'Bonk',
    symbol: 'BONK',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
    color: 'text-orange-500',
  },

  // JUP - Jupiter Token
  JUP: {
    name: 'Jupiter',
    symbol: 'JUP',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png',
    color: 'text-cyan-400',
  },

  // RAY - Raydium Token
  RAY: {
    name: 'Raydium',
    symbol: 'RAY',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
    color: 'text-blue-400',
  },

  // PYTH - Pyth Network Token
  PYTH: {
    name: 'Pyth Network',
    symbol: 'PYTH',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3/logo.png',
    color: 'text-purple-400',
  },

  // WIF - dogwifhat
  WIF: {
    name: 'dogwifhat',
    symbol: 'WIF',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm/logo.png',
    color: 'text-pink-400',
  },

  // JTO - Jito Token
  JTO: {
    name: 'Jito',
    symbol: 'JTO',
    iconUrl:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL/logo.png',
    color: 'text-indigo-400',
  },

  // 默认未知代币图标
  DEFAULT: {
    name: 'Unknown Token',
    symbol: '?',
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzk5NDVGRiIvPgogIDx0ZXh0IHg9IjE2IiB5PSIyMSIgZm9udC1zaXplPSIxNiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+PzwvdGV4dD4KPC9zdmc+',
    color: 'text-gray-400',
  },
};

/**
 * 获取代币信息
 *
 * @param tokenSymbol - 代币符号 (例: 'USDC', 'SOL')
 * @returns TokenInfo 对象
 *
 * @example
 * getTokenInfo('USDC') // 返回USDC的图标和信息
 * getTokenInfo('UNKNOWN') // 返回默认占位图标
 */
export function getTokenInfo(tokenSymbol: string): TokenInfo {
  return KNOWN_TOKENS[tokenSymbol] || KNOWN_TOKENS.DEFAULT;
}

/**
 * 获取代币图标URL
 *
 * @param tokenSymbol - 代币符号
 * @returns 图标URL
 */
export function getTokenIconUrl(tokenSymbol: string): string {
  return getTokenInfo(tokenSymbol).iconUrl;
}

/**
 * 获取代币颜色类名
 *
 * @param tokenSymbol - 代币符号
 * @returns Tailwind CSS 颜色类名
 */
export function getTokenColor(tokenSymbol: string): string {
  return getTokenInfo(tokenSymbol).color;
}

/**
 * 检查代币是否为已知代币
 *
 * @param tokenSymbol - 代币符号
 * @returns 是否为已知代币
 */
export function isKnownToken(tokenSymbol: string): boolean {
  return tokenSymbol in KNOWN_TOKENS && tokenSymbol !== 'DEFAULT';
}
