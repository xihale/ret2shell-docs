---
title: Helm values 参考
description: Chart 结构、三层 values 分层与关键字段
---

import { Aside } from '@astrojs/starlight/components';

Chart 位于仓库 `deploy/helm/ret2shell/`，`templates/_config.tpl` 会把 values 渲染成平台容器内的 `config.toml`，`templates/_helpers.tpl` 强制安装在 `ret2shell-platform` 命名空间（装到别的 namespace 直接 `fail`）。

## 三层 values 分层

Helm `-f` 可叠加多层，后面的覆盖前面的：

| 层 | 文件 | 内容 |
| --- | --- | --- |
| 公共缩配层 | `values-common.yaml` | 组件模式、StorageClass、PV 大小、资源限制 |
| 暴露层 | `values-exposure.yaml` | 平台暴露方式（ingress/nodePort）、`nodeSelector`、registry 对外地址 |
| 密钥层 | `values.private.yaml` | `signingKey`、数据库/缓存/队列密码 |

`deploy/helm/ret2shell/examples/` 提供四组现成组合：`values-{ingress,nodeport}-{external,internal}.yaml`（external = 外接数据库等依赖，internal = Chart 内建）。

## 关键字段速查（v3.10.11 values.yaml）

### platform

```yaml
platform:
  image:
    repository: ghcr.io/ret2shell/ret2shell
    tag: "3.10.11"          # digest 非空时优先于 tag
  replicaCount: 1           # values.schema.json 固定 const 1，不可改
  rbac:
    create: true
    useClusterAdmin: true   # 平台需要集群管理权限
  exposure:
    type: ingress           # ingress | nodePort
  service:
    port: 8080
    nodePort: 30307         # exposure.type=nodePort 时生效
  persistence:
    size: 420Gi             # local PV 部署时按磁盘实际缩配
    storageClass: ""
  config:                   # 渲染为 config.toml，字段见 config.toml 参考
    auth: { signingKey: "…", bufferTime: 21600, expiresTime: 86400 }
    captcha: { enabled: true, difficulty: 4, validator: pow }
    email: { enabled: false, … }
    logging: { compress: true, filesKept: 3, level: "info,tower_http=info,sqlx=warn" }
    cluster:
      enabled: true
      nodeSelector: ""      # 只填标签值（如 "challenge"），拼为 ret.sh.cn/workload=<值>
      traffic: ""           # 已废弃，用 Admin 面板
      lifecycle: ""
      enableCapture: true
    server:
      apiBasePath: /api
      corsOrigins: "*"
      externalDomain: ret2shell.local
      externalHttps: true
      highlightBanner: ""   # 面板顶部横幅
      zenGame: 0
      rateLimit: { burstLimit: 32, burstRestoreRate: 500 }
    extraToml: ""           # 追加任意原生 TOML 到渲染结果
  blocked:
    content: ""             # 敏感词列表（或用 existingConfigMap）
```

### registry

```yaml
registry:
  mode: internal            # internal | external
  service:
    port: 5000
  externalAccess:
    enabled: true
    serviceType: NodePort
    nodePort: 30310
    host: registry.example.com:30310   # 渲染为 [cluster.registry] external
    insecure: true
  persistence:
    size: 300Gi
  external:                 # mode: external 时使用
    server: registry.example.com
    external: registry.example.com
    insecure: false
    username: ""
    password: ""
```

### postgresql / valkey / nats / victoriaLogs

| 键 | 内建默认 | external 关键字段 |
| --- | --- | --- |
| `postgresql.mode` | `internal`，镜像 `postgres:18-alpine` | `external.{host,port,database,username,password,sslMode}` |
| `valkey.mode` | `internal`，`architecture: standalone`，`auth.enabled: true` | `external.url`（redis:// 连接串） |
| `nats.mode` | `internal`，JetStream `maxMemoryStore: 1Gi` | `external.{host,port,token}` |
| `victoriaLogs.mode` | `internal`，镜像 `victoriametrics/victoria-logs:v1.43.1` | `external.url` |

各组均有独立的 `persistence.{size,storageClass}` 与 `auth` 凭据字段；凭据务必放进 `values.private.yaml` 并与平台侧配置一致。

<Aside type="caution">
**PostgreSQL 18 挂载点**：内建 postgresql 模板的挂载点如需兼容 PostgreSQL 18 镜像，参照[踩坑手册 · 坑 5](/ops/troubleshooting/坑-5--postgresql-18-镜像拒绝旧挂载点)打补丁；每次升级 chart 后要重打。
</Aside>

## 全局项

```yaml
global:
  storageClass: ""          # 各组件未单独指定时使用
  imagePullSecrets: []
  labels: {}
  annotations: {}
```

## 本地校验

```bash
helm template ret2shell deploy/helm/ret2shell -n ret2shell-platform \
  -f values-common.yaml -f values-exposure.yaml -f values.private.yaml > rendered.yaml
helm lint deploy/helm/ret2shell -n ret2shell-platform \
  -f values-common.yaml -f values-exposure.yaml -f values.private.yaml
```
