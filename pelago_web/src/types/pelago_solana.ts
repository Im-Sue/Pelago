/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pelago_solana.json`.
 */
export type PelagoSolana = {
  "address": "5Y6KqLPs2DGRBzg4ybG9KfkyM5vTt8ZDELy9YwF8rGJq",
  "metadata": {
    "name": "pelagoSolana",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Pelago Solana Migration - P0 Phase"
  },
  "docs": [
    "Pelago Solana Program",
    "",
    "A simplified lending protocol migrated from Pelago (Ethereum) to Solana.",
    "",
    "**P1 Phase Features:**",
    "- Market initialization with dual token vaults",
    "- Loan asset supply/withdraw (deposit/withdraw)",
    "- Collateral asset supply/withdraw",
    "- Borrowing/repayment with health factor validation",
    "- Virtual shares mechanism (防止通胀攻击)",
    "- Interest accrual (简化版线性利息)",
    "",
    "**P1 Simplifications:**",
    "- Fixed oracle price (100 USDC/SOL)",
    "- Fixed annual rate (5%)",
    "- Linear interest (not compound)",
    "- No liquidation mechanism (延迟到P2)",
    "- No authorization/callback systems (延迟到P2)"
  ],
  "instructions": [
    {
      "name": "borrow",
      "docs": [
        "Borrow loan assets from the market",
        "",
        "Borrows loan tokens against deposited collateral. Validates health factor",
        "before executing the borrow.",
        "",
        "**Parameters:**",
        "- `amount`: Amount of loan tokens to borrow (in token base units)",
        "- Must be > 0",
        "- Must not exceed available liquidity",
        "",
        "**Health Check:**",
        "- Calculates: (collateral_value * lltv) >= (borrow_value * LLTV_PRECISION)",
        "- Uses fixed oracle price: 100 USDC/SOL",
        "- Fails if position becomes undercollateralized",
        "",
        "**Accounts:**",
        "- `market`: Market account",
        "- `user_position`: User position PDA (must exist)",
        "- `loan_vault`: Market's loan token vault (source)",
        "- `user_token_account`: User's loan token account (destination)",
        "- `user`: User wallet (signer)",
        "- `token_program`: SPL token program",
        "",
        "**P1: Dual-parameter mode** (Pelago compatibility)",
        "- `assets > 0, shares = 0`: Borrow exact assets, calculate shares",
        "- `assets = 0, shares > 0`: Incur exact debt shares, calculate assets"
      ],
      "discriminator": [
        228,
        253,
        131,
        202,
        207,
        116,
        89,
        18
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market account (must be initialized)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.loan_token_mint",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "market.collateral_token_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "docs": [
            "User position PDA (must exist with collateral)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "loanVault",
          "docs": [
            "Market's loan token vault (source of borrowed funds)"
          ],
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "User's loan token account (destination of borrowed funds)"
          ],
          "writable": true
        },
        {
          "name": "user",
          "docs": [
            "User wallet (signer)"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program (for token transfer)"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "assets",
          "type": "u64"
        },
        {
          "name": "shares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeMarket",
      "docs": [
        "Initialize a new lending market",
        "",
        "Creates a new market account with associated loan and collateral token vaults.",
        "Only the market authority can call this instruction.",
        "",
        "**Parameters:**",
        "- `lltv`: Liquidation Loan-to-Value ratio (precision: 1e8)",
        "- Example: 80% → 80_000_000",
        "- Valid range: 0 < lltv <= 100_000_000",
        "",
        "**Accounts:**",
        "- `market`: Market PDA account (to be initialized)",
        "- `loan_token_mint`: SPL token mint for loan asset (e.g., USDC)",
        "- `collateral_token_mint`: SPL token mint for collateral asset (e.g., SOL)",
        "- `loan_vault`: Token account for holding loan assets (to be created)",
        "- `collateral_vault`: Token account for holding collateral assets (to be created)",
        "- `authority`: Market authority (admin)",
        "- `system_program`: Solana system program",
        "- `token_program`: SPL token program",
        "- `rent`: Rent sysvar"
      ],
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market PDA account (to be initialized)",
            "Seeds: [\"market\", loan_token_mint, collateral_token_mint]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "loanTokenMint"
              },
              {
                "kind": "account",
                "path": "collateralTokenMint"
              }
            ]
          }
        },
        {
          "name": "loanTokenMint",
          "docs": [
            "Loan token mint (e.g., USDC)"
          ]
        },
        {
          "name": "collateralTokenMint",
          "docs": [
            "Collateral token mint (e.g., SOL)"
          ]
        },
        {
          "name": "loanVault",
          "docs": [
            "Loan token vault (to be created)",
            "Token account owned by market PDA for holding loan assets"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "collateralVault",
          "docs": [
            "Collateral token vault (to be created)",
            "Token account owned by market PDA for holding collateral assets"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "docs": [
            "Market authority (admin who can initialize and manage)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "Solana system program"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "docs": [
            "Rent sysvar for rent-exempt calculations"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lltv",
          "type": "u64"
        }
      ]
    },
    {
      "name": "repay",
      "docs": [
        "Repay borrowed loan assets",
        "",
        "Repays borrowed tokens and burns borrow shares using virtual shares mechanism.",
        "Supports third-party repayment (payer ≠ borrower).",
        "",
        "**Parameters:**",
        "- `assets`: Amount of loan tokens to repay (mutually exclusive with shares)",
        "- `shares`: Amount of borrow shares to burn (mutually exclusive with assets)",
        "- Exactly one must be > 0, the other must be 0",
        "",
        "**P1 Enhancements:**",
        "- Virtual shares calculation",
        "- Interest accrual before repayment",
        "- Handles overpayment gracefully (saturating_sub)",
        "",
        "**Accounts:**",
        "- `market`: Market account",
        "- `borrower_position`: Borrower's position PDA",
        "- `payer`: Payer wallet (signer, can be different from borrower)",
        "- `borrower`: Borrower wallet (whose debt is being repaid)",
        "- `payer_token_account`: Payer's loan token account (source)",
        "- `loan_vault`: Market's loan token vault (destination)",
        "- `token_program`: SPL token program"
      ],
      "discriminator": [
        234,
        103,
        67,
        82,
        208,
        234,
        219,
        166
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.loan_token_mint",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "market.collateral_token_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "borrowerPosition",
          "docs": [
            "Borrower's position PDA (user being repaid for)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "borrower"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Payer wallet (signer, source of repayment funds)",
            "Can be the borrower themselves or a third party"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "borrower",
          "docs": [
            "Borrower wallet (user whose debt is being repaid)"
          ]
        },
        {
          "name": "payerTokenAccount",
          "docs": [
            "Payer's loan token account (source of repayment)"
          ],
          "writable": true
        },
        {
          "name": "loanVault",
          "docs": [
            "Market's loan token vault (receives repayment)"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "assets",
          "type": "u64"
        },
        {
          "name": "shares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "supply",
      "docs": [
        "Supply loan assets to the market",
        "",
        "Deposits loan tokens (e.g., USDC) into the market and receives supply shares.",
        "P0: 1:1 share mapping (1 token = 1 share).",
        "",
        "**Parameters:**",
        "- `amount`: Amount of loan tokens to supply (in token base units)",
        "- Must be > 0",
        "",
        "**Accounts:**",
        "- `market`: Market account",
        "- `user_position`: User position PDA (created if first supply)",
        "- `loan_vault`: Market's loan token vault",
        "- `user_token_account`: User's loan token account (source)",
        "- `user`: User wallet (signer)",
        "- `system_program`: Solana system program",
        "- `token_program`: SPL token program",
        "",
        "**P1: Dual-parameter mode** (Pelago compatibility)",
        "- `assets > 0, shares = 0`: Supply exact assets, calculate shares",
        "- `assets = 0, shares > 0`: Burn exact shares, calculate assets"
      ],
      "discriminator": [
        81,
        67,
        116,
        61,
        250,
        209,
        5,
        198
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market account (must be initialized)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.loan_token_mint",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "market.collateral_token_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "docs": [
            "User position PDA (created if first supply, otherwise loaded)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "loanVault",
          "docs": [
            "Market's loan token vault (receives the deposit)"
          ],
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "User's loan token account (source of deposit)"
          ],
          "writable": true
        },
        {
          "name": "user",
          "docs": [
            "User wallet (signer)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "Solana system program (for PDA creation if needed)"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program (for token transfer)"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "assets",
          "type": "u64"
        },
        {
          "name": "shares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "supplyCollateral",
      "docs": [
        "Supply collateral assets to the market",
        "",
        "Deposits collateral tokens (e.g., SOL) into the market to back borrowing.",
        "P0: Direct collateral tracking without virtual shares.",
        "",
        "**Parameters:**",
        "- `amount`: Amount of collateral tokens to supply (in token base units)",
        "- Must be > 0",
        "",
        "**Accounts:**",
        "- `market`: Market account",
        "- `user_position`: User position PDA (created if doesn't exist)",
        "- `collateral_vault`: Market's collateral token vault",
        "- `user_collateral_account`: User's collateral token account (source)",
        "- `user`: User wallet (signer)",
        "- `system_program`: Solana system program",
        "- `token_program`: SPL token program"
      ],
      "discriminator": [
        80,
        132,
        192,
        67,
        93,
        50,
        65,
        9
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market account (must be initialized)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.loan_token_mint",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "market.collateral_token_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "docs": [
            "User position PDA (created if first interaction, otherwise loaded)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "docs": [
            "Market's collateral token vault (receives the deposit)"
          ],
          "writable": true
        },
        {
          "name": "userCollateralAccount",
          "docs": [
            "User's collateral token account (source of deposit)"
          ],
          "writable": true
        },
        {
          "name": "user",
          "docs": [
            "User wallet (signer)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "Solana system program (for PDA creation if needed)"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program (for token transfer)"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "docs": [
        "Withdraw loan assets from the market",
        "",
        "Withdraws loan tokens and burns supply shares using virtual shares mechanism.",
        "Maintains liquidity constraint: totalBorrowAssets ≤ totalSupplyAssets.",
        "",
        "**Parameters:**",
        "- `assets`: Amount of loan tokens to withdraw (mutually exclusive with shares)",
        "- `shares`: Amount of supply shares to burn (mutually exclusive with assets)",
        "- Exactly one must be > 0, the other must be 0",
        "",
        "**P1 Enhancements:**",
        "- Virtual shares calculation for accurate conversion",
        "- Interest accrual before withdrawal",
        "- Liquidity validation",
        "",
        "**Accounts:**",
        "- `market`: Market account",
        "- `user_position`: User position PDA",
        "- `user`: User wallet (signer)",
        "- `receiver_token_account`: Destination for withdrawn tokens",
        "- `loan_vault`: Market's loan token vault (source)",
        "- `token_program`: SPL token program"
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.loan_token_mint",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "market.collateral_token_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "docs": [
            "User position PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "docs": [
            "User wallet (signer, authority for withdrawal)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "receiverTokenAccount",
          "docs": [
            "Receiver token account (can be user's own or different account)"
          ],
          "writable": true
        },
        {
          "name": "loanVault",
          "docs": [
            "Market's loan token vault (source of withdrawal)"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "assets",
          "type": "u64"
        },
        {
          "name": "shares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawCollateral",
      "docs": [
        "Withdraw collateral assets from user position",
        "",
        "Transfers collateral tokens from market to receiver.",
        "Must maintain health factor after withdrawal.",
        "",
        "**Parameters:**",
        "- `assets`: Amount of collateral tokens to withdraw",
        "- Must be > 0",
        "",
        "**P1 Enhancements:**",
        "- Interest accrual before health check",
        "- Virtual shares in health calculation",
        "",
        "**Accounts:**",
        "- `market`: Market account",
        "- `user_position`: User position PDA",
        "- `user`: User wallet (signer)",
        "- `receiver_collateral_account`: Destination for collateral",
        "- `collateral_vault`: Market's collateral token vault (source)",
        "- `token_program`: SPL token program"
      ],
      "discriminator": [
        115,
        135,
        168,
        106,
        139,
        214,
        138,
        150
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.loan_token_mint",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "market.collateral_token_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "docs": [
            "User position PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "docs": [
            "User wallet (signer, authority)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "receiverCollateralAccount",
          "docs": [
            "Receiver collateral token account"
          ],
          "writable": true
        },
        {
          "name": "collateralVault",
          "docs": [
            "Market's collateral token vault (source of withdrawal)"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "assets",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "userPosition",
      "discriminator": [
        251,
        248,
        209,
        245,
        83,
        234,
        17,
        27
      ]
    }
  ],
  "events": [
    {
      "name": "accrueInterestEvent",
      "discriminator": [
        107,
        191,
        252,
        125,
        157,
        84,
        71,
        124
      ]
    },
    {
      "name": "borrowEvent",
      "discriminator": [
        86,
        8,
        140,
        206,
        215,
        179,
        118,
        201
      ]
    },
    {
      "name": "repayEvent",
      "discriminator": [
        129,
        213,
        0,
        108,
        218,
        108,
        82,
        140
      ]
    },
    {
      "name": "supplyEvent",
      "discriminator": [
        102,
        86,
        244,
        238,
        146,
        98,
        150,
        255
      ]
    },
    {
      "name": "withdrawCollateralEvent",
      "discriminator": [
        145,
        38,
        46,
        87,
        190,
        149,
        253,
        191
      ]
    },
    {
      "name": "withdrawEvent",
      "discriminator": [
        22,
        9,
        133,
        26,
        160,
        44,
        71,
        192
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientCollateral",
      "msg": "Insufficient collateral: position is undercollateralized"
    },
    {
      "code": 6001,
      "name": "insufficientLiquidity",
      "msg": "Insufficient liquidity: market cannot fulfill this borrow"
    },
    {
      "code": 6002,
      "name": "mathOverflow",
      "msg": "Math overflow: calculation exceeded maximum value"
    },
    {
      "code": 6003,
      "name": "divisionByZero",
      "msg": "Division by zero: invalid calculation"
    },
    {
      "code": 6004,
      "name": "invalidLltv",
      "msg": "Invalid LLTV: must be between 0 and 100%"
    },
    {
      "code": 6005,
      "name": "zeroAmount",
      "msg": "Zero amount: operation amount must be greater than zero"
    },
    {
      "code": 6006,
      "name": "uninitializedMarket",
      "msg": "Uninitialized market: market account not properly set up"
    },
    {
      "code": 6007,
      "name": "unauthorized",
      "msg": "Unauthorized: only market authority can perform this operation"
    },
    {
      "code": 6008,
      "name": "inconsistentInput",
      "msg": "Inconsistent input: exactly one of assets or shares must be non-zero"
    },
    {
      "code": 6009,
      "name": "insufficientSupply",
      "msg": "Insufficient supply: not enough supply shares to withdraw"
    },
    {
      "code": 6010,
      "name": "insufficientBorrow",
      "msg": "Insufficient borrow: not enough borrow shares to repay"
    },
    {
      "code": 6011,
      "name": "invalidTimestamp",
      "msg": "Invalid timestamp: clock error or time inconsistency"
    },
    {
      "code": 6012,
      "name": "invalidVault",
      "msg": "Invalid vault: vault account mismatch"
    }
  ],
  "types": [
    {
      "name": "accrueInterestEvent",
      "docs": [
        "Event emitted when interest is accrued",
        "",
        "Off-chain indexers can track:",
        "- Interest accumulation over time",
        "- Effective APY calculation",
        "- Market growth metrics",
        "",
        "Note: Market pubkey can be derived from transaction context"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "interest",
            "docs": [
              "Interest amount accrued (in loan token base units)"
            ],
            "type": "u64"
          },
          {
            "name": "totalBorrowAssets",
            "docs": [
              "New total borrow assets after accrual"
            ],
            "type": "u64"
          },
          {
            "name": "totalSupplyAssets",
            "docs": [
              "New total supply assets after accrual"
            ],
            "type": "u64"
          },
          {
            "name": "elapsedSeconds",
            "docs": [
              "Elapsed time since last accrual (seconds)"
            ],
            "type": "i64"
          },
          {
            "name": "timestamp",
            "docs": [
              "Current timestamp after accrual"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "borrowEvent",
      "docs": [
        "Event emitted on successful borrow"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "docs": [
              "User public key (borrower)"
            ],
            "type": "pubkey"
          },
          {
            "name": "assets",
            "docs": [
              "Assets borrowed"
            ],
            "type": "u64"
          },
          {
            "name": "shares",
            "docs": [
              "Shares issued"
            ],
            "type": "u64"
          },
          {
            "name": "totalBorrowShares",
            "docs": [
              "Total borrow shares in market"
            ],
            "type": "u64"
          },
          {
            "name": "totalBorrowAssets",
            "docs": [
              "Total borrow assets in market"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "market",
      "docs": [
        "Market account structure representing a lending market",
        "",
        "This structure stores all essential information for a lending market including:",
        "- Token mint addresses for loan and collateral tokens",
        "- Token vault addresses for holding deposited assets",
        "- Supply and borrow totals (assets and shares)",
        "- Liquidation Loan-to-Value ratio (LLTV)",
        "",
        "**P0 Simplifications:**",
        "- 1:1 share mapping (total_supply_shares == total_supply_assets)",
        "- No interest accrual (last_update is reserved for future use)",
        "- Fixed price oracle (hardcoded 100 USDC/SOL)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Market authority (admin who can initialize and manage)"
            ],
            "type": "pubkey"
          },
          {
            "name": "loanTokenMint",
            "docs": [
              "Mint address of the loan token (e.g., USDC)"
            ],
            "type": "pubkey"
          },
          {
            "name": "collateralTokenMint",
            "docs": [
              "Mint address of the collateral token (e.g., SOL)"
            ],
            "type": "pubkey"
          },
          {
            "name": "loanVault",
            "docs": [
              "Token account for holding deposited loan assets",
              "Created during market initialization"
            ],
            "type": "pubkey"
          },
          {
            "name": "collateralVault",
            "docs": [
              "Token account for holding deposited collateral assets",
              "Created during market initialization"
            ],
            "type": "pubkey"
          },
          {
            "name": "totalSupplyAssets",
            "docs": [
              "Total loan assets supplied to the market",
              "P0: Equals total_supply_shares (1:1 mapping)"
            ],
            "type": "u64"
          },
          {
            "name": "totalSupplyShares",
            "docs": [
              "Total supply shares issued",
              "P0: Equals total_supply_assets (no virtual shares)"
            ],
            "type": "u64"
          },
          {
            "name": "totalBorrowAssets",
            "docs": [
              "Total loan assets borrowed from the market",
              "P0: Equals total_borrow_shares (1:1 mapping)"
            ],
            "type": "u64"
          },
          {
            "name": "totalBorrowShares",
            "docs": [
              "Total borrow shares issued",
              "P0: Equals total_borrow_assets (no virtual shares)"
            ],
            "type": "u64"
          },
          {
            "name": "lltv",
            "docs": [
              "Liquidation Loan-to-Value ratio",
              "Precision: 1e8 (e.g., 80_000_000 = 80%)",
              "Used in health factor calculation: (collateral_value * lltv) / borrow_value"
            ],
            "type": "u64"
          },
          {
            "name": "lastUpdate",
            "docs": [
              "Last update timestamp (Unix timestamp)",
              "P0: Reserved for future interest accrual, not used currently"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed for deterministic address derivation"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "repayEvent",
      "docs": [
        "Event emitted on successful repayment"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "payer",
            "docs": [
              "Payer public key (who paid)"
            ],
            "type": "pubkey"
          },
          {
            "name": "borrower",
            "docs": [
              "Borrower public key (whose debt was repaid)"
            ],
            "type": "pubkey"
          },
          {
            "name": "assets",
            "docs": [
              "Assets repaid"
            ],
            "type": "u64"
          },
          {
            "name": "shares",
            "docs": [
              "Shares burned"
            ],
            "type": "u64"
          },
          {
            "name": "remainingBorrowShares",
            "docs": [
              "Remaining borrow shares for borrower"
            ],
            "type": "u64"
          },
          {
            "name": "totalBorrowAssets",
            "docs": [
              "Remaining total borrow assets in market"
            ],
            "type": "u64"
          },
          {
            "name": "totalBorrowShares",
            "docs": [
              "Remaining total borrow shares in market"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "supplyEvent",
      "docs": [
        "Event emitted on successful supply"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "docs": [
              "User public key (supplier)"
            ],
            "type": "pubkey"
          },
          {
            "name": "assets",
            "docs": [
              "Assets supplied"
            ],
            "type": "u64"
          },
          {
            "name": "shares",
            "docs": [
              "Shares received"
            ],
            "type": "u64"
          },
          {
            "name": "totalSupplyShares",
            "docs": [
              "Total supply shares in market"
            ],
            "type": "u64"
          },
          {
            "name": "totalSupplyAssets",
            "docs": [
              "Total supply assets in market"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "userPosition",
      "docs": [
        "User position account structure representing a user's position in a market",
        "",
        "This structure tracks an individual user's:",
        "- Supply shares (loan assets deposited)",
        "- Borrow shares (loan assets borrowed)",
        "- Collateral amount (collateral assets deposited)",
        "",
        "**P0 Simplifications:**",
        "- 1:1 share mapping (shares == assets)",
        "- No interest accumulation tracking"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "docs": [
              "User wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "market",
            "docs": [
              "Market this position belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "supplyShares",
            "docs": [
              "Supply shares held by user",
              "P0: Equals actual loan assets supplied (1:1 mapping)"
            ],
            "type": "u64"
          },
          {
            "name": "borrowShares",
            "docs": [
              "Borrow shares held by user",
              "P0: Equals actual loan assets borrowed (1:1 mapping)"
            ],
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "docs": [
              "Collateral amount deposited by user",
              "Stored in collateral token's base units (e.g., lamports for SOL)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed for deterministic address derivation"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "withdrawCollateralEvent",
      "docs": [
        "Event emitted on successful collateral withdrawal"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "docs": [
              "User public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "receiver",
            "docs": [
              "Receiver token account"
            ],
            "type": "pubkey"
          },
          {
            "name": "assets",
            "docs": [
              "Assets withdrawn"
            ],
            "type": "u64"
          },
          {
            "name": "remainingCollateral",
            "docs": [
              "Remaining collateral in position"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "withdrawEvent",
      "docs": [
        "Event emitted on successful withdrawal"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "docs": [
              "User public key (withdrawer)"
            ],
            "type": "pubkey"
          },
          {
            "name": "receiver",
            "docs": [
              "Receiver token account"
            ],
            "type": "pubkey"
          },
          {
            "name": "assets",
            "docs": [
              "Assets withdrawn"
            ],
            "type": "u64"
          },
          {
            "name": "shares",
            "docs": [
              "Shares burned"
            ],
            "type": "u64"
          },
          {
            "name": "totalSupplyAssets",
            "docs": [
              "Remaining total supply assets in market"
            ],
            "type": "u64"
          },
          {
            "name": "totalSupplyShares",
            "docs": [
              "Remaining total supply shares in market"
            ],
            "type": "u64"
          }
        ]
      }
    }
  ]
};
