# AGENTS.md — Charlie的电子骨灰盒

## 项目概览

一个以"个人纪念/数字保存"为主题的 Astro 博客，风格简约、文艺、情感化。
名为"Charlie的电子骨灰盒"——一个存放记忆与思念的数字空间。

## 技术栈

- **框架**: Astro 7 (Static Site Generation)
- **样式**: Tailwind CSS 4 + 自定义全局 CSS
- **内容**: Markdown / MDX (Astro Content Collections, glob loader)
- **字体**: Noto Sans SC (中文无衬线) + Noto Serif SC (中文衬线) + Inter (英文)

## 目录结构

```
src/
├── components/          # 可复用组件
│   ├── BaseHead.astro   # <head> 元信息
│   ├── Header.astro     # 顶部导航
│   ├── Footer.astro     # 页脚
│   ├── PostCard.astro   # 文章卡片
│   ├── FormattedDate.astro  # 日期格式化
│   └── Guestbook.astro  # 留言板组件
├── content/
│   └── blog/            # 博客文章 (Markdown)
├── layouts/
│   ├── Layout.astro     # 基础布局
│   └── BlogPost.astro   # 文章详情页布局
├── pages/
│   ├── index.astro      # 首页
│   ├── about.astro      # 关于页
│   ├── rss.xml.js       # RSS 订阅
│   └── blog/
│       ├── index.astro  # 文章目录页
│       └── [slug].astro # 文章详情页
├── styles/
│   └── global.css       # 全局样式 + Tailwind + 文章排版
├── consts.ts            # 站点常量（标题、导航、分类等）
└── content.config.ts    # 内容集合配置
```

## 开发命令

```bash
pnpm install      # 安装依赖
pnpm run dev      # 启动开发服务器
pnpm run build    # 构建生产版本
pnpm run preview  # 预览构建结果
```

## 设计规范

详见 `DESIGN.md`。核心关键词：低饱和色系（黑白灰+暖棕点缀）、简约文艺、留白、呼吸感动效。

## 内容管理

### 新增文章
1. 在 `src/content/blog/` 下新建 `.md` 或 `.mdx` 文件
2. Frontmatter 格式：
```yaml
---
title: 文章标题
description: 文章摘要
pubDate: 2024-01-01
category: essay     # memory | letter | essay | photo | poem
tags: ["标签1", "标签2"]
---
```

### 分类说明
- `memory` — 回忆
- `letter` — 书信
- `essay` — 随笔
- `photo` — 影像
- `poem` — 诗句

## 功能模块

1. **首页**: Hero 区 + 最新文章 + 分类卡片 + 引言 + 留言板
2. **文章页**: 情感化排版（首字下沉、衬线标题、引用样式）
3. **目录页**: 按年份分组 + 分类筛选 + 搜索 + 列表/时间线双视图
4. **关于页**: 个人介绍 + 分类说明 + 趣味清单
5. **留言板**: 本地存储的评论系统（localStorage）

## 关键实现细节

- **内容渲染**: 使用 `post.rendered.html` (glob loader 预渲染结果) 配合 `set:html`
- **搜索/筛选**: 前端实现，数据通过 `<script type="application/json">` 注入
- **响应式**: 移动端单列布局、导航折叠、正文自适应

## 部署

使用 Coze CLI 管理：
- 构建: `pnpm run build`
- 静态产物: `dist/` 目录
