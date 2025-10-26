use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("5Y6KqLPs2DGRBzg4ybG9KfkyM5vTt8ZDELy9YwF8rGJq");

/// Pelago Solana Program
///
/// A simplified lending protocol migrated from Pelago (Ethereum) to Solana.
///
/// **P1 Phase Features:**
/// - Market initialization with dual token vaults
/// - Loan asset supply/withdraw (deposit/withdraw)
/// - Collateral asset supply/withdraw
/// - Borrowing/repayment with health factor validation
/// - Virtual shares mechanism (防止通胀攻击)
/// - Interest accrual (简化版线性利息)
///
/// **P1 Simplifications:**
/// - Fixed oracle price (100 USDC/SOL)
/// - Fixed annual rate (5%)
/// - Linear interest (not compound)
/// - No liquidation mechanism (延迟到P2)
/// - No authorization/callback systems (延迟到P2)
#[program]
pub mod pelago_solana {
    use super::*;

    /// Initialize a new lending market
    ///
    /// Creates a new market account with associated loan and collateral token vaults.
    /// Only the market authority can call this instruction.
    ///
    /// **Parameters:**
    /// - `lltv`: Liquidation Loan-to-Value ratio (precision: 1e8)
    ///   - Example: 80% → 80_000_000
    ///   - Valid range: 0 < lltv <= 100_000_000
    ///
    /// **Accounts:**
    /// - `market`: Market PDA account (to be initialized)
    /// - `loan_token_mint`: SPL token mint for loan asset (e.g., USDC)
    /// - `collateral_token_mint`: SPL token mint for collateral asset (e.g., SOL)
    /// - `loan_vault`: Token account for holding loan assets (to be created)
    /// - `collateral_vault`: Token account for holding collateral assets (to be created)
    /// - `authority`: Market authority (admin)
    /// - `system_program`: Solana system program
    /// - `token_program`: SPL token program
    /// - `rent`: Rent sysvar
    pub fn initialize_market(ctx: Context<InitializeMarket>, lltv: u64) -> Result<()> {
        instructions::initialize_market::handler(ctx, lltv)
    }

    /// Supply loan assets to the market
    ///
    /// Deposits loan tokens (e.g., USDC) into the market and receives supply shares.
    /// P0: 1:1 share mapping (1 token = 1 share).
    ///
    /// **Parameters:**
    /// - `amount`: Amount of loan tokens to supply (in token base units)
    ///   - Must be > 0
    ///
    /// **Accounts:**
    /// - `market`: Market account
    /// - `user_position`: User position PDA (created if first supply)
    /// - `loan_vault`: Market's loan token vault
    /// - `user_token_account`: User's loan token account (source)
    /// - `user`: User wallet (signer)
    /// - `system_program`: Solana system program
    /// - `token_program`: SPL token program
    ///
    /// **P1: Dual-parameter mode** (Pelago compatibility)
    /// - `assets > 0, shares = 0`: Supply exact assets, calculate shares
    /// - `assets = 0, shares > 0`: Burn exact shares, calculate assets
    pub fn supply(ctx: Context<Supply>, assets: u64, shares: u64) -> Result<()> {
        instructions::supply::handler(ctx, assets, shares)
    }

    /// Supply collateral assets to the market
    ///
    /// Deposits collateral tokens (e.g., SOL) into the market to back borrowing.
    /// P0: Direct collateral tracking without virtual shares.
    ///
    /// **Parameters:**
    /// - `amount`: Amount of collateral tokens to supply (in token base units)
    ///   - Must be > 0
    ///
    /// **Accounts:**
    /// - `market`: Market account
    /// - `user_position`: User position PDA (created if doesn't exist)
    /// - `collateral_vault`: Market's collateral token vault
    /// - `user_collateral_account`: User's collateral token account (source)
    /// - `user`: User wallet (signer)
    /// - `system_program`: Solana system program
    /// - `token_program`: SPL token program
    pub fn supply_collateral(ctx: Context<SupplyCollateral>, amount: u64) -> Result<()> {
        instructions::supply_collateral::handler(ctx, amount)
    }

    /// Borrow loan assets from the market
    ///
    /// Borrows loan tokens against deposited collateral. Validates health factor
    /// before executing the borrow.
    ///
    /// **Parameters:**
    /// - `amount`: Amount of loan tokens to borrow (in token base units)
    ///   - Must be > 0
    ///   - Must not exceed available liquidity
    ///
    /// **Health Check:**
    /// - Calculates: (collateral_value * lltv) >= (borrow_value * LLTV_PRECISION)
    /// - Uses fixed oracle price: 100 USDC/SOL
    /// - Fails if position becomes undercollateralized
    ///
    /// **Accounts:**
    /// - `market`: Market account
    /// - `user_position`: User position PDA (must exist)
    /// - `loan_vault`: Market's loan token vault (source)
    /// - `user_token_account`: User's loan token account (destination)
    /// - `user`: User wallet (signer)
    /// - `token_program`: SPL token program
    ///
    /// **P1: Dual-parameter mode** (Pelago compatibility)
    /// - `assets > 0, shares = 0`: Borrow exact assets, calculate shares
    /// - `assets = 0, shares > 0`: Incur exact debt shares, calculate assets
    pub fn borrow(ctx: Context<Borrow>, assets: u64, shares: u64) -> Result<()> {
        instructions::borrow::handler(ctx, assets, shares)
    }

    /// Withdraw loan assets from the market
    ///
    /// Withdraws loan tokens and burns supply shares using virtual shares mechanism.
    /// Maintains liquidity constraint: totalBorrowAssets ≤ totalSupplyAssets.
    ///
    /// **Parameters:**
    /// - `assets`: Amount of loan tokens to withdraw (mutually exclusive with shares)
    /// - `shares`: Amount of supply shares to burn (mutually exclusive with assets)
    ///   - Exactly one must be > 0, the other must be 0
    ///
    /// **P1 Enhancements:**
    /// - Virtual shares calculation for accurate conversion
    /// - Interest accrual before withdrawal
    /// - Liquidity validation
    ///
    /// **Accounts:**
    /// - `market`: Market account
    /// - `user_position`: User position PDA
    /// - `user`: User wallet (signer)
    /// - `receiver_token_account`: Destination for withdrawn tokens
    /// - `loan_vault`: Market's loan token vault (source)
    /// - `token_program`: SPL token program
    pub fn withdraw(ctx: Context<Withdraw>, assets: u64, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, assets, shares)
    }

    /// Withdraw collateral assets from user position
    ///
    /// Transfers collateral tokens from market to receiver.
    /// Must maintain health factor after withdrawal.
    ///
    /// **Parameters:**
    /// - `assets`: Amount of collateral tokens to withdraw
    ///   - Must be > 0
    ///
    /// **P1 Enhancements:**
    /// - Interest accrual before health check
    /// - Virtual shares in health calculation
    ///
    /// **Accounts:**
    /// - `market`: Market account
    /// - `user_position`: User position PDA
    /// - `user`: User wallet (signer)
    /// - `receiver_collateral_account`: Destination for collateral
    /// - `collateral_vault`: Market's collateral token vault (source)
    /// - `token_program`: SPL token program
    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, assets: u64) -> Result<()> {
        instructions::withdraw_collateral::handler(ctx, assets)
    }

    /// Repay borrowed loan assets
    ///
    /// Repays borrowed tokens and burns borrow shares using virtual shares mechanism.
    /// Supports third-party repayment (payer ≠ borrower).
    ///
    /// **Parameters:**
    /// - `assets`: Amount of loan tokens to repay (mutually exclusive with shares)
    /// - `shares`: Amount of borrow shares to burn (mutually exclusive with assets)
    ///   - Exactly one must be > 0, the other must be 0
    ///
    /// **P1 Enhancements:**
    /// - Virtual shares calculation
    /// - Interest accrual before repayment
    /// - Handles overpayment gracefully (saturating_sub)
    ///
    /// **Accounts:**
    /// - `market`: Market account
    /// - `borrower_position`: Borrower's position PDA
    /// - `payer`: Payer wallet (signer, can be different from borrower)
    /// - `borrower`: Borrower wallet (whose debt is being repaid)
    /// - `payer_token_account`: Payer's loan token account (source)
    /// - `loan_vault`: Market's loan token vault (destination)
    /// - `token_program`: SPL token program
    pub fn repay(ctx: Context<Repay>, assets: u64, shares: u64) -> Result<()> {
        instructions::repay::handler(ctx, assets, shares)
    }
}
