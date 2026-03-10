/**
 * WebExpenseTracer – app.js
 * A simple client-side expense/income tracker that persists data in localStorage.
 */

const STORAGE_KEY = 'wet_transactions';
const BUDGET_STORAGE_KEY = 'wet_budgets';

// Category → emoji mapping
const CATEGORY_ICONS = {
  '收入': '💵',
  '餐饮': '🍜',
  '交通': '🚌',
  '购物': '🛍️',
  '住房': '🏠',
  '娱乐': '🎮',
  '医疗': '🏥',
  '教育': '📚',
  '其他': '📦',
};

const CATEGORY_LIST = Object.keys(CATEGORY_ICONS);

const DEFAULT_BUDGETS = {
  '餐饮': 1200,
  '交通': 600,
  '购物': 800,
  '住房': 2000,
  '娱乐': 500,
  '医疗': 400,
  '教育': 700,
  '其他': 500,
};

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {Array<{id: string, description: string, amount: number, category: string, date: string}>} */
let transactions = [];
/** @type {Record<string, number>} */
let budgets = {};

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : [];
  } catch {
    transactions = [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadBudgets() {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    budgets = raw ? JSON.parse(raw) : {};
  } catch {
    budgets = {};
  }

  budgets = { ...DEFAULT_BUDGETS, ...budgets };
}

function saveBudgets() {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatAmount(value) {
  return '¥' + Math.abs(value).toFixed(2);
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getExpenseCategories() {
  return CATEGORY_LIST.filter((c) => c !== '收入');
}

function getExpenseTotalsByCategory() {
  const totals = {};
  getExpenseCategories().forEach((c) => { totals[c] = 0; });

  transactions.forEach((t) => {
    if (t.amount < 0) {
      const cat = t.category;
      if (!totals[cat]) totals[cat] = 0;
      totals[cat] += Math.abs(t.amount);
    }
  });

  return totals;
}

// ─── UI Updates ───────────────────────────────────────────────────────────────

function updateSummary() {
  const income  = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const balance = income + expense;

  document.getElementById('balance').textContent       = '¥' + balance.toFixed(2);
  document.getElementById('total-income').textContent  = '¥' + income.toFixed(2);
  document.getElementById('total-expense').textContent = '¥' + Math.abs(expense).toFixed(2);
}

function renderTransactions() {
  const list     = document.getElementById('transaction-list');
  const emptyMsg = document.getElementById('empty-msg');

  list.innerHTML = '';

  if (transactions.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  // Render newest first
  [...transactions].reverse().forEach((t) => {
    const li = document.createElement('li');
    li.className = `transaction-item ${t.amount >= 0 ? 'income-item' : 'expense-item'}`;
    li.dataset.id = t.id;

    const icon       = CATEGORY_ICONS[t.category] ?? '📦';
    const amountText = (t.amount >= 0 ? '+' : '-') + formatAmount(t.amount);
    const amountCls  = t.amount >= 0 ? 'positive' : 'negative';

    li.innerHTML = `
      <span class="item-icon">${icon}</span>
      <div class="item-details">
        <div class="item-desc">${escapeHtml(t.description)}</div>
        <div class="item-meta">${escapeHtml(t.category)} · ${formatDate(t.date)}</div>
      </div>
      <span class="item-amount ${amountCls}">${amountText}</span>
      <button class="btn-delete" data-id="${t.id}" title="删除">✕</button>
    `;

    list.appendChild(li);
  });
}

function refresh() {
  updateSummary();
  renderTransactions();
  renderBudgetList();
  updateCategoryChart();
}

// ─── Security helper ─────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

function handleFormSubmit(e) {
  e.preventDefault();

  const descriptionInput = document.getElementById('description');
  const amountInput      = document.getElementById('amount');
  const categorySelect   = document.getElementById('category');

  const description = descriptionInput.value.trim();
  const amount      = parseFloat(amountInput.value);
  const category    = categorySelect.value;

  if (!description) {
    alert('请填写描述！');
    return;
  }

  if (isNaN(amount) || amount === 0) {
    alert('请填写有效的金额（不能为 0）！');
    return;
  }

  const transaction = {
    id:          generateId(),
    description,
    amount,
    category,
    date:        new Date().toISOString(),
  };

  transactions.push(transaction);
  saveTransactions();
  refresh();

  // Reset form
  descriptionInput.value = '';
  amountInput.value      = '';
  categorySelect.value   = '收入';
  descriptionInput.focus();
}

function handleDeleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  refresh();
}

function handleClearAll() {
  if (transactions.length === 0) return;
  if (!confirm('确定要清空所有记录吗？此操作不可撤销。')) return;
  transactions = [];
  saveTransactions();
  refresh();
}

function handleSaveBudgets() {
  const inputs = document.querySelectorAll('[data-budget-input]');
  inputs.forEach((input) => {
    const category = input.dataset.category;
    if (!category) return;
    const value = parseFloat(input.value);
    budgets[category] = isNaN(value) || value < 0 ? 0 : value;
  });

  saveBudgets();
  renderBudgetList();
  alert('预算已保存！');
}

function renderBudgetList() {
  const container = document.getElementById('budget-list');
  if (!container) return;

  const totals = getExpenseTotalsByCategory();
  container.innerHTML = '';

  getExpenseCategories().forEach((category) => {
    const icon = CATEGORY_ICONS[category] ?? '📦';
    const budget = Number(budgets[category]) || 0;
    const spent  = totals[category] ?? 0;
    const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : (spent > 0 ? 100 : 0);
    const over = budget > 0 ? spent > budget : spent > 0;

    const row = document.createElement('div');
    row.className = 'budget-row';

    const label = document.createElement('div');
    label.className = 'budget-label';
    label.textContent = `${icon} ${category}`;

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'budget-input';

    const prefix = document.createElement('span');
    prefix.textContent = '¥';
    prefix.style.color = '#4a5568';
    prefix.style.fontWeight = '600';

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.dataset.category = category;
    input.dataset.budgetInput = 'true';
    input.value = budget.toString();

    inputWrapper.appendChild(prefix);
    inputWrapper.appendChild(input);

    const progress = document.createElement('div');
    progress.className = 'budget-progress';

    const bar = document.createElement('div');
    bar.className = `budget-bar${over ? ' over' : ''}`;
    bar.style.width = `${Math.min(100, percent)}%`;
    progress.appendChild(bar);

    const meta = document.createElement('div');
    meta.className = 'budget-meta';
    const usedText = `已用 ¥${spent.toFixed(2)} / 预算 ¥${budget.toFixed(2)}`;
    const statusText = budget > 0
      ? `${Math.min(100, percent).toFixed(0)}%`
      : (spent > 0 ? '未设置预算' : '等待记录');
    meta.innerHTML = `
      <span>${usedText}</span>
      <span class="${over ? 'over' : ''}">${over ? '已超出预算' : statusText}</span>
    `;

    row.appendChild(label);
    row.appendChild(inputWrapper);
    row.appendChild(progress);
    row.appendChild(meta);

    container.appendChild(row);
  });
}

function updateCategoryChart() {
  const canvas = document.getElementById('category-chart');
  const emptyMsg = document.getElementById('chart-empty');
  const legend = document.getElementById('chart-legend');
  if (!canvas) return;

  const totals = getExpenseTotalsByCategory();
  const entries = Object.entries(totals).filter(([, value]) => value > 0);

  if (entries.length === 0) {
    canvas.style.display = 'none';
    if (legend) legend.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  canvas.style.display = 'block';
  if (emptyMsg) emptyMsg.style.display = 'none';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const palette = ['#63b3ed', '#68d391', '#f6ad55', '#fc8181', '#b794f4', '#f687b3', '#4fd1c5', '#ed8936'];
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  const displayWidth = canvas.parentElement?.clientWidth || 320;
  const displayHeight = 260;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  const centerX = displayWidth / 2;
  const centerY = displayHeight / 2;
  const radius  = Math.min(displayWidth, displayHeight) / 2 - 10;

  let startAngle = -Math.PI / 2;
  entries.forEach(([label, value], idx) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = palette[idx % palette.length];
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Cutout for doughnut style
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Center total text
  ctx.fillStyle = '#4a5568';
  ctx.font = '600 14px "Segoe UI", "PingFang SC", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('总支出', centerX, centerY - 10);
  ctx.font = '700 18px "Segoe UI", "PingFang SC", "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#2d3748';
  ctx.fillText(`¥${total.toFixed(2)}`, centerX, centerY + 10);

  ctx.restore();

  if (legend) {
    legend.innerHTML = entries.map(([label, value], idx) => {
      const color = palette[idx % palette.length];
      return `<span class="legend-item"><span class="legend-dot" style="background:${color}"></span>${label} ¥${value.toFixed(2)}</span>`;
    }).join('');
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadTransactions();
  loadBudgets();
  refresh();

  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);

  document.getElementById('transaction-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (btn) {
      handleDeleteTransaction(btn.dataset.id);
    }
  });

  document.getElementById('clear-all').addEventListener('click', handleClearAll);
  document.getElementById('save-budgets').addEventListener('click', handleSaveBudgets);
});
