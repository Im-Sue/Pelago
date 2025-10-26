//! Withdraw Collateral Instruction
//!
//! Allows users to withdraw collateral assets from their position.
//! Must maintain health factor after withdrawal to prevent undercollateralization.
//!
//! **P1 Enhancements:**
//! - Accrues interest before health check (ensures accurate borrow amount)
//! - Uses virtual shares in health calculation (via to_assets_up)
//!
//! **Pelago.sol Reference:** withdrawCollateral() function (L323-342)

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::PelagoError;
use crate::state::{Market, UserPosition};
use crate::utils::interest::accrue_interest;
use crate::utils::shares_math::to_assets_up;
use crate::constants::{FIXED_ORACLE_PRICE, LLTV_PRECISION, PRICE_PRECISION};

/// Withdraw collateral assets from user position
///
/// Transfers collateral tokens from market vault to receiver.
/// Must maintain health factor after withdrawal.
///
/// **State Changes:**
/// - `user_position.collateral_amount` -= assets
/// - `collateral_vault.amount` -= assets (via transfer)
///
/// **Validation:**
/// - Assets must be non-zero
/// - User must have sufficient collateral
/// - Health factor must remain valid after withdrawal
#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    /// Market account
    #[account(
        mut,
        seeds = [
            Market::SEED_PREFIX,
            market.loan_token_mint.as_ref(),
            market.collateral_token_mint.as_ref(),
        ],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// User position PDA
    #[account(
        mut,
        seeds = [
            UserPosition::SEED_PREFIX,
            market.key().as_ref(),
            user.key().as_ref(),
        ],
        bump = user_position.bump,
    )]
    pub user_position: Account<'info, UserPosition>,

    /// User wallet (signer, authority)
    #[account(mut)]
    pub user: Signer<'info>,

    /// Receiver collateral token account
    /// CHECK: Validated via token transfer
    #[account(mut)]
    pub receiver_collateral_account: Account<'info, TokenAccount>,

    /// Market's collateral token vault (source of withdrawal)
    #[account(
        mut,
        constraint = collateral_vault.key() == market.collateral_vault @ PelagoError::InvalidVault,
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    /// SPL token program
    pub token_program: Program<'info, Token>,
}

/// Handler for withdraw collateral instruction
///
/// **Processing Steps:**
/// 1. Validate assets > 0
/// 2. Accrue interest (ensures accurate borrow value for health check)
/// 3. Update user collateral amount
/// 4. Check health factor with new collateral amount
/// 5. Transfer collateral tokens to receiver
///
/// **Health Check:**
/// - Must maintain: `collateral_value × lltv ≥ borrow_value × LLTV_PRECISION`
/// - Uses virtual shares: `borrow_value = to_assets_up(user_borrow_shares)`
/// - Rounding UP on borrow value ensures conservative health check
///
/// **Errors:**
/// - ZeroAmount: assets == 0
/// - InsufficientCollateral: User doesn't have enough collateral OR health check fails
/// - MathOverflow: Calculation overflow
pub fn handler(
    ctx: Context<WithdrawCollateral>,
    assets: u64,
) -> Result<()> {
    // Step 1: Validate assets
    require!(assets > 0, PelagoError::ZeroAmount);

    let market = &mut ctx.accounts.market;
    let user_position = &mut ctx.accounts.user_position;

    // Step 2: Accrue interest before health check
    // This ensures borrow amounts are up-to-date for accurate health calculation
    accrue_interest(market)?;

    msg!(
        "Withdraw collateral: user={}, amount={}, current_collateral={}",
        user_position.user,
        assets,
        user_position.collateral_amount
    );

    // Step 3: Update user collateral amount
    user_position.collateral_amount = user_position
        .collateral_amount
        .checked_sub(assets)
        .ok_or(PelagoError::InsufficientCollateral)?;

    // Step 4: Health check with new collateral amount
    // P1: Uses virtual shares to calculate actual borrow assets
    check_health_p1(market, user_position)?;

    // Step 5: Transfer collateral tokens from vault to receiver
    let loan_token_mint = market.loan_token_mint;
    let collateral_token_mint = market.collateral_token_mint;
    let bump = market.bump;

    let market_seeds = &[
        Market::SEED_PREFIX,
        loan_token_mint.as_ref(),
        collateral_token_mint.as_ref(),
        &[bump],
    ];
    let signer_seeds = &[&market_seeds[..]];

    let transfer_accounts = Transfer {
        from: ctx.accounts.collateral_vault.to_account_info(),
        to: ctx.accounts.receiver_collateral_account.to_account_info(),
        authority: market.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer_seeds,
    );

    token::transfer(cpi_ctx, assets)?;

    msg!(
        "Withdraw collateral success: remaining_collateral={}",
        user_position.collateral_amount
    );

    // Emit event
    emit!(WithdrawCollateralEvent {
        market: market.key(),
        user: ctx.accounts.user.key(),
        receiver: ctx.accounts.receiver_collateral_account.key(),
        assets,
        remaining_collateral: user_position.collateral_amount,
    });

    Ok(())
}

/// P1 Health check using virtual shares
///
/// Validates that user position remains healthy after collateral withdrawal.
/// Uses `to_assets_up` to convert borrow shares to assets (conservative rounding).
///
/// **Formula:**
/// ```
/// collateral_value_usd = collateral_amount × oracle_price / price_precision
/// borrow_value_usd = to_assets_up(borrow_shares) (already in USDC)
/// healthy = collateral_value_usd × lltv ≥ borrow_value_usd × LLTV_PRECISION
/// ```
///
/// **Parameters:**
/// - `market`: Market account (for oracle price, lltv, and total borrow state)
/// - `user_position`: User position (for collateral and borrow shares)
///
/// **Returns:**
/// - Ok(()) if position is healthy
/// - Err(InsufficientCollateral) if position is undercollateralized
pub fn check_health_p1(
    market: &Market,
    user_position: &UserPosition,
) -> Result<()> {
    // If user has no borrows, they are always healthy
    if user_position.borrow_shares == 0 {
        return Ok(());
    }

    // Calculate actual borrow assets using virtual shares (P1)
    // Rounding UP to be conservative (favors protocol safety)
    let borrow_value_usdc = to_assets_up(
        user_position.borrow_shares,
        market.total_borrow_assets,
        market.total_borrow_shares,
    )?;

    // Calculate collateral value in USDC
    // collateral_value = (collateral_amount × price) / price_precision
    let collateral_value_usd = (user_position.collateral_amount as u128)
        .checked_mul(FIXED_ORACLE_PRICE as u128)
        .ok_or(PelagoError::MathOverflow)?
        .checked_div(PRICE_PRECISION as u128)
        .ok_or(PelagoError::MathOverflow)?;

    // Calculate max allowed borrow value
    // max_borrow = (collateral_value × lltv) / LLTV_PRECISION
    let max_borrow_value = collateral_value_usd
        .checked_mul(market.lltv as u128)
        .ok_or(PelagoError::MathOverflow)?
        .checked_div(LLTV_PRECISION as u128)
        .ok_or(PelagoError::MathOverflow)?;

    msg!(
        "Health check: collateral_value={}, borrow_value={}, max_borrow={}, lltv={}",
        collateral_value_usd,
        borrow_value_usdc,
        max_borrow_value,
        market.lltv
    );

    // Validate health: borrow_value <= max_borrow_value
    require!(
        (borrow_value_usdc as u128) <= max_borrow_value,
        PelagoError::InsufficientCollateral
    );

    Ok(())
}

/// Event emitted on successful collateral withdrawal
#[event]
pub struct WithdrawCollateralEvent {
    /// Market public key
    pub market: Pubkey,

    /// User public key
    pub user: Pubkey,

    /// Receiver token account
    pub receiver: Pubkey,

    /// Assets withdrawn
    pub assets: u64,

    /// Remaining collateral in position
    pub remaining_collateral: u64,
}
