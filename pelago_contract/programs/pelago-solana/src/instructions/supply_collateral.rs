use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::PelagoError;
use crate::state::{Market, UserPosition};

/// Supply collateral assets to the market
///
/// Deposits collateral tokens (e.g., SOL) into the market to back borrowing.
/// If this is the user's first interaction, creates a UserPosition PDA account.
///
/// **P0 Simplification:**
/// - Direct collateral amount tracking (no virtual shares for collateral)
/// - No interest accrual before operation
///
/// **Pelago.sol Reference:** supplyCollateral() function (L132-147)
/// - Original: Direct collateral tracking without shares
/// - P0: Same behavior (no simplification needed)
#[derive(Accounts)]
pub struct SupplyCollateral<'info> {
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

    /// User position PDA (created if first interaction, otherwise loaded)
    #[account(
        init_if_needed,
        payer = user,
        space = UserPosition::LEN,
        seeds = [
            UserPosition::SEED_PREFIX,
            market.key().as_ref(),
            user.key().as_ref(),
        ],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    /// Market's collateral token vault (receives the deposit)
    #[account(
        mut,
        constraint = collateral_vault.key() == market.collateral_vault @ PelagoError::UninitializedMarket,
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    /// User's collateral token account (source of deposit)
    #[account(
        mut,
        constraint = user_collateral_account.mint == market.collateral_token_mint @ PelagoError::UninitializedMarket,
    )]
    pub user_collateral_account: Account<'info, TokenAccount>,

    /// User wallet (signer)
    #[account(mut)]
    pub user: Signer<'info>,

    /// Solana system program (for PDA creation if needed)
    pub system_program: Program<'info, System>,

    /// SPL token program (for token transfer)
    pub token_program: Program<'info, Token>,
}

/// Handler for supply_collateral instruction
///
/// **Operation Flow:**
/// 1. Validate amount > 0
/// 2. Initialize UserPosition if first interaction (init_if_needed handles this)
/// 3. Transfer collateral tokens from user to market vault
/// 4. Update user_position.collateral_amount
///
/// **State Changes:**
/// - user_position.collateral_amount += amount
/// - collateral_vault.amount += amount (via token transfer)
///
/// **Note:** Unlike supply/borrow, collateral doesn't affect market totals
/// because it's tracked per-user only. The market doesn't need to know
/// total collateral for P0 operations.
///
/// **Error Cases:**
/// - ZeroAmount: amount == 0
/// - Insufficient user balance (handled by token program)
pub fn handler(ctx: Context<SupplyCollateral>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, PelagoError::ZeroAmount);

    let market = &ctx.accounts.market;
    let user_position = &mut ctx.accounts.user_position;

    // Initialize user position fields if this is first interaction
    // (init_if_needed creates account but doesn't initialize fields)
    if user_position.user == Pubkey::default() {
        user_position.user = ctx.accounts.user.key();
        user_position.market = market.key();
        user_position.supply_shares = 0;
        user_position.borrow_shares = 0;
        user_position.collateral_amount = 0;
        user_position.bump = ctx.bumps.user_position;
    }

    // Transfer collateral tokens from user to market vault
    let transfer_accounts = Transfer {
        from: ctx.accounts.user_collateral_account.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
    );
    token::transfer(cpi_ctx, amount)?;

    // Update user position collateral
    user_position.collateral_amount = user_position
        .collateral_amount
        .checked_add(amount)
        .ok_or(PelagoError::MathOverflow)?;

    msg!(
        "SupplyCollateral: user={}, amount={}, total_collateral={}",
        user_position.user,
        amount,
        user_position.collateral_amount
    );

    Ok(())
}
