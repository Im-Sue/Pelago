/// Precision constant for price calculations
///
/// **Value:** 1,000,000 (1e6)
///
/// **Usage:** Oracle price representation
/// - Example: 100 USDC/SOL → stored as 100_000_000 (100 * PRICE_PRECISION)
/// - Division: actual_price = stored_price / PRICE_PRECISION
///
/// **P0 Implementation:** Fixed oracle price of 100 USDC/SOL
/// - Hardcoded value: 100_000_000
pub const PRICE_PRECISION: u64 = 1_000_000;

/// Precision constant for LLTV (Liquidation Loan-to-Value) calculations
///
/// **Value:** 100,000,000 (1e8)
///
/// **Usage:** LLTV percentage representation with high precision
/// - Example: 80% LLTV → stored as 80_000_000 (0.8 * LLTV_PRECISION)
/// - Division: actual_percentage = lltv_value / LLTV_PRECISION
///
/// **Health Factor Calculation:**
/// ```text
/// collateral_value_usd = collateral_amount * oracle_price / PRICE_PRECISION
/// borrow_value_usd = borrow_amount
/// health_factor = (collateral_value_usd * lltv) / (borrow_value_usd * LLTV_PRECISION)
/// ```
///
/// **Health Check:**
/// - Healthy: collateral_value_usd * lltv >= borrow_value_usd * LLTV_PRECISION
/// - Undercollateralized: collateral_value_usd * lltv < borrow_value_usd * LLTV_PRECISION
pub const LLTV_PRECISION: u64 = 100_000_000;

/// P0 fixed oracle price: 100 USDC per SOL
///
/// **Value:** 100,000 (100 * PRICE_PRECISION / 1000)
///
/// **Purpose:** Simplified price oracle for P0 phase
/// - No external oracle integration
/// - No price updates
/// - Fixed conversion rate for testing and demonstration
///
/// **Decimal Adjustment:**
/// - SOL has 9 decimals, USDC has 6 decimals (3 decimal difference)
/// - Price is divided by 1000 (10^3) to account for this difference
/// - Formula: FIXED_ORACLE_PRICE = 100 × PRICE_PRECISION / 1000
/// - This ensures: 1 SOL (1e9 units) × 100_000 / 1e6 = 100 USDC (1e8 units → 100e6 after division)
///
/// **Calculation Example:**
/// - 9 SOL collateral = 9_000_000_000 units
/// - Value = 9_000_000_000 × 100_000 / 1_000_000 = 900_000_000 (900 USDC with 6 decimals)
///
/// **Future Enhancement:** Replace with Pyth/Switchboard oracle integration
pub const FIXED_ORACLE_PRICE: u64 = 100_000; // 100 * PRICE_PRECISION / 1000 for decimal adjustment

/// Maximum LLTV allowed (100%)
///
/// **Value:** 100,000,000 (100% * LLTV_PRECISION)
///
/// **Purpose:** Validation boundary for market initialization
/// - LLTV must be: 0 < lltv <= MAX_LLTV
pub const MAX_LLTV: u64 = LLTV_PRECISION;
