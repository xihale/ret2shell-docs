---
title: 部署形态总览
description: Docker Compose、Helm 与 Standalone 三种部署形态的选择与组合
---

import { Aside } from '@astrojs/starlight/components';

Ret2Shell 支持三种部署形态，可按环境组合：

| 形态 | 适用场景 | 依赖管理 | 题目集群 |
| --- | --- | --- | --- |
| **Docker Compose（dev）** | 本地开发调试 | `docker-compose.dev.yml` 一键拉起五件套 | 无（`cluster.enabled=false`）或外接集群 |
| **Docker Compose（prod）** | 单机小规模部署 | `deploy/compose/docker-compose.yml` | 外部 k8s 集群（kubeconfig 挂载） |
| **Helm / k3s（生产推荐）** | 正式比赛 | Chart 内建全部六件套 | 同集群（InCluster） |
| **Standalone** | 二进制直跑 | 手工自备 PostgreSQL/Valkey/NATS | `kube_config_path` 指向外部集群 |

## 决策要点

- **要跑动态容器题**：必须有一个 Kubernetes 集群。生产强烈推荐[平台与集群同装](/architecture/overview/#3-平台连接-kubernetes-的方式)——k3s 单机即可起步，节点扩容见[调度与扩容 Playbook](/deploy/scaling/)。
- **Compose 单机生产**：平台二进制跑在 compose 外或作为服务跑在 compose 内，通过 `kube_config_path = "/etc/ret2shell/kubeconfig.yaml"` 连接外部集群。
- **完整从零到上线的 k3s 流程**：见 [k3s 生产部署](/deploy/k3s-production/)。

## 相关源码位置

| 内容 | 路径 |
| --- | --- |
| Compose 与 Nginx 配置 | `deploy/compose/`、`deploy/nginx-module/`、`deploy/caddy/` |
| Helm chart | `deploy/helm/ret2shell/`（含 4 组示例 values） |
| k8s 手工部署清单 | `deploy/k8s/`（StorageClass、values 示例） |
| 配置样例 | `config/config.sample.toml` |

## 官方容器镜像

```bash
# 平台镜像（内含 skopeo，支持面板上传题目镜像）
ghcr.io/ret2shell/ret2shell:3.10.11

# 本地构建
./release-image.sh
```
