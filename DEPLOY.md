# 部署指南

## Cloudflare Pages 部署

### 前置准备

1. 一个 Supabase 项目（免费版即可）：https://supabase.com/
2. 一个 Cloudflare 账号：https://pages.cloudflare.com/

### 步骤一：准备 Supabase 数据库

1. 登录 Supabase，创建新项目
2. 进入项目 → **SQL Editor** → 新建查询
3. 运行以下建表 SQL（全部复制粘贴执行）：

```sql
-- 文章分类枚举
CREATE TYPE post_category AS ENUM ('memory', 'letter', 'essay', 'photo', 'poem');

-- 文章状态枚举
CREATE TYPE post_status AS ENUM ('draft', 'published');

-- 评论状态枚举
CREATE TYPE comment_status AS ENUM ('pending', 'approved', 'rejected');

-- 文章表
CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  content text NOT NULL,
  category post_category DEFAULT 'essay',
  tags text[] DEFAULT '{}',
  status post_status DEFAULT 'draft',
  pub_date date,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  cover_image text,
  weather text,
  mood text,
  unlock_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 留言表
CREATE TABLE guestbook_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_email text,
  content text NOT NULL,
  website text,
  status comment_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 访问统计表
CREATE TABLE visit_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  visit_count integer DEFAULT 0,
  last_visited timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 分类表
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 标签表
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 文章-标签关联表
CREATE TABLE post_tags (
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

-- 文章点赞表
CREATE TABLE post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, visitor_id)
);

-- 纪念日表
CREATE TABLE memorial_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  type text DEFAULT 'anniversary',
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 自动更新 updated_at 函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON blog_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 增加浏览量函数
CREATE OR REPLACE FUNCTION increment_view_count(post_slug TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE slug = post_slug AND status = 'published'
  RETURNING view_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 增加点赞数函数
CREATE OR REPLACE FUNCTION increment_like_count(post_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE blog_posts
  SET like_count = like_count + 1
  WHERE id = post_id_param
  RETURNING like_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 减少点赞数函数
CREATE OR REPLACE FUNCTION decrement_like_count(post_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE blog_posts
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = post_id_param
  RETURNING like_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 插入默认分类
INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('回忆', 'memory', '那些年那些事', 1),
  ('书信', 'letter', '写给远方的你', 2),
  ('随笔', 'essay', '随想随记', 3),
  ('影像', 'photo', '用镜头定格的时光', 4),
  ('诗句', 'poem', '散落的文字碎片', 5)
ON CONFLICT (slug) DO NOTHING;
```

### 步骤二：配置 RLS（行级安全）

继续在 SQL Editor 执行：

```sql
-- 启用 RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_dates ENABLE ROW LEVEL SECURITY;

-- blog_posts: 公开可读已发布文章
CREATE POLICY "posts_select_public" ON blog_posts
  FOR SELECT USING (status = 'published');

-- blog_posts: 认证用户可写
CREATE POLICY "posts_write_auth" ON blog_posts
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- guestbook_comments: 公开可读已审核留言
CREATE POLICY "comments_select_public" ON guestbook_comments
  FOR SELECT USING (status = 'approved');

-- guestbook_comments: 公开可插入（默认待审核）
CREATE POLICY "comments_insert_public" ON guestbook_comments
  FOR INSERT WITH CHECK (status = 'pending');

-- guestbook_comments: 认证用户可管理
CREATE POLICY "comments_write_auth" ON guestbook_comments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- visit_stats: 公开读写
CREATE POLICY "visit_stats_select_public" ON visit_stats
  FOR SELECT USING (true);

CREATE POLICY "visit_stats_insert_public" ON visit_stats
  FOR INSERT WITH CHECK (true);

-- categories: 公开可读，认证可写
CREATE POLICY "categories_select_public" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_write_auth" ON categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- tags: 公开可读，认证可写
CREATE POLICY "tags_select_public" ON tags
  FOR SELECT USING (true);

CREATE POLICY "tags_write_auth" ON tags
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- post_tags: 公开可读，认证可写
CREATE POLICY "post_tags_select_public" ON post_tags
  FOR SELECT USING (true);

CREATE POLICY "post_tags_write_auth" ON post_tags
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- post_likes: 公开读写
CREATE POLICY "likes_select_public" ON post_likes
  FOR SELECT USING (true);

CREATE POLICY "likes_insert_public" ON post_likes
  FOR INSERT WITH CHECK (true);

-- memorial_dates: 公开可读，认证可写
CREATE POLICY "memorial_select_public" ON memorial_dates
  FOR SELECT USING (true);

CREATE POLICY "memorial_write_auth" ON memorial_dates
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### 步骤三：配置 Storage（媒体存储）

1. Supabase 后台 → **Storage** → 新建存储桶
2. 名称：`media`
3. 设为**公开**（Public）
4. 配置存储桶策略：

```sql
-- 公开读
CREATE POLICY "media_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- 认证用户可上传
CREATE POLICY "media_insert_auth" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- 认证用户可删除
CREATE POLICY "media_delete_auth" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND auth.role() = 'authenticated');
```

### 步骤四：创建管理员账号

在 SQL Editor 执行：

```sql
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user
) VALUES (
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@charlie.urn',
  crypt('admin123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"admin","name":"Charlie"}'::jsonb,
  false
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email;
```

### 步骤五：Cloudflare Pages 配置

1. 登录 Cloudflare Pages → **Create a project** → **Connect to Git**
2. 选择你的 GitHub 仓库
3. 构建设置：
   - **Framework preset**: `Astro`
   - **Build command**: `pnpm install && pnpm run build`
   - **Build output directory**: `dist`
4. **Environment variables**（环境变量）中添加：

| 变量名 | 值 | 说明 |
|--------|----|------|
| `PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 项目 URL |
| `PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase anon public key |
| `SUPABASE_URL` | `https://xxx.supabase.co` | 同上（构建时用） |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase service_role key（构建时读取数据库用） |

5. 点 **Save and Deploy**

### 步骤六：验证

部署完成后：
1. 打开网站，首页应该能看到文章列表
2. 访问 `/admin/login`，用 `admin@charlie.urn` / `admin123456` 登录
3. 尝试发布一篇新文章
4. 测试留言板功能

### 环境变量说明

项目支持多种环境变量命名方式，按优先级匹配：

**构建时（服务端读取数据库）：**
1. `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
2. `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`
3. `COZE_SUPABASE_URL` / `COZE_SUPABASE_SERVICE_ROLE_KEY`（Coze 平台专用）

**浏览器端（前端直连）：**
从 HTML meta 标签读取，构建时自动注入：
- `x-supabase-url`
- `x-supabase-anon-key`
