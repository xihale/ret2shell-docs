---
title: 踩坑与排障手册
description: 生产部署演进过程中沉淀的实战坑与修复方法
---

import { Aside } from '@astrojs/starlight/components';

以下条目来自从跨公网组网到云上内网直连生产环境的部署实践。每条含现象、根因、诊断与修复。

## 排障速查表

| 症状 | 首要排查 | 条目 |
| --- | --- | --- |
| 纯内网节点 `kubectl exec/logs` 502 | 去掉控制面 `--node-external-ip`（改 `--tls-san`），主机名改纯小写 | [坑 19](坑-19--纯内网节点的-kubectl-execlogs-502--node-external-ip-诱导与主机名大小写) |
| ufw 禁了公网入站但 NodePort 仍可直连 | `nat PREROUTING` DNAT 绕过 INPUT，需 `*raw PREROUTING` | [坑 18](坑-18--kube-proxy-nat-prerouting-绕过-ufw-input-暴露-nodeport) |
| 切 wireguard-native 后 ping 通但 Pod HTTP 不通 | 删残留 `flannel.1`；ufw 放行 `flannel-wg`/`cni0` | [坑 17](坑-17--切-wireguard-native-后-flannel1-路由残留) |
| 开实例 422 `spec.nodeSelector: Invalid value` | `node-selector` 只填值 `challenge` | [坑 13](坑-13--node-selector-要填标签值不是键值对) |
| 开实例 500 `MissingInstanceFunction` | Checker 脚本 `team.get("id")` 改 `team.id` | [坑 12](坑-12--checker-脚本-teamgetid-运行时炸-missinginstancefunction) |
| 玩家连入口 NodePort 超时 | tcpdump 抓 SYN 分层判丢 | [坑 15](坑-15--ufw-的-path-陷阱与分层判丢法) |
| NodePort 全区间放行裸露 30307/30310 | ufw 顶部 deny | [坑 16](坑-16--nodeport-全区间放行导致-3030730310-裸露安全审计修复) |
| 镜像拉取 `ImagePullBackOff` | 节点 `registries.yaml` 与内网互通 | — |
| PostgreSQL 18 无限 CrashLoop | `mountPath` 改 `/var/lib/postgresql` | [坑 5](坑-5--postgresql-18-镜像拒绝旧挂载点) |
| Helm 连不上集群 | 显式 `KUBECONFIG=/etc/rancher/k3s/k3s.yaml` | [坑 6](坑-6--helm-4-找不到集群) |
| 跨节点 Pod 互访与 Pod 出向超时 | ufw 放行接口收发与 route 转发 | [坑 2](坑-2--计算节点防火墙-forward-链默认丢弃) |

## 坑 1 · 云安全组在 VM 内无法修改，如何判别拦截层

云安全组只能在控制台改。在节点上区分「被云安全组拦截」还是「目标进程未监听」：

```bash
timeout 4 bash -c "echo > /dev/tcp/IP/PORT"
# 立即 Connection refused (RST) = 安全组已放行，目标端口未监听
# 4 秒 timeout = 被云安全组或主机防火墙 DROP
```

## 坑 2 · 计算节点防火墙 FORWARD 链默认丢弃

- **现象**：节点 `Ready`，但跨节点 Pod 互访、该节点 Pod 出向流量全部超时。
- **修复**：ufw 开启默认拒绝后，必须同时放行接口收发与路由转发：

```bash
sudo ufw allow in on flannel-wg && sudo ufw allow out on flannel-wg
sudo ufw allow in on cni0 && sudo ufw allow out on cni0
sudo ufw route allow in on flannel-wg && sudo ufw route allow out on flannel-wg
sudo ufw route allow in on cni0 && sudo ufw route allow out on cni0
```

## 坑 3 & 14 · 双层 Overlay 与 MTU 黑洞（留档）

- **现象**：早期虚拟网（tun0 MTU 1360）叠加 VXLAN 时，Pod `eth0` MTU 1310（MSS 1270），宿主机网桥 `cni0` 停留在遗留的 1280；对外发信卡死在 TLS 握手——对端按满 MSS 回的 1298 字节 IP 包（带 DF）进 `cni0` 被内核静默丢弃，邮件 worker 单线程永久阻塞。
- **根治**：砍掉额外 Overlay 层，物理链路 MTU 1500，`flannel-wg` 与 `cni0` 统一 1420。

## 坑 4 · flannel endpoint 认错 IP

- **根因**：flannel 不读 Node 对象的 ExternalIP，默认取「主机默认路由网卡 IP」写进租约 `PublicIP`。
- **要点**：内网直连部署不需要 `--flannel-external-ip`；该参数仅 `k3s server` 支持，agent 传了会直接报错退出。

## 坑 5 · PostgreSQL 18 镜像拒绝旧挂载点

- **现象**：`postgresql-0` 无限 `CrashLoopBackOff`。
- **根因**：chart 模板硬编码 `mountPath: /var/lib/postgresql/data`；PostgreSQL 18+ 官方镜像要求数据挂到父目录 `/var/lib/postgresql`（数据自动进版本化子目录 `18/docker`）。
- **修复**：用补丁模板覆盖 chart 的 `templates/postgresql.yaml`，**每次升级 chart 后重打**。参考 [k3s 生产部署 · Step 5](/deploy/k3s-production/#step-5-postgresql-18-挂载点补丁)。

## 坑 6 · Helm 4 找不到集群

- **现象**：`helm upgrade` 报连不上 `localhost:8080`。
- **修复**：Helm 不自动读 `/etc/rancher/k3s/k3s.yaml`，显式指定 `KUBECONFIG=/etc/rancher/k3s/k3s.yaml`（可写入 `/root/.bashrc`）。

## 坑 7 · EIP NAT 后出向源 IP 是 VPC 内网 IP

绑定 EIP 的节点主动外发流量时，源 IP 是 VPC 内网地址（EIP 只做目的 NAT）。对端按源 IP 放行时要放行 VPC 网段，而不是 EIP。

## 坑 8 · `pkill -f` 自匹配误杀当前 SSH 会话

`pkill -f k3s-install.sh` 会匹配到包含同字符串的当前 SSH 子 shell 并一起杀掉。用字符类避免自匹配：

```bash
pkill -f '[k]3s-install.sh'
```

## 坑 9 & 10 · 跨网混布时 flannel 租约限制（留档）

flannel 每节点只有一个 `PublicIP`：早期「海外公网节点 + 同 VPC 节点」混布时公网节点与纯内网节点无法直接互通。统一收敛到同一内网地址池后问题不再出现——这是推荐「同地域同 VPC 组网」的原因之一。

## 坑 12 · Checker 脚本 `team.get("id")` 运行时炸 `MissingInstanceFunction`

- **现象**：玩家开启实例报 500，平台日志 `VmError MissingInstanceFunction`；保存脚本时 lint 却显示通过。
- **根因**：Rune 的 `RuneTeam` / `RuneUser` 是原生绑定结构体，只有 `#[rune(get)]` 字段属性（`team.id` / `user.id`），没有字典式 `.get("id")` 方法。
- **修复**：Checker 脚本里所有 `team.get("id")` / `user.get("id")` 改为属性访问 `team.id` / `user.id`。

## 坑 13 · node selector 要填标签值，不是键值对

- **现象**：开启实例 422：`Pod invalid: spec.nodeSelector: Invalid value: "ret.sh.cn/workload=challenge"`。
- **根因**：平台内部固定拼接键名 `ret.sh.cn/workload = <配置值>`；填完整键值对会把整串当标签值，含 `=` 过不了 k8s 校验。
- **修复**：全局、比赛、values 一律只填 `challenge`。见[实例运行时 · 调度标签](/architecture/instance-lifecycle/#2-调度标签nodeselector)。

## 坑 15 · ufw 的 PATH 陷阱与分层判丢法

- **现象**：公网玩家连 NodePort 超时，控制面测试却正常。
- **两层原因**：
  1. 非 root 会话 `PATH` 不含 `/usr/sbin`，直接敲 `ufw` 报 command not found，误以为没装防火墙；`sudo ufw status` 才看到 active 且默认 DROP。
  2. **分层判丢**：入口机 `sudo tcpdump -ni eth0 "tcp port <nodePort>"`，从外部发起连接——抓不到 SYN 是云安全组拦截；抓到 SYN 无回包是主机防火墙拦截。

## 坑 16 · NodePort 全区间放行导致 30307/30310 裸露（安全审计修复）

- **风险**：入口机对公网放行 `30000-32767/tcp` 后，平台后端（30307）与无密码内建 registry（30310）也在区间内，公网可直接 `GET /v2/_catalog` 拖走全部题目镜像。
- **修复**：

```bash
sudo ufw insert 1 deny in on eth0 to any port 30307,30310 proto tcp
```

## 坑 17 · 切 wireguard-native 后 `flannel.1` 路由残留

- **现象**：`wg show flannel-wg` 握手成功，但跨节点访问 Pod IP 超时。
- **根因**：旧 `flannel.1` 网卡未删，其 /24 路由优先于 `flannel-wg` 的 /16；且 ufw 未放行 `flannel-wg`。
- **修复**：

```bash
sudo ip link delete flannel.1
sudo ufw allow in on flannel-wg && sudo ufw allow out on flannel-wg
sudo ufw route allow in on flannel-wg && sudo ufw route allow out on flannel-wg
```

## 坑 18 · kube-proxy `nat PREROUTING` 绕过 ufw INPUT 暴露 NodePort

- **现象**：纯内网计算节点设了 `ufw default deny incoming`、只放行内网段。公网直连其 SSH (22) 确实不通，但直连挑战 NodePort (如 31004) 却返回 200。
- **根因**：Netfilter 钩子顺序是 `raw PREROUTING → conntrack → mangle → nat PREROUTING → 路由判决`。kube-proxy 把 NodePort DNAT 挂在 `nat PREROUTING`：外部报文在 DNAT 阶段目的 IP 已改为 Pod IP（`10.42.x.x`），路由判决走 **FORWARD** 而非 INPUT；`KUBE-FORWARD` 排在 `ufw-before-forward` 之前，对带 `0x4000` 标记的包直接 ACCEPT——ufw 的 INPUT/FORWARD 规则全部被绕开。
- **修复**：`/etc/ufw/before.rules` 顶部加 `*raw` 表，在 nat PREROUTING 之前丢弃非内网入站包：

```text
*raw
:PREROUTING ACCEPT [0:0]
-A PREROUTING -i eth0 -s 10.0.0.0/22 -j ACCEPT      # 内网网段（按实际替换）
-A PREROUTING -i eth0 -s 169.254.0.0/16 -j ACCEPT   # 云内网 metadata/软件源
-A PREROUTING -i eth0 -s 183.60.83.19 -p udp --sport 53 -j ACCEPT   # 云 DNS（按云厂商替换）
-A PREROUTING -i eth0 -s 183.60.82.98 -p udp --sport 53 -j ACCEPT
-A PREROUTING -i eth0 -j DROP
COMMIT
```

完整双向白名单见[安全加固清单](/deploy/security-hardening/#3-纯内网计算节点的公网全封闭)。

## 坑 19 · 纯内网节点的 `kubectl exec/logs` 502：`--node-external-ip` 诱导与主机名大小写

- **现象**：纯内网节点加入集群后 `Ready`，调度与 NodePort 访问正常，但控制面 `kubectl exec/logs` 报 `502 Bad Gateway`（日志：`failed to find Session for client ...`）。
- **两层根因**：
  1. 控制面配了 `--node-external-ip=<EIP>`：k3s supervisor 在 `/v1-k3s/serving` 把公网 IP 下发给 agent 内部负载均衡，纯内网节点封了公网出站，`wss://<EIP>:6443/v1-k3s/connect` 的 remotedialer 隧道建立失败（日志 `Server <EIP>:6443@UNCHECKED->FAILED from failed dial`）。
  2. 云厂商默认主机名含大写（如 `VM-16-2-debian`）：k8s Node 名强制小写，主机名保留大写会引发证书/会话标识不一致。
- **修复**：
  1. 控制面改用 `--tls-san=<EIP>`（只影响证书 SAN，集群内仍宣告内网地址）；
  2. 计算节点自举时强制 `hostnamectl set-hostname $(hostname | tr '[:upper:]' '[:lower:]')`。修复后 exec/logs 恢复毫秒级响应。
