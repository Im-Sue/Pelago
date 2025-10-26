#!/bin/bash

# Pelago Solana - Devnet 测试脚本
# 使用方法: ./test-devnet.sh

set -e

echo "🧪 开始在 Devnet 测试 Pelago Solana..."
echo ""

DEVNET_RPC="https://devnet.helius-rpc.com/?api-key=86103c49-61f2-43d6-a803-9fc0dadcdb2f"

# 检查程序是否已部署
PROGRAM_ID=$(solana address --keypair target/deploy/pelago_solana-keypair.json)
echo "Program ID: $PROGRAM_ID"
echo ""

# 运行测试
echo "🏃 运行测试套件..."
anchor test \
    --provider.cluster "$DEVNET_RPC" \
    --skip-local-validator \
    --skip-deploy

echo ""
echo "✅ 测试完成！"
