use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::PelagoError;
use crate::state::{Market, UserPosition};
use crate::utils::shares_math::{to_shares_down, to_assets_up};
use crate::utils::interest::accrue_interest;

/// Supply loan assets to the market
///
/// Deposits loan tokens (e.g., USDC) into the market and receives supply shares.
/// If this is the user's first supply, creates a UserPosition PDA account.
///
/// **P1 Enhancements:**
/// - Virtual shares mechanism (防止通胀攻击)
/// - Interest accrual before operation
/// - Uses SharesMathLib.toSharesDown for accurate conversion
///
/// **Pelago.sol Reference:** supply() function (L82-110)
/// - P1: Implements virtual shares with to_shares_down()
/// - Security: Prevents inflation attacks via VIRTUAL_SHARES = 1e6
#[derive(Accounts)]
pub struct Supply<'info> {
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

    /// User position PDA (created if first supply, otherwise loaded)
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

    /// Market's loan token vault (receives the deposit)
    #[account(
        mut,
        constraint = loan_vault.key() == market.loan_vault @ PelagoError::UninitializedMarket,
    )]
    pub loan_vault: Account<'info, TokenAccount>,

    /// User's loan token account (source of deposit)
    #[account(
        mut,
        constraint = user_token_account.mint == market.loan_token_mint @ PelagoError::UninitializedMarket,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// User wallet (signer)
    #[account(mut)]
    pub user: Signer<'info>,

    /// Solana system program (for PDA creation if needed)
    pub system_program: Program<'info, System>,

    /// SPL token program (for token transfer)
    pub token_program: Program<'info, Token>,
}

/// Handler for supply instruction
///
/// **Operation Flow:**
/// 1. Validate assets/shares mutual exclusivity (exactly one must be > 0)
/// 2. Accrue interest before calculation (P1)
/// 3. Initialize UserPosition if first supply (init_if_needed handles this)
/// 4. Convert between assets and shares using virtual shares mechanism
/// 5. Transfer loan tokens from user to market vault
/// 6. Update user_position.supply_shares
/// 7. Update market.total_supply_assets and market.total_supply_shares
///
/// **Dual-Parameter Mode (Pelago compatibility):**
/// - Mode 1: `assets > 0, shares = 0` → User specifies assets, calculate shares
/// - Mode 2: `assets = 0, shares > 0` → User specifies shares, calculate assets
///
/// **Share Calculation (P1):**
/// - If assets provided: `shares = toSharesDown(assets, totalAssets, totalShares)`
///   - Rounding DOWN: User receives slightly fewer shares → favors protocol
/// - If shares provided: `assets = toAssetsUp(shares, totalAssets, totalShares)`
///   - Rounding UP: User pays slightly more assets → favors protocol
///
/// **State Changes:**
/// - user_position.supply_shares += calculated_shares
/// - market.total_supply_assets += calculated_assets
/// - market.total_supply_shares += calculated_shares
/// - loan_vault.amount += calculated_assets (via token transfer)
///
/// **Error Cases:**
/// - InconsistentInput: Both or neither of (assets, shares) are non-zero
/// - MathOverflow: Share calculation overflow
/// - Insufficient user balance (handled by token program)
pub fn handler(
    ctx: Context<Supply>,
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
    // This ensures share conversion uses up-to-date totalSupplyAssets
    accrue_interest(market)?;

    // Step 3: Initialize user position fields if this is first interaction
    // (init_if_needed creates account but doesn't initialize fields)
    if user_position.user == Pubkey::default() {
        user_position.user = ctx.accounts.user.key();
        user_position.market = market.key();
        user_position.supply_shares = 0;
        user_position.borrow_shares = 0;
        user_position.collateral_amount = 0;
        user_position.bump = ctx.bumps.user_position;
    }

    // Step 4: Convert between assets and shares using virtual shares (P1)
    // Dual-parameter mode following Pelago design
    let (final_assets, final_shares) = if assets > 0 {
        // Mode 1: User specifies assets, calculate shares
        // Rounding DOWN: User receives fewer shares → favors protocol
        let s = to_shares_down(
            assets,
            market.total_supply_assets,
            market.total_supply_shares,
        )?;
        (assets, s)
    } else {
        // Mode 2: User specifies shares, calculate assets
        // Rounding UP: User pays more assets → favors protocol
        let a = to_assets_up(
            shares,
            market.total_supply_assets,
            market.total_supply_shares,
        )?;
        (a, shares)
    };

    msg!(
        "Supply calculation: assets={}, shares={}, total_assets={}, total_shares={}",
        final_assets,
        final_shares,
        market.total_supply_assets,
        market.total_supply_shares
    );

    // Step 5: Transfer loan tokens from user to market vault
    let transfer_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.loan_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
    );
    token::transfer(cpi_ctx, final_assets)?;

    // Step 6: Update user position
    user_position.supply_shares = user_position
        .supply_shares
        .checked_add(final_shares)
        .ok_or(PelagoError::MathOverflow)?;

    // Step 7: Update market totals
    market.total_supply_assets = market
        .total_supply_assets
        .checked_add(final_assets)
        .ok_or(PelagoError::MathOverflow)?;

    market.total_supply_shares = market
        .total_supply_shares
        .checked_add(final_shares)
        .ok_or(PelagoError::MathOverflow)?;

    msg!(
        "Supply success: user={}, assets={}, shares={}, user_total_shares={}, market_total_supply={}",
        user_position.user,
        final_assets,
        final_shares,
        user_position.supply_shares,
        market.total_supply_assets
    );

    // Emit event for off-chain tracking
    emit!(SupplyEvent {
        user: ctx.accounts.user.key(),
        assets: final_assets,
        shares: final_shares,
        total_supply_shares: market.total_supply_shares,
        total_supply_assets: market.total_supply_assets,
    });

    Ok(())
}

/// Event emitted on successful supply
#[event]
pub struct SupplyEvent {
    /// User public key (supplier)
    pub user: Pubkey,

    /// Assets supplied
    pub assets: u64,

    /// Shares received
    pub shares: u64,

    /// Total supply shares in market
    pub total_supply_shares: u64,

    /// Total supply assets in market
    pub total_supply_assets: u64,
}
