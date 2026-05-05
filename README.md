# 资治通鉴深度阅读 App

一个基于 Expo + Express.js 的资治通鉴深度阅读应用。

## 目录结构

当前仓库是一个 monorepo（基于 pnpm 的 workspace）

- Expo 代码在 `client` 目录，Express.js 代码在 `server` 目录

```
├── server/                     # 服务端代码根目录 (Express.js)
│   ├── src/
│   │   └── index.ts            # Express 入口文件
│   └── package.json            # 服务端 package.json
├── client/                     # React Native 前端代码
│   ├── app/                    # Expo Router 路由目录
│   ├── screens/                # 页面实现目录
│   ├── components/             # 可复用组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── utils/                  # 工具函数
│   └── package.json            # Expo 应用 package.json
├── package.json
└── pnpm-workspace.yaml
```

## 依赖管理

**禁止**使用 `npm` 或 `yarn`，按目录区分安装命令：

| 目录 | 安装命令 | 说明 |
|------|----------|------|
| `client/` | `npx expo install <package>` | Expo 会自动选择与 SDK 兼容的版本 |
| `server/` | `pnpm add <package>` | 使用 pnpm 管理后端依赖 |

```bash
# client 目录（Expo 项目）
cd client && npx expo install expo-camera expo-image-picker

# server 目录（Express 项目）
cd server && pnpm add axios cors
```

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动前后端服务
pnpm dev
```

前端默认地址: `http://localhost:8081`，后端 API: `http://localhost:9091`
开发启动时，`client` 会自动识别当前电脑的局域网 IP，并把 `EXPO_PUBLIC_BACKEND_BASE_URL` 指向 `http://<当前IP>:9091`，所以换电脑或换网络后通常不需要手改地址。

## 环境配置

在项目根目录创建 `.env` 文件：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/zizhitongjian
PORT=9091
EXPO_PUBLIC_BACKEND_BASE_URL=
APP_NAME=资治通鉴深度阅读App
```
