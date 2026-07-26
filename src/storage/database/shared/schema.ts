import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core"

// 文章状态枚举
export const postStatusEnum = pgEnum("post_status", ["published", "draft"])

// 评论状态枚举
export const commentStatusEnum = pgEnum("comment_status", ["approved", "pending", "hidden"])

// 文章分类枚举
export const categoryEnum = pgEnum("post_category", ["memory", "letter", "essay", "photo", "poem"])

// 博客文章表
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").default(""),
  content: text("content").notNull(),
  category: categoryEnum("category").default("essay"),
  tags: text("tags").array().default([]),
  status: postStatusEnum("status").default("published"),
  viewCount: integer("view_count").default(0),
  pubDate: timestamp("pub_date", { withTimezone: true, mode: 'string' }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
})

// 留言板评论表
export const guestbookComments = pgTable("guestbook_comments", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"),
  content: text("content").notNull(),
  website: text("website"),
  status: commentStatusEnum("status").default("approved"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
})

// 访问统计表
export const visitStats = pgTable("visit_stats", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  visitDate: timestamp("visit_date", { withTimezone: true, mode: 'string' }).defaultNow(),
  count: integer("count").default(0),
})
