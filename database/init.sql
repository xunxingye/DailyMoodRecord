-- 心情记录数据库初始化脚本
-- 适用于MySQL 5.7+

-- 创建数据库
CREATE DATABASE IF NOT EXISTS daily_mood CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE daily_mood;

-- 创建心情记录表
CREATE TABLE IF NOT EXISTS mood_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE COMMENT '记录日期',
    content TEXT NOT NULL COMMENT '心情内容',
    mood ENUM('low', 'medium', 'high') NOT NULL COMMENT '心情状态：low-低落，medium-平静，high-开心',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_date (date),
    INDEX idx_mood (mood),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日心情记录表';

-- 插入示例数据（可选）
INSERT IGNORE INTO mood_records (date, content, mood) VALUES
('2024-09-29', '今天天气很好，心情不错，完成了几个重要的任务。', 'high'),
('2024-09-28', '普通的一天，没有什么特别的事情发生。', 'medium'),
('2024-09-27', '工作压力有点大，感觉有些疲惫。', 'low');

-- 创建用户（如果需要）
-- CREATE USER IF NOT EXISTS 'dailymood'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON daily_mood.* TO 'dailymood'@'localhost';
-- FLUSH PRIVILEGES;

-- 显示表结构
DESCRIBE mood_records;

-- 显示插入的示例数据
SELECT * FROM mood_records ORDER BY date DESC;
