---
title: 实时通信与流量隧道
description: wsrx WebSocket 隧道与平台事件通道
---

import { Aside } from '@astrojs/starlight/components';

## 1. wsrx 流量隧道（玩家连接题目的中转路径）

未配置 traffic 脚本（或题目在纯内网）时，玩家通过平台的 WebSocket 隧道访问题目实例：

```text
玩家浏览器 / wsrx CLI ──wss://<域名>/api/traffic/{traffic_token}?port=N──> 平台 Pod ──kube port-forward──> 挑战 Pod:N
```

**握手与转发流程**（`crates/server/src/routes/traffic/mod.rs`、`manager.rs` 的 `wsrx_link`）：

1. 客户端请求 `GET /api/traffic/{token}?port=N` 并升级为 WebSocket。
2. 服务端按 Pod 标签 `ret.sh.cn/traffic={token}` 定位挑战 Pod，校验端口 `N` 在容器声明的端口列表内。
3. 通过 `kube::Api::portforward` 建立到目标 Pod 的流通道，`wsrx::proxy::proxy_stream` 双向桥接。
4. 客户端把隧道映射为本机端口：面板内置 wsrx 客户端（`web/src/lib/wsrx`）自动映射到 `127.0.0.1:<随机端口>`；本地 wsrx CLI 同理。

**注意事项**：

- `traffic_token` 是实例创建时生成的 21 位 nanoid（标签 `ret.sh.cn/traffic`），只对本人实例有效。
- 仅支持 TCP 流（UDP 题目必须走 NodePort 直连拓扑）。
- 所有流量经平台所在节点中转，带宽受控制面限制；大流量比赛推荐配置 [NodePort 出口拓扑](/architecture/traffic-topologies/)。
- 生产环境需 `external_https = true`（wss）。

## 2. 平台事件通道

平台内部事件经 NATS JetStream 传递（组件见[平台与集群架构](/architecture/overview/)），主要主题：

| 主题 | 内容 |
| --- | --- |
| `game.{id}.event` | 比赛事件流 |
| `instance.{id}.status` | 实例状态变化 |
| `system.task.*` | 系统异步任务 |

面向前端：

- **比赛聊天与通知**：比赛内聊天、通知经 `/api/game` 的 chat/notification 路由与 WebSocket 推送。
- **公告**：`/api/bulletin`，面板实时可见。
- **排行榜更新**：比赛事件驱动的实时排行（见 `game/statistics`）。

这些通道面向平台自身前端；外部集成请使用 REST API 与 wsrx 隧道，不要直接连 NATS。
