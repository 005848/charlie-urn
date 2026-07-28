-- ========================================
-- Charlie的电子骨灰盒 - 数据库修复脚本 v2
-- 兼容 PostgreSQL 12+（去掉 CREATE POLICY IF NOT EXISTS）
-- ========================================

-- 1. 升级 blog_posts 表结构
-- ========================================

ALTER TABLE blog_posts ALTER COLUMN category TYPE text USING category::text;

-- 添加缺失字段（用 DO 块避免重复添加报错）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'cover_image') THEN
    ALTER TABLE blog_posts ADD COLUMN cover_image text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'weather') THEN
    ALTER TABLE blog_posts ADD COLUMN weather text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'mood') THEN
    ALTER TABLE blog_posts ADD COLUMN mood text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'unlock_date') THEN
    ALTER TABLE blog_posts ADD COLUMN unlock_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'like_count') THEN
    ALTER TABLE blog_posts ADD COLUMN like_count integer DEFAULT 0;
  END IF;
END $$;

UPDATE blog_posts SET like_count = 0 WHERE like_count IS NULL;

-- 2. 创建 categories 表（分类）
-- ========================================

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_policy" ON categories;
CREATE POLICY "categories_select_policy" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_all_policy" ON categories;
CREATE POLICY "categories_all_policy" ON categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. 创建 tags 表（标签）
-- ========================================

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_select_policy" ON tags;
CREATE POLICY "tags_select_policy" ON tags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tags_all_policy" ON tags;
CREATE POLICY "tags_all_policy" ON tags
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4. 创建 post_tags 关联表
-- ========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    CREATE TABLE IF NOT EXISTS post_tags (
      post_id integer REFERENCES blog_posts(id) ON DELETE CASCADE,
      tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      PRIMARY KEY (post_id, tag_id)
    );
  ELSE
    CREATE TABLE IF NOT EXISTS post_tags (
      post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
      tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      PRIMARY KEY (post_id, tag_id)
    );
  END IF;
END $$;

ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_tags_select_policy" ON post_tags;
CREATE POLICY "post_tags_select_policy" ON post_tags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_tags_all_policy" ON post_tags;
CREATE POLICY "post_tags_all_policy" ON post_tags
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. 创建 post_likes 表（点赞）
-- ========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    CREATE TABLE IF NOT EXISTS post_likes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id integer REFERENCES blog_posts(id) ON DELETE CASCADE,
      visitor_id text,
      ip_address text,
      user_agent text,
      created_at timestamptz DEFAULT now()
    );
  ELSE
    CREATE TABLE IF NOT EXISTS post_likes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
      visitor_id text,
      ip_address text,
      user_agent text,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_likes_post_visitor ON post_likes(post_id, visitor_id);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select_policy" ON post_likes;
CREATE POLICY "post_likes_select_policy" ON post_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_likes_insert_policy" ON post_likes;
CREATE POLICY "post_likes_insert_policy" ON post_likes
  FOR INSERT WITH CHECK (true);

-- 6. 创建 memorial_dates 表（纪念日）
-- ========================================

CREATE TABLE IF NOT EXISTS memorial_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  type text DEFAULT 'anniversary',
  description text,
  is_annual boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE memorial_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memorial_dates_select_policy" ON memorial_dates;
CREATE POLICY "memorial_dates_select_policy" ON memorial_dates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "memorial_dates_all_policy" ON memorial_dates;
CREATE POLICY "memorial_dates_all_policy" ON memorial_dates
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 7. SQL 函数：增加浏览量
-- ========================================

CREATE OR REPLACE FUNCTION increment_view_count(post_slug text)
RETURNS integer AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE slug = post_slug;
  
  RETURN (SELECT view_count FROM blog_posts WHERE slug = post_slug);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. SQL 函数：增加点赞数（自动适配 id 类型）
-- ========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION increment_like_count(post_id_param integer)
      RETURNS integer AS $inner$
      BEGIN
        UPDATE blog_posts
        SET like_count = COALESCE(like_count, 0) + 1
        WHERE id = post_id_param;
        
        RETURN (SELECT like_count FROM blog_posts WHERE id = post_id_param);
      END;
      $inner$ LANGUAGE plpgsql SECURITY DEFINER;
    $func$;
  ELSE
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION increment_like_count(post_id_param uuid)
      RETURNS integer AS $inner$
      BEGIN
        UPDATE blog_posts
        SET like_count = COALESCE(like_count, 0) + 1
        WHERE id = post_id_param;
        
        RETURN (SELECT like_count FROM blog_posts WHERE id = post_id_param);
      END;
      $inner$ LANGUAGE plpgsql SECURITY DEFINER;
    $func$;
  END IF;
END $$;

-- 9. SQL 函数：减少点赞数（自动适配 id 类型）
-- ========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION decrement_like_count(post_id_param integer)
      RETURNS integer AS $inner$
      BEGIN
        UPDATE blog_posts
        SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
        WHERE id = post_id_param;
        
        RETURN (SELECT like_count FROM blog_posts WHERE id = post_id_param);
      END;
      $inner$ LANGUAGE plpgsql SECURITY DEFINER;
    $func$;
  ELSE
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION decrement_like_count(post_id_param uuid)
      RETURNS integer AS $inner$
      BEGIN
        UPDATE blog_posts
        SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
        WHERE id = post_id_param;
        
        RETURN (SELECT like_count FROM blog_posts WHERE id = post_id_param);
      END;
      $inner$ LANGUAGE plpgsql SECURITY DEFINER;
    $func$;
  END IF;
END $$;

-- 10. 添加 rejected 到 comment_status 枚举
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'comment_status' AND e.enumlabel = 'rejected'
  ) THEN
    EXECUTE 'ALTER TYPE comment_status ADD VALUE ''rejected''';
  END IF;
END $$;

-- 11. 插入初始数据
-- ========================================

-- 默认分类
INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('回忆', 'memory', '那些闪闪发光的日子', 1),
  ('书信', 'letter', '想对你说的话', 2),
  ('随笔', 'essay', '零碎的思绪', 3),
  ('影像', 'photo', '定格的瞬间', 4),
  ('诗', 'poem', '给你的诗', 5)
ON CONFLICT (slug) DO NOTHING;

-- 示例纪念日
INSERT INTO memorial_dates (title, date, type, description, is_annual, sort_order)
SELECT '初见的日子', '2018-03-15', 'anniversary', '那天阳光正好', true, 1
WHERE NOT EXISTS (SELECT 1 FROM memorial_dates WHERE title = '初见的日子');

INSERT INTO memorial_dates (title, date, type, description, is_annual, sort_order)
SELECT 'Charlie 的生日', '2020-07-20', 'birthday', '生日快乐呀', true, 2
WHERE NOT EXISTS (SELECT 1 FROM memorial_dates WHERE title = 'Charlie 的生日');

-- ========================================
-- 执行完成！
-- ========================================
