# Pelago - Efficient Lending Protocol on Solana

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-v0.29-blue)](https://anchor-lang.com)

> A high-performance decentralized lending protocol built natively for Solana, featuring isolated markets, share-based accounting, and real-time interest accrual.

## 🌟 Overview

**Pelago** is an innovative lending protocol designed from the ground up for Solana's high-performance blockchain:

- **Isolated Lending Markets**: Independent risk pools with customizable parameters (LLTV, oracle, interest rate)
- **Share-Based Accounting**: Virtual shares mechanism for efficient interest distribution without loops
- **Flexible Collateralization**: Adjustable LLTV (Liquidation Loan-to-Value) from 0% to 100%
- **Lightning Fast**: ~400ms confirmations, ~$0.00025 transaction costs
- **User-Friendly DApp**: Modern React frontend with seamless wallet integration

## 📁 Project Structure

```
.
├── pelago_contract/     # Solana smart contract (Anchor framework)
│   ├── programs/        # Rust program source
│   ├── tests/          # Integration tests
│   └── scripts/        # Deployment utilities
│
└── pelago_web/         # Frontend application
    ├── src/            # React + TypeScript
    └── public/         # Static assets
```

## 🚀 Quick Start

### Prerequisites

- Rust 1.70+
- Solana CLI 1.17+
- Anchor Framework 0.29+
- Node.js 18+

### Smart Contract Setup

```bash
cd pelago_contract

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Edit .env and add your Helius API key

# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Frontend Setup

```bash
cd pelago_web

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the app.

## ✨ Features

### Core Functionality (MVP)

- ✅ **Market Creation**: Initialize isolated lending markets
- ✅ **Supply**: Deposit assets to earn interest
- ✅ **Borrow**: Take loans against collateral
- ✅ **Collateral Management**: Supply and withdraw collateral
- ✅ **Repayment**: Repay borrowed funds
- ✅ **Withdrawal**: Withdraw supplied assets
- ✅ **Interest Accrual**: Real-time interest calculations
- ✅ **Health Factor**: Position risk monitoring

## 🏗️ Technical Architecture

### Smart Contract

- **Framework**: Anchor (type-safe Solana development)
- **Design**: Isolated markets with independent risk parameters
- **Accounting**: Share-based for efficient interest distribution
- **Instructions**: Modular, composable operations

### Frontend

- **Stack**: React + TypeScript + Vite
- **State**: Zustand (lightweight, performant)
- **Wallet**: @solana/wallet-adapter (multi-wallet support)
- **UI**: TailwindCSS + shadcn/ui components

## 🔧 Configuration

### Environment Variables

**Contract** (`.env`):
```env
HELIUS_API_KEY=your_key
ANCHOR_PROVIDER_URL=https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
ANCHOR_WALLET=~/.config/solana/id.json
```

**Frontend** (`.env`):
```env
VITE_HELIUS_API_KEY=your_key
VITE_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=${VITE_HELIUS_API_KEY}
VITE_PROGRAM_ID=your_deployed_program_id
```

## 🧪 Testing

```bash
# Contract tests
cd pelago_contract
anchor test

# Frontend (if implemented)
cd pelago_web
npm test
```

## 📈 Performance Benefits

| Metric | Ethereum | Solana (Pelago) |
|--------|----------|-----------------|
| Transaction Cost | ~$5-50 | ~$0.00025 |
| Confirmation Time | ~12 seconds | ~400ms |
| Throughput | ~15 TPS | ~50,000 TPS |
| Finality | ~13 minutes | ~2 seconds |

## 🛡️ Security

**⚠️ Important**: This is a hackathon project and has NOT been audited.

**Do NOT use in production without:**
- Comprehensive security audit
- Extensive mainnet-beta testing
- Proper key management infrastructure

## 🎯 Core Innovation

### Virtual Shares Architecture
Pelago implements an efficient share-based accounting system that eliminates the need for iterating over user positions:

- **Supply Shares**: Users receive shares proportional to their deposits
- **Borrow Shares**: Borrowed amounts tracked via share mechanism
- **Interest Accrual**: Automatic compounding through share price updates
- **Gas Efficiency**: O(1) operations instead of O(n) loops

### Technical Highlights

**Smart Contract**:
- Written in Rust using Anchor Framework v0.29
- Modular instruction design for composability
- Real-time interest rate calculations (linear model)
- Health factor validation for safe borrowing

**Frontend**:
- React 19 + TypeScript for type safety
- Zustand for lightweight state management
- @solana/wallet-adapter for multi-wallet support
- Real-time position monitoring and health factor tracking

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- [Anchor Framework](https://anchor-lang.com) - Solana development framework
- [Solana Foundation](https://solana.com) - Blockchain infrastructure
- DeFi community for lending protocol design patterns

---

**Built with ❤️ for the Solana Ecosystem**

*Hackathon Submission 2025*
