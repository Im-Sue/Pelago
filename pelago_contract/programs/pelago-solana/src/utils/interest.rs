//! Interest Accrual Module
//!
//! This module implements simplified interest accrual for P1 phase migration.
//! Calculates and applies linear interest to borrow and supply assets over time.
//!
//! **P1 Simplifications:**
//! - Fixed annual interest rate: 5% (0.05)
//! - Linear interest calculation (not compound/Taylor series)
//! - Simple formula: `interest = principal × rate × time`
//! - No fee mechanism (all interest goes to suppliers)
//!
//! **P2 Future Enhancements:**
//! - Dynamic Interest Rate Models (IRM)
//! - Taylor series compound interest (wTaylorCompounded)
//! - Fee distribution to protocol treasury
//! - Multiple IRM strategies per market
//!
//! **Reference:** Pelago.sol _accrueInterest() (L481-509)

use anchor_lang::prelude::*;
use crate::error::PelagoError;
use crate::state::Market;

/// Fixed annual interest rate for P1 phase
///
/// Rate: 5% per year = 0.05
/// Precision: 1e18 (WAD precision matching Solidity)
/// Value: 50_000_000_000_000_000 = 0.05 × 10^18
///
/// **Calculation:**
/// - Annual rate: 5%
/// - Per-second rate: 5% / (365.25 × 24 × 60 × 60) ≈ 1.585489599188230×10⁻⁹
pub const FIXED_ANNUAL_RATE_WAD: u128 = 50_000_000_000_000_000; // 0.05 in WAD

/// Precision constant (18 decimals)
/// Used for fixed-point arithmetic to match Solidity WAD standard
pub const WAD: u128 = 1_000_000_000_000_000_000; // 1e18

/// Seconds per year (accounting for leap years)
/// 365.25 days × 24 hours × 60 minutes × 60 seconds = 31,557,600 seconds
pub const SECONDS_PER_YEAR: u128 = 31_557_600;

/// Accrues interest for a market based on elapsed time since last update
///
/// **Operation Flow:**
/// 1. Calculate elapsed time since last_update
/// 2. If elapsed == 0, return early (no time passed)
/// 3. Calculate linear interest: `interest = totalBorrow × rate × time`
/// 4. Update totalBorrowAssets (borrowers owe more)
/// 5. Update totalSupplyAssets (suppliers earn more)
/// 6. Update last_update timestamp
/// 7. Emit AccrueInterestEvent
///
/// **Interest Distribution:**
/// - All interest goes to suppliers (P1 has no fees)
/// - totalSupplyAssets increases by same amount as totalBorrowAssets
/// - This maintains the invariant: `totalBorrowAssets ≤ totalSupplyAssets`
///
/// **Linear Interest Formula:**
/// ```ignore
/// rate_per_second = FIXED_ANNUAL_RATE / SECONDS_PER_YEAR
/// interest = (totalBorrow × rate_per_second × elapsed) / WAD
/// ```
///
/// **Parameters:**
/// - `market`: Mutable reference to Market account
///
/// **State Changes:**
/// - `market.total_borrow_assets` += interest
/// - `market.total_supply_assets` += interest
/// - `market.last_update` = current_timestamp
///
/// **Errors:**
/// - MathOverflow: If interest calculation overflows
/// - ClockUnavailable: If Solana clock sysvar is unavailable
///
/// **Gas Optimization (P2):**
/// - Current: Called on every borrow/withdraw/repay operation
/// - Future: Consider batching or lazy accrual for gas savings
pub fn accrue_interest(market: &mut Market) -> Result<()> {
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp;

    // Calculate elapsed time in seconds
    let elapsed = current_timestamp
        .checked_sub(market.last_update)
        .ok_or(PelagoError::InvalidTimestamp)?;

    // Early return if no time has passed (prevents redundant calculations)
    if elapsed == 0 {
        return Ok(());
    }

    // Ensure elapsed is positive (clock should never go backwards)
    if elapsed < 0 {
        return err!(PelagoError::InvalidTimestamp);
    }

    let elapsed_u128 = elapsed as u128;

    // Calculate per-second interest rate
    // rate_per_second = annual_rate / seconds_per_year
    let rate_per_second = FIXED_ANNUAL_RATE_WAD
        .checked_div(SECONDS_PER_YEAR)
        .ok_or(PelagoError::MathOverflow)?;

    // Calculate interest
    // interest = (total_borrow × rate_per_second × elapsed) / WAD
    let total_borrow_u128 = market.total_borrow_assets as u128;

    let interest = total_borrow_u128
        .checked_mul(rate_per_second)
        .ok_or(PelagoError::MathOverflow)?
        .checked_mul(elapsed_u128)
        .ok_or(PelagoError::MathOverflow)?
        .checked_div(WAD)
        .ok_or(PelagoError::MathOverflow)?;

    // Convert interest back to u64
    let interest_u64 = u64::try_from(interest)
        .map_err(|_| PelagoError::MathOverflow)?;

    // Update market state
    // Note: Both borrow and supply assets increase by the same amount
    market.total_borrow_assets = market
        .total_borrow_assets
        .checked_add(interest_u64)
        .ok_or(PelagoError::MathOverflow)?;

    market.total_supply_assets = market
        .total_supply_assets
        .checked_add(interest_u64)
        .ok_or(PelagoError::MathOverflow)?;

    // Update timestamp
    market.last_update = current_timestamp;

    // Emit event for off-chain tracking
    // Note: market pubkey is not available here since we only have &mut Market
    // Off-chain indexers can derive it from the transaction context
    emit!(AccrueInterestEvent {
        interest: interest_u64,
        total_borrow_assets: market.total_borrow_assets,
        total_supply_assets: market.total_supply_assets,
        elapsed_seconds: elapsed,
        timestamp: current_timestamp,
    });

    msg!(
        "Interest accrued: interest={}, elapsed={}s, new_borrow={}, new_supply={}",
        interest_u64,
        elapsed,
        market.total_borrow_assets,
        market.total_supply_assets
    );

    Ok(())
}

/// Event emitted when interest is accrued
///
/// Off-chain indexers can track:
/// - Interest accumulation over time
/// - Effective APY calculation
/// - Market growth metrics
///
/// Note: Market pubkey can be derived from transaction context
#[event]
pub struct AccrueInterestEvent {
    /// Interest amount accrued (in loan token base units)
    pub interest: u64,

    /// New total borrow assets after accrual
    pub total_borrow_assets: u64,

    /// New total supply assets after accrual
    pub total_supply_assets: u64,

    /// Elapsed time since last accrual (seconds)
    pub elapsed_seconds: i64,

    /// Current timestamp after accrual
    pub timestamp: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_interest_rate_calculation() {
        // Verify the per-second rate is reasonable
        let rate_per_second = FIXED_ANNUAL_RATE_WAD / SECONDS_PER_YEAR;

        // Expected: 0.05 / 31,557,600 ≈ 1.585×10⁻⁹ (in WAD)
        // In WAD terms: ≈ 1,585,489,599 (approximately)
        assert!(rate_per_second > 0);
        assert!(rate_per_second < FIXED_ANNUAL_RATE_WAD); // Should be much smaller
    }

    #[test]
    fn test_annual_interest_approximation() {
        // Simulate 1 year of interest on 100,000 tokens
        let principal = 100_000u128;
        let rate_per_second = FIXED_ANNUAL_RATE_WAD / SECONDS_PER_YEAR;
        let one_year_seconds = SECONDS_PER_YEAR;

        let interest = (principal * rate_per_second * one_year_seconds) / WAD;

        // Expected: 100,000 × 0.05 = 5,000 tokens
        // Allow small rounding error
        assert!(interest >= 4_999 && interest <= 5_001);
    }

    #[test]
    fn test_zero_elapsed_time() {
        // Interest should be 0 if no time elapsed
        let principal = 100_000u128;
        let rate_per_second = FIXED_ANNUAL_RATE_WAD / SECONDS_PER_YEAR;
        let elapsed = 0u128;

        let interest = (principal * rate_per_second * elapsed) / WAD;
        assert_eq!(interest, 0);
    }
}
