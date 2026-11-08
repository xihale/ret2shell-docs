---
title: 题目环境配置（ChallengeEnv）
description: 题目容器环境字段、默认值与编排示例
---

import { Aside } from '@astrojs/starlight/components';

每道动态容器题在题目配置里带一段容器环境描述（源码定义：`crates/config/src/cluster.rs` 的 `ChallengeEnv` / `ChallengeImage`），平台据此创建 Pod 与 Service。

## 字段参考

### 顶层 `ChallengeEnv`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `images` | — | 容器列表，每项一个 `ChallengeImage`（一个 Pod 内多容器） |
| `internet` | — | `false` 时 Pod 打标 `ret.sh.cn/internet="false"`，命中 `internet-disabled` 策略全断网 |
| `pull_secret` | `""` | 外部私有仓库的 Secret 名；内建仓库留空。Secret 必须建在 `ret2shell-challenge` 命名空间 |

### `ChallengeImage`

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `name` | — | 容器与 ServicePort 名称 |
| `tag` | — | **完整镜像地址**，内建仓库必须带 external 前缀 |
| `port` | — | **必填**。容器暴露端口；缺省会因 Service 无端口报 `MissingField("service ports")` |
| `protocol` | `TCP` | `TCP` / `UDP` / `STCP` |
| `app_protocol` | `raw` | `raw` / `http`，写入 Service 注解 `ret.sh.cn/traffic-{raw\|http}` |
| `cpu` / `cpu_req` | — / `0.01` | CPU limit / request（核）。低 request 降低调度门槛 |
| `mem` / `mem_req` | — / `32Mi` | 内存 limit / request |
| `storage` / `storage_req` | `3Gi` / `64Mi` | 临时存储 limit / request |
| `restricted` | `false` | `true` 时禁提权、drop `NET_BIND_SERVICE`，Pod 级设置 `net.ipv4.ip_unprivileged_port_start=1024` |

## 编排示例

```yaml
images:
  - name: pwn-xx
    tag: "registry.example.com:30310/challenge/pwn-xx:latest"  # 完整镜像引用
    cpu: 1
    cpu_req: 0.01
    mem: 64Mi
    mem_req: 32Mi
    storage: 3Gi
    storage_req: 64Mi
    port: 9999
    protocol: TCP
    app_protocol: raw
    restricted: true
internet: false
pull_secret: ""
```

<Aside type="caution">
`tag` 要写**全量地址**（含仓库前缀与 tag），节点侧再通过 `registries.yaml` 把对外地址重定向到内网拉取（见[题目镜像与 Registry](/deploy/challenge-images/)）。只写 `challenge/pwn-xx` 这类短名会落到 docker.io。
</Aside>

## 与实例行为的关系

- `port` 决定 ServicePort 数量：多个镜像各声明 `port` 即生成多个端口映射，traffic 脚本按端口名逐一返回对外地址。
- `protocol` 支持 UDP（wsrx 中转路径仅支持 TCP）。
- `restricted: true` 与 `internet: false` 是题目安全基线的推荐组合。
- 资源字段直接映射 Pod 的 requests/limits；request 给小值（`cpu_req: 0.01`）可让大量实例挤进同一节点。
