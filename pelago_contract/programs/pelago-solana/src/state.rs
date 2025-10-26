use anchor_lang::prelude::*;

/// Market account structure representing a lending market
///
/// This structure stores all essential information for a lending market including:
/// - Token mint addresses for loan and collateral tokens
/// - Token vault addresses for holding deposited assets
/// - Supply and borrow totals (assets and shares)
/// - Liquidation Loan-to-Value ratio (LLTV)
///
/// **P0 Simplifications:**
/// - 1:1 share mapping (total_supply_shares == total_supply_assets)
/// - No interest accrual (last_update is reserved for future use)
/// - Fixed price oracle (hardcoded 100 USDC/SOL)
#[account]
pub struct Market {
    /// Market authority (admin who can initialize and manage)
    pub authority: Pubkey,

    /// Mint address of the loan token (e.g., USDC)
    pub loan_token_mint: Pubkey,

    /// Mint address of the collateral token (e.g., SOL)
    pub collateral_token_mint: Pubkey,

    /// Token account for holding deposited loan assets
    /// Created during market initialization
    pub loan_vault: Pubkey,

    /// Token account for holding deposited collateral assets
    /// Created during market initialization
    pub collateral_vault: Pubkey,

    /// Total loan assets supplied to the market
    /// P0: Equals total_supply_shares (1:1 mapping)
    pub total_supply_assets: u64,

    /// Total supply shares issued
    /// P0: Equals total_supply_assets (no virtual shares)
    pub total_supply_shares: u64,

    /// Total loan assets borrowed from the market
    /// P0: Equals total_borrow_shares (1:1 mapping)
    pub total_borrow_assets: u64,

    /// Total borrow shares issued
    /// P0: Equals total_borrow_assets (no virtual shares)
    pub total_borrow_shares: u64,

    /// Liquidation Loan-to-Value ratio
    /// Precision: 1e8 (e.g., 80_000_000 = 80%)
    /// Used in health factor calculation: (collateral_value * lltv) / borrow_value
    pub lltv: u64,

    /// Last update timestamp (Unix timestamp)
    /// P0: Reserved for future interest accrual, not used currently
    pub last_update: i64,

    /// PDA bump seed for deterministic address derivation
    pub bump: u8,
}

impl Market {
    /// Space required for Market account
    /// Calculation breakdown:
    /// - 8 bytes (anchor discriminator)
    /// - 32 bytes (authority)
    /// - 32 bytes (loan_token_mint)
    /// - 32 bytes (collateral_token_mint)
    /// - 32 bytes (loan_vault)
    /// - 32 bytes (collateral_vault)
    /// - 8 bytes (total_supply_assets)
    /// - 8 bytes (total_supply_shares)
    /// - 8 bytes (total_borrow_assets)
    /// - 8 bytes (total_borrow_shares)
    /// - 8 bytes (lltv)
    /// - 8 bytes (last_update)
    /// - 1 byte (bump)
    /// Total: 217 bytes
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1;

    /// PDA seed prefix for market accounts
    pub const SEED_PREFIX: &'static [u8] = b"market";
}

/// User position account structure representing a user's position in a market
///
/// This structure tracks an individual user's:
/// - Supply shares (loan assets deposited)
/// - Borrow shares (loan assets borrowed)
/// - Collateral amount (collateral assets deposited)
///
/// **P0 Simplifications:**
/// - 1:1 share mapping (shares == assets)
/// - No interest accumulation tracking
#[account]
pub struct UserPosition {
    /// User wallet address
    pub user: Pubkey,

    /// Market this position belongs to
    pub market: Pubkey,

    /// Supply shares held by user
    /// P0: Equals actual loan assets supplied (1:1 mapping)
    pub supply_shares: u64,

    /// Borrow shares held by user
    /// P0: Equals actual loan assets borrowed (1:1 mapping)
    pub borrow_shares: u64,

    /// Collateral amount deposited by user
    /// Stored in collateral token's base units (e.g., lamports for SOL)
    pub collateral_amount: u64,

    /// PDA bump seed for deterministic address derivation
    pub bump: u8,
}

impl UserPosition {
    /// Space required for UserPosition account
    /// Calculation breakdown:
    /// - 8 bytes (anchor discriminator)
    /// - 32 bytes (user)
    /// - 32 bytes (market)
    /// - 8 bytes (supply_shares)
    /// - 8 bytes (borrow_shares)
    /// - 8 bytes (collateral_amount)
    /// - 1 byte (bump)
    /// Total: 97 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;

    /// PDA seed prefix for user position accounts
    pub const SEED_PREFIX: &'static [u8] = b"user-position";
}
