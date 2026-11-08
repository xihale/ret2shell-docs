---
title: REST API 概览
description: 鉴权方式与按模块划分的端点地图
---

import { Aside } from '@astrojs/starlight/components';

所有 REST 端点挂在 `/api` 前缀下（`[server] api_base_path` 可改）。完整路由定义见 `crates/server/src/routes/`。

## 鉴权

- **JWT Bearer**：登录后持 `Authorization: Bearer <token>` 访问；access token 短期有效，refresh token 用于续签（`[auth]` 中 `expires_time` / `buffer_time` 控制时长与缓冲）。
- **OAuth**：内置 OAuth 登录路由（`/api/account/oauth/*`）。
- **权限分级**：平台管理（`/api/platform/*`）与集群管理（`/api/cluster/*`）端点需要管理员角色（DevOps）；比赛管理端点校验出题人/组织者身份。

## 模块地图

路由树（`crates/server/src/routes/mod.rs`）：

| 模块 | 前缀 | 覆盖内容 |
| --- | --- | --- |
| account | `/api/account` | 注册、登录、登出、邮箱验证与找回、改密、邀请码、OAuth |
| user | `/api/user` | 用户资料、头像、偏好、用户管理 |
| game | `/api/game` | 比赛全生命周期（见下） |
| team | `/api/game`（team 子路由） | 组队、邀请、成员与权限 |
| bulletin | `/api/bulletin` | 公告 |
| calendar | `/api/calendar` | 赛程日历 |
| event | `/api/event` | 事件通知 |
| media | `/api/media` | 用户上传媒体 |
| wiki | `/api/wiki` | Wiki 页面 |
| platform | `/api/platform` | 平台配置（GET/PATCH）、统计、日志查询、版本与授权信息 |
| cluster | `/api/cluster` | 集群节点、调度、traffic/lifecycle 脚本、registry 代理，见[运行时配置与集群 API](/config/runtime-config/) |
| traffic | `/api/traffic` | wsrx WebSocket 隧道，见[实时通信](/api/realtime/) |
| rpc | `/api/rpc` | 内部 RPC |
| internal | `/api/internal` | 题目仓库同步回调 |
| — | `/api/ping` | 健康检查 |

### game 模块子资源

`crates/server/src/routes/game/`：

| 子资源 | 说明 |
| --- | --- |
| `core` | 比赛 CRUD、报名、开赛/结束控制 |
| `challenge` | 题目列表与详情 |
| `challenge/instance` | 实例开启/状态/续期/销毁（配额与 60s 防抖见[实例运行时](/architecture/instance-lifecycle/)） |
| `challenge/submission` | 提交与判题 |
| `challenge/attachment` / `resource` | 附件与资源下载 |
| `challenge/checker` | 判题脚本（Rune） |
| `challenge/hint` | 提示 |
| `admin` | 比赛管理（题目编排、缓存、可见性等） |
| `participant` | 参赛者管理 |
| `team` | 组队 |
| `chat` / `notification` | 比赛内聊天与通知 |
| `statistics` | 排行榜与统计 |
| `registry` | 比赛级题目镜像仓库操作 |
| `repo` / `repo_sync` | 题目仓库与同步 |
| `runtime` / `hook` / `lifecycle` | 比赛级运行时配置与实例事件回调 |

## 速率限制

所有请求经 GCRA 限流（`[server.rate_limit]`，默认 burst 32、500ms 恢复速率）；触发限流返回 429。

## 约定

- 时间戳为 Unix 秒。
- 实例/比赛相关操作的结果直接对应[实例运行时](/architecture/instance-lifecycle/)中描述的状态机（如 412 表示命中 60s 启动锁）。
