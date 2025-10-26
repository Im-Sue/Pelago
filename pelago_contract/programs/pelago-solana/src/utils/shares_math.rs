//! Virtual Shares Math Library
//!
//! This module implements the virtual shares mechanism from Pelago's SharesMathLib.sol.
//! Virtual shares prevent share price manipulation attacks (inflation attacks) by introducing
//! virtual offsets in share/asset conversion calculations.
//!
//! **Security Mechanism:**
//! - VIRTUAL_SHARES = 1,000,000 (1e6): Virtual share offset
//! - VIRTUAL_ASSETS = 1: Virtual asset offset
//!
//! These constants ensure that:
//! 1. First depositor cannot manipulate share price via direct transfers
//! 2. Small deposits don't lose value due to rounding errors
//! 3. Attack cost (≈1B tokens) far exceeds potential gains
//!
//! **Reference:** SharesMathLib.sol (Pelago)
//! **OpenZeppelin Documentation:** https://docs.openzeppelin.com/contracts/4.x/erc4626#inflation-attack

use anchor_lang::prelude::*;
use crate::error::PelagoError;

/// Virtual shares offset constant
///
/// Set to 1e6 to balance:
/// - Attack prevention: Requires ~1B tokens to manipulate share price
/// - Precision preservation: Small deposits receive reasonable share amounts
/// - Overflow safety: Low enough to prevent u128 multiplication overflows
pub const VIRTUAL_SHARES: u128 = 1_000_000;

/// Virtual assets offset constant
///
/// Set to 1 to establish initial share-to-asset conversion rate
pub const VIRTUAL_ASSETS: u128 = 1;

/// Converts assets to shares with rounding down
///
/// Formula: `shares = (assets × (totalShares + VIRTUAL_SHARES)) / (totalAssets + VIRTUAL_ASSETS)`
///
/// **Rounding Direction:** DOWN
/// - Used in: supply, repay (favors protocol)
/// - Effect: User receives slightly fewer shares → protocol gains dust amounts
///
/// **Parameters:**
/// - `assets`: Amount of assets to convert
/// - `total_assets`: Current total assets in market
/// - `total_shares`: Current total shares issued
///
/// **Returns:** Calculated shares (rounded down)
///
/// **Errors:**
/// - MathOverflow: If intermediate calculation exceeds u128::MAX
///
/// **Example:**
/// ```ignore
/// // Empty market: First deposit of 1000 tokens
/// let shares = to_shares_down(1000, 0, 0)?;
/// // shares = (1000 × 1_000_000) / 1 = 1_000_000_000
/// ```
pub fn to_shares_down(
    assets: u64,
    total_assets: u64,
    total_shares: u64,
) -> Result<u64> {
    let assets_u128 = assets as u128;
    let total_assets_u128 = (total_assets as u128)
        .checked_add(VIRTUAL_ASSETS)
        .ok_or(PelagoError::MathOverflow)?;
    let total_shares_u128 = (total_shares as u128)
        .checked_add(VIRTUAL_SHARES)
        .ok_or(PelagoError::MathOverflow)?;

    // Calculate: (assets × (totalShares + VIRTUAL_SHARES)) / (totalAssets + VIRTUAL_ASSETS)
    let numerator = assets_u128
        .checked_mul(total_shares_u128)
        .ok_or(PelagoError::MathOverflow)?;

    let shares = numerator / total_assets_u128; // Rounding down via integer division

    // Safely convert back to u64
    u64::try_from(shares).map_err(|_| PelagoError::MathOverflow.into())
}

/// Converts assets to shares with rounding up
///
/// Formula: `shares = ⌈(assets × (totalShares + VIRTUAL_SHARES)) / (totalAssets + VIRTUAL_ASSETS)⌉`
///
/// **Rounding Direction:** UP
/// - Used in: borrow, withdraw (favors protocol)
/// - Effect: User receives slightly more debt shares or burns more supply shares
///
/// **Parameters:**
/// - `assets`: Amount of assets to convert
/// - `total_assets`: Current total assets in market
/// - `total_shares`: Current total shares issued
///
/// **Returns:** Calculated shares (rounded up)
///
/// **Errors:**
/// - MathOverflow: If intermediate calculation exceeds u128::MAX
pub fn to_shares_up(
    assets: u64,
    total_assets: u64,
    total_shares: u64,
) -> Result<u64> {
    let assets_u128 = assets as u128;
    let total_assets_u128 = (total_assets as u128)
        .checked_add(VIRTUAL_ASSETS)
        .ok_or(PelagoError::MathOverflow)?;
    let total_shares_u128 = (total_shares as u128)
        .checked_add(VIRTUAL_SHARES)
        .ok_or(PelagoError::MathOverflow)?;

    let numerator = assets_u128
        .checked_mul(total_shares_u128)
        .ok_or(PelagoError::MathOverflow)?;

    // Rounding up: (numerator + denominator - 1) / denominator
    let shares = numerator
        .checked_add(total_assets_u128 - 1)
        .ok_or(PelagoError::MathOverflow)?
        / total_assets_u128;

    u64::try_from(shares).map_err(|_| PelagoError::MathOverflow.into())
}

/// Converts shares to assets with rounding down
///
/// Formula: `assets = (shares × (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES)`
///
/// **Rounding Direction:** DOWN
/// - Used in: borrow, withdraw (favors protocol)
/// - Effect: User receives slightly fewer assets → protocol retains dust amounts
///
/// **Parameters:**
/// - `shares`: Amount of shares to convert
/// - `total_assets`: Current total assets in market
/// - `total_shares`: Current total shares issued
///
/// **Returns:** Calculated assets (rounded down)
///
/// **Errors:**
/// - MathOverflow: If intermediate calculation exceeds u128::MAX
pub fn to_assets_down(
    shares: u64,
    total_assets: u64,
    total_shares: u64,
) -> Result<u64> {
    let shares_u128 = shares as u128;
    let total_assets_u128 = (total_assets as u128)
        .checked_add(VIRTUAL_ASSETS)
        .ok_or(PelagoError::MathOverflow)?;
    let total_shares_u128 = (total_shares as u128)
        .checked_add(VIRTUAL_SHARES)
        .ok_or(PelagoError::MathOverflow)?;

    let numerator = shares_u128
        .checked_mul(total_assets_u128)
        .ok_or(PelagoError::MathOverflow)?;

    let assets = numerator / total_shares_u128; // Rounding down

    u64::try_from(assets).map_err(|_| PelagoError::MathOverflow.into())
}

/// Converts shares to assets with rounding up
///
/// Formula: `assets = ⌈(shares × (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES)⌉`
///
/// **Rounding Direction:** UP
/// - Used in: supply, repay, health checks (favors protocol)
/// - Effect: User pays slightly more assets or health check is more conservative
///
/// **Parameters:**
/// - `shares`: Amount of shares to convert
/// - `total_assets`: Current total assets in market
/// - `total_shares`: Current total shares issued
///
/// **Returns:** Calculated assets (rounded up)
///
/// **Errors:**
/// - MathOverflow: If intermediate calculation exceeds u128::MAX
pub fn to_assets_up(
    shares: u64,
    total_assets: u64,
    total_shares: u64,
) -> Result<u64> {
    let shares_u128 = shares as u128;
    let total_assets_u128 = (total_assets as u128)
        .checked_add(VIRTUAL_ASSETS)
        .ok_or(PelagoError::MathOverflow)?;
    let total_shares_u128 = (total_shares as u128)
        .checked_add(VIRTUAL_SHARES)
        .ok_or(PelagoError::MathOverflow)?;

    let numerator = shares_u128
        .checked_mul(total_assets_u128)
        .ok_or(PelagoError::MathOverflow)?;

    // Rounding up
    let assets = numerator
        .checked_add(total_shares_u128 - 1)
        .ok_or(PelagoError::MathOverflow)?
        / total_shares_u128;

    u64::try_from(assets).map_err(|_| PelagoError::MathOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_shares_down_empty_market() {
        // First deposit: 1000 tokens in empty market
        let shares = to_shares_down(1000, 0, 0).unwrap();
        // Expected: (1000 × 1_000_000) / 1 = 1_000_000_000
        assert_eq!(shares, 1_000_000_000);
    }

    #[test]
    fn test_to_shares_up_empty_market() {
        let shares = to_shares_up(1000, 0, 0).unwrap();
        // Should equal to_shares_down for exact divisions
        assert_eq!(shares, 1_000_000_000);
    }

    #[test]
    fn test_virtual_shares_prevents_manipulation() {
        // Attacker deposits 1 token
        let attacker_shares = to_shares_down(1, 0, 0).unwrap();
        assert_eq!(attacker_shares, 1_000_000);

        // Attacker directly transfers 10,000 tokens to vault (not via supply)
        // State: totalAssets=1, totalShares=1_000_000, vault_balance=10,001

        // Victim deposits 5,000 tokens
        // Without virtual shares, victim might get 0 shares due to price manipulation
        // With virtual shares:
        let victim_shares = to_shares_down(5000, 1, 1_000_000).unwrap();
        // Expected: (5000 × 2_000_000) / 2 = 5_000_000_000
        assert!(victim_shares > 0); // Victim is protected!
    }

    #[test]
    fn test_rounding_directions() {
        // Use a scenario where rounding matters: 7 assets, totals that cause remainder
        let total_assets = 10;
        let total_shares = 15;

        let shares_down = to_shares_down(7, total_assets, total_shares).unwrap();
        let shares_up = to_shares_up(7, total_assets, total_shares).unwrap();

        // shares_up should be >= shares_down
        assert!(shares_up >= shares_down);

        let assets_down = to_assets_down(7, total_assets, total_shares).unwrap();
        let assets_up = to_assets_up(7, total_assets, total_shares).unwrap();

        // assets_up should be >= assets_down
        assert!(assets_up >= assets_down);
    }
}
