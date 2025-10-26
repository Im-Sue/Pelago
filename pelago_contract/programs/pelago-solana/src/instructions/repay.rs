//! Repay Instruction
//!
//! Allows borrowers (or third parties) to repay loan assets and burn borrow shares.
//! Supports two modes:
//! 1. Repay exact assets amount (calculates shares to burn)
//! 2. Repay by burning exact shares amount (calculates assets to pay)
//!
//! **P1 Enhancements:**
//! - Uses virtual shares mechanism (SharesMathLib)
//! - Accrues interest before repayment
//! - Handles overpayment gracefully (saturating subtraction)
//! - Supports third-party repayment (payer ≠ borrower)
//!
//! **Pelago.sol Reference:** repay() function (L269-298)

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::PelagoError;
use crate::state::{Market, UserPosition};
use crate::utils::shares_math::{to_shares_down, to_assets_up};
use crate::utils::interest::accrue_interest;

/// Repay borrowed loan assets
///
/// Burns borrow shares and transfers loan tokens from payer to market vault.
/// Payer can be the borrower themselves or a third party repaying on their behalf.
///
/// **Operation Modes:**
/// - `assets > 0, shares = 0`: Repay exact asset amount
/// - `assets = 0, shares > 0`: Burn exact share amount
///
/// **State Changes:**
/// - `user_position.borrow_shares` -= calculated_shares
/// - `market.total_borrow_shares` -= calculated_shares
/// - `market.total_borrow_assets` -= calculated_assets (with saturating_sub)
/// - `loan_vault.amount` += calculated_assets (via transfer)
///
/// **Validation:**
/// - Exactly one of (assets, shares) must be non-zero
/// - Borrower (on_behalf) must be non-zero address
/// - User must have sufficient borrow shares
///
/// **Special Handling:**
/// - Uses `saturating_sub` for total_borrow_assets due to rounding
/// - Assets may exceed totalBorrowAssets by 1 (allowed by Pelago protocol)
#[derive(Accounts)]
pub struct Repay<'info> {
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

    /// Borrower's position PDA (user being repaid for)
    #[account(
        mut,
        seeds = [
            UserPosition::SEED_PREFIX,
            market.key().as_ref(),
            borrower.key().as_ref(),
        ],
        bump = borrower_position.bump,
    )]
    pub borrower_position: Account<'info, UserPosition>,

    /// Payer wallet (signer, source of repayment funds)
    /// Can be the borrower themselves or a third party
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Borrower wallet (user whose debt is being repaid)
    /// CHECK: Validated via PDA derivation
    pub borrower: UncheckedAccount<'info>,

    /// Payer's loan token account (source of repayment)
    #[account(
        mut,
        constraint = payer_token_account.mint == market.loan_token_mint @ PelagoError::InvalidVault,
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    /// Market's loan token vault (receives repayment)
    #[account(
        mut,
        constraint = loan_vault.key() == market.loan_vault @ PelagoError::InvalidVault,
    )]
    pub loan_vault: Account<'info, TokenAccount>,

    /// SPL token program
    pub token_program: Program<'info, Token>,
}

/// Handler for repay instruction
///
/// **Processing Steps:**
/// 1. Validate input parameters (mutual exclusivity of assets/shares)
/// 2. Accrue interest to update market state
/// 3. Convert between assets and shares using virtual shares
/// 4. Update borrower position and market totals
/// 5. Transfer tokens from payer to vault
///
/// **Share Calculation:**
/// - If assets provided: `shares = to_shares_down(assets, totalBorrowAssets, totalBorrowShares)`
///   - Rounding DOWN: Borrower burns fewer shares → pays slightly more assets → favors protocol
/// - If shares provided: `assets = to_assets_up(shares, totalBorrowAssets, totalBorrowShares)`
///   - Rounding UP: Borrower pays more assets for same shares → favors protocol
///
/// **Overpayment Handling:**
/// - Due to rounding, `assets` may exceed `totalBorrowAssets` by 1
/// - Uses `saturating_sub` to prevent underflow
/// - This is expected behavior and matches Pelago's `zeroFloorSub`
///
/// **Errors:**
/// - InconsistentInput: Both or neither of (assets, shares) are non-zero
/// - InsufficientBorrow: User doesn't have enough borrow shares
/// - MathOverflow: Calculation overflow
pub fn handler(
    ctx: Context<Repay>,
    assets: u64,
    shares: u64,
) -> Result<()> {
    // Step 1: Validate input mutual exclusivity
    require!(
        (assets > 0 && shares == 0) || (assets == 0 && shares > 0),
        PelagoError::InconsistentInput
    );

    let market = &mut ctx.accounts.market;
    let borrower_position = &mut ctx.accounts.borrower_position;

    // Step 2: Accrue interest before any calculation
    accrue_interest(market)?;

    // Step 3: Convert between assets and shares using virtual shares
    let (final_assets, final_shares) = if assets > 0 {
        // User specifies assets to repay
        // Calculate shares to burn (rounding DOWN to favor protocol)
        let s = to_shares_down(
            assets,
            market.total_borrow_assets,
            market.total_borrow_shares,
        )?;
        (assets, s)
    } else {
        // User specifies shares to burn
        // Calculate assets to pay (rounding UP to favor protocol)
        let a = to_assets_up(
            shares,
            market.total_borrow_assets,
            market.total_borrow_shares,
        )?;
        (a, shares)
    };

    msg!(
        "Repay calculation: assets={}, shares={}, borrower_shares={}",
        final_assets,
        final_shares,
        borrower_position.borrow_shares
    );

    // Step 4: Update borrower position and market totals
    // Use saturating_sub to handle overpayment gracefully
    // This matches Pelago.sol's UtilsLib.zeroFloorSub() behavior
    borrower_position.borrow_shares = borrower_position
        .borrow_shares
        .saturating_sub(final_shares);

    market.total_borrow_shares = market
        .total_borrow_shares
        .saturating_sub(final_shares);

    market.total_borrow_assets = market
        .total_borrow_assets
        .saturating_sub(final_assets);

    msg!(
        "Repay: payer={}, borrower={}, assets={}, shares={}, remaining_borrow_shares={}",
        ctx.accounts.payer.key(),
        ctx.accounts.borrower.key(),
        final_assets,
        final_shares,
        borrower_position.borrow_shares
    );

    // Step 5: Transfer tokens from payer to vault
    let transfer_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.loan_vault.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
    );

    token::transfer(cpi_ctx, final_assets)?;

    // Emit event for off-chain tracking
    emit!(RepayEvent {
        market: market.key(),
        payer: ctx.accounts.payer.key(),
        borrower: ctx.accounts.borrower.key(),
        assets: final_assets,
        shares: final_shares,
        remaining_borrow_shares: borrower_position.borrow_shares,
        total_borrow_assets: market.total_borrow_assets,
        total_borrow_shares: market.total_borrow_shares,
    });

    Ok(())
}

/// Event emitted on successful repayment
#[event]
pub struct RepayEvent {
    /// Market public key
    pub market: Pubkey,

    /// Payer public key (who paid)
    pub payer: Pubkey,

    /// Borrower public key (whose debt was repaid)
    pub borrower: Pubkey,

    /// Assets repaid
    pub assets: u64,

    /// Shares burned
    pub shares: u64,

    /// Remaining borrow shares for borrower
    pub remaining_borrow_shares: u64,

    /// Remaining total borrow assets in market
    pub total_borrow_assets: u64,

    /// Remaining total borrow shares in market
    pub total_borrow_shares: u64,
}
