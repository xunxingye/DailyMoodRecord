const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daily_mood',
  charset: 'utf8mb4'
  // 移除timezone设置，让数据库使用默认行为
};

// 创建数据库连接池
let pool;
async function initDatabase() {
  try {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // 测试连接
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// API路由

// 获取指定日期的心情记录
app.get('/api/mood/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT * FROM mood_records WHERE date = ?',
      [date]
    );
    
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: '未找到该日期的记录' });
    }
  } catch (error) {
    console.error('获取心情记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 保存或更新心情记录
app.post('/api/mood', async (req, res) => {
  try {
    const { content, mood } = req.body;
    
    // 服务器获取北京时间
    const beijingTime = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
    const date = beijingTime.toISOString().split('T')[0];
    
    console.log('服务器获取的北京日期:', date);
    console.log('收到保存请求:', { date, content, mood });
    
    if (!content || !mood) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 检查是否已存在记录
    const [existing] = await pool.execute(
      'SELECT id FROM mood_records WHERE date = ?',
      [date]
    );
    
    if (existing.length > 0) {
      // 更新现有记录
      console.log('更新现有记录:', date);
      await pool.execute(
        'UPDATE mood_records SET content = ?, mood = ?, updated_at = NOW() WHERE date = ?',
        [content, mood, date]
      );
    } else {
      // 创建新记录
      console.log('创建新记录:', date);
      await pool.execute(
        'INSERT INTO mood_records (date, content, mood, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [date, content, mood]
      );
    }
    
    console.log('保存成功');
    res.json({ success: true, message: '心情记录保存成功' });
  } catch (error) {
    console.error('保存心情记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取指定年月的所有心情记录
app.get('/api/moods/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    console.log(`获取心情记录: ${year}-${month}`);
    
    // 正确计算月份的最后一天
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    
    // 使用简单的日期计算，避免时区问题
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    
    console.log(`日期范围: ${startDate} 到 ${endDate}`);
    
    const [rows] = await pool.execute(
      'SELECT * FROM mood_records WHERE date >= ? AND date <= ? ORDER BY date',
      [startDate, endDate]
    );
    
    console.log(`找到 ${rows.length} 条记录`);
    
    // 转换为以日期为键的对象
    const moodData = {};
    rows.forEach(record => {
      console.log('处理记录:', record);
      
      // 正确处理日期，避免时区偏移
      let dateStr;
      if (record.date instanceof Date) {
        // 使用本地日期格式，避免UTC转换导致的日期偏移
        const year = record.date.getFullYear();
        const month = String(record.date.getMonth() + 1).padStart(2, '0');
        const day = String(record.date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else if (typeof record.date === 'string') {
        // 如果已经是字符串，直接使用
        dateStr = record.date;
      } else {
        // 其他情况，转换为字符串
        dateStr = record.date.toString();
      }
      
      console.log('处理后的日期:', dateStr);
      
      const day = parseInt(dateStr.split('-')[2]);
      moodData[day] = {
        content: record.content,
        mood: record.mood,
        date: dateStr
      };
    });
    
    console.log('返回数据:', moodData);
    res.json(moodData);
  } catch (error) {
    console.error('获取月度心情记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除心情记录
app.delete('/api/mood/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const [result] = await pool.execute(
      'DELETE FROM mood_records WHERE date = ?',
      [date]
    );
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: '记录删除成功' });
    } else {
      res.status(404).json({ error: '未找到该记录' });
    }
  } catch (error) {
    console.error('删除心情记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 为 history.html 添加特定路由以禁用缓存
app.get('/history.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'history.html'));
});

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📝 心情记录应用已启动`);
  });
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('正在关闭服务器...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

startServer().catch(console.error);
