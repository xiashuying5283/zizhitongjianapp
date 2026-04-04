#!/bin/bash
# 资治通鉴 App 后端一键部署脚本
# 使用方法: bash deploy.sh your-domain.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "用法: bash deploy.sh your-domain.com"
    exit 1
fi

echo "=========================================="
echo "  资治通鉴 App 后端部署"
echo "  域名: $DOMAIN"
echo "=========================================="

# 1. 安装依赖
echo "[1/6] 安装系统依赖..."
apt update
apt install -y nodejs npm postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# 2. 安装全局工具
echo "[2/6] 安装 pnpm 和 pm2..."
npm install -g pnpm pm2

# 3. 配置 PostgreSQL
echo "[3/6] 配置数据库..."
sudo -u postgres psql -c "CREATE DATABASE zizhitongjian;" 2>/dev/null || echo "数据库已存在"
sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'zizhitongjian2024';" 2>/dev/null || echo "用户已存在"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE zizhitongjian TO appuser;"
sudo -u postgres psql -d zizhitongjian -c "GRANT ALL ON SCHEMA public TO appuser;"

# 4. 配置 Nginx
echo "[4/6] 配置 Nginx..."
cat > /etc/nginx/sites-available/zizhitongjian << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:9091;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/zizhitongjian /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 5. 安装项目依赖
echo "[5/6] 安装项目依赖..."
cd "$(dirname "$0")"
pnpm install
pnpm build

# 6. 创建环境变量
echo "[6/6] 配置环境变量..."
if [ ! -f .env ]; then
    cat > .env << EOF
# 数据库连接
DATABASE_URL=postgresql://appuser:zizhitongjian2024@localhost:5432/zizhitongjian

# 服务端口
PORT=9091

# 前端连接地址
EXPO_PUBLIC_BACKEND_BASE_URL=https://$DOMAIN

# 应用名称
APP_NAME=资治通鉴深度阅读App

# OpenAI API 配置（请修改为你的 key）
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
EOF
    echo "已创建 .env 文件，请编辑填入真实的 OPENAI_API_KEY"
fi

# 启动服务
pm2 delete zizhitongjian-api 2>/dev/null || true
pm2 start dist/index.js --name zizhitongjian-api
pm2 save
pm2 startup | tail -1 | bash

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 编辑 .env 填入真实的 OPENAI_API_KEY"
echo "   nano .env"
echo ""
echo "2. 申请免费 SSL 证书："
echo "   certbot --nginx -d $DOMAIN"
echo ""
echo "3. 重启服务："
echo "   pm2 restart zizhitongjian-api"
echo ""
echo "4. 测试访问："
echo "   curl https://$DOMAIN"
echo ""
