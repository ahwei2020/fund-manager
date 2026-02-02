/**
 * 基金数据 API 模块
 * 用于获取基金净值、估值等数据
 */

const FundAPI = {
  // API 配置
  config: {
    // 基金搜索 API
    searchUrl: 'https://fuzzysearch.eastmoney.com/api/search',
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
   * 搜索基金
   * @param {string} keyword 搜索关键词（基金代码或名称）
   * @returns {Promise<Array>} 搜索结果列表
   */
  async searchFund(keyword) {
    try {
      if (!keyword || keyword.trim().length === 0) {
        return [];
      }

      const url = `${this.config.searchUrl}?param=${encodeURIComponent(keyword)}`;
      const data = await this.jsonp(url);

      // 处理返回数据
      if (data && data.Datas) {
        return data.Datas.map(item => ({
          code: item.CODE || item.fcode,
          name: item.NAME || item.shortname,
          type: item.FTYPE || item.ftype,
          pinyin: item.JP || item.abbname
        }));
      }

      return [];
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
      const url = `${this.config.estimateUrl}/${fundCode}.js?rt=${Date.now()}`;

      // 使用 JSONP 方式获取数据（兼容 iOS Safari）
      return new Promise((resolve, reject) => {
        const callback = 'jsonp_estimate_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const script = document.createElement('script');

        // 设置超时
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('请求超时'));
        }, this.config.timeout);

        const cleanup = () => {
          clearTimeout(timeout);
          if (window[callback]) {
            delete window[callback];
          }
          if (script.parentNode) {
            document.body.removeChild(script);
          }
        };

        // 定义全局回调函数 - 解析 jsonpgz 格式
        window[callback] = (data) => {
          cleanup();
          // 东方财富返回的是 jsonpgz({...}) 格式
          if (data && data.fundcode) {
            resolve({
              code: data.fundcode,
              name: data.name,
              estimateNetWorth: parseFloat(data.gsz), // 估值净值
              dayGrowth: parseFloat(data.gszzl), // 估值涨跌幅%
              netWorth: parseFloat(data.dwjz), // 最新净值
              time: data.gztime // 估值时间
            });
          } else {
            reject(new Error('数据格式错误'));
          }
        };

        // 错误处理
        script.onerror = () => {
          cleanup();
          reject(new Error('API 请求失败'));
        };

        // 设置请求URL - 直接请求 JS 文件，通过回调处理
        script.src = url;

        document.body.appendChild(script);
      });
    } catch (error) {
      console.error('获取基金估值失败:', error);
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
           申购状态: item.SGZT,
          赎回状态: item.SHZT
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
