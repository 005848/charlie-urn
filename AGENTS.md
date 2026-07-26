# AGENTS.md — Charlie的电子骨灰盒

## 项目概览

一个以"个人纪念/数字保存"为主题的 Astro 静态博客，风格简约、文艺、情感化。
名为"Charlie的电子骨灰盒"——一个存放记忆与思念的数字空间。
数据存储在 Supabase (PostgreSQL)，前端直连，支持管理员后台发布文章和管理留言。

## 技术栈

- **框架**: Astro 7 (Static Site Generation + 前端动态加载)
- **样式**: Tailwind CSS 4 + 自定义全局 CSS
- **数据库**: Supabase (PostgreSQL) + 前端 Supabase JS 客户端
- **认证**: Supabase Auth (邮箱密码登录)
- **字体**: Noto Sans SC + Noto Serif SC + Inter

## 目录结构

```
src/
├── components/          # 可复用组件
│   ├── BaseHead.astro   # <head> 元信息 + Supabase 配置注入
│   ├── Header.astro     # 顶部导航
│   ├── Footer.astro     # 页脚
│   ├── PostCard.astro   # 文章卡片
│   ├── FormattedDate.astro  # 日期格式化
│   └── Guestbook.astro  # 留言板组件（前端直连 Supabase）
├── content/
│   └── blog/            # 博客文章 (Markdown，已迁移到数据库)
├── layouts/
│   ├── Layout.astro     # 基础布局
│   └── BlogPost.astro   # 文章详情页布局
├── lib/
│   └── supabase/
│       └── client.ts    # 前端 Supabase 客户端工厂
├── pages/
│   ├── index.astro      # 首页（前端动态加载最新文章）
│   ├── about.astro      # 关于页
│   ├── rss.xml.js       # RSS 订阅
│   ├── blog/
│   │   ├── index.astro  # 文章目录页（前端搜索 + 分类筛选）
│   │   └── [slug].astro # 文章详情页（构建时静态生成）
│   └── admin/
│       ├── login.astro  # 管理员登录页（Supabase Auth）
│       ├── index.astro  # 后台首页
│       ├── posts/
│       │   ├── index.astro  # 文章管理列表
│       │   └── edit.astro   # 文章编辑器（Markdown + 预览）
│       └── comments.astro   # 留言管理
├── styles/
│   └── global.css       # 全局样式 + Tailwind + 文章排版
├── storage/database/
│   ├── shared/schema.ts # Drizzle schema
│   └── supabase-client.ts  # 服务端 Supabase 客户端（service_role）
├── consts.ts            # 站点常量
└── content.config.ts    # 内容集合配置
```

## 开发命令

```bash
pnpm install      # 安装依赖
pnpm run dev      # 启动开发服务器 (端口 5000)
pnpm run build    # 构建生产版本 (静态输出到 dist/)
pnpm run preview  # 预览构建结果
```

## 部署

**纯静态站点**，构建产物在 `dist/` 目录，可部署到任何静态托管平台。

### 环境变量（构建时需要）
- `COZE_SUPABASE_URL` — Supabase 项目 URL
- `COZE_SUPABASE_ANON_KEY` — Supabase 匿名 key
- `COZE_SUPABASE_SERVICE_ROLE_KEY` — Supabase 服务端 key（构建时读数据库生成静态页）

构建时这些变量会通过 Python SDK 自动加载。

### 热铁盒部署说明
1. 导入仓库
2. 构建命令: `pnpm install && pnpm run build`
3. 发布目录: `dist`
4. 环境变量: 在热铁盒后台配置 `PUBLIC_SUPABASE_URL` 和 `PUBLIC_SUPABASE_ANON_KEY`
   （同时代码中已支持 meta 标签注入，构建时自动写入）

## 设计规范

详见 `DESIGN.md`。核心关键词：低饱和色系（黑白灰+暖棕点缀）、简约文艺、留白、呼吸感动效。

## 内容管理

### 管理员登录
- 路径: `/admin/login`
- 默认账号: `admin@charlie.urn` / `admin123456`
- 认证方式: Supabase Auth (邮箱密码)

### 文章管理
- 支持新建、编辑、删除文章
- Markdown 编辑器 + 实时预览
- 草稿/发布状态切换
- 分类: memory | letter | essay | photo | poem

### 留言管理
- 访客留言默认 `pending` 状态，需管理员审核
- 管理员可批准、删除留言

## 数据模型

### blog_posts
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| slug | text | URL 别名（唯一） |
| title | text | 标题 |
| description | text | 摘要 |
| content | text | Markdown 内容 |
| category | post_category | 分类枚举 |
| tags | text[] | 标签数组 |
| status | post_status | draft / published |
| pub_date | date | 发布日期 |
| view_count | int | 浏览量 |
| created_at / updated_at | timestamptz | 时间戳 |

### guestbook_comments
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| author_name | text | 访客昵称 |
| author_email | text | 邮箱（可选） |
| content | text | 留言内容 |
| website | text | 网站（可选） |
| status | comment_status | pending / approved / rejected |
| created_at | timestamptz | 时间戳 |

### 行级安全 (RLS)
- blog_posts: 公开可读已发布文章，认证用户可写
- guestbook_comments: 公开可读已批准留言，公开可插入（默认 pending），认证用户可写
- visit_stats: 公开可读可写

## 关键实现细节

- **文章详情页**: 构建时从 Supabase 读取并静态生成（SEO 友好）
- **首页/目录页**: 浏览器端 JS 动态加载 Supabase 数据（发布即时生效）
- **Supabase 配置注入**: 服务端环境变量 → `<meta>` 标签 → 前端 JS 读取
- **管理后台**: 纯前端 + Supabase SDK，无需自建 API 服务
- **留言审核**: RLS + 前端过滤，确保未经审核的留言不显示

## 迁移脚本

```bash
# 建表 + 导入示例文章
pnpm tsx scripts/setup-database.ts
pnpm tsx scripts/import-posts-db.ts
pnpm tsx scripts/create-admin.ts
```
