/**
 * 本地存储管理模块
 * 用于管理基金持仓、交易记录等数据的本地存储
 */

const Storage = {
  // 存储键名
  KEYS: {
    HOLDINGS: 'fundHoldings',
    TRANSACTIONS: 'transactions',
    CACHE: 'fundCache',
    SETTINGS: 'settings'
  },

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * 获取持仓列表
   * @returns {Array} 持仓基金列表
   */
  getHoldings() {
    try {
      const data = localStorage.getItem(this.KEYS.HOLDINGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取持仓列表失败:', error);
      return [];
    }
  },

  /**
   * 保存持仓列表
   * @param {Array} holdings 持仓列表
   */
  saveHoldings(holdings) {
    try {
      localStorage.setItem(this.KEYS.HOLDINGS, JSON.stringify(holdings));
      return true;
    } catch (error) {
      console.error('保存持仓列表失败:', error);
      return false;
    }
  },

  /**
   * 添加持仓
   * @param {Object} holding 持仓对象
   * @returns {Object|null} 添加后的持仓对象
   */
  addHolding(holding) {
    try {
      const holdings = this.getHoldings();

      // 检查是否已存在相同代码的基金
      const existing = holdings.find(h => h.code === holding.code);
      if (existing) {
        throw new Error('该基金已存在于持仓中');
      }

      holding.id = this.generateId();
      holding.addDate = new Date().toISOString().split('T')[0];
      holding.lastUpdate = Date.now();

      holdings.push(holding);
      this.saveHoldings(holdings);

      return holding;
    } catch (error) {
      console.error('添加持仓失败:', error);
      throw error;
    }
  },

  /**
   * 更新持仓
   * @param {string} id 持仓ID
   * @param {Object} data 更新的数据
   * @returns {Object|null} 更新后的持仓对象
   */
  updateHolding(id, data) {
    try {
      const holdings = this.getHoldings();
      const index = holdings.findIndex(h => h.id === id);

      if (index === -1) {
        throw new Error('未找到该持仓');
      }

      holdings[index] = {
        ...holdings[index],
        ...data,
        lastUpdate: Date.now()
      };

      this.saveHoldings(holdings);
      return holdings[index];
    } catch (error) {
      console.error('更新持仓失败:', error);
      throw error;
    }
  },

  /**
   * 删除持仓
   * @param {string} id 持仓ID
   * @returns {boolean} 是否成功
   */
  deleteHolding(id) {
    try {
      const holdings = this.getHoldings();
      const filtered = holdings.filter(h => h.id !== id);

      if (filtered.length === holdings.length) {
        throw new Error('未找到该持仓');
      }

      this.saveHoldings(filtered);
      return true;
    } catch (error) {
      console.error('删除持仓失败:', error);
      return false;
    }
  },

  /**
   * 获取交易记录
   * @returns {Array} 交易记录列表
   */
  getTransactions() {
    try {
      const data = localStorage.getItem(this.KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取交易记录失败:', error);
      return [];
    }
  },

  /**
   * 添加交易记录
   * @param {Object} transaction 交易对象
   * @returns {Object} 添加后的交易对象
   */
  addTransaction(transaction) {
    try {
      const transactions = this.getTransactions();
      transaction.id = this.generateId();
      transaction.date = transaction.date || new Date().toISOString().split('T')[0];
      transaction.createTime = Date.now();

      transactions.unshift(transaction); // 最新的在前

      localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
      return transaction;
    } catch (error) {
      console.error('添加交易记录失败:', error);
      throw error;
    }
  },

  /**
   * 删除交易记录
   * @param {string} id 交易ID
   * @returns {boolean} 是否成功
   */
  deleteTransaction(id) {
    try {
      const transactions = this.getTransactions();
      const filtered = transactions.filter(t => t.id !== id);

      if (filtered.length === transactions.length) {
        throw new Error('未找到该交易记录');
      }

      localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('删除交易记录失败:', error);
      return false;
    }
  },

  /**
   * 获取基金缓存
   * @param {string} key 缓存键
   * @returns {Object|null} 缓存数据
   */
  getCache(key) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.KEYS.CACHE) || '{}');

      if (key) {
        const item = cache[key];
        if (item && item.expireTime > Date.now()) {
          return item.data;
        }
        return null;
      }

      return cache;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  },

  /**
   * 设置基金缓存
   * @param {string} key 缓存键
   * @param {any} data 缓存数据
   * @param {number} expireMinutes 过期时间（分钟）
   */
  setCache(key, data, expireMinutes = 5) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.KEYS.CACHE) || '{}');
      cache[key] = {
        data,
        updateTime: Date.now(),
        expireTime: Date.now() + expireMinutes * 60 * 1000
      };

      localStorage.setItem(this.KEYS.CACHE, JSON.stringify(cache));
      return true;
    } catch (error) {
      console.error('设置缓存失败:', error);
      return false;
    }
  },

  /**
   * 清除过期缓存
   */
  clearExpiredCache() {
    try {
      const cache = JSON.parse(localStorage.getItem(this.KEYS.CACHE) || '{}');
      const now = Date.now();
      let hasExpired = false;

      for (const key in cache) {
        if (cache[key].expireTime < now) {
          delete cache[key];
          hasExpired = true;
        }
      }

      if (hasExpired) {
        localStorage.setItem(this.KEYS.CACHE, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('清除过期缓存失败:', error);
    }
  },

  /**
   * 获取设置
   * @param {string} key 设置键
   * @returns {any} 设置值
   */
  getSetting(key) {
    try {
      const settings = JSON.parse(localStorage.getItem(this.KEYS.SETTINGS) || '{}');
      return settings[key];
    } catch (error) {
      console.error('获取设置失败:', error);
      return null;
    }
  },

  /**
   * 设置设置
   * @param {string} key 设置键
   * @param {any} value 设置值
   */
  setSetting(key, value) {
    try {
      const settings = JSON.parse(localStorage.getItem(this.KEYS.SETTINGS) || '{}');
      settings[key] = value;
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('设置失败:', error);
      return false;
    }
  },

  /**
   * 导出所有数据
   * @returns {string} JSON格式的数据
   */
  exportData() {
    try {
      const data = {
        holdings: this.getHoldings(),
        transactions: this.getTransactions(),
        settings: JSON.parse(localStorage.getItem(this.KEYS.SETTINGS) || '{}'),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('导出数据失败:', error);
      return null;
    }
  },

  /**
   * 导入数据
   * @param {string} jsonString JSON格式的数据
   * @returns {boolean} 是否成功
   */
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // 验证数据格式
      if (!data.version) {
        throw new Error('无效的数据格式');
      }

      if (data.holdings) {
        this.saveHoldings(data.holdings);
      }

      if (data.transactions) {
        localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
      }

      if (data.settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data.settings));
      }

      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  },

  /**
   * 清除所有数据
   */
  clearAll() {
    try {
      localStorage.removeItem(this.KEYS.HOLDINGS);
      localStorage.removeItem(this.KEYS.TRANSACTIONS);
      localStorage.removeItem(this.KEYS.CACHE);
      localStorage.removeItem(this.KEYS.SETTINGS);
      return true;
    } catch (error) {
      console.error('清除数据失败:', error);
      return false;
    }
  },

  /**
   * 获取存储使用情况
   * @returns {Object} 存储信息
   */
  getStorageInfo() {
    try {
      let total = 0;
      const items = {};

      for (const key in this.KEYS) {
        const storageKey = this.KEYS[key];
        const value = localStorage.getItem(storageKey);
        if (value) {
          const size = new Blob([value]).size;
          total += size;
          items[storageKey] = size;
        }
      }

      return {
        total,
        items,
        count: {
          holdings: this.getHoldings().length,
          transactions: this.getTransactions().length
        }
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  }
};
