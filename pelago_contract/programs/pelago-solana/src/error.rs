use anchor_lang::prelude::*;

/// Custom error codes for Pelago Solana program
#[error_code]
pub enum PelagoError {
    /// Error code: 6000
    /// Insufficient collateral to maintain healthy position
    /// Triggered when: (collateral_value * lltv) < borrow_value
    #[msg("Insufficient collateral: position is undercollateralized")]
    InsufficientCollateral,

    /// Error code: 6001
    /// Not enough liquidity available in the market to fulfill borrow request
    /// Triggered when: borrow_amount > (total_supply_assets - total_borrow_assets)
    #[msg("Insufficient liquidity: market cannot fulfill this borrow")]
    InsufficientLiquidity,

    /// Error code: 6002
    /// Mathematical operation resulted in overflow
    /// Triggered during: multiplication, addition, or division operations
    #[msg("Math overflow: calculation exceeded maximum value")]
    MathOverflow,

    /// Error code: 6003
    /// Attempted division by zero
    /// Triggered when: denominator is zero in division operations
    #[msg("Division by zero: invalid calculation")]
    DivisionByZero,

    /// Error code: 6004
    /// Invalid LLTV (Liquidation Loan-to-Value) parameter
    /// Triggered when: lltv > 100% or lltv == 0
    #[msg("Invalid LLTV: must be between 0 and 100%")]
    InvalidLltv,

    /// Error code: 6005
    /// Operation amount is zero
    /// Triggered when: supply_amount == 0 or borrow_amount == 0
    #[msg("Zero amount: operation amount must be greater than zero")]
    ZeroAmount,

    /// Error code: 6006
    /// Market is not properly initialized
    /// Triggered when: accessing uninitialized market account
    #[msg("Uninitialized market: market account not properly set up")]
    UninitializedMarket,

    /// Error code: 6007
    /// Unauthorized operation attempt
    /// Triggered when: non-authority tries to perform admin operation
    #[msg("Unauthorized: only market authority can perform this operation")]
    Unauthorized,

    /// Error code: 6008
    /// Inconsistent input parameters (both assets and shares provided or both zero)
    /// Triggered when: (assets > 0 && shares > 0) || (assets == 0 && shares == 0)
    #[msg("Inconsistent input: exactly one of assets or shares must be non-zero")]
    InconsistentInput,

    /// Error code: 6009
    /// Insufficient supply shares to withdraw
    /// Triggered when: withdraw_shares > user_supply_shares
    #[msg("Insufficient supply: not enough supply shares to withdraw")]
    InsufficientSupply,

    /// Error code: 6010
    /// Insufficient borrow shares to repay
    /// Triggered when: repay_shares > user_borrow_shares
    #[msg("Insufficient borrow: not enough borrow shares to repay")]
    InsufficientBorrow,

    /// Error code: 6011
    /// Invalid timestamp (clock error or time went backwards)
    /// Triggered when: elapsed < 0 or Clock::get() fails
    #[msg("Invalid timestamp: clock error or time inconsistency")]
    InvalidTimestamp,

    /// Error code: 6012
    /// Invalid vault account
    /// Triggered when: provided vault doesn't match market's vault
    #[msg("Invalid vault: vault account mismatch")]
    InvalidVault,
}
