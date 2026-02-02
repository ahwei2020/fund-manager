/**
 * 主应用逻辑
 */

// 全局状态
const AppState = {
  holdings: [],
  isLoading: false,
  lastRefreshTime: 0,
  refreshInterval: 5 * 60 * 1000 // 5分钟
};

/**
 * 初始化应用
 */
function initApp() {
  // 加载持仓数据
  loadHoldings();

  // 渲染持仓列表
  renderHoldings();

  // 自动刷新净值数据
  refreshNetValues();

  // 绑定事件
  bindEvents();

  // 加载主题设置
  loadTheme();
}

/**
 * 加载持仓数据
 */
function loadHoldings() {
  AppState.holdings = Storage.getHoldings();
  updateHoldingCount();
}

/**
 * 渲染持仓列表
 */
function renderHoldings() {
  const listEl = document.getElementById('holdingsList');
  const emptyEl = document.getElementById('emptyState');

  if (AppState.holdings.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    updateSummaryCard({ totalCost: 0, totalCurrent: 0, totalProfit: 0, totalProfitRate: 0, hasDayProfit: false });
    return;
  }

  emptyEl.classList.add('hidden');

  // 按市值降序排序
  const sortedHoldings = [...AppState.holdings].sort((a, b) => {
    const valueA = a.shares * (a.lastNav || a.costPrice);
    const valueB = b.shares * (b.lastNav || b.costPrice);
    return valueB - valueA;
  });

  listEl.innerHTML = sortedHoldings.map(holding => {
    const currentNav = holding.lastNav || holding.costPrice;
    const profit = Calculator.calculateProfit(holding, currentNav);
    const profitFormat = Calculator.formatProfit(profit.profit, profit.profitRate);
    const currentValue = holding.shares * currentNav;
    const dayChangeText = holding.dayChange !== undefined && holding.dayChange !== null
      ? `今日 ${Calculator.formatRate(holding.dayChange)}`
      : '';

    return `
      <div class="holding-item" onclick="viewHoldingDetail('${holding.id}')">
        <div class="holding-header">
          <div>
            <div class="holding-name">${escapeHtml(holding.name)}</div>
            <div class="holding-code">${holding.code}</div>
          </div>
          <div class="holding-profit">
            <div class="holding-profit-amount ${profitFormat.className}">
              ${profitFormat.amountText}
            </div>
            <div class="holding-profit-rate ${profitFormat.className}">
              ${profitFormat.rateText}
            </div>
          </div>
        </div>
        <div class="holding-info">
          <span>持有 ${holding.shares.toFixed(2)} 份 · 市值 ¥${currentValue.toFixed(2)}</span>
          <span class="holding-day-change ${holding.dayChange >= 0 ? 'profit-positive' : 'profit-negative'}">
            ${dayChangeText}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 更新持仓总数显示
 */
function updateHoldingCount() {
  const countEl = document.getElementById('holdingCount');
  countEl.textContent = `${AppState.holdings.length} 只`;
}

/**
 * 更新总览卡片
 */
function updateSummaryCard(summary) {
  const totalAmountEl = document.getElementById('totalAmount');
  const profitTextEl = document.getElementById('profitText');
  const profitIconEl = document.getElementById('profitIcon');
  const summaryCardEl = document.getElementById('summaryCard');

  // 更新总金额
  totalAmountEl.textContent = `¥${summary.totalCurrent.toFixed(2)}`;

  // 更新收益显示
  if (summary.hasDayProfit) {
    // 显示当日收益
    const dayProfitFormat = Calculator.formatProfit(summary.totalDayProfit, summary.dayProfitRate);
    profitTextEl.textContent = `今日 ${dayProfitFormat.amountText} (${dayProfitFormat.rateText})`;
    profitIconEl.textContent = summary.totalDayProfit >= 0 ? '📈' : '📉';
  } else {
    // 显示累计收益
    const totalProfitFormat = Calculator.formatProfit(summary.totalProfit, summary.totalProfitRate);
    profitTextEl.textContent = `累计 ${totalProfitFormat.amountText} (${totalProfitFormat.rateText})`;
    profitIconEl.textContent = summary.totalProfit >= 0 ? '💰' : '💸';
  }

  // 更新背景样式
  if (summary.hasDayProfit) {
    summaryCardEl.className = 'summary-card';
    if (summary.totalDayProfit < 0) {
      summaryCardEl.style.background = 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)';
    } else {
      summaryCardEl.style.background = '';
    }
  }
}

/**
 * 刷新净值数据
 */
async function refreshNetValues() {
  if (AppState.isLoading) return;

  const now = Date.now();

  // 首次加载或超过刷新间隔时才从API获取数据
  const shouldFetch = AppState.lastRefreshTime === 0 || (now - AppState.lastRefreshTime >= AppState.refreshInterval);

  // 先使用现有数据计算并显示（确保有数据展示）
  const summary = Calculator.calculateSummary(AppState.holdings);
  updateSummaryCard(summary);

  if (!shouldFetch) {
    return;
  }

  setRefreshing(true);

  try {
    const codes = AppState.holdings.map(h => h.code);

    if (codes.length === 0) {
      return;
    }

    // 批量获取基金估值
    const results = await Promise.allSettled(
      codes.map(code => FundAPI.getFundEstimate(code))
    );

    // 更新持仓数据
    let updated = false;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const estimate = result.value;
        const holding = AppState.holdings.find(h => h.code === estimate.code);

        if (holding) {
          holding.lastNav = estimate.netWorth || holding.lastNav || holding.costPrice;
          holding.dayChange = estimate.dayGrowth || 0;
          holding.estimateTime = estimate.time;
          updated = true;
        }
      }
    });

    if (updated) {
      // 保存更新后的持仓数据
      Storage.saveHoldings(AppState.holdings);

      // 更新刷新时间
      AppState.lastRefreshTime = now;
    }

    // 重新渲染列表和总览
    renderHoldings();
    const newSummary = Calculator.calculateSummary(AppState.holdings);
    updateSummaryCard(newSummary);

    if (updated) {
      Utils.toast('数据已更新');
    }
  } catch (error) {
    console.error('刷新净值失败:', error);
    Utils.toast('刷新失败，请稍后重试');
  } finally {
    setRefreshing(false);
  }
}

/**
 * 设置刷新状态
 */
function setRefreshing(isRefreshing) {
  AppState.isLoading = isRefreshing;
  const refreshBtn = document.getElementById('refreshBtn');

  if (isRefreshing) {
    refreshBtn.classList.add('rotating');
  } else {
    refreshBtn.classList.remove('rotating');
  }
}

/**
 * 查看持仓详情
 */
function viewHoldingDetail(id) {
  const holding = AppState.holdings.find(h => h.id === id);
  if (holding) {
    // 保存当前查看的持仓ID到sessionStorage
    sessionStorage.setItem('currentHoldingId', id);
    location.href = `fund-detail.html?id=${id}`;
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', () => {
    refreshNetValues();
  });

  // 设置按钮
  document.getElementById('settingsBtn').addEventListener('click', () => {
    location.href = 'settings.html';
  });

  // 下拉刷新
  let startY = 0;
  let isPulling = false;

  document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  });

  document.addEventListener('touchmove', (e) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 100) {
      isPulling = false;
      refreshNetValues();
    }
  });

  document.addEventListener('touchend', () => {
    isPulling = false;
  });
}

/**
 * 加载主题
 */
function loadTheme() {
  const theme = Storage.getSetting('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 页面可见性变化时刷新
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const now = Date.now();
    if (now - AppState.lastRefreshTime >= AppState.refreshInterval) {
      refreshNetValues();
    }
  }
});
