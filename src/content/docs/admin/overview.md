---
title: 管理面板总览
description: Ret2Shell 两级管理面板（平台管理与比赛管理）的入口、页面地图与权限门槛
---

Ret2Shell 的管理操作分为**两级面板**，均基于 Web 界面，不需要命令行：

| 级别 | 入口 | 管什么 | 权限门槛 |
| --- | --- | --- | --- |
| **平台管理** | 顶栏进入 `/admin` | 全站设置、用户、集群、系统运维 | 平台级权限（`DevOps` / `Statistics`） |
| **比赛管理** | 比赛页顶部工具栏（管理员可见） | 单场比赛的全部运营：信息、规则、题目、队伍、监控 | 该比赛的管理员身份 |

:::note[权限模型]
平台用户权限以位掩码存储（`Permission` 枚举，值 0-9）。`DevOps`（9）可操作全部平台管理页；`Statistics`（8）可查看统计与日志；比赛管理员是**针对单场比赛**授予的身份（`isAdminOfGame`），与平台权限相互独立。创建比赛的用户自动成为该比赛管理员。
:::

## 平台管理页面地图（`/admin`）

侧边栏从上到下：

| 页面 | 标题 | 用途 |
| --- | --- | --- |
| `/admin/statistics` | 平台统计信息 | 全站用户数、比赛数、实例规模等总览 |
| `/admin/logs` | 服务器日志 | 后端结构化日志在线检索（排障第一现场） |
| `/admin/edit` | 平台信息 | 首页文案、关于页等平台级内容编辑 |
| `/admin/captcha` | 验证码保护 | PoW 验证码开关与难度 |
| `/admin/media` | 媒体存储 | 平台静态资源（图片等）上传管理 |
| `/admin/email` | 平台发信邮箱 | SMTP 发件配置（注册验证、通知邮件） |
| `/admin/oauth` | 第三方认证 | OAuth2 / CAS 等外部登录源配置（含 Rx 脚本） |
| `/admin/users` | 用户列表 | 用户检索、封禁、权限授予 |
| `/admin/sync` | 资源同步 | 跨节点/跨站资源同步任务 |
| `/admin/cluster` | 集群管理 | Kubernetes 节点状态、资源水位、节点操作 |
| `/admin/traffic` | 环境路由 | 全局 traffic 脚本（出口拓扑） |
| `/admin/lifecycle` | 生命周期 | 实例生命周期函数与预设 |
| `/license` | Ret2Shell 公共许可证 | 许可证全文查看 |

## 比赛管理页面地图（`/games/:id/admin`）

进入自己管理的比赛后，顶部工具栏（首页 · 统计 · 事件看板 · 编辑信息 · **创建**）与侧边栏：

| 页面 | 标题 | 用途 |
| --- | --- | --- |
| `/admin/monitor` | 事件看板 | 提交、审计等事件实时流（自动刷新） |
| `/admin/statistics` | 统计数据 | 本场比赛的做题/得分统计 |
| `/admin/edit` | 编辑信息 | 比赛表单（见[创建与管理比赛](/ret2shell-docs/admin/games/)） |
| `/admin/rules` | 比赛规则 | 面向选手的规则文本 |
| `/admin/policies` | 策略管理 | 队伍/提交等策略限制 |
| `/admin/timeline` | 时段管理 | 比赛时间线预设（配合自动放题） |
| `/admin/hammers` | 锤子反馈 | 选手"锤子"申诉工单处理 |
| `/admin/teams` | 参赛队伍 | 队伍审核与管理 |
| `/admin/organize` | 组织管理 | 主办/协办组织与院校开关 |
| `/admin/events` | 事件推送 | Webhook/推送设备绑定（token 管理） |
| `/admin/traffic` | 环境路由 | 本场比赛的出口拓扑脚本 |
| `/admin/lifecycle` | 生命周期 | 本场比赛的实例生命周期预设 |
| `/admin/captures` | 容器流量 | 容器网络流量捕获查看 |
| `/admin/git` | 题目仓库 | 比赛数据 Git 仓库浏览/克隆 |
| `/admin/delete` | 删除比赛 | 危险操作，二次确认 |

## 上题在哪？

**不在 `/admin` 里。** 题目管理入口在比赛页面的"题目"标签页（`/games/:id/challenges`）：管理员打开后会看到**创建**按钮；点开任意题目后，弹窗内出现管理员专属标签页（题解、附件、实例、评测、统计）。

完整流程见 **[上题指南（管理面板）](/ret2shell-docs/admin/challenges/)**。
