---
title: 快速开始
description: 本地开发环境搭建与首次运行
---

import { Steps } from '@astrojs/starlight/components';

本页搭建一个可开发的本地环境：后端 `cargo run` 热启动，前端 Vite 热重载，依赖服务由 Docker Compose 提供。

## 环境要求

| 依赖 | 版本 |
| --- | --- |
| Rust | 1.95.0+（MSRV） |
| Node.js | 21+ 与 pnpm |
| Docker / Podman | 用于跑依赖服务 |
| PostgreSQL | 18+ |
| Redis / Valkey | 8+ |
| NATS | 2+（需 JetStream） |

<Steps>

### 克隆仓库并构建后端

```bash
git clone https://github.com/ret2shell/ret2shell.git
cd ret2shell
cargo build
```

### 安装前端依赖

```bash
cd web && pnpm install && cd ..
```

### 初始化配置

```bash
cp config/config.sample.toml config/config.toml
```

至少修改 `[auth] signing_key`（换成随机字符串）与 `[database]`、`[cache]`、`[queue]` 的连接信息以匹配下一步的 Compose 服务。字段含义见 [config.toml 全量参考](/config/reference/)。

### 启动依赖服务

```bash
docker compose -f deploy/compose/docker-compose.dev.yml up -d
```

dev compose 提供 5 个服务，与生产 Helm chart 的六件套对应（不含平台自身）：

| 服务 | 镜像 | 端口 |
| --- | --- | --- |
| database | `postgres:18-alpine` | 5432 |
| cache | `valkey/valkey:8-alpine` | 6379 |
| message_queue | `nats:2-alpine`（JetStream） | 4222 |
| vlogs | `victoriametrics/victoria-logs:v1.43.1` | 9428 |
| registry | `registry:3` | 5000 |

### 启动后端

```bash
cargo run --bin r2s-server
```

### 启动前端开发服务器

新开终端：

```bash
cd web && pnpm dev --host
```

访问 Vite 输出的地址即可使用面板。生产形态下由 `r2s-server` 直接托管 `web/dist` 静态资源（`[server.frontend] serve_type = 'static'`）。

</Steps>

## 接入 Kubernetes（可选）

本地开发默认不接管题目容器。要让平台真正创建挑战实例，需要给它一个可用的 Kubernetes 集群，`[cluster]` 配置支持三级回退（详见[平台与集群架构](/architecture/overview/#平台连接-kubernetes-的方式)）：

```toml
[cluster]
enabled = true      # 总开关
try_default = true  # 平台自身运行在 k8s 内时使用 InCluster ServiceAccount
```

平台在集群外时改用 `auto_infer = true`（推断本机 kubeconfig）或显式指定 `kube_config_path`。完整的生产部署流程见 [k3s 生产部署](/deploy/k3s-production/)。

## 常用开发命令速查

```bash
# 后端
cargo run --bin r2s-server   # 启动服务器
cargo +nightly fmt           # 格式化（仓库 rustfmt.toml：2 空格缩进）
cargo clippy                 # 代码检查
cargo test                   # 测试

# 前端
pnpm -C web dev --host       # 开发服务器
pnpm -C web format           # Biome 格式化
pnpm -C web lint             # Biome 检查
pnpm -C web test             # 测试
```

提交遵循 gitmoji 规范（`<gitmoji> <摘要>`，如 `:sparkles: add new feature`），详见 [CONTRIBUTING](https://github.com/ret2shell/ret2shell/blob/main/CONTRIBUTING.md)。
