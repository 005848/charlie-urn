-- ============================================================
-- Charlie的电子骨灰盒 — 全文搜索迁移脚本
-- 作用：为 blog_posts 表添加全文搜索能力
-- 执行方式：在 Supabase SQL Editor 中运行此脚本
-- ============================================================

-- 1. 添加 search_vector 列（tsvector 类型）
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. 创建更新 search_vector 的函数
CREATE OR REPLACE FUNCTION blog_posts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建触发器（先删后建，避免重复）
DROP TRIGGER IF EXISTS blog_posts_search_vector_update ON blog_posts;

CREATE TRIGGER blog_posts_search_vector_update
BEFORE INSERT OR UPDATE OF title, description, content
ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION blog_posts_search_vector_update();

-- 4. 创建 GIN 索引（加速全文搜索）
CREATE INDEX IF NOT EXISTS blog_posts_search_vector_idx
ON blog_posts USING GIN (search_vector);

-- 5. 为已有数据填充 search_vector
UPDATE blog_posts
SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'C');

-- 6. 创建搜索函数（供前端 RPC 调用）
-- 入参：search_term 搜索关键词，page_limit 每页数量，page_offset 偏移量
-- 返回：匹配的文章列表 + 总数
CREATE OR REPLACE FUNCTION search_blog_posts(
  search_term text,
  page_limit int DEFAULT 20,
  page_offset int DEFAULT 0,
  category_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  description text,
  category post_category,
  pub_date date,
  tags text[],
  rank float4,
  total_count bigint
) AS $$
DECLARE
  query_text text;
BEGIN
  -- 将搜索词转换为 tsquery（支持空格分隔的多关键词 AND 搜索）
  query_text := regexp_replace(search_term, '\s+', ' & ', 'g');

  RETURN QUERY
  SELECT
    p.id,
    p.slug,
    p.title,
    p.description,
    p.category,
    p.pub_date,
    p.tags,
    ts_rank(p.search_vector, to_tsquery('simple', query_text)) AS rank,
    count(*) OVER () AS total_count
  FROM blog_posts p
  WHERE
    p.status = 'published'
    AND (category_filter IS NULL OR p.category = category_filter::post_category)
    AND p.search_vector @@ to_tsquery('simple', query_text)
  ORDER BY rank DESC, p.pub_date DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. 验证执行
-- 执行完后可以用下面这条测试：
-- SELECT * FROM search_blog_posts('纪念', 10, 0);

-- ============================================================
-- 回滚脚本（如需撤销）：
-- DROP FUNCTION IF EXISTS search_blog_posts(text, int, int, text);
-- DROP TRIGGER IF EXISTS blog_posts_search_vector_update ON blog_posts;
-- DROP FUNCTION IF EXISTS blog_posts_search_vector_update();
-- DROP INDEX IF EXISTS blog_posts_search_vector_idx;
-- ALTER TABLE blog_posts DROP COLUMN IF EXISTS search_vector;
-- ============================================================
