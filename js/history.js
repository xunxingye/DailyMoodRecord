console.log('History.js loading...');

(function() {
  console.log('IIFE started');
  
  // 获取当前北京时间并设置为默认显示月份
  const beijingTime = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
  let currentDate = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate());
  console.log('🗓️ 北京时间初始化完成:');
  console.log('   年份:', currentDate.getFullYear());
  console.log('   月份:', currentDate.getMonth() + 1, '月');
  console.log('   日期:', currentDate.getDate());
  console.log('   完整日期:', currentDate.toString());
  
  let entries = {};

  // DOM 元素
  const calendarEl = document.getElementById('calendar');
  const monthYearEl = document.getElementById('monthYear');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const modal = document.getElementById('detailModal');

  // 心情等级映射
  const moodConfig = {
    'low': { emoji: '😞', label: '低落', class: 'mood-low' },
    'medium': { emoji: '😐', label: '一般', class: 'mood-medium' },
    'high': { emoji: '😄', label: '开心', class: 'mood-high' }
  };
  
  // 向后兼容：数字键映射
  const numericMoodConfig = {
    1: { emoji: '😞', label: '低落', class: 'mood-low' },
    2: { emoji: '😐', label: '一般', class: 'mood-medium' },
    3: { emoji: '😄', label: '开心', class: 'mood-high' }
  };

  // 默认emoji池
  const defaultEmojis = ['📝', '📄', '📋', '📖', '📑', '🗓️'];

  // 中文月份
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  // 中文星期
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // 初始化
  async function init() {
    console.log('🚀 初始化历史页面...');
    console.log('📅 显示日期:', currentDate.getFullYear(), '年', currentDate.getMonth() + 1, '月');
    
    createWeekdaysHeader();
    createLegend();
    await loadAndRenderCalendar();
    bindEvents();
  }

  // 创建星期标题
  function createWeekdaysHeader() {
    const weekdaysEl = document.querySelector('.weekdays');
    if (!weekdaysEl) return;

    weekdaysEl.innerHTML = weekdays.map(day => 
      `<div class="weekday">${day}</div>`
    ).join('');
  }

  // 创建图例
  function createLegend() {
    const legendEl = document.querySelector('.legend');
    if (!legendEl) return;

    legendEl.innerHTML = `
      <div class="legend-item">
        <div class="legend-dot low"></div>
        <span>低落</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot medium"></div>
        <span>一般</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot high"></div>
        <span>开心</span>
      </div>
    `;
  }

  // 加载并渲染日历
  async function loadAndRenderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    console.log(`🔍 正在加载 ${year}年${month}月 的心情数据...`);
    
    try {
      const apiUrl = `/api/moods/${year}/${month}`;
      console.log(`� 请求URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      console.log(`� 响应状态: ${response.status}`);
      
      if (response.ok) {
        const rawData = await response.json();
        console.log('🎯 API返回数据:', rawData);
        console.log('📝 数据键:', Object.keys(rawData));
        
        // 处理数据
        entries = {};
        for (const key in rawData) {
          const data = rawData[key];
          console.log(`处理键: ${key}, 数据:`, data);
          
          if (typeof key === 'string' && /^\d+$/.test(key)) {
            // 数字字符串键: "29" -> 29
            const dayNum = parseInt(key);
            entries[dayNum] = data;
            console.log(`✅ 存储第${dayNum}天:`, entries[dayNum]);
          }
        }
        
        console.log('📋 最终entries对象:', entries);
      } else {
        console.log(`⚠️ API请求失败: ${response.status}`);
        entries = {};
      }
      
      renderCalendar();
    } catch (error) {
      console.error('❌ 加载心情数据失败:', error);
      entries = {};
      renderCalendar();
    }
  }

  // 渲染日历
  function renderCalendar() {
    if (!calendarEl || !monthYearEl) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    console.log(`🔄 开始渲染日历: ${year}年${month + 1}月`);
    console.log(`📊 当前entries对象:`, entries);
    
    // 更新月份年份显示
    monthYearEl.textContent = `${year}年${monthNames[month]}`;

    // 计算日历信息
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // 转换为周一开始
    const daysInMonth = lastDay.getDate();
    
    console.log(`📅 月份信息: 第一天星期${firstDayOfWeek}, 本月共${daysInMonth}天`);

    // 清空日历
    calendarEl.innerHTML = '';

    let dayCount = 0;

    // 添加前置空白格子
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'day empty';
      calendarEl.appendChild(emptyDay);
      dayCount++;
    }

    // 添加本月日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'day';
      
      // 构建日期字符串
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // 查找心情记录
      const entry = entries[d];
      console.log(`🔍 第${d}天的数据:`, entry);
      
      // 日期数字
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = d;
      dayEl.appendChild(dayNumber);

      // emoji
      const emojiEl = document.createElement('div');
      emojiEl.className = 'day-emoji';
      
      if (entry) {
        console.log(`✨ 第${d}天有心情记录:`, entry);
        
        // 获取心情配置
        let config = moodConfig[entry.mood] || numericMoodConfig[entry.mood];
        
        if (config) {
          emojiEl.textContent = config.emoji;

          // 兼容：同时添加 mood-* 类 与 简短类 (low/medium/high)
          // 这样会同时匹配 .day.mood-low 与 .day.low 等不同的 CSS 规则
          dayEl.classList.add(config.class);
          try {
            const shortClass = String(config.class).replace(/^mood-/, '');
            if (shortClass) {
              dayEl.classList.add(shortClass);
            }
          } catch (e) {
            // 忽略任何异常，保底只添加 config.class
            console.warn('无法添加短类名:', e);
          }
          
          dayEl.classList.add('has-entry'); // 可选标记，便于进一步样式调整
          
          // 设置数据属性
          dayEl.setAttribute('data-date', dateStr);
          dayEl.setAttribute('data-mood', entry.mood);
          dayEl.setAttribute('data-content', entry.content || '');
          dayEl.style.cursor = 'pointer';
          
          console.log(`🎭 第${d}天显示: ${config.emoji} (${entry.mood})`);
        } else {
          console.log(`❓ 第${d}天心情格式未识别: ${entry.mood}`);
          emojiEl.textContent = '❓';
        }
      } else {
        // 无心情记录
        const defaultEmoji = defaultEmojis[d % defaultEmojis.length];
        emojiEl.textContent = defaultEmoji;
        dayEl.classList.add('no-entry');
        console.log(`📝 第${d}天无记录，显示默认: ${defaultEmoji}`);
      }
      
      dayEl.appendChild(emojiEl);
      calendarEl.appendChild(dayEl);
      dayCount++;
    }

    // 填充剩余格子
    while (dayCount < 42) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'day empty';
      calendarEl.appendChild(emptyDay);
      dayCount++;
    }

    console.log(`✅ 日历渲染完成，共${dayCount}个格子`);
  }

  // 绑定事件
  function bindEvents() {
    // 上一月
    if (prevBtn) {
      prevBtn.addEventListener('click', async () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        await loadAndRenderCalendar();
      });
    }

    // 下一月
    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        await loadAndRenderCalendar();
      });
    }

    // 日期点击事件
    if (calendarEl) {
      calendarEl.addEventListener('click', (e) => {
        console.log('🖱️ 日历被点击, 目标:', e.target);
        
        const dayEl = e.target.closest('.day');
        console.log('📅 找到日期元素:', dayEl);
        
        if (!dayEl) {
          console.log('❌ 未找到.day元素');
          return;
        }
        
        if (dayEl.dataset && dayEl.dataset.date && dayEl.dataset.mood) {
          console.log('✅ 找到心情数据:', {
            date: dayEl.dataset.date,
            mood: dayEl.dataset.mood,
            content: dayEl.dataset.content
          });
          
          const dateStr = dayEl.dataset.date;
          const entry = {
            mood: dayEl.dataset.mood,
            content: dayEl.dataset.content || ''
          };
          
          showDetail(dateStr, entry);
        } else {
          console.log('⚠️ 这一天没有心情数据');
        }
      });
    }

    // 模态框关闭事件
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    });
  }

  // 显示详情模态框
  function showDetail(dateStr, entry) {
    if (!modal) {
      console.error('❌ 模态框元素未找到');
      return;
    }

    console.log('🚀 显示详情:', { dateStr, entry });
    
    const config = moodConfig[entry.mood] || numericMoodConfig[entry.mood];
    
    if (!config) {
      console.error('❌ 未找到心情配置:', entry.mood);
      return;
    }
    
    // 解析日期
    const dateParts = dateStr.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    const dateDisplay = `${year}年${month}月${day}日`;
    
    const modalInner = modal.querySelector('.modal-inner');
    if (!modalInner) {
      console.error('❌ 模态框内容元素未找到');
      return;
    }
    
    modalInner.innerHTML = `
      <button class="modal-close" onclick="closeModal()">×</button>
      <div class="title">${dateDisplay}</div>
      <div class="mood">
        ${config.emoji} ${config.label}
      </div>
      <div class="content">${entry.content || '暂无内容'}</div>
    `;
    
    modal.setAttribute('aria-hidden', 'false');
    console.log('✅ 模态框已显示');
  }

  // 关闭模态框
  function closeModal() {
    if (!modal) return;
    
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      const modalInner = modal.querySelector('.modal-inner');
      if (modalInner) {
        modalInner.innerHTML = '';
      }
    }, 200);
  }

  // 全局函数供HTML调用
  window.closeModal = closeModal;

  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM加载完成，开始初始化...');
    init();
  });

})();

console.log('✅ History.js 加载完成');