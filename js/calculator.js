/**
 * 收益计算模块
 * 用于计算基金收益、涨跌幅等
 */

const Calculator = {
  /**
   * 计算单个基金收益
   * @param {Object} holding 持仓对象
   * @param {number} currentNav 当前净值
   * @returns {Object} 收益信息
   */
  calculateProfit(holding, currentNav) {
    const costAmount = holding.shares * holding.costPrice;
    const currentAmount = holding.shares * currentNav;
    const profit = currentAmount - costAmount;
    const profitRate = costAmount > 0 ? (profit / costAmount * 100) : 0;

    return {
      costAmount: this.round(costAmount, 2),
      currentAmount: this.round(currentAmount, 2),
      profit: this.round(profit, 2),
      profitRate: this.round(profitRate, 2)
    };
  },

  /**
   * 计算当日收益
   * @param {Object} holding 持仓对象
   * @param {number} dayChangeRate 日涨跌幅
   * @returns {number} 当日收益金额
   */
  calculateDayProfit(holding, dayChangeRate) {
    const currentAmount = holding.shares * (holding.lastNav || holding.costPrice);
    const dayProfit = currentAmount * (dayChangeRate / 100);
    return this.round(dayProfit, 2);
  },

  /**
   * 计算持仓总览
   * @param {Array} holdings 持仓列表
   * @returns {Object} 持仓总览信息
   */
  calculateSummary(holdings) {
    let totalCost = 0;
    let totalCurrent = 0;
    let totalDayProfit = 0;
    let hasDayProfit = false;

    holdings.forEach(h => {
      const profit = this.calculateProfit(h, h.lastNav || h.costPrice);
      totalCost += profit.costAmount;
      totalCurrent += profit.currentAmount;

      if (h.dayChange !== undefined && h.dayChange !== null) {
        totalDayProfit += this.calculateDayProfit(h, h.dayChange);
        hasDayProfit = true;
      }
    });

    const totalProfit = totalCurrent - totalCost;
    const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost * 100) : 0;
    const dayProfitRate = totalCurrent > 0 ? (totalDayProfit / totalCurrent * 100) : 0;

    return {
      totalCost: this.round(totalCost, 2),
      totalCurrent: this.round(totalCurrent, 2),
      totalProfit: this.round(totalProfit, 2),
      totalProfitRate: this.round(totalProfitRate, 2),
      totalDayProfit: this.round(totalDayProfit, 2),
      dayProfitRate: this.round(dayProfitRate, 2),
      hasDayProfit
    };
  },

  /**
   * 计算交易后的持仓变化
   * @param {Object} holding 当前持仓
   * @param {Object} transaction 交易对象
   * @returns {Object} 更新后的持仓信息
   */
  calculateAfterTransaction(holding, transaction) {
    let newShares = holding.shares;
    let newCostPrice = holding.costPrice;

    if (transaction.type === 'buy') {
      // 买入：更新成本价（加权平均）
      const oldCost = holding.shares * holding.costPrice;
      const newCost = transaction.amount;
      const totalCost = oldCost + newCost;
      newShares = holding.shares + transaction.shares;
      newCostPrice = totalCost / newShares;
    } else if (transaction.type === 'sell') {
      // 卖出：减少份额，成本价不变
      newShares = holding.shares - transaction.shares;
    }

    return {
      shares: Math.max(0, this.round(newShares, 2)),
      costPrice: this.round(newCostPrice, 4)
    };
  },

  /**
   * 计算收益率
   * @param {number} profit 收益金额
   * @param {number} cost 成本金额
   * @returns {number} 收益率百分比
   */
  calculateRate(profit, cost) {
    if (cost === 0) return 0;
    return this.round((profit / cost) * 100, 2);
  },

  /**
   * 计算持仓天数
   * @param {string} startDate 开始日期 (YYYY-MM-DD)
   * @param {string} endDate 结束日期 (YYYY-MM-DD)，默认为今天
   * @returns {number} 持仓天数
   */
  calculateHoldingDays(startDate, endDate = null) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  /**
   * 计算年化收益率
   * @param {number} totalRate 总收益率
   * @param {number} days 持仓天数
   * @returns {number} 年化收益率
   */
  calculateAnnualizedRate(totalRate, days) {
    if (days === 0) return 0;
    const daysPerYear = 365;
    return this.round(((1 + totalRate / 100) ** (daysPerYear / days) - 1) * 100, 2);
  },

  /**
   * 计算持仓分布
   * @param {Array} holdings 持仓列表
   * @returns {Array} 持仓分布数据
   */
  calculateDistribution(holdings) {
    const totalValue = holdings.reduce((sum, h) => {
      return sum + (h.shares * (h.lastNav || h.costPrice));
    }, 0);

    const distribution = holdings.map(h => {
      const value = h.shares * (h.lastNav || h.costPrice);
      const percentage = totalValue > 0 ? (value / totalValue * 100) : 0;
      return {
        code: h.code,
        name: h.name,
        value: this.round(value, 2),
        percentage: this.round(percentage, 2)
      };
    });

    // 按占比降序排序
    distribution.sort((a, b) => b.percentage - a.percentage);

    return distribution;
  },

  /**
   * 计算收益走势
   * @param {Array} holdings 持仓列表
   * @param {Array} historyNetValues 历史净值数据
   * @returns {Array} 收益走势数据
   */
  calculateProfitTrend(holdings, historyNetValues) {
    if (!historyNetValues || historyNetValues.length === 0) {
      return [];
    }

    return historyNetValues.map(item => {
      let totalValue = 0;
      holdings.forEach(h => {
        const nav = item.netValues && item.netValues[h.code] ? item.netValues[h.code] : h.lastNav || h.costPrice;
        totalValue += h.shares * nav;
      });

      return {
        date: item.date,
        value: this.round(totalValue, 2)
      };
    });
  },

  /**
   * 四舍五入
   * @param {number} num 数值
   * @param {number} decimals 小数位数
   * @returns {number} 四舍五入后的数值
   */
  round(num, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },

  /**
   * 格式化金额
   * @param {number} amount 金额
   * @param {boolean} withSymbol 是否包含货币符号
   * @returns {string} 格式化后的金额
   */
  formatAmount(amount, withSymbol = true) {
    const symbol = withSymbol ? '¥' : '';
    const absAmount = Math.abs(amount);

    // 大于1万，用万表示
    if (absAmount >= 10000) {
      return `${symbol}${(amount / 10000).toFixed(2)}万`;
    }

    return `${symbol}${amount.toFixed(2)}`;
  },

  /**
   * 格式化百分比
   * @param {number} rate 百分比数值
   * @param {boolean} withSymbol 是否包含正负号
   * @returns {string} 格式化后的百分比
   */
  formatRate(rate, withSymbol = true) {
    const sign = withSymbol && rate > 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  },

  /**
   * 格式化收益显示
   * @param {number} profit 收益金额
   * @param {number} rate 收益率
   * @returns {Object} 格式化后的收益信息
   */
  formatProfit(profit, rate) {
    const isPositive = profit >= 0;
    const className = isPositive ? 'profit-positive' : 'profit-negative';
    const amountText = this.formatAmount(profit);
    const rateText = this.formatRate(rate);

    return {
      className,
      amountText,
      rateText,
      isPositive
    };
  }
};
