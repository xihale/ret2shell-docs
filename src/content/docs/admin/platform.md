---
title: 平台级管理
description: 用户与权限、第三方认证、邮箱、验证码、媒体存储、资源同步与服务器日志的面板操作
---

本页覆盖 `/admin` 下的平台级管理功能。

## 用户列表

`/admin/users`：

- 按用户名/邮箱检索用户；
- 查看与编辑用户资料、封禁/解封；
- **授予平台权限**：勾选 `Permission` 位（`DevOps` 全权运维、`Statistics` 统计只读等）。

比赛管理员身份不在全局用户页授予——由创建者身份与比赛内授权决定。权限位模型见[管理面板总览](/ret2shell-docs/admin/overview/)。

## 平台信息与媒体

- **平台信息**（`/admin/edit`）：首页文案、关于页等站点级 Markdown 内容。
- **媒体存储**（`/admin/media`）：上传/管理平台图片等静态资源，页面引用其 URL。

## 登录与认证

- **第三方认证**（`/admin/oauth`）：配置 OAuth2（授权码流程）、CAS 等外部登录源。每个 provider 一张表单；进阶逻辑（如院校映射 `institute`）通过内置 **Rx 脚本** 编辑（`email.rx`、`oauth2_auth_code.rx`、`yale_cas.rx`）。
- **平台发信邮箱**（`/admin/email`）：SMTP 服务器、端口、发件人凭据，用于注册验证与通知邮件。
- **验证码保护**（`/admin/captcha`）：PoW 验证码开关与难度调节，防脚本批量注册/撞库。

## 资源同步

`/admin/sync`：跨站点/跨节点同步资源（如媒体、题目资源包）。单站部署一般无需使用。

## 可观测性

- **平台统计信息**（`/admin/statistics`）：用户、比赛、实例规模总览。
- **服务器日志**（`/admin/logs`）：后端结构化日志在线检索，排障第一入口（配合[踩坑与排障手册](/ret2shell-docs/ops/troubleshooting/)）。

## 许可证

`/license` 查看许可证全文。Ret2Shell 使用 GPL-3.0 衍生的自定义许可证，含用户面向的商业化限制条款，商用前阅读 [COMMERCIAL_POLICY](https://github.com/ret2shell/ret2shell/blob/main/COMMERCIAL_POLICY.md)。
