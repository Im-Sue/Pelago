//! Withdraw Instruction
//!
//! Allows suppliers to withdraw loan assets from the market by burning supply shares.
//! Supports two modes:
//! 1. Withdraw exact assets amount (calculates required shares to burn)
//! 2. Withdraw by burning exact shares amount (calculates assets received)
//!
//! **P1 Enhancements:**
//! - Uses virtual shares mechanism (SharesMathLib)
//! - Accrues interest before withdrawal
//! - Validates liquidity constraints
//!
//! **Pelago.sol Reference:** withdraw() function (L200-230)

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::PelagoError;
use crate::state::{Market, UserPosition};
use crate::utils::shares_math::{to_shares_up, to_assets_down};
use crate::utils::interest::accrue_interest;

/// Withdraw loan assets from the market
///
/// Burns supply shares and transfers loan tokens to receiver.
/// Must maintain liquidity constraint: totalBorrowAssets ≤ totalSupplyAssets
///
/// **Operation Modes:**
/// - `assets > 0, shares = 0`: Withdraw exact asset amount
/// - `assets = 0, shares > 0`: Burn exact share amount
///
/// **State Changes:**
/// - `user_position.supply_shares` -= calculated_shares
/// - `market.total_supply_shares` -= calculated_shares
/// - `market.total_supply_assets` -= calculated_assets
/// - `loan_vault.amount` -= calculated_assets (via transfer)
///
/// **Validation:**
/// - Exactly one of (assets, shares) must be non-zero
/// - Receiver must be non-zero address
/// - User must have sufficient supply shares
/// - Must maintain liquidity: totalBorrow ≤ totalSupply after withdrawal
#[derive(Accounts)]
pub struct Withdraw<'info> {
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

    /// User wallet (signer, authority for withdrawal)
    #[account(mut)]
    pub user: Signer<'info>,

    /// Receiver token account (can be user's own or different account)
    /// CHECK: Validated via token transfer
    #[account(mut)]
    pub receiver_token_account: Account<'info, TokenAccount>,

    /// Market's loan token vault (source of withdrawal)
    #[account(
        mut,
        constraint = loan_vault.key() == market.loan_vault @ PelagoError::InvalidVault,
    )]
    pub loan_vault: Account<'info, TokenAccount>,

    /// SPL token program
    pub token_program: Program<'info, Token>,
}

/// Handler for withdraw instruction
///
/// **Processing Steps:**
/// 1. Validate input parameters (mutual exclusivity of assets/shares)
/// 2. Accrue interest to update market state
/// 3. Convert between assets and shares using virtual shares
/// 4. Update user position and market totals
/// 5. Validate liquidity constraint
/// 6. Transfer tokens from vault to receiver
///
/// **Share Calculation:**
/// - If assets provided: `shares = to_shares_up(assets, totalSupplyAssets, totalSupplyShares)`
///   - Rounding UP: User burns more shares → favors protocol
/// - If shares provided: `assets = to_assets_down(shares, totalSupplyAssets, totalSupplyShares)`
///   - Rounding DOWN: User receives fewer assets → favors protocol
///
/// **Errors:**
/// - InconsistentInput: Both or neither of (assets, shares) are non-zero
/// - InsufficientSupply: User doesn't have enough supply shares
/// - InsufficientLiquidity: Withdrawal would violate totalBorrow ≤ totalSupply
/// - MathOverflow: Calculation overflow
pub fn handler(
    ctx: Context<Withdraw>,
    assets: u64,
    shares: u64,
) -> Result<()> {
    // Step 1: Validate input mutual exclusivity
    require!(
        (assets > 0 && shares == 0) || (assets == 0 && shares > 0),
        PelagoError::InconsistentInput
    );

    let market = &mut ctx.accounts.market;
    let user_position = &mut ctx.accounts.user_position;

    // Step 2: Accrue interest before any calculation
    accrue_interest(market)?;

    // Step 3: Convert between assets and shares using virtual shares
    let (final_assets, final_shares) = if assets > 0 {
        // User specifies assets to withdraw
        // Calculate shares to burn (rounding UP to favor protocol)
        let s = to_shares_up(
            assets,
            market.total_supply_assets,
            market.total_supply_shares,
        )?;
        (assets, s)
    } else {
        // User specifies shares to burn
        // Calculate assets to receive (rounding DOWN to favor protocol)
        let a = to_assets_down(
            shares,
            market.total_supply_assets,
            market.total_supply_shares,
        )?;
        (a, shares)
    };

    msg!(
        "Withdraw calculation: assets={}, shares={}, user_shares={}",
        final_assets,
        final_shares,
        user_position.supply_shares
    );

    // Step 4: Update user position and market totals
    user_position.supply_shares = user_position
        .supply_shares
        .checked_sub(final_shares)
        .ok_or(PelagoError::InsufficientSupply)?;

    market.total_supply_shares = market
        .total_supply_shares
        .checked_sub(final_shares)
        .ok_or(PelagoError::MathOverflow)?;

    market.total_supply_assets = market
        .total_supply_assets
        .checked_sub(final_assets)
        .ok_or(PelagoError::MathOverflow)?;

    // Step 5: Validate liquidity constraint
    // Invariant: totalBorrowAssets ≤ totalSupplyAssets
    // This ensures there's always enough liquidity to cover all borrows
    require!(
        market.total_borrow_assets <= market.total_supply_assets,
        PelagoError::InsufficientLiquidity
    );

    // Step 6: Transfer tokens from vault to receiver
    // Use PDA signer (market authority) to authorize transfer from vault
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
        from: ctx.accounts.loan_vault.to_account_info(),
        to: ctx.accounts.receiver_token_account.to_account_info(),
        authority: market.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer_seeds,
    );

    token::transfer(cpi_ctx, final_assets)?;

    msg!(
        "Withdraw success: user={}, assets={}, shares={}, remaining_shares={}, new_total_supply={}",
        user_position.user,
        final_assets,
        final_shares,
        user_position.supply_shares,
        market.total_supply_assets
    );

    // Emit event for off-chain tracking
    emit!(WithdrawEvent {
        market: market.key(),
        user: ctx.accounts.user.key(),
        receiver: ctx.accounts.receiver_token_account.key(),
        assets: final_assets,
        shares: final_shares,
        total_supply_assets: market.total_supply_assets,
        total_supply_shares: market.total_supply_shares,
    });

    Ok(())
}

/// Event emitted on successful withdrawal
#[event]
pub struct WithdrawEvent {
    /// Market public key
    pub market: Pubkey,

    /// User public key (withdrawer)
    pub user: Pubkey,

    /// Receiver token account
    pub receiver: Pubkey,

    /// Assets withdrawn
    pub assets: u64,

    /// Shares burned
    pub shares: u64,

    /// Remaining total supply assets in market
    pub total_supply_assets: u64,

    /// Remaining total supply shares in market
    pub total_supply_shares: u64,
}
