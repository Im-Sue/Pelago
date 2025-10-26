use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::{FIXED_ORACLE_PRICE, LLTV_PRECISION, PRICE_PRECISION};
use crate::error::PelagoError;
use crate::state::{Market, UserPosition};
use crate::utils::shares_math::{to_shares_up, to_assets_down, to_assets_up};
use crate::utils::interest::accrue_interest;

/// Borrow loan assets from the market
///
/// Borrows loan tokens against deposited collateral with health factor validation.
/// User must have sufficient collateral deposited to maintain healthy position.
///
/// **P1 Enhancements:**
/// - Virtual shares mechanism for borrows (防止份额操纵)
/// - Interest accrual before operation
/// - Uses SharesMathLib.toSharesUp for accurate conversion
/// - Health check uses virtual shares for precise debt calculation
///
/// **P1 Simplifications:**
/// - Fixed oracle price: 100 USDC/SOL (P2: Pyth/Switchboard integration)
///
/// **Pelago.sol Reference:** borrow() function (L195-223)
/// - P1: Implements virtual shares + interest accrual + enhanced health check
/// - Security: Rounding UP on borrow shares → conservative debt tracking
#[derive(Accounts)]
pub struct Borrow<'info> {
    /// Market account (must be initialized)
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

    /// User position PDA (must exist with collateral)
    #[account(
        mut,
        seeds = [
            UserPosition::SEED_PREFIX,
            market.key().as_ref(),
            user.key().as_ref(),
        ],
        bump = user_position.bump,
        constraint = user_position.user == user.key() @ PelagoError::Unauthorized,
    )]
    pub user_position: Account<'info, UserPosition>,

    /// Market's loan token vault (source of borrowed funds)
    #[account(
        mut,
        constraint = loan_vault.key() == market.loan_vault @ PelagoError::UninitializedMarket,
    )]
    pub loan_vault: Account<'info, TokenAccount>,

    /// User's loan token account (destination of borrowed funds)
    #[account(
        mut,
        constraint = user_token_account.mint == market.loan_token_mint @ PelagoError::UninitializedMarket,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// User wallet (signer)
    pub user: Signer<'info>,

    /// SPL token program (for token transfer)
    pub token_program: Program<'info, Token>,
}

/// Handler for borrow instruction
///
/// **Operation Flow:**
/// 1. Validate amount > 0
/// 2. Accrue interest before calculation (P1)
/// 3. Check market liquidity (available_liquidity >= amount)
/// 4. Calculate shares using virtual shares: to_shares_up(amount, totalBorrowAssets, totalBorrowShares)
/// 5. Update user and market borrow state
/// 6. Health check with virtual shares (uses to_assets_up for precise debt)
/// 7. Validate liquidity constraint
/// 8. Transfer loan tokens from vault to user (using market PDA as authority)
///
/// **Share Calculation (P1):**
/// - Uses virtual shares: `shares = ⌈(amount × (totalShares + 1e6)) / (totalAssets + 1)⌉`
/// - Rounding UP: Borrower gets more debt shares → conservative → favors protocol
///
/// **Health Factor Calculation (P1):**
/// ```
/// collateral_value_usd = collateral_amount × FIXED_ORACLE_PRICE / PRICE_PRECISION
/// borrow_value_usd = to_assets_up(user_borrow_shares, totalBorrowAssets, totalBorrowShares)
/// healthy = collateral_value_usd × lltv ≥ borrow_value_usd × LLTV_PRECISION
/// ```
///
/// **Example:**
/// - Collateral: 10 SOL (10_000_000_000 lamports)
/// - Price: 100 USDC/SOL (100_000_000 with precision)
/// - LLTV: 80% (80_000_000 with precision)
/// - Collateral Value: 10 × 100 = 1000 USDC
/// - Max Borrow: 1000 × 0.8 = 800 USDC
///
/// **Dual-Parameter Mode (Pelago compatibility):**
/// - Mode 1: `assets > 0, shares = 0` → User specifies assets, calculate shares
/// - Mode 2: `assets = 0, shares > 0` → User specifies shares, calculate assets
///
/// **State Changes:**
/// - user_position.borrow_shares += calculated_shares
/// - market.total_borrow_assets += calculated_assets
/// - market.total_borrow_shares += calculated_shares
/// - loan_vault.amount -= calculated_assets (via token transfer)
///
/// **Error Cases:**
/// - InconsistentInput: Both or neither of (assets, shares) are non-zero
/// - InsufficientLiquidity: available_liquidity < assets
/// - InsufficientCollateral: position becomes undercollateralized
/// - MathOverflow: Calculation overflow
pub fn handler(
    ctx: Context<Borrow>,
    assets: u64,
    shares: u64,
) -> Result<()> {
    // Step 1: Validate input mutual exclusivity
    // Exactly one of (assets, shares) must be non-zero (Pelago: exactlyOneZero)
    require!(
        (assets > 0 && shares == 0) || (assets == 0 && shares > 0),
        PelagoError::InconsistentInput
    );

    let market = &mut ctx.accounts.market;
    let user_position = &mut ctx.accounts.user_position;

    // Step 2: Accrue interest before any calculation (P1)
    // This ensures share conversion and health check use up-to-date values
    accrue_interest(market)?;

    // Step 3: Convert between assets and shares using virtual shares (P1)
    // Dual-parameter mode following Pelago design
    let (final_assets, final_shares) = if assets > 0 {
        // Mode 1: User specifies assets, calculate shares
        // Rounding UP: Borrower gets more debt shares → favors protocol
        let s = to_shares_up(
            assets,
            market.total_borrow_assets,
            market.total_borrow_shares,
        )?;
        (assets, s)
    } else {
        // Mode 2: User specifies shares, calculate assets
        // Rounding DOWN: Borrower receives fewer assets → favors protocol
        let a = to_assets_down(
            shares,
            market.total_borrow_assets,
            market.total_borrow_shares,
        )?;
        (a, shares)
    };

    msg!(
        "Borrow calculation: assets={}, shares={}, total_borrow_assets={}, total_borrow_shares={}",
        final_assets,
        final_shares,
        market.total_borrow_assets,
        market.total_borrow_shares
    );

    // Step 4: Check market liquidity
    let available_liquidity = market
        .total_supply_assets
        .checked_sub(market.total_borrow_assets)
        .ok_or(PelagoError::MathOverflow)?;

    require!(
        available_liquidity >= final_assets,
        PelagoError::InsufficientLiquidity
    );

    // Step 5: Update user position and market totals
    user_position.borrow_shares = user_position
        .borrow_shares
        .checked_add(final_shares)
        .ok_or(PelagoError::MathOverflow)?;

    market.total_borrow_assets = market
        .total_borrow_assets
        .checked_add(final_assets)
        .ok_or(PelagoError::MathOverflow)?;

    market.total_borrow_shares = market
        .total_borrow_shares
        .checked_add(final_shares)
        .ok_or(PelagoError::MathOverflow)?;

    // Step 6: Health check with virtual shares (P1)
    // Uses updated market state and to_assets_up for precise debt calculation
    check_health_p1(market, user_position)?;

    // Step 7: Validate liquidity constraint
    require!(
        market.total_borrow_assets <= market.total_supply_assets,
        PelagoError::InsufficientLiquidity
    );

    // Step 8: Transfer loan tokens from vault to user (PDA signs)
    let seeds = &[
        Market::SEED_PREFIX,
        market.loan_token_mint.as_ref(),
        market.collateral_token_mint.as_ref(),
        &[market.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let transfer_accounts = Transfer {
        from: ctx.accounts.loan_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: market.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, final_assets)?;

    msg!(
        "Borrow success: user={}, assets={}, shares={}, user_total_borrow_shares={}, market_total_borrow={}, collateral={}",
        user_position.user,
        final_assets,
        final_shares,
        user_position.borrow_shares,
        market.total_borrow_assets,
        user_position.collateral_amount
    );

    // Emit event for off-chain tracking
    emit!(BorrowEvent {
        user: ctx.accounts.user.key(),
        assets: final_assets,
        shares: final_shares,
        total_borrow_shares: market.total_borrow_shares,
        total_borrow_assets: market.total_borrow_assets,
    });

    Ok(())
}

/// P1 Health check using virtual shares
///
/// Validates that user position remains healthy after borrow operation.
/// Uses `to_assets_up` to convert borrow shares to assets (conservative rounding).
///
/// **P1 Health Formula:**
/// ```
/// collateral_value_usd = collateral_amount × FIXED_ORACLE_PRICE / PRICE_PRECISION
/// borrow_value_usd = to_assets_up(borrow_shares, totalBorrowAssets, totalBorrowShares)
/// healthy = collateral_value_usd × lltv ≥ borrow_value_usd × LLTV_PRECISION
/// ```
///
/// **Pelago.sol Reference:** _isHealthy() function (L425-462)
/// - P1: Uses virtual shares for accurate borrow value calculation
/// - Rounding UP on borrow value → conservative health check
///
/// **Parameters:**
/// - `market`: Market account (for oracle price, lltv, and total borrow state)
/// - `user_position`: User position (for collateral and borrow shares)
///
/// **Returns:**
/// - Ok(()) if position is healthy
/// - Err(InsufficientCollateral) if position is undercollateralized
fn check_health_p1(market: &Market, user_position: &UserPosition) -> Result<()> {
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
        "P1 Health check: collateral_value={}, borrow_value={}, max_borrow={}, lltv={}, user_borrow_shares={}",
        collateral_value_usd,
        borrow_value_usdc,
        max_borrow_value,
        market.lltv,
        user_position.borrow_shares
    );

    // Validate health: borrow_value <= max_borrow_value
    require!(
        (borrow_value_usdc as u128) <= max_borrow_value,
        PelagoError::InsufficientCollateral
    );

    Ok(())
}

/// Event emitted on successful borrow
#[event]
pub struct BorrowEvent {
    /// User public key (borrower)
    pub user: Pubkey,

    /// Assets borrowed
    pub assets: u64,

    /// Shares issued
    pub shares: u64,

    /// Total borrow shares in market
    pub total_borrow_shares: u64,

    /// Total borrow assets in market
    pub total_borrow_assets: u64,
}
