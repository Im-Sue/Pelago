#!/bin/bash

# Pelago Solana - Devnet 部署脚本
# 使用方法: ./deploy-devnet.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Pelago Solana 到 Devnet..."
echo ""

# Devnet RPC URL
DEVNET_RPC="https://devnet.helius-rpc.com/?api-key=86103c49-61f2-43d6-a803-9fc0dadcdb2f"

# 1. 检查余额
echo "📊 步骤 1: 检查钱包余额..."
BALANCE=$(solana balance --url "$DEVNET_RPC" 2>/dev/null || echo "0 SOL")
echo "当前余额: $BALANCE"

if [[ "$BALANCE" == "0 SOL" ]]; then
    echo "⚠️  警告: 余额不足！"
    echo "请访问以下网站领取 devnet SOL:"
    echo "  - QuickNode: https://faucet.quicknode.com/solana/devnet"
    echo "  - Solana官方: https://faucet.solana.com/"
    echo ""
    echo "你的钱包地址: $(solana address)"
    echo ""
    read -p "获取到 SOL 后按回车继续，或按 Ctrl+C 取消..."
fi

# 2. 清理并重新构建
echo ""
echo "🔨 步骤 2: 清理并重新构建程序..."
anchor clean
anchor build

# 3. 部署到 devnet
echo ""
echo "📦 步骤 3: 部署到 Devnet..."
anchor deploy \
    --provider.cluster "$DEVNET_RPC" \
    --program-name pelago_solana \
    --program-keypair target/deploy/pelago_solana-keypair.json

# 4. 获取部署信息
echo ""
echo "✅ 部署成功！"
echo ""
echo "📋 部署信息:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 读取 program ID
PROGRAM_ID=$(solana address --keypair target/deploy/pelago_solana-keypair.json)
echo "Program ID: $PROGRAM_ID"

# 显示钱包信息
WALLET_ADDRESS=$(solana address)
echo "部署钱包: $WALLET_ADDRESS"

# 显示剩余余额
NEW_BALANCE=$(solana balance --url "$DEVNET_RPC")
echo "剩余余额: $NEW_BALANCE"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 5. 验证部署
echo "🔍 步骤 4: 验证部署..."
solana program show "$PROGRAM_ID" --url "$DEVNET_RPC"

echo ""
echo "🎉 部署完成！接下来可以运行测试验证："
echo "   ./test-devnet.sh"
echo ""
echo "📝 前端集成信息已保存到: FRONTEND_INTEGRATION.md"
