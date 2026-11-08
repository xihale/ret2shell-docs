---
title: 环境路由、生命周期与集群
description: 通过面板管理实例出口拓扑（traffic 脚本）、生命周期预设、容器流量捕获与集群节点
---

本页覆盖比赛级与平台级的**运行时管理**页面：环境路由、生命周期、容器流量、集群管理。全部为面板操作。

## 环境路由（traffic）

入口：比赛级 `/games/:id/admin/traffic`；平台级 `/admin/traffic`。

实例的"出口如何暴露"由 **traffic 脚本**（`.rx`，Rune 脚本）决定，核心原语是 `expose(node, service)`。面板内置两个预设：

| 预设 | 拓扑 | 适用 |
| --- | --- | --- |
| `single_node_direct` | 单节点直连：实例端口直接暴露在所在节点 | 单集群、节点有公网入口 |
| `multi_node_direct` | 多节点直连：计算节点暴露 + 入口节点转发 | 计算/入口分离的多节点拓扑 |

选择预设后可在编辑器里微调；UDP 服务无法经平台代理与 WSRX 访问（转发层限制），需在脚本中自行处理。协议与端口在[题目环境](/ret2shell-docs/admin/challenges/#4-配置环境实例标签页)中定义。

## 生命周期（lifecycle）

入口：比赛级 `/games/:id/admin/lifecycle`；平台级 `/admin/lifecycle`。

控制实例的自动行为：

- **functions**：生命周期钩子函数（启动、回收等时机的自动化动作）；
- **preset**：预设组合，比赛级可直接套用平台预设。

与题目 TTL 的关系：实例默认按时限自动回收，选手端可用 **延长一小时** 续期；生命周期预设定义的是批量/自动维度的策略。

## 容器流量（captures）

入口：`/games/:id/admin/captures`。查看比赛实例的网络流量捕获记录，用于安全审计与作弊取证。

## 集群管理（cluster）

入口：`/admin/cluster`，平台级页面：

- **节点状态**：各 Kubernetes 节点的 Ready 状态、版本；
- **节点资源**：CPU/内存/存储水位；
- **节点操作**：选择节点执行管理动作（排水、标签等）。

:::note[与部署文档的边界]
集群管理页管的是**已接入集群的运行时状态**；节点加入、存储类、镜像仓库对接等属于部署期操作，见 [k3s 生产部署](/ret2shell-docs/deploy/k3s-production/)。
:::

## 镜像仓库

游戏镜像仓库由平台按比赛自动划分（`useRegistryConfig` / `useRegistryRepositories`），仓库地址与凭据在 Helm values 中配置（见 [Helm values 参考](/ret2shell-docs/config/helm-values/)）。面板内的镜像上传走 `POST /game/:id/registry`，无需本地 docker。
