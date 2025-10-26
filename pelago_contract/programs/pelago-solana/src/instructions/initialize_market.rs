use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::MAX_LLTV;
use crate::error::PelagoError;
use crate::state::Market;

/// Initialize a new lending market with dual token vaults
///
/// This instruction creates:
/// 1. Market PDA account with lending parameters
/// 2. Loan token vault (for holding deposited loan assets)
/// 3. Collateral token vault (for holding deposited collateral assets)
///
/// **Design Decision:** Both vaults are created upfront during market initialization
/// rather than lazy initialization. This ensures:
/// - Clearer architecture with explicit vault lifecycle
/// - Simpler downstream instructions (no conditional vault creation)
/// - Consistent account structure across all markets
///
/// **Access Control:** Only the authority can initialize markets
#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    /// Market PDA account (to be initialized)
    /// Seeds: ["market", loan_token_mint, collateral_token_mint]
    #[account(
        init,
        payer = authority,
        space = Market::LEN,
        seeds = [
            Market::SEED_PREFIX,
            loan_token_mint.key().as_ref(),
            collateral_token_mint.key().as_ref(),
        ],
        bump
    )]
    pub market: Account<'info, Market>,

    /// Loan token mint (e.g., USDC)
    pub loan_token_mint: Account<'info, Mint>,

    /// Collateral token mint (e.g., SOL)
    pub collateral_token_mint: Account<'info, Mint>,

    /// Loan token vault (to be created)
    /// Token account owned by market PDA for holding loan assets
    #[account(
        init,
        payer = authority,
        token::mint = loan_token_mint,
        token::authority = market,
    )]
    pub loan_vault: Account<'info, TokenAccount>,

    /// Collateral token vault (to be created)
    /// Token account owned by market PDA for holding collateral assets
    #[account(
        init,
        payer = authority,
        token::mint = collateral_token_mint,
        token::authority = market,
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    /// Market authority (admin who can initialize and manage)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Solana system program
    pub system_program: Program<'info, System>,

    /// SPL token program
    pub token_program: Program<'info, Token>,

    /// Rent sysvar for rent-exempt calculations
    pub rent: Sysvar<'info, Rent>,
}

/// Handler for initialize_market instruction
///
/// **Validation:**
/// - LLTV must be > 0 and <= 100% (MAX_LLTV)
/// - Loan and collateral mints must be valid SPL tokens
/// - Authority must sign the transaction
///
/// **State Changes:**
/// - Creates Market account with initial values (all zeros except lltv)
/// - Creates loan_vault token account (owned by market PDA)
/// - Creates collateral_vault token account (owned by market PDA)
/// - Sets last_update to current timestamp
///
/// **P0 Behavior:**
/// - No interest accrual setup (last_update is informational only)
/// - No oracle integration (uses fixed price in borrow instruction)
pub fn handler(ctx: Context<InitializeMarket>, lltv: u64) -> Result<()> {
    // Validate LLTV parameter
    require!(lltv > 0 && lltv <= MAX_LLTV, PelagoError::InvalidLltv);

    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Initialize market state
    market.authority = ctx.accounts.authority.key();
    market.loan_token_mint = ctx.accounts.loan_token_mint.key();
    market.collateral_token_mint = ctx.accounts.collateral_token_mint.key();
    market.loan_vault = ctx.accounts.loan_vault.key();
    market.collateral_vault = ctx.accounts.collateral_vault.key();

    // Initialize supply and borrow totals (all zeros)
    market.total_supply_assets = 0;
    market.total_supply_shares = 0;
    market.total_borrow_assets = 0;
    market.total_borrow_shares = 0;

    // Set LLTV and timestamp
    market.lltv = lltv;
    market.last_update = clock.unix_timestamp;
    market.bump = ctx.bumps.market;

    msg!(
        "Market initialized: loan_mint={}, collateral_mint={}, lltv={}",
        market.loan_token_mint,
        market.collateral_token_mint,
        market.lltv
    );

    Ok(())
}
