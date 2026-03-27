-- 资治通鉴数据库表结构

-- 朝代表
CREATE TABLE IF NOT EXISTS dynasties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 帝王表
CREATE TABLE IF NOT EXISTS emperors (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    reign_start INTEGER, -- 公元前用负数表示
    reign_end INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dynasty_id, name)
);

-- 卷表
CREATE TABLE IF NOT EXISTS volumes (
    id SERIAL PRIMARY KEY,
    volume_number INTEGER NOT NULL UNIQUE,
    volume_name VARCHAR(100) NOT NULL,
    dynasty_id INTEGER REFERENCES dynasties(id),
    year_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 年号记录表（核心表）
CREATE TABLE IF NOT EXISTS year_entries (
    id SERIAL PRIMARY KEY,
    volume_id INTEGER REFERENCES volumes(id),
    emperor_id INTEGER REFERENCES emperors(id),
    year_name VARCHAR(50), -- 如"二十三年"
    bc_year INTEGER NOT NULL, -- 公元前用负数
    year_display VARCHAR(50), -- 显示格式
    ganzhi VARCHAR(10), -- 干支
    original_text TEXT, -- 原文
    translation TEXT, -- 译文
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(volume_id, bc_year)
);

-- 胡三省注表
CREATE TABLE IF NOT EXISTS hu_notes (
    id SERIAL PRIMARY KEY,
    year_entry_id INTEGER REFERENCES year_entries(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_year_entries_bc_year ON year_entries(bc_year);
CREATE INDEX IF NOT EXISTS idx_year_entries_emperor_id ON year_entries(emperor_id);
CREATE INDEX IF NOT EXISTS idx_hu_notes_year_entry_id ON hu_notes(year_entry_id);
