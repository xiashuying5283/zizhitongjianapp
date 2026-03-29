-- 资治通鉴深度阅读App - 本地数据库初始化脚本
-- 使用方法: createdb zizhitongjian && psql -d zizhitongjian -f init-db.sql

-- 健康检查表
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 朝代表
CREATE TABLE IF NOT EXISTS dynasties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 帝王表
CREATE TABLE IF NOT EXISTS emperors (
  id SERIAL PRIMARY KEY,
  dynasty_id INTEGER REFERENCES dynasties(id),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  reign_start INTEGER,
  reign_end INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dynasty_id, name)
);

-- 卷册表（新结构）
CREATE TABLE IF NOT EXISTS volumes (
  id SERIAL PRIMARY KEY,
  volume_number INTEGER NOT NULL UNIQUE,
  volume_name VARCHAR(100) NOT NULL,
  dynasty_id INTEGER REFERENCES dynasties(id),
  year_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 年条目表
CREATE TABLE IF NOT EXISTS year_entries (
  id SERIAL PRIMARY KEY,
  volume_id INTEGER REFERENCES volumes(id),
  emperor_id INTEGER REFERENCES emperors(id),
  year_name VARCHAR(50),
  bc_year INTEGER NOT NULL,
  year_display VARCHAR(50),
  gan_zhi VARCHAR(10),
  original_text TEXT,
  translation TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(volume_id, bc_year)
);

-- 胡三省注表
CREATE TABLE IF NOT EXISTS hu_notes (
  id SERIAL PRIMARY KEY,
  year_entry_id INTEGER REFERENCES year_entries(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 旧版资治通鉴卷册表（保留兼容）
CREATE TABLE IF NOT EXISTS zizhitongjian_volumes (
  id SERIAL PRIMARY KEY,
  volume_number INTEGER NOT NULL UNIQUE,
  era_name TEXT NOT NULL,
  dynasty TEXT NOT NULL,
  volume_name TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  time_range TEXT,
  year_start INTEGER,
  year_end INTEGER
);

-- 旧版资治通鉴段落表（保留兼容）
CREATE TABLE IF NOT EXISTS zizhitongjian_paragraphs (
  id SERIAL PRIMARY KEY,
  volume_id INTEGER REFERENCES zizhitongjian_volumes(id),
  paragraph_index INTEGER NOT NULL,
  original TEXT NOT NULL,
  annotation TEXT NOT NULL,
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  content_with_notes TEXT,
  year_mark VARCHAR(20),
  bc_year INTEGER
);

-- ZHTJ 卷册表
CREATE TABLE IF NOT EXISTS zhtj_volumes (
  id SERIAL PRIMARY KEY,
  volume_number INTEGER NOT NULL UNIQUE,
  volume_name TEXT NOT NULL,
  dynasty TEXT,
  start_year INTEGER,
  end_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ZHTJ 年条目表
CREATE TABLE IF NOT EXISTS zhtj_year_entries (
  id SERIAL PRIMARY KEY,
  volume_id INTEGER REFERENCES zhtj_volumes(id) ON DELETE CASCADE,
  emperor TEXT NOT NULL,
  year_name TEXT NOT NULL,
  gan_zhi TEXT,
  bc_year INTEGER NOT NULL,
  year_display TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ZHTJ 段落表
CREATE TABLE IF NOT EXISTS zhtj_paragraphs (
  id SERIAL PRIMARY KEY,
  year_entry_id INTEGER REFERENCES zhtj_year_entries(id) ON DELETE CASCADE,
  paragraph_index INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  hu_notes JSONB DEFAULT '[]',
  translation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 阅读进度表
CREATE TABLE IF NOT EXISTS reading_progress (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100),
  volume_number INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  last_paragraph_index INTEGER DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reading_progress_device ON reading_progress USING btree (device_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read ON reading_progress USING btree (last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_year_entries_bc_year ON year_entries USING btree (bc_year);
CREATE INDEX IF NOT EXISTS idx_year_entries_volume ON year_entries USING btree (volume_id);
CREATE INDEX IF NOT EXISTS idx_year_entries_emperor_id ON year_entries USING btree (emperor_id);
CREATE INDEX IF NOT EXISTS idx_hu_notes_year_entry_id ON hu_notes USING btree (year_entry_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_year ON zhtj_paragraphs USING btree (year_entry_id);
CREATE INDEX IF NOT EXISTS idx_zhtj_year_entries_bc_year ON zhtj_year_entries USING btree (bc_year);
CREATE INDEX IF NOT EXISTS idx_zhtj_year_entries_volume ON zhtj_year_entries USING btree (volume_id);

-- 社区帖子表
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0
);

-- 帖子点赞表
CREATE TABLE IF NOT EXISTS post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  likes INTEGER DEFAULT 0
);

-- 评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 书签表
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_id VARCHAR(100),
  volume_number INTEGER NOT NULL,
  paragraph_index INTEGER NOT NULL,
  note TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 笔记表
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_id VARCHAR(100),
  volume_number INTEGER NOT NULL,
  paragraph_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 注释表
CREATE TABLE IF NOT EXISTS annotations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_id VARCHAR(100),
  volume_number INTEGER NOT NULL,
  paragraph_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 阅读统计表
CREATE TABLE IF NOT EXISTS reading_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_id VARCHAR(100),
  volume_number INTEGER,
  reading_duration INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, volume_number)
);

-- 人物表
CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  alias TEXT[] DEFAULT '{}',
  dynasty VARCHAR(50),
  description TEXT,
  birth_year INTEGER,
  death_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 人物关系表
CREATE TABLE IF NOT EXISTS character_relations (
  id SERIAL PRIMARY KEY,
  character_id INTEGER REFERENCES characters(id),
  related_character_id INTEGER REFERENCES characters(id),
  relation_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 人物事件表
CREATE TABLE IF NOT EXISTS character_events (
  id SERIAL PRIMARY KEY,
  character_id INTEGER REFERENCES characters(id),
  volume_number INTEGER,
  year_bc INTEGER,
  event_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 反馈表
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_id VARCHAR(100),
  type VARCHAR(20) NOT NULL DEFAULT 'suggestion',
  content TEXT NOT NULL,
  contact VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 年号表（用于年份显示）
CREATE TABLE IF NOT EXISTS era_years (
  id SERIAL PRIMARY KEY,
  era_name VARCHAR(50) NOT NULL,
  era_phase VARCHAR(50),
  year_in_era INTEGER NOT NULL,
  gan_zhi VARCHAR(10),
  gregorian_year INTEGER NOT NULL,
  emperor_name VARCHAR(100),
  emperor_title VARCHAR(50),
  dynasty VARCHAR(50),
  display_name VARCHAR(100),
  note TEXT
);
