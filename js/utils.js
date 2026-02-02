/**
 * 工具函数模块
 */

const Utils = {
  /**
   * 显示 Toast 提示
   * @param {string} message 提示消息
   * @param {number} duration 显示时长（毫秒）
   */
  toast(message, duration = 2000) {
    // 移除已存在的 toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  },

  /**
   * 显示确认对话框
   * @param {string} message 确认消息
   * @param {string} title 标题
   * @returns {Promise<boolean>} 是否确认
   */
  confirm(message, title = '确认') {
    return new Promise((resolve) => {
      // 使用原生 confirm
      const result = window.confirm(message);
      resolve(result);
    });
  },

  /**
   * 格式化日期
   * @param {Date|string|number} date 日期
   * @param {string} format 格式化模板
   * @returns {string} 格式化后的日期
   */
  formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
      return '';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  /**
   * 格式化相对时间
   * @param {Date|string|number} date 日期
   * @returns {string} 相对时间描述
   */
  formatRelativeTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return this.formatDate(date);
    }
  },

  /**
   * 防抖函数
   * @param {Function} fn 要执行的函数
   * @param {number} delay 延迟时间
   * @returns {Function} 防抖后的函数
   */
  debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  },

  /**
   * 节流函数
   * @param {Function} fn 要执行的函数
   * @param {number} interval 间隔时间
   * @returns {Function} 节流后的函数
   */
  throttle(fn, interval = 300) {
    let last = 0;
    return function(...args) {
      const now = Date.now();
      if (now - last >= interval) {
        last = now;
        fn.apply(this, args);
      }
    };
  },

  /**
   * 深拷贝
   * @param {any} obj 要拷贝的对象
   * @returns {any} 拷贝后的对象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  },

  /**
   * 下载文件
   * @param {string} content 文件内容
   * @param {string} filename 文件名
   * @param {string} mimeType MIME类型
   */
  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * 读取文件
   * @param {File} file 文件对象
   * @returns {Promise<string>} 文件内容
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  },

  /**
   * 解析 URL 参数
   * @param {string} url URL地址
   * @returns {Object} 参数对象
   */
  parseUrlParams(url = window.location.href) {
    const params = {};
    const queryString = url.split('?')[1];

    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }

    return params;
  },

  /**
   * 设置 URL 参数
   * @param {Object} params 参数对象
   * @param {boolean} replace 是否替换历史记录
   */
  setUrlParams(params, replace = true) {
    const url = new URL(window.location.href);

    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, params[key]);
      }
    });

    if (replace) {
      window.history.replaceState({}, '', url.toString());
    } else {
      window.history.pushState({}, '', url.toString());
    }
  },

  /**
   * 复制到剪贴板
   * @param {string} text 要复制的文本
   * @returns {Promise<boolean>} 是否成功
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      }
    } catch (error) {
      console.error('复制失败:', error);
      return false;
    }
  },

  /**
   * 数字动画
   * @param {number} start 起始值
   * @param {number} end 结束值
   * @param {number} duration 动画时长
   * @param {Function} callback 回调函数
   */
  animateNumber(start, end, duration, callback) {
    const startTime = performance.now();
    const difference = end - start;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用 easeOutQuart 缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const current = start + difference * easeProgress;

      callback(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  },

  /**
   * 获取交易类型名称
   * @param {string} type 交易类型
   * @returns {string} 类型名称
   */
  getTransactionTypeName(type) {
    const typeMap = {
      'buy': '买入',
      'sell': '卖出',
      'convert': '转换'
    };
    return typeMap[type] || type;
  },

  /**
   * 获取交易类型颜色类名
   * @param {string} type 交易类型
   * @returns {string} 颜色类名
   */
  getTransactionTypeClass(type) {
    const classMap = {
      'buy': 'profit-positive',
      'sell': 'profit-negative',
      'convert': 'text-secondary'
    };
    return classMap[type] || '';
  },

  /**
   * 验证基金代码
   * @param {string} code 基金代码
   * @returns {boolean} 是否有效
   */
  isValidFundCode(code) {
    return /^\d{6}$/.test(code);
  },

  /**
   * 验证份额
   * @param {number|string} shares 份额
   * @returns {boolean} 是否有效
   */
  isValidShares(shares) {
    const num = parseFloat(shares);
    return !isNaN(num) && num > 0;
  },

  /**
   * 验证价格
   * @param {number|string} price 价格
   * @returns {boolean} 是否有效
   */
  isValidPrice(price) {
    const num = parseFloat(price);
    return !isNaN(num) && num > 0;
  }
};
