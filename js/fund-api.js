/**
 * 基金数据 API 模块
 * 用于获取基金净值、估值等数据
 */

// 基金代码搜索缓存
let fundCodeCache = null;

const FundAPI = {
  // API 配置
  config: {
    // 基金搜索数据源
    fundSearchUrl: 'https://fund.eastmoney.com/js/fundcode_search.js',
    // 基金实时估值 API
    estimateUrl: 'https://fundgz.eastmoney.com/js',
    // 基金详情 API
    detailUrl: 'https://fund.eastmoney.com/pingzhongdata',
    // 基金历史净值 API
    historyUrl: 'https://fund.eastmoney.com/f10/F10DataApi.aspx',
    // 请求超时时间
    timeout: 10000
  },

  /**
   * JSONP 请求
   * @param {string} url 请求URL
   * @param {string} callbackName 回调函数名
   * @returns {Promise} 请求结果
   */
  jsonp(url, callbackName = 'cb') {
    return new Promise((resolve, reject) => {
      // 生成唯一的回调函数名
      const callback = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const script = document.createElement('script');

      // 设置超时
      const timeout = setTimeout(() => {
        delete window[callback];
        document.body.removeChild(script);
        reject(new Error('请求超时'));
      }, this.config.timeout);

      // 定义回调函数
      window[callback] = (data) => {
        clearTimeout(timeout);
        delete window[callback];
        document.body.removeChild(script);
        resolve(data);
      };

      // 错误处理
      script.onerror = () => {
        clearTimeout(timeout);
        delete window[callback];
        if (script.parentNode) {
          document.body.removeChild(script);
        }
        reject(new Error('API 请求失败'));
      };

      // 设置请求URL
      script.src = url.includes('callback=')
        ? url.replace('callback=', 'callback=' + callback)
        : url.includes('cb=')
        ? url.replace('cb=', 'cb=' + callback)
        : url + (url.includes('?') ? '&' : '?') + 'callback=' + callback;

      document.body.appendChild(script);
    });
  },

  /**
   * 加载基金代码数据
   * @returns {Promise<Array>} 基金列表
   */
  async loadFundCodes() {
    // 如果已有缓存，直接返回
    if (fundCodeCache) {
      return fundCodeCache;
    }

    try {
      // 从 localStorage 读取缓存
      const cached = localStorage.getItem('fundCodeCache');
      if (cached) {
        const data = JSON.parse(cached);
        // 缓存有效期7天
        if (data.expireTime > Date.now()) {
          fundCodeCache = data.funds;
          return fundCodeCache;
        }
      }

      // 从服务器加载基金数据
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timeout = setTimeout(() => {
          if (script.parentNode) {
            document.body.removeChild(script);
          }
          reject(new Error('加载基金数据超时'));
        }, this.config.timeout);

        script.onload = () => {
          clearTimeout(timeout);
          if (script.parentNode) {
            document.body.removeChild(script);
          }
          // 数据已加载到全局变量 r 中
          if (typeof r !== 'undefined' && Array.isArray(r)) {
            fundCodeCache = r;
            // 缓存到 localStorage，有效期7天
            localStorage.setItem('fundCodeCache', JSON.stringify({
              funds: r,
              expireTime: Date.now() + 7 * 24 * 60 * 60 * 1000
            }));
            resolve(r);
          } else {
            reject(new Error('基金数据格式错误'));
          }
        };

        script.onerror = () => {
          clearTimeout(timeout);
          if (script.parentNode) {
            document.body.removeChild(script);
          }
          reject(new Error('加载基金数据失败'));
        };

        script.src = this.config.fundSearchUrl + '?t=' + Date.now();
        document.body.appendChild(script);
      });
    } catch (error) {
      console.error('加载基金代码失败:', error);
      throw error;
    }
  },

  /**
   * 搜索基金
   * @param {string} keyword 搜索关键词（基金代码或名称）
   * @returns {Promise<Array>} 搜索结果列表
   */
  async searchFund(keyword) {
    try {
      if (!keyword || keyword.trim().length === 0) {
        return [];
      }

      const allFunds = await this.loadFundCodes();

      // 搜索匹配：代码或名称包含关键词
      const keywordUpper = keyword.toUpperCase().trim();
      const results = [];

      // 最多返回20条结果
      for (const fund of allFunds) {
        if (results.length >= 20) break;

        const code = fund[0]; // 基金代码
        const pinyin = fund[1]; // 拼音缩写
        const name = fund[2]; // 基金名称
        const type = fund[3]; // 基金类型

        // 匹配代码（精确优先）或名称（模糊）
        if (code === keywordUpper ||
            code.includes(keywordUpper) ||
            name.includes(keyword) ||
            (pinyin && pinyin.toUpperCase().includes(keywordUpper))) {
          results.push({
            code: code,
            name: name,
            type: type,
            pinyin: pinyin
          });
        }
      }

      // 精确匹配代码的结果排在前面
      results.sort((a, b) => {
        if (a.code === keywordUpper) return -1;
        if (b.code === keywordUpper) return 1;
        return 0;
      });

      return results;
    } catch (error) {
      console.error('搜索基金失败:', error);
      throw error;
    }
  },

  /**
   * 获取基金实时估值
   * @param {string} fundCode 基金代码
   * @returns {Promise<Object>} 基金估值数据
   */
  async getFundEstimate(fundCode) {
    try {
      // 首先尝试获取实时估值（仅在交易时间有效）
      const estimateResult = await this.fetchRealTimeEstimate(fundCode);

      // 如果有实时估值数据，直接返回
      if (estimateResult) {
        return estimateResult;
      }

      // 否则获取最新净值数据
      return await this.fetchLatestNetWorth(fundCode);
    } catch (error) {
      console.error('获取基金估值失败:', error);
      throw error;
    }
  },

  /**
   * 获取实时估值数据
   * @param {string} fundCode 基金代码
   * @returns {Promise<Object|null>} 实时估值数据
   */
  async fetchRealTimeEstimate(fundCode) {
    try {
      const url = `${this.config.estimateUrl}/${fundCode}.js?rt=${Date.now()}`;

      return new Promise((resolve) => {
        const script = document.createElement('script');
        const timeout = setTimeout(() => {
          cleanup();
          resolve(null); // 超时返回null，尝试其他方式
        }, 3000);

        const cleanup = () => {
          clearTimeout(timeout);
          if (script.parentNode) {
            document.body.removeChild(script);
          }
        };

        // 尝试解析返回的数据
        script.onload = () => {
          cleanup();
          // 检查是否有数据被定义（通过检查全局变量）
          const dataKey = `jsonpgz_${fundCode}`;
          if (window[dataKey]) {
            const data = window[dataKey];
            delete window[dataKey];
            resolve({
              code: fundCode,
              name: data.name || '',
              estimateNetWorth: parseFloat(data.gsz) || 0,
              dayGrowth: parseFloat(data.gszzl) || 0,
              netWorth: parseFloat(data.dwjz) || 0,
              time: data.gztime || ''
            });
          } else {
            resolve(null);
          }
        };

        script.onerror = () => {
          cleanup();
          resolve(null);
        };

        script.src = url;
        document.body.appendChild(script);
      });
    } catch (error) {
      return null;
    }
  },

  /**
   * 获取最新净值数据
   * @param {string} fundCode 基金代码
   * @returns {Promise<Object>} 最新净值数据
   */
  async fetchLatestNetWorth(fundCode) {
    try {
      const url = `${this.config.detailUrl}/${fundCode}.js?v=${Date.now()}`;

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('请求超时'));
        }, this.config.timeout);

        const cleanup = () => {
          clearTimeout(timeout);
          if (script.parentNode) {
            document.body.removeChild(script);
          }
        };

        script.onload = () => {
          cleanup();
          // 从已加载的数据中提取净值信息
          if (typeof Data_netWorthTrend !== 'undefined' && Array.isArray(Data_netWorthTrend) && Data_netWorthTrend.length > 0) {
            const latest = Data_netWorthTrend[Data_netWorthTrend.length - 1];
            resolve({
              code: fundCode,
              name: typeof fS_name !== 'undefined' ? fS_name : '',
              estimateNetWorth: parseFloat(latest.y) || 0,
              dayGrowth: parseFloat(latest.equityReturn) || 0,
              netWorth: parseFloat(latest.y) || 0,
              time: ''
            });
          } else {
            reject(new Error('无法获取净值数据'));
          }
        };

        script.onerror = () => {
          cleanup();
          reject(new Error('API 请求失败'));
        };

        script.src = url;
        document.body.appendChild(script);
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * 获取基金详情
   * @param {string} fundCode 基金代码
   * @returns {Promise<Object>} 基金详情数据
   */
  async getFundDetail(fundCode) {
    try {
      const url = `${this.config.detailUrl}/${fundCode}.js?rt=${Date.now()}`;

      // 使用 JSONP 方式获取数据（兼容 iOS Safari）
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');

        // 设置超时
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('请求超时'));
        }, this.config.timeout);

        const cleanup = () => {
          clearTimeout(timeout);
          if (script.parentNode) {
            document.body.removeChild(script);
          }
        };

        // 加载 JS 文件后解析数据
        script.onload = () => {
          cleanup();
          // 东方财富的详情数据是通过 JS 变量定义的
          // 由于跨域限制，这里我们简化处理，只返回基本信息
          resolve({
            code: fundCode,
            name: '',
            holdings: []
          });
        };

        script.onerror = () => {
          cleanup();
          // 详解文件加载失败不代表失败，可能只是没有详情数据
          resolve({
            code: fundCode,
            name: '',
            holdings: []
          });
        };

        script.src = url;
        document.body.appendChild(script);
      });
    } catch (error) {
      console.error('获取基金详情失败:', error);
      throw error;
    }
  },

  /**
   * 获取基金历史净值
   * @param {string} fundCode 基金代码
   * @param {number} pageSize 每页数量
   * @param {number} pageIndex 页码
   * @returns {Promise<Object>} 历史净值数据
   */
  async getFundHistory(fundCode, pageSize = 20, pageIndex = 1) {
    try {
      const url = `${this.config.historyUrl}?type=lsjz&code=${fundCode}&pagesize=${pageSize}&page=${pageIndex}`;

      const data = await this.jsonp(url);

      if (data && data.data) {
        return {
          totalPages: Math.ceil(data.total / data.pagesize),
          currentPage: data.currentPage,
          total: data.total,
          records: data.data.map(item => ({
            date: item.FSRQ,
            netWorth: parseFloat(item.DWJZ),
            dayGrowth: parseFloat(item.JZZZL || 0),
            accumulatedNetWorth: parseFloat(item.LJJZ),
            purchaseStatus: item.SGZT,
            redemptionStatus: item.SHZT
          }))
        };
      }

      return null;
    } catch (error) {
      console.error('获取历史净值失败:', error);
      throw error;
    }
  },

  /**
   * 批量获取基金估值
   * @param {Array<string>} fundCodes 基金代码数组
   * @returns {Promise<Array>} 基金估值数据数组
   */
  async getBatchFundEstimate(fundCodes) {
    try {
      const promises = fundCodes.map(code =>
        this.getFundEstimate(code).catch(err => {
          console.error(`获取基金 ${code} 估值失败:`, err);
          return null;
        })
      );

      const results = await Promise.all(promises);
      return results.filter(r => r !== null);
    } catch (error) {
      console.error('批量获取基金估值失败:', error);
      throw error;
    }
  },

  /**
   * 解析基金代码
   * @param {string} input 用户输入
   * @returns {string|null} 基金代码
   */
  parseFundCode(input) {
    if (!input) return null;

    // 去除空格
    const code = input.trim().toUpperCase();

    // 6位数字代码
    if (/^\d{6}$/.test(code)) {
      return code;
    }

    return null;
  },

  /**
   * 格式化基金代码
   * @param {string} code 基金代码
   * @returns {string} 格式化后的代码
   */
  formatFundCode(code) {
    if (!code) return '';
    return code.trim().toUpperCase();
  }
};
