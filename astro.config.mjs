// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import mermaid from 'astro-mermaid-satteri';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://xihale.github.io',
  base: '/ret2shell-docs',
  output: 'static',
  markdown: {
    processor: satteri(),
  },
  integrations: [
    mermaid({ autoTheme: true }),
    starlight({
      title: 'Ret2Shell 文档',
      description:
        'Ret2Shell CTF 竞赛平台详细文档与运维手册：架构原理、生产部署、配置参考、API 与排障。',
      favicon: '/favicon.svg',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/ret2shell/ret2shell',
        },
      ],
      defaultLocale: 'root',
      locales: { root: { label: '简体中文', lang: 'zh-CN' } },
      logo: { src: './public/favicon.svg' },
      pagination: false,
      customCss: ['./src/custom.css'],
      sidebar: [
        {
          label: '入门',
          items: [
            { label: '平台简介', link: '/' },
            { label: '快速开始', slug: 'getting-started' },
          ],
        },
        {
          label: '平台管理',
          items: [
            { label: '管理面板总览', slug: 'admin/overview' },
            { label: '创建与管理比赛', slug: 'admin/games' },
            { label: '上题指南（管理面板）', slug: 'admin/challenges' },
            { label: '环境路由与生命周期', slug: 'admin/runtime' },
            { label: '平台级管理', slug: 'admin/platform' },
          ],
        },
        {
          label: '架构与原理',
          items: [
            { label: '平台与集群架构', slug: 'architecture/overview' },
            { label: '题目实例运行时', slug: 'architecture/instance-lifecycle' },
            { label: '出口拓扑与 traffic 脚本', slug: 'architecture/traffic-topologies' },
          ],
        },
        {
          label: '部署指南',
          items: [
            { label: '部署形态总览', slug: 'deploy/overview' },
            { label: 'k3s 生产部署（从零到上线）', slug: 'deploy/k3s-production' },
            { label: '题目镜像与 Registry', slug: 'deploy/challenge-images' },
            { label: '调度与扩容 Playbook', slug: 'deploy/scaling' },
            { label: '安全加固清单', slug: 'deploy/security-hardening' },
          ],
        },
        {
          label: '配置参考',
          items: [
            { label: 'config.toml 全量参考', slug: 'config/reference' },
            { label: 'Helm values 参考', slug: 'config/helm-values' },
            { label: '运行时配置与集群 API', slug: 'config/runtime-config' },
            { label: '题目环境配置（ChallengeEnv）', slug: 'config/challenge-env' },
          ],
        },
        {
          label: 'API 参考',
          items: [
            { label: 'REST API 概览', slug: 'api/rest' },
            { label: '实时通信与流量隧道', slug: 'api/realtime' },
          ],
        },
        {
          label: '运维手册',
          items: [
            { label: '运维速查手册', slug: 'ops/cheatsheet' },
            { label: '踩坑与排障手册', slug: 'ops/troubleshooting' },
          ],
        },
      ],
    }),
  ],
});
