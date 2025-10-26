import { getTokenInfo } from '../../utils/tokenIcons';

interface TokenIconProps {
  /** 代币符号 (例: 'USDC', 'SOL') */
  token: string;
  /** 图标大小 (像素) */
  size?: number;
  /** 额外的CSS类名 */
  className?: string;
  /** 是否显示边框 */
  showBorder?: boolean;
}

/**
 * 代币图标组件
 *
 * 显示代币的官方图标,支持USDC/SOL等已知代币
 * 未知代币显示占位图标
 *
 * @example
 * <TokenIcon token="USDC" size={32} />
 * <TokenIcon token="SOL" size={40} showBorder />
 */
export function TokenIcon({
  token,
  size = 32,
  className = '',
  showBorder = true,
}: TokenIconProps) {
  const tokenInfo = getTokenInfo(token);

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      title={`${tokenInfo.name} (${tokenInfo.symbol})`}
    >
      <img
        src={tokenInfo.iconUrl}
        alt={tokenInfo.symbol}
        width={size}
        height={size}
        className={`rounded-full ${
          showBorder ? 'ring-2 ring-solana-gray' : ''
        }`}
        onError={(e) => {
          // 图标加载失败时的fallback
          const target = e.target as HTMLImageElement;
          target.src = getTokenInfo('DEFAULT').iconUrl;
        }}
      />
    </div>
  );
}

/**
 * 代币对图标组件
 *
 * 显示两个代币的图标,带有重叠效果
 *
 * @example
 * <TokenPairIcon loanToken="USDC" collateralToken="SOL" />
 */
export function TokenPairIcon({
  loanToken,
  collateralToken,
  size = 32,
  className = '',
}: {
  loanToken: string;
  collateralToken: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      <TokenIcon token={loanToken} size={size} className="z-10" showBorder />
      <TokenIcon token={collateralToken} size={size} showBorder />
    </div>
  );
}
