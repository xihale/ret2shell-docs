---
title: config.toml 全量参考
description: 平台配置文件全部字段、默认值与生效优先级
---

import { Aside } from '@astrojs/starlight/components';

平台启动时读取一份 TOML 配置：开发环境为 `config/config.toml`（样例 `config/config.sample.toml`）；容器部署挂载到 `/etc/ret2shell/`；路径可用环境变量 `CONFIG_PATH` 覆盖。

**生效优先级**：Admin 面板运行时配置（存数据库）＞ 环境变量 ＞ `config.toml` ＞ 代码默认值。

## 配置段总览

| 配置段 | 用途 |
| --- | --- |
| `[auditor]` | 敏感词审计 |
| `[auth]` | JWT 签发 |
| `[bucket]` | 比赛/题目文件存储 |
| `[cache]` | Redis / Valkey 连接 |
| `[captcha]` | 验证码 |
| `[cluster]` | Kubernetes 集群与题目实例 |
| `[database]` | PostgreSQL 连接 |
| `[email]` | SMTP 发信 |
| `[logging]` | 日志与 VictoriaLogs |
| `[media]` | 用户上传 |
| `[queue]` | NATS 连接 |
| `[server]` | HTTP 服务与前端托管 |

## `[auditor]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `sensitive_word_list` | `./config/sensitive_word_list.txt` | 敏感词列表文件路径 |

## `[auth]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `signing_key` | 样例为占位符 | JWT 签名密钥，务必替换为随机字符串（UUID/nanoid） |
| `expires_time` | `86400` | token 有效期（秒） |
| `buffer_time` | `21600` | token 重新签发的缓冲时间（秒） |

## `[bucket]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `path` | `./data/bucket` | 附件/题目文件存储路径 |

## `[cache]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `url` | `redis://localhost:6379` | 连接串，支持四种格式 |

```text
redis://username:password@foo.com:6379/1                       # 单机
rediss://username:password@foo.com:6379/1                      # TLS
redis-cluster://username:password@foo.com:30001?node=bar.com:30002&node=baz.com:30003   # 集群
redis-sentinel://username:password@foo.com:6379/1?sentinelServiceName=fakename&node=foo.com:30001   # 哨兵
```

## `[captcha]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 是否启用 |
| `difficulty` | `4` | 难度（PoW 前导零位数等） |
| `validator` | `pow` | `none` / `image` / `pow` / `recaptcha_v3` / `h_captcha` |

## `[cluster]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `false` | 集群控制器总开关，关闭时平台不接管题目容器 |
| `try_default` | — | 使用 InCluster ServiceAccount（平台运行在 k8s 内时设 `true`） |
| `auto_infer` | — | 推断本机 kubeconfig（仅 `try_default=false` 时生效） |
| `kube_config_path` | `~/.kube/config` | 显式指定 kubeconfig（前两者均为 false 时必填） |
| `node_selector` | `""` | 挑战 Pod 调度标签值，拼为 `ret.sh.cn/workload=<值>`；空串不限制节点。运行时配置可覆盖 |
| `traffic` | — | 出口映射 Rune 脚本。**已废弃**，改用 Admin 面板 |
| `lifecycle` | — | 实例生命周期回调 Rune 脚本 |
| `enable_capture` | `true`（样例） | 流量捕获开关。v3.10.11 源码中未见消费点 |
| `capture_directory` | `./data/captures`（样例） | 捕获文件目录。样例标注 `currently not working` |
| — | — | 清理间隔固定 30 秒，不再可配（样例注释） |

### `[cluster.registry]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 启用内建仓库；启用后不支持混用外部 registry 搜索 |
| `server` | `localhost:5000` | 平台推送镜像的集群内地址 |
| `external` | `localhost:5000` | 写入镜像 tag 前缀的对外地址（k8s 拉取用） |
| `insecure` | `false` | HTTP 无 TLS |
| `username` / `password` | — | 可选鉴权 |

## `[database]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `host` / `port` | `127.0.0.1` / `5432` | PostgreSQL 地址 |
| `user` / `password` / `db` | `ret2shell` / — / `ret2shell` | 认证与库 |
| `ssl_mode` | `disable` | `disable` / `allow` / `prefer` / `require` / `verify-ca` / `verify-full` |

## `[email]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `false` | 是否发信 |
| `host` / `port` | `smtp.example.com` / `587` | SMTP 地址 |
| `sender` / `username` / `password` | `Ret2Shell` / — / — | 发件人 |
| `tls` | `starttls` | `none` / `tls` / `starttls` |

## `[logging]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `level` | `info,tower_http=info,sqlx=warn` | tracing 过滤语法 |
| `directory` | `./data/log` | 本地日志目录 |
| `files_kept` | `3` | 保留文件数 |
| `compress` | `true` | 是否压缩 |
| `victoria` | `http://localhost:9428` | VictoriaLogs 摄入地址 |

## `[media]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `path` | `./data/media` | 上传文件目录 |
| `limit` | `100` | 单用户每周上传数 |
| `anti_theft` | `true` | 防盗链签名 |

## `[queue]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `host` / `port` | `127.0.0.1` / `4222` | NATS 地址 |
| `token` | — | token 认证，优先于 user/password |
| `user` / `password` | — | 两者必须同时有效，否则被忽略 |
| `ping_interval` | `5` | 心跳间隔（秒） |
| `tls` | `false` | 是否 TLS |

## `[server]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `host` / `port` | `127.0.0.1` / `8080` | 监听地址 |
| `api_base_path` | `/api` | API 路由前缀 |
| `cors_origins` | `*` | CORS 来源 |
| `external_domain` | `dev.ret.sh.cn`（样例） | 对外域名（生成外链、wsrx 地址等） |
| `external_https` | `true` | 外链是否使用 https |

### `[server.rate_limit]`（GCRA）

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `burst_limit` | `32` | 突发容量 |
| `burst_restore_rate` | `500` | 恢复速率（毫秒） |

### `[server.frontend]`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `path` | `./web/dist` | 前端静态资源目录 |
| `serve_type` | `static` | `static`（平台托管）或 `proxy`（外部 Nginx/Caddy 托管时反代） |

### 面板可改的字段

以下站点信息不必改配置文件，Admin 面板即可修改（存数据库，优先级更高）：`name`、`footer_info`、`footer_url`、`subject_info`、`subject_url`、`record`（ICP 备案号）、`hide_maker`。

## Standalone 常用环境变量

不用 Helm 时可用环境变量覆盖部分配置：`DATABASE_URL`、`REDIS_URL`（或 `rediss://`）、`NATS_URL`、`SERVER_HOST`、`CONFIG_PATH`。
