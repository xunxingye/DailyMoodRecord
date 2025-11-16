document.addEventListener("DOMContentLoaded", () => {
  const moodCards = document.querySelectorAll(".mood-card");
  const toast = document.getElementById("toast");
  const toastIcon = document.querySelector(".toast-icon");
  const toastMessage = document.querySelector(".toast-message");
  const diary = document.getElementById("diary");
  const charCount = document.getElementById("charCount");
  let selectedMood = null;
  let selectedMoodData = null;
  // 使用本地时区的日期，避免时区问题
  let todayDate = new Date().getFullYear() + '-' + 
                  String(new Date().getMonth() + 1).padStart(2, '0') + '-' + 
                  String(new Date().getDate()).padStart(2, '0');

  // 初始化页面
  async function init() {
    console.log('Initializing main page...');
    // 不再自动加载今日心情，保持输入界面为空
    // await loadTodayMood();
    updateCharCount();
    
    // 清空所有输入内容，确保刷新时是空白状态
    if (diary) {
      diary.value = '';
    }
    
    // 重置所有心情卡片选择状态
    moodCards.forEach(card => card.classList.remove('selected'));
    selectedMood = null;
    selectedMoodData = null;
  }

  // 加载今日心情
  async function loadTodayMood() {
    try {
      console.log('Loading today mood for:', todayDate);
      const response = await fetch(`/api/mood/${todayDate}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Today mood loaded:', data);
        displayTodayMood(data);
      } else if (response.status === 404) {
        console.log('No mood record for today');
        // 没有记录，显示空白表单
      } else {
        throw new Error('Failed to load today mood');
      }
    } catch (error) {
      console.error('加载今日心情失败:', error);
      showToast('数据加载失败，请检查网络连接', '❌');
    }
  }

  // 显示今日心情
  function displayTodayMood(moodData) {
    // 填充文本内容
    if (diary && moodData.content) {
      diary.value = moodData.content;
      updateCharCount();
    }

    // 选中对应的心情卡片
    const moodValue = getMoodValue(moodData.mood);
    const targetCard = document.querySelector(`[data-mood="${moodValue}"]`);
    if (targetCard) {
      selectMoodCard(targetCard, moodData);
    }
  }

  // 将数字心情转换为字符串
  function getMoodValue(moodLevel) {
    const moodMap = { 1: 'low', 2: 'medium', 3: 'high' };
    return moodMap[moodLevel] || 'medium';
  }

  // 将字符串心情转换为数字
  function getMoodLevel(moodValue) {
    const levelMap = { 'low': 1, 'medium': 2, 'high': 3 };
    return levelMap[moodValue] || 2;
  }

  // 选中心情卡片
  function selectMoodCard(card, moodData = null) {
    // 重置所有卡片
    moodCards.forEach(c => c.classList.remove('selected'));
    
    // 选中当前卡片
    card.classList.add('selected');
    selectedMood = card.dataset.mood; // 保存字符串值: "low", "medium", "high"
    
    console.log('Selected mood (string):', selectedMood); // 添加调试
    
    // 保存心情数据
    selectedMoodData = {
      mood: selectedMood, // 直接使用字符串，不转换
      emoji: card.querySelector('.mood-emoji').textContent,
      label: card.querySelector('.mood-label').textContent
    };

    // 如果是从数据库加载的，使用原始数据
    if (moodData) {
      selectedMoodData = {
        mood: moodData.mood,
        emoji: moodData.emoji,
        label: selectedMoodData.label
      };
    }

    console.log('Selected mood data:', selectedMoodData);
  }

  // 字符计数更新
  function updateCharCount() {
    const count = diary.value.length;
    charCount.textContent = count;
    
    if (count > 450) {
      charCount.style.color = 'rgba(239,68,68,0.8)';
    } else if (count > 350) {
      charCount.style.color = 'rgba(251,191,36,0.8)';
    } else {
      charCount.style.color = 'rgba(255,255,255,0.7)';
    }
  }

  diary.addEventListener('input', updateCharCount);

  // 心情卡片点击
  moodCards.forEach(card => {
    card.addEventListener("click", () => {
      selectMoodCard(card);

      // 获取心情信息
      const moodLabel = card.querySelector('.mood-label').textContent;
      const moodEmoji = card.querySelector('.mood-emoji').textContent;

      // 显示提示
      showToast(`${moodEmoji} 已选择：${moodLabel}`, "✨");
    });

    // 添加点击动效
    card.addEventListener('mousedown', () => {
      card.style.transform = 'translateY(-2px) scale(0.95)';
    });

    card.addEventListener('mouseup', () => {
      card.style.transform = '';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // 保存按钮
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const diaryText = diary.value.trim();
    
    if (!diaryText) {
      showToast("请先写下今天的心情吧 📝", "⚠️");
      diary.focus();
      diary.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => diary.style.animation = '', 500);
      return;
    }
    
    if (!selectedMood) {
      showToast("别忘了选择今天的心情哦 😊", "⚠️");
      return;
    }

    try {
      console.log('Saving mood record:', { content: diaryText, mood: selectedMood });
      
      // 保存心情记录 - 不发送日期，让服务器自己获取北京时间
      const response = await fetch('/api/mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: diaryText,
          mood: selectedMood
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Save response:', result);
        
        // 成功保存
        showToast("今日心情保存成功！✨", "✅");
        
        // 添加成功动效
        const saveBtn = document.getElementById("saveBtn");
        saveBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          saveBtn.style.transform = '';
        }, 150);
      } else {
        const errorText = await response.text();
        console.error('Save failed:', response.status, errorText);
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存心情记录失败:', error);
      showToast("保存失败，请稍后重试", "❌");
    }
  });

  // 查看历史
  document.getElementById("historyBtn").addEventListener("click", () => {
    showToast("正在跳转到历史页面...", "📅");
    
    setTimeout(() => {
      window.location.href = "./history.html";
    }, 800);
  });

  // 改进的提示函数
  function showToast(message, icon = "💬") {
    if (toastIcon && toastMessage) {
      toastIcon.textContent = icon;
      toastMessage.textContent = message;
    } else {
      toast.textContent = `${icon} ${message}`;
    }
    
    toast.setAttribute('aria-hidden', 'false');

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.setAttribute('aria-hidden', 'true');
    }, 3000);
  }

  // 添加摇晃动画
  const shakeStyle = document.createElement('style');
  shakeStyle.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      50% { transform: translateX(5px); }
      75% { transform: translateX(-3px); }
    }
  `;
  document.head.appendChild(shakeStyle);

  // 初始化字符计数
  updateCharCount();
  
  // 初始化页面
  init();
});
