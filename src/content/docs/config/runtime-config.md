---
title: 运行时配置与集群 API
description: Admin 面板运行时配置、集群管理端点与实例元数据
---

import { Aside } from '@astrojs/starlight/components';

## 1. 配置生效优先级

同一配置项可能出现在四个位置，优先级从高到低：

1. **Admin 面板运行时配置**（存数据库）
2. 环境变量
3. `config.toml`
4. 代码默认值

比赛级的 `node_selector` / `traffic`（比赛未归档时）优先于全局运行时配置。

## 2. 集群相关 API 端点

除 `/api/traffic/{token}` 外，以下端点都需要 **DevOps** 管理员权限（端点定义见 `crates/server/src/routes/cluster/mod.rs`）：

| 端点 | 方法 | 功能 |
| --- | --- | --- |
| `/api/cluster/config` | GET | 获取集群运行时配置 |
| `/api/cluster/node` | GET | 获取 k8s 节点列表与状态 |
| `/api/cluster/node-selector` | PATCH / DELETE | 设置或清空全局默认 `nodeSelector`（请求体只填标签值，如 `"challenge"`） |
| `/api/cluster/traffic` | PATCH / DELETE | 设置或清空全局默认 traffic 脚本 |
| `/api/cluster/lifecycle` | PATCH / DELETE | 设置或清空全局默认 lifecycle 脚本 |
| `/api/cluster/registry/{*}` | ANY | 反向代理内建 registry 的 HTTP API v2（如 `/v2/_catalog`、`/v2/<name>/tags/list`） |
| `/api/cluster/calmdown` | GET | 查询集群是否过载（Pending 挑战 Pod > 32） |
| `/api/game/{id}/node-selector` | PATCH / DELETE | 单场比赛的 `nodeSelector`（比赛未归档时优先于全局） |
| `/api/game/{id}/traffic` | PATCH / DELETE | 单场比赛的 traffic 脚本 |
| `/api/traffic/{token}?port=N` | GET (WebSocket) | 玩家 wsrx 隧道端点，见[实时通信](/api/realtime/) |

## 3. 挑战实例的 Kubernetes 元数据

排查实例问题时按这些标签/注解检索（`crates/cluster/src/manager.rs`）：

| 键 | 类型 | 值说明 |
| --- | --- | --- |
| `ret.sh.cn/challenge` / `team` / `game` / `user` | Label | 关联的题目、队伍、比赛、用户 ID |
| `ret.sh.cn/traffic` | Label | 21 位 nanoid；Service 的 selector 仅通过它绑定 Pod |
| `ret.sh.cn/internet` | Label | `"true"` / `"false"`；`"false"` 命中 `internet-disabled` 策略断网 |
| `ret.sh.cn/renew` | Annotation | 已续期次数（0–3），总存活时长 = `(renew + 1) × 3600` 秒 |
| `ret.sh.cn/ports` | Annotation | 实例暴露端口信息 |
| `ret.sh.cn/traffic-raw` / `ret.sh.cn/traffic-http` | Service Annotation | 各端口的应用层协议 |

常用命令：

```bash
# 按比赛与用户查实例
k3s kubectl -n ret2shell-challenge get pods -l 'ret.sh.cn/game=<id>,ret.sh.cn/user=<uid>' -o wide

# 查看某实例的续期状态
k3s kubectl -n ret2shell-challenge get pod <pod> \
  -o jsonpath='{.metadata.annotations.ret\.sh\.cn/renew}'

# 列出全部实例 Service 与分配的 NodePort
k3s kubectl -n ret2shell-challenge get svc -o wide
```

## 4. 常用运维操作对照

| 操作 | 入口 |
| --- | --- |
| 设置全局调度池 | 面板集群配置或 `PATCH /api/cluster/node-selector`，值填 `challenge` |
| 设置出口拓扑 | 面板流量配置或 `PATCH /api/cluster/traffic`，脚本见[出口拓扑](/architecture/traffic-topologies/) |
| 查询镜像仓库 | 面板镜像页或 `GET /api/cluster/registry/v2/_catalog` |
| 实例过载判断 | `GET /api/cluster/calmdown`；平台创建实例时收到 `overloaded` 信号 |
| 单场比赛覆盖配置 | `PATCH /api/game/{id}/node-selector`、`/traffic`（比赛归档后失效） |
