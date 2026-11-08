# ret2shell-docs

[Ret2Shell](https://github.com/ret2shell/ret2shell) CTF 竞赛平台的详细文档与运维手册，基于 [Astro Starlight](https://starlight.astro.build) 构建，部署于 GitHub Pages。

线上地址：**https://xihale.github.io/ret2shell-docs/**

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:4321/ret2shell-docs/
pnpm build      # 产物在 dist/
pnpm preview
```

## 内容结构

内容全部位于 `src/content/docs/`：

| 目录 | 内容 |
| --- | --- |
| `index.mdx` / `getting-started.md` | 平台简介、快速开始 |
| `architecture/` | 平台与集群架构、实例运行时、出口拓扑 |
| `deploy/` | 部署形态、k3s 生产部署、镜像与 Registry、扩容、安全加固 |
| `config/` | config.toml、Helm values、运行时配置、ChallengeEnv |
| `api/` | REST API、实时通信与流量隧道 |
| `ops/` | 运维速查、踩坑排障 |

侧边栏在 `astro.config.mjs` 中定义。

## 部署

推送到 `main` 分支后由 `.github/workflows/deploy.yml` 自动构建并发布到 GitHub Pages（仓库 Pages 来源需设置为 **GitHub Actions**）。
