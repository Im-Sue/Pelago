import { motion } from 'framer-motion';
import { useHealthFactor } from '../../hooks/useHealthFactor';
import clsx from 'clsx';

export function HealthMeter() {
  const { healthFactor, maxBorrowAmount, status, statusLabel } = useHealthFactor();

  const circumference = 2 * Math.PI * 90; // 半径90的圆周长
  const progress = Math.min(healthFactor / 200, 1); // 200%为满值
  const strokeDashoffset = circumference * (1 - progress);

  // 智能字体大小：根据数字长度调整
  const getFontSize = () => {
    if (healthFactor >= 10000) return 'text-2xl'; // 5位数或更多
    if (healthFactor >= 1000) return 'text-3xl';  // 4位数
    if (healthFactor >= 100) return 'text-4xl';   // 3位数
    return 'text-5xl';                             // 1-2位数
  };

  // 特殊处理无限大健康度
  const displayValue = healthFactor === 999 ? '∞' : `${healthFactor}%`;

  const statusConfig = {
    safe: {
      color: 'text-status-safe',
      bgColor: 'from-status-safe/20 to-status-safe/5',
      strokeColor: '#10b981',
    },
    warning: {
      color: 'text-status-warning',
      bgColor: 'from-status-warning/20 to-status-warning/5',
      strokeColor: '#f59e0b',
    },
    danger: {
      color: 'text-status-danger',
      bgColor: 'from-status-danger/20 to-status-danger/5',
      strokeColor: '#ef4444',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={clsx('card bg-gradient-to-br', config.bgColor, 'mt-6')}>
      <h3 className="text-xl font-bold mb-6 text-center">Health Factor</h3>

      {/* SVG圆形进度条 */}
      <div className="flex justify-center mb-6">
        <svg width="220" height="220" className="transform -rotate-90 drop-shadow-lg">
          {/* 外圈光晕效果 */}
          <circle
            cx="110"
            cy="110"
            r="95"
            stroke={config.strokeColor}
            strokeWidth="2"
            fill="none"
            opacity="0.2"
          />

          {/* 背景圆 */}
          <circle
            cx="110"
            cy="110"
            r="90"
            stroke="#1a1a2e"
            strokeWidth="14"
            fill="none"
          />

          {/* 进度圆 - 渐变效果 */}
          <defs>
            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.strokeColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={config.strokeColor} stopOpacity="1" />
            </linearGradient>
          </defs>

          <motion.circle
            cx="110"
            cy="110"
            r="90"
            stroke="url(#healthGradient)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* 中心文字 */}
          <text
            x="110"
            y="105"
            textAnchor="middle"
            className={clsx(getFontSize(), 'font-bold fill-white')}
            transform="rotate(90 110 110)"
          >
            {displayValue}
          </text>
          <text
            x="110"
            y="125"
            textAnchor="middle"
            className="text-sm fill-gray-400"
            transform="rotate(90 110 110)"
          >
            Health
          </text>
        </svg>
      </div>

      {/* 状态标签 */}
      <div className="text-center mb-4">
        <span className={clsx('text-lg font-semibold', config.color)}>
          {statusLabel}
        </span>
      </div>

      {/* 可借款额度 */}
      <div className="bg-solana-gray/50 rounded-lg p-4 text-center">
        <p className="stat-label">Available to Borrow</p>
        <p className={clsx('stat-value', config.color)}>
          {maxBorrowAmount.toFixed(2)} <span className="text-sm">USDC</span>
        </p>
      </div>

      {/* 健康度说明 */}
      <div className="mt-4 text-xs text-gray-400 text-center space-y-2">
        <div className="bg-solana-gray/30 rounded px-3 py-2 inline-block">
          <p className="font-mono">Health Factor = (Max Borrow / Current Borrow) × 100%</p>
        </div>
        <div className={clsx('text-sm font-semibold', config.color)}>
          {healthFactor >= 150 && '✅ You can safely borrow more'}
          {healthFactor >= 100 && healthFactor < 150 && '⚠️ Consider reducing borrow'}
          {healthFactor < 100 && '🚨 URGENT: Add collateral or repay'}
        </div>
      </div>
    </div>
  );
}
