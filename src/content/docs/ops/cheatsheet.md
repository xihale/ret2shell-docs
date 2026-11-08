---
title: 运维速查手册
description: 日常运维一屏速查：拓扑、端口、命令与故障表
---

import { Aside } from '@astrojs/starlight/components';

本文是日常运维的一屏速查。从零搭建见 [k3s 生产部署](/deploy/k3s-production/)，机制细节见[架构与原理](/architecture/overview/)。

## 参考拓扑（示例值）

| 节点 | 内网 IP | 公网 | 标签（`ret.sh.cn/*`） | 职责 |
| --- | --- | --- | --- | --- |
| `ctrl` | 10.0.0.11 | 203.0.113.11（EIP） | 无 | 控制面：k3s server + 平台六件套 + 反向代理，不跑题目 |
| `edge` | 10.0.0.21 | 203.0.113.10（大带宽） | `role=ingress` | 公网入口 + SSH 跳板，不跑题目 |
| `node1` | 10.0.0.31 | 已全封闭 | `workload=challenge` | 纯内网计算节点，兼扩容模板母机（克隆节点命名 `node-*`） |

VPC `10.0.0.0/22` 互通，flannel wireguard-native（MTU 1420）。

## 核心端口

| 端口 | 方向 | 用途 |
| --- | --- | --- |
| TCP 6443 | 计算节点 → ctrl | k3s API 注册与 remotedialer 隧道 |
| UDP 51820 | 节点 ↔ 节点 | flannel wireguard-native overlay |
| TCP 10250 | ctrl ↔ 计算节点 | kubelet（exec/logs/port-forward） |
| TCP 30307 | 反代 → ctrl 本机 | 平台 Web 与 API（公网封堵） |
| TCP 30310 | 计算节点 → ctrl | 内建 registry 拉镜像（公网封堵） |
| TCP 30000–32767 | 玩家 → edge | 挑战实例 NodePort |

## 日常运维命令

```bash
# 1. 集群节点与平台状态
ssh ctrl 'k3s kubectl get nodes -o wide; k3s kubectl -n ret2shell-platform get pods'

# 2. 经入口节点跳板登录纯内网计算节点
ssh -J edge node1 'wg show flannel-wg && ufw status numbered'

# 3. WireGuard overlay 握手状态
ssh ctrl 'wg show flannel-wg'

# 4. 赛前收紧题目调度权限（控制面与入口节点不跑题）
ssh ctrl 'k3s kubectl label node ctrl edge ret.sh.cn/workload-'
# 调试期放开共同跑题：
ssh ctrl 'k3s kubectl label node ctrl edge ret.sh.cn/workload=challenge --overwrite'

# 5. 节点维护（暂停新实例调度，存量实例不受影响）
ssh ctrl 'k3s kubectl cordon <节点名>'
ssh ctrl 'k3s kubectl uncordon <节点名>'

# 6. 平台与实例日志
ssh ctrl 'k3s kubectl -n ret2shell-platform logs deploy/ret2shell-platform --tail=50 -f'
ssh ctrl 'k3s kubectl -n ret2shell-challenge get pods,svc -o wide'

# 7. 内建 registry 镜像列表
ssh ctrl 'curl -s http://127.0.0.1:30310/v2/_catalog'

# 8. 平台 Helm 升级（升级 chart 后重打 postgres 18 补丁）
ssh ctrl 'cd ~/r2s-deploy && KUBECONFIG=/etc/rancher/k3s/k3s.yaml \
  helm upgrade ret2shell . -n ret2shell-platform \
  -f values-common.yaml -f values-exposure.yaml -f values.private.yaml'
```

## 实例生命周期与安全边界

| 机制 | 规则 |
| --- | --- |
| TTL 与续期 | 每次 1 小时，最多续期 3 次（最长 4 小时）；过期判据 `now - started_at > 3600 × (renew + 1)` |
| 配额与防抖 | 个人赛每用户 1 实例，团队赛同队同题 1 实例；Valkey 启动锁 60 秒（`cache:cluster:{user_id}`） |
| SA Token 禁用 | `ret2shell-challenge` 的 default SA 设 `automountServiceAccountToken: false`，容器内无 k8s 凭据 |
| 内网横向隔离 | `deny-internal-networks` NetworkPolicy 阻断 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`、`169.254.0.0/16` |
| 节点公网隔离 | 纯计算节点 `raw PREROUTING` + ufw 默认拒绝，公网出入全断，杜绝绕过入口或反弹 Shell |

## 上题参数速查（ChallengeEnv）

| 参数 | 推荐值 | 说明 |
| --- | --- | --- |
| `tag` | `<仓库地址>:30310/challenge/<名>:latest` | 完整镜像引用；节点按 `registries.yaml` 自动转内网拉取 |
| `port` | `80` / `9999`（依题目） | **必填**，缺省报 `MissingField("service ports")` |
| `protocol` / `app_protocol` | `TCP` / `raw` | UDP 题目仅 NodePort 直连可用 |
| `mem` / `mem_req` | `64Mi` / `32Mi` | 内存上限与请求 |
| `cpu` / `cpu_req` | `1` / `0.01` | 低 request 降低调度门槛 |
| `restricted` | `true` | 禁提权、非特权端口起始 1024 |
| `internet` | `false` | 阻断全部出站 |

<Aside type="caution">
Admin 面板或 API 设置 `nodeSelector` 时**只填标签值** `challenge`，不要填 `ret.sh.cn/workload=challenge`（[坑 13](/ops/troubleshooting/坑-13--node-selector-要填标签值不是键值对)）。
</Aside>

## 常见故障速查

| 症状 | 排查与修复 |
| --- | --- |
| `kubectl exec/logs` 报 502 | 控制面误配 `--node-external-ip`（改用 `--tls-san`）；节点主机名含大写 → [坑 19](/ops/troubleshooting/坑-19--纯内网节点的-kubectl-execlogs-502--node-external-ip-诱导与主机名大小写) |
| ufw 禁了入站但公网仍能连 NodePort | kube-proxy 在 `nat PREROUTING` DNAT 绕过 INPUT，需 `*raw PREROUTING` 丢非内网包 → [坑 18](/ops/troubleshooting/坑-18--kube-proxy-nat-prerouting-绕过-ufw-input-暴露-nodeport) |
| 跨节点 Pod 不通 | ufw 未放行 `flannel-wg`/`cni0` 的 allow 与 route allow → [坑 2](/ops/troubleshooting/坑-2--计算节点防火墙-forward-链默认丢弃)、[坑 17](/ops/troubleshooting/坑-17--切-wireguard-native-后-flannel1-路由残留) |
| 开实例 422 `Invalid value: "ret.sh.cn/workload=..."` | `node-selector` 只填值 `challenge` → [坑 13](/ops/troubleshooting/坑-13--node-selector-要填标签值不是键值对) |
| 开实例 500 `MissingInstanceFunction` | Checker 脚本用 `team.get("id")`，改属性访问 `team.id` → [坑 12](/ops/troubleshooting/坑-12--checker-脚本-teamgetid-运行时炸-missinginstancefunction) |
| 玩家连 NodePort 超时 | 入口机 `sudo tcpdump -ni eth0 "tcp port <N>"` 分层判丢：无 SYN 是云安全组，有 SYN 无回包是主机防火墙 → [坑 15](/ops/troubleshooting/坑-15--ufw-的-path-陷阱与分层判丢法) |
| PostgreSQL CrashLoopBackOff | chart 模板 `mountPath` 改为 `/var/lib/postgresql` → [坑 5](/ops/troubleshooting/坑-5--postgresql-18-镜像拒绝旧挂载点) |
| 镜像拉取 `ImagePullBackOff` | 节点 `registries.yaml` 是否指向内网 registry 地址，内网是否互通 |
