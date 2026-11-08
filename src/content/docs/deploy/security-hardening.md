---
title: 安全加固清单
description: 节点防火墙、命名空间隔离与端口暴露治理
---

import { Aside } from '@astrojs/starlight/components';

CTF 平台的攻击面天然面向恶意用户：题目容器里跑的是选手，网络入口面向公网。本清单汇总一套经过实战检验的纵深防御配置。

## 1. 端口暴露矩阵

| 端口 | 服务 | 暴露面 | 治理 |
| --- | --- | --- | --- |
| 443 | 反向代理（面板） | 公网 | 正常开放 |
| 30000-32767 | 挑战实例 NodePort | 公网（仅入口节点） | 放行；其余节点仅内网 |
| 30307 | 平台 HTTP（NodePort） | 内网 | 入口节点 ufw 顶部 deny |
| 30310 | 内建 registry（NodePort，无鉴权） | 内网 | 入口节点 ufw 顶部 deny |
| 6443 / 10250 / 51820 | apiserver / kubelet / WireGuard | 内网 | 安全组限 VPC 网段 |

<Aside type="caution">
**NodePort 是全区间放行的**：在入口节点对公网放行 `30000-32767` 后，落在区间内的 `30307`（平台后端）与 `30310`（无密码 registry）也会一并暴露——公网可直接 `GET /v2/_catalog` 拖走全部题目镜像。必须在 ufw 顶部插入显式拒绝（[坑 16](/ops/troubleshooting/坑-16--nodeport-全区间放行导致-3030730310-裸露安全审计修复)）：

```bash
sudo ufw insert 1 deny in on eth0 to any port 30307,30310 proto tcp
```

</Aside>

## 2. 挑战命名空间加固（平台层）

平台初始化后执行一次：

```bash
# 1. 禁止挑战 Pod 挂载 ServiceAccount Token（容器内无 k8s 凭据）
k3s kubectl -n ret2shell-challenge patch serviceaccount default \
  -p '{"automountServiceAccountToken": false}'

# 2. 阻断题目容器探测私网与云 metadata（对所有 Pod 生效，即使题目开 internet）
k3s kubectl apply -f - << 'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-internal-networks
  namespace: ret2shell-challenge
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
              - 169.254.0.0/16
EOF
```

叠加平台自建的 `internet-disabled`（题目 `internet: false` 时全断网）后形成双层隔离，见[实例运行时 · 网络隔离](/architecture/instance-lifecycle/#5-网络隔离internet-开关与内网防护)。

## 3. 纯内网计算节点的公网全封闭

纯计算节点即使带有公网 IP，也应彻底切断公网直连出入：外部无法扫到 SSH 或 NodePort，玩家流量统一走入口节点，容器反弹公网 Shell 也出不去。

<Aside type="caution">
**仅 `ufw default deny incoming` 挡不住公网连 NodePort。** kube-proxy 把 NodePort 规则挂在 `nat PREROUTING` 链：外部报文访问 `公网IP:31004` 时在 DNAT 阶段目的 IP 就被改写为 Pod IP，路由判决直接走 **FORWARD** 链而非 INPUT，且 `KUBE-FORWARD` 对带 `0x4000` 标记的包直接放行——绕过 ufw 的 INPUT/FORWARD 拦截。详见[坑 18](/ops/troubleshooting/坑-18--kube-proxy-nat-prerouting-绕过-ufw-input-暴露-nodeport)。
</Aside>

**方案：`*raw PREROUTING` + ufw 双向白名单。** 在 `/etc/ufw/before.rules` 顶部插入 raw 表规则，在 nat PREROUTING **之前**直接丢弃非内网入站包（示例：VPC `10.0.0.0/22`，腾讯云内网 DNS `183.60.83.19/183.60.82.98`，按云厂商替换）：

```text
*raw
:PREROUTING ACCEPT [0:0]
-A PREROUTING -i eth0 -s 10.0.0.0/22 -j ACCEPT
-A PREROUTING -i eth0 -s 169.254.0.0/16 -j ACCEPT
-A PREROUTING -i eth0 -s 183.60.83.19 -p udp --sport 53 -j ACCEPT
-A PREROUTING -i eth0 -s 183.60.82.98 -p udp --sport 53 -j ACCEPT
-A PREROUTING -i eth0 -s 183.60.83.19 -p tcp --sport 53 -j ACCEPT
-A PREROUTING -i eth0 -s 183.60.82.98 -p tcp --sport 53 -j ACCEPT
-A PREROUTING -i eth0 -j DROP
COMMIT
```

配套 ufw 策略（默认拒绝入站/出站/路由，仅放行内网与 overlay 接口）：

```bash
ufw default deny incoming
ufw default deny outgoing
ufw default deny routed

# 仅放行 VPC 内网出入
ufw allow in from 10.0.0.0/22
ufw allow out to 10.0.0.0/22

# 放行云内网软件源/NTP 与 DNS
ufw allow out to 169.254.0.0/16
ufw allow out to 183.60.83.19 port 53
ufw allow out to 183.60.82.98 port 53

# 放行 overlay 与容器网桥接口（含跨节点转发）
ufw allow in on flannel-wg && ufw allow out on flannel-wg
ufw allow in on cni0 && ufw allow out on cni0
ufw route allow in on flannel-wg && ufw route allow out on flannel-wg
ufw route allow in on cni0 && ufw route allow out on cni0
```

运维通道：SSH 经入口节点跳板（`ProxyJump`），不暴露纯内网节点的 22 端口。

## 4. 入口节点 ufw 基线

```bash
sudo ufw insert 1 deny in on eth0 to any port 30307,30310 proto tcp
sudo ufw allow 30000:32767/tcp
sudo ufw allow from 10.0.0.0/22
sudo ufw route allow in on flannel-wg && sudo ufw route allow out on flannel-wg
sudo ufw route allow in on cni0 && sudo ufw route allow out on cni0
```

## 5. k3s 控制面参数

- 用 `--tls-san=<EIP>` 而非 `--node-external-ip`（避免诱导纯内网节点向公网建 remotedialer 隧道，[坑 19](/ops/troubleshooting/坑-19--纯内网节点的-kubectl-execlogs-502--node-external-ip-诱导与主机名大小写)）。
- 禁用不用的组件：`--disable=traefik --disable=servicelb --disable=metrics-server`。
- `--write-kubeconfig-mode=600`。

## 6. 平台层安全特性

| 特性 | 说明 |
| --- | --- |
| JWT | access + refresh 双 token，黑名单 7 天（Valkey） |
| 速率限制 | GCRA，默认 burst 32 / 500ms 恢复（`[server.rate_limit]`） |
| 验证码 | PoW / 图形 / reCAPTCHA v3 / hCaptcha（`[captcha]`） |
| 敏感词审计 | `[auditor]` 团队名/敏感词列表 |
| 题目安全上下文 | `restricted: true` 禁提权 + 非特权端口起始 1024 |
| 动态 flag | 按用户与题目确定性生成，实例重建不变 |

## 7. 加固验证清单

```bash
# 1. 公网无法访问平台与 registry 端口
curl -m 3 http://<入口公网IP>:30307/   # 应超时
curl -m 3 http://<入口公网IP>:30310/v2/_catalog   # 应超时

# 2. 公网 NodePort 正常（开一个测试实例后）
curl -I http://<入口公网IP>:<nodePort>/   # 200

# 3. 纯内网节点公网 IP 全封闭（从外部测试）
curl -m 3 http://<计算节点公网IP>:<nodePort>/   # 超时
curl -m 3 http://<计算节点公网IP>:22/           # 超时

# 4. 挑战命名空间策略齐备
k3s kubectl -n ret2shell-challenge get netpol
k3s kubectl -n ret2shell-challenge get sa default -o yaml | grep automount

# 5. 题目容器内探测私网应被阻断
k3s kubectl -n ret2shell-challenge exec <pod> -- curl -m 3 10.0.0.11:6443   # 应失败
```
