//! Core Library Modules
//!
//! This module exports utility libraries for Pelago Solana protocol.
//!
//! **P1 Phase Libraries:**
//! - `shares_math`: Virtual shares calculation (防止通胀攻击)
//! - `interest`: Interest accrual mechanism (简化版线性利息)

pub mod shares_math;
pub mod interest;

// Re-export commonly used functions for convenience
pub use shares_math::{
    to_shares_down,
    to_shares_up,
    to_assets_down,
    to_assets_up,
    VIRTUAL_SHARES,
    VIRTUAL_ASSETS,
};

pub use interest::{
    accrue_interest,
    AccrueInterestEvent,
    FIXED_ANNUAL_RATE_WAD,
    WAD,
};
