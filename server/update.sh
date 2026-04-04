#!/bin/bash
# 更新后端代码并重启

set -e

echo "拉取最新代码..."
git pull

echo "安装依赖..."
pnpm install

echo "构建项目..."
pnpm build

echo "重启服务..."
pm2 restart zizhitongjian-api

echo "更新完成！"
pm2 logs zizhitongjian-api --lines 20
