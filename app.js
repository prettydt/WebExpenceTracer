/**
 * WebExpenseTracer – app.js
 * A simple client-side expense/income tracker that persists data in localStorage.
 */

const STORAGE_KEY = 'wet_transactions';

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

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {Array<{id: string, description: string, amount: number, category: string, date: string}>} */
let transactions = [];

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

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadTransactions();
  refresh();

  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);

  document.getElementById('transaction-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (btn) {
      handleDeleteTransaction(btn.dataset.id);
    }
  });

  document.getElementById('clear-all').addEventListener('click', handleClearAll);
});
