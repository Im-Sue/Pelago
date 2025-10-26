/**
 * 操作步骤图标组件
 *
 * 为各种操作提供专业的视觉图标
 * 替代原有的emoji数字图标(1️⃣ 2️⃣ 3️⃣)
 */

export type StepType = 'supply' | 'collateral' | 'borrow' | 'withdraw' | 'repay';

interface StepConfig {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
}

const STEP_CONFIGS: Record<StepType, StepConfig> = {
  supply: {
    icon: '💵',
    color: 'text-solana-green',
    bgColor: 'bg-solana-green/20',
    label: 'Supply',
  },
  collateral: {
    icon: '🛡️',
    color: 'text-solana-purple',
    bgColor: 'bg-solana-purple/20',
    label: 'Collateral',
  },
  borrow: {
    icon: '📤',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/20',
    label: 'Borrow',
  },
  withdraw: {
    icon: '🏦',
    color: 'text-solana-green',
    bgColor: 'bg-solana-green/20',
    label: 'Withdraw',
  },
  repay: {
    icon: '💳',
    color: 'text-solana-purple',
    bgColor: 'bg-solana-purple/20',
    label: 'Repay',
  },
};

interface StepIconProps {
  /** 步骤类型 */
  step: StepType;
  /** 步骤编号 (可选,显示在右上角) */
  number?: number;
  /** 图标大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 额外CSS类名 */
  className?: string;
}

/**
 * 步骤图标组件
 *
 * @example
 * <StepIcon step="supply" number={1} />
 * <StepIcon step="collateral" number={2} size="lg" />
 */
export function StepIcon({
  step,
  number,
  size = 'md',
  className = '',
}: StepIconProps) {
  const config = STEP_CONFIGS[step];

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-12 h-12 text-3xl',
  };

  const numberSizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center ${sizeClasses[size]} ${config.bgColor} rounded-lg transition-all hover:scale-110 ${className}`}
      title={config.label}
    >
      <span className={config.color}>{config.icon}</span>
      {number !== undefined && (
        <span
          className={`absolute -top-1 -right-1 ${numberSizeClasses[size]} bg-solana-purple text-white font-bold rounded-full flex items-center justify-center ring-2 ring-solana-dark`}
        >
          {number}
        </span>
      )}
    </div>
  );
}

/**
 * 步骤标题组件
 *
 * 结合图标和文字的标题组件
 *
 * @example
 * <StepHeader step="supply" number={1} title="Supply USDC" />
 */
export function StepHeader({
  step,
  number,
  title,
  className = '',
}: {
  step: StepType;
  number?: number;
  title: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <StepIcon step={step} number={number} />
      <h3 className="text-xl font-bold">{title}</h3>
    </div>
  );
}
