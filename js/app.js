/* app.js — Expense & Budget Visualizer */

/* ==========================================================================
   1. CONSTANTS
   ========================================================================== */

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

const LS_KEY = 'expense_budget_visualizer_v1';

const SORT_ORDERS = {
  INSERTION:    'insertion',
  AMOUNT_ASC:   'amount-asc',
  AMOUNT_DESC:  'amount-desc',
  CATEGORY_ASC: 'category-asc',
};

const THEMES = {
  LIGHT: 'light',
  DARK:  'dark',
};

// Fixed palette of 10 colors cycling over categories
const CHART_COLORS = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
];

/* ==========================================================================
   2. STATE
   ========================================================================== */

const AppState = {
  transactions:   [],                    // Transaction[]
  categories:     [...DEFAULT_CATEGORIES], // string[]
  spendingLimits: {},                    // Record<categoryName, number>
  theme:          THEMES.LIGHT,          // 'light' | 'dark'
  sortOrder:      SORT_ORDERS.INSERTION, // session-only, not persisted
};

/* ==========================================================================
   3. STORAGE
   ========================================================================== */

// Chart.js instance — destroyed and recreated on each renderChart() call
let chartInstance = null;

/**
 * Persist the current AppState (excluding sortOrder) to Local Storage.
 * On any error, shows the non-blocking storage warning banner.
 */
function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      transactions:   AppState.transactions,
      categories:     AppState.categories,
      spendingLimits: AppState.spendingLimits,
      theme:          AppState.theme,
    }));
  } catch (e) {
    showStorageWarning();
  }
}

/**
 * Load persisted state from Local Storage into AppState.
 * Validates each field defensively; drops malformed data rather than crashing.
 * On any parse/access error, resets to defaults and shows the warning banner.
 */
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return; // First visit — keep defaults

    const parsed = JSON.parse(raw);

    // --- transactions: must be an array; drop items missing required fields ---
    if (Array.isArray(parsed.transactions)) {
      AppState.transactions = parsed.transactions.filter((item) => {
        return (
          item !== null &&
          typeof item === 'object' &&
          typeof item.id        === 'string' &&
          typeof item.name      === 'string' &&
          typeof item.amount    === 'number' &&
          typeof item.category  === 'string' &&
          typeof item.timestamp === 'number'
        );
      });
    } else {
      AppState.transactions = [];
    }

    // --- categories: must be a non-empty array of strings ---
    if (
      Array.isArray(parsed.categories) &&
      parsed.categories.length > 0 &&
      parsed.categories.every((c) => typeof c === 'string')
    ) {
      AppState.categories = parsed.categories;
    } else {
      AppState.categories = [...DEFAULT_CATEGORIES];
    }

    // --- spendingLimits: must be a plain object with numeric values ---
    if (
      parsed.spendingLimits !== null &&
      typeof parsed.spendingLimits === 'object' &&
      !Array.isArray(parsed.spendingLimits)
    ) {
      const validLimits = {};
      for (const [key, val] of Object.entries(parsed.spendingLimits)) {
        if (typeof val === 'number' && isFinite(val)) {
          validLimits[key] = val;
        }
      }
      AppState.spendingLimits = validLimits;
    } else {
      AppState.spendingLimits = {};
    }

    // --- theme: must be 'light' or 'dark' ---
    AppState.theme = parsed.theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;

  } catch (e) {
    // JSON parse error or storage unavailable — reset to safe defaults
    AppState.transactions   = [];
    AppState.categories     = [...DEFAULT_CATEGORIES];
    AppState.spendingLimits = {};
    AppState.theme          = THEMES.LIGHT;
    showStorageWarning();
  }
}

/**
 * Display the non-blocking Local Storage warning banner by removing its
 * `hidden` attribute.  Safe to call multiple times.
 */
function showStorageWarning() {
  const banner = document.getElementById('storage-warning');
  if (banner) {
    banner.removeAttribute('hidden');
  }
}

/* ==========================================================================
   4. VALIDATION (pure — no side effects, no state mutations)
   ========================================================================== */

/**
 * Validate the fields for a new transaction.
 *
 * @param {string} name      - Item name entered by the user.
 * @param {*}      amount    - Amount value (may be a string from the input).
 * @param {string} category  - Selected category.
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateTransaction(name, amount, category) {
  const errors = [];

  // Name must be non-empty after trimming whitespace
  if (typeof name !== 'string' || name.trim() === '') {
    errors.push('Item name is required.');
  }

  // Amount must be a positive finite number
  const numericAmount = Number(amount);
  if (
    amount === '' ||
    amount === null ||
    amount === undefined ||
    !isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    errors.push('Amount must be a positive number.');
  }

  // Category must be non-empty
  if (typeof category !== 'string' || category.trim() === '') {
    errors.push('Category is required.');
  }

  return errors.length === 0
    ? { ok: true,  errors: [] }
    : { ok: false, errors };
}

/**
 * Validate a new category name against the existing category list.
 *
 * @param {string}   name               - Proposed category name.
 * @param {string[]} existingCategories - Current list of category names.
 * @returns {{ ok: boolean, error?: string }}
 */
function validateCategory(name, existingCategories) {
  // Name must be non-empty after trimming
  if (typeof name !== 'string' || name.trim() === '') {
    return { ok: false, error: 'Category name cannot be empty.' };
  }

  // Must not duplicate an existing category (case-insensitive)
  const normalised = name.trim().toLowerCase();
  const isDuplicate = existingCategories.some(
    (cat) => cat.toLowerCase() === normalised
  );
  if (isDuplicate) {
    return { ok: false, error: `Category "${name.trim()}" already exists.` };
  }

  return { ok: true };
}

/**
 * Validate a spending limit value.
 *
 * @param {*} value - The raw value from the limit input (may be a string).
 * @returns {{ ok: boolean, error?: string }}
 */
function validateSpendingLimit(value) {
  const numericValue = Number(value);

  if (
    value === '' ||
    value === null ||
    value === undefined ||
    !isFinite(numericValue) ||
    numericValue <= 0
  ) {
    return { ok: false, error: 'Spending limit must be a positive number.' };
  }

  return { ok: true };
}

/* ==========================================================================
   5. COMPUTED VALUES (pure — no side effects, no state mutations)
   ========================================================================== */

/**
 * Compute the total balance as the arithmetic sum of all transaction amounts.
 *
 * @param {Array<{amount: number}>} transactions
 * @returns {number} Sum of all amounts, or 0 for an empty array.
 */
function computeBalance(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) return 0;
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Compute per-category spending totals.
 * Every transaction is counted in exactly one entry; the sum of all map
 * values equals computeBalance(transactions).
 *
 * @param {Array<{amount: number, category: string}>} transactions
 * @returns {Map<string, number>} category name → total amount
 */
function computeCategoryTotals(transactions) {
  const totals = new Map();
  if (!Array.isArray(transactions)) return totals;

  for (const t of transactions) {
    const current = totals.get(t.category) ?? 0;
    totals.set(t.category, current + t.amount);
  }

  return totals;
}

/**
 * Group transactions by calendar month and compute per-month summaries.
 *
 * Each entry in the returned map has:
 *   - label      {string}                  e.g. "June 2025"
 *   - total      {number}                  sum of all amounts in that month
 *   - byCategory {Record<string, number>}  category → total for that month
 *
 * The map is ordered by ascending month (earliest first).
 *
 * @param {Array<{amount: number, category: string, timestamp: number}>} transactions
 * @returns {Map<string, {label: string, total: number, byCategory: Record<string, number>}>}
 */
function computeMonthlySummary(transactions) {
  const summary = new Map();
  if (!Array.isArray(transactions)) return summary;

  for (const t of transactions) {
    const date  = new Date(t.timestamp);
    const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    if (!summary.has(label)) {
      summary.set(label, { label, total: 0, byCategory: {} });
    }

    const entry = summary.get(label);
    entry.total += t.amount;
    entry.byCategory[t.category] = (entry.byCategory[t.category] ?? 0) + t.amount;
  }

  // Sort entries by the actual date of the first transaction in each month
  // (ascending — earliest month first)
  const monthOrder = new Map();
  for (const t of transactions) {
    const date  = new Date(t.timestamp);
    const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!monthOrder.has(label)) {
      // Store a sortable key: YYYY-MM
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthOrder.set(label, key);
    }
  }

  const sorted = new Map(
    [...summary.entries()].sort(([a], [b]) => {
      const ka = monthOrder.get(a) ?? '';
      const kb = monthOrder.get(b) ?? '';
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    })
  );

  return sorted;
}

/**
 * Return a new array of transactions sorted according to `order`.
 * The original array is never mutated.
 *
 * Supported order values (see SORT_ORDERS constant):
 *   'amount-asc'   — ascending by amount
 *   'amount-desc'  — descending by amount
 *   'category-asc' — lexicographic ascending by category
 *   'insertion'    — original insertion order (stable, by timestamp)
 *
 * @param {Array<{amount: number, category: string, timestamp: number}>} transactions
 * @param {string} order
 * @returns {Array} New sorted array.
 */
function getSortedTransactions(transactions, order) {
  if (!Array.isArray(transactions)) return [];

  // Shallow copy so the original array is never mutated
  const copy = [...transactions];

  switch (order) {
    case SORT_ORDERS.AMOUNT_ASC:
      return copy.sort((a, b) => a.amount - b.amount);

    case SORT_ORDERS.AMOUNT_DESC:
      return copy.sort((a, b) => b.amount - a.amount);

    case SORT_ORDERS.CATEGORY_ASC:
      return copy.sort((a, b) => a.category.localeCompare(b.category));

    case SORT_ORDERS.INSERTION:
    default:
      // Sort by timestamp ascending to preserve insertion order
      return copy.sort((a, b) => a.timestamp - b.timestamp);
  }
}

/* ==========================================================================
   6. STATE MUTATIONS
   ========================================================================== */

/**
 * Add a new transaction to AppState after validating all fields.
 *
 * On validation failure: returns { ok: false, error } without mutating state.
 * On success: creates the transaction, persists state, re-renders, and
 * returns { ok: true }.
 *
 * @param {string} name
 * @param {*}      amount    - Raw value from the form input.
 * @param {string} category
 * @returns {{ ok: boolean, error?: string }}
 */
function addTransaction(name, amount, category) {
  const validation = validateTransaction(name, amount, category);
  if (!validation.ok) {
    return { ok: false, error: validation.errors.join(' ') };
  }

  // Generate a unique ID — prefer crypto.randomUUID(), fall back to timestamp
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  AppState.transactions.push({
    id,
    name:      name.trim(),
    amount:    Number(amount),
    category,
    timestamp: Date.now(),
  });

  saveState();
  renderAll();

  return { ok: true };
}

/**
 * Remove the transaction with the given id from AppState.
 * Persists the updated state and re-renders the UI.
 *
 * @param {string} id - The transaction id to remove.
 */
function deleteTransaction(id) {
  AppState.transactions = AppState.transactions.filter((t) => t.id !== id);
  saveState();
  renderAll();
}

/**
 * Add a new custom category after validating the name.
 *
 * On validation failure: returns { ok: false, error }.
 * On success: appends the category, persists state, re-renders the category
 * selectors, and returns { ok: true }.
 *
 * @param {string} name
 * @returns {{ ok: boolean, error?: string }}
 */
function addCategory(name) {
  const validation = validateCategory(name, AppState.categories);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  AppState.categories.push(name.trim());
  saveState();
  renderCategorySelectors();

  return { ok: true };
}

/**
 * Set a spending limit for the given category after validating the value.
 *
 * On validation failure: returns { ok: false, error }.
 * On success: stores the limit, persists state, re-renders the spending-limit
 * warnings, and returns { ok: true }.
 *
 * @param {string} category
 * @param {*}      limit    - Raw value from the limit input.
 * @returns {{ ok: boolean, error?: string }}
 */
function setSpendingLimit(category, limit) {
  const validation = validateSpendingLimit(limit);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  AppState.spendingLimits[category] = Number(limit);
  saveState();
  renderTransactionList();
  renderSpendingLimitWarnings();

  return { ok: true };
}

/**
 * Switch the active theme, persist it, and re-render the theme-dependent UI.
 *
 * @param {'light'|'dark'} theme
 */
function setTheme(theme) {
  AppState.theme = theme;
  saveState();
  renderTheme();
}

/**
 * Update the active sort order and re-render the transaction list.
 * Sort order is session-only and is NOT persisted to Local Storage.
 *
 * @param {string} order - One of the SORT_ORDERS values.
 */
function setSortOrder(order) {
  AppState.sortOrder = order;
  renderTransactionList();
}

/* ==========================================================================
   7. RENDERING
   ========================================================================== */

/**
 * Update the balance display with the current total of all transactions.
 * Formats the value as "$X.XX".
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
function renderBalance() {
  const balance = computeBalance(AppState.transactions);
  const el = document.getElementById('balance-display');
  if (el) {
    el.textContent = '$' + balance.toFixed(2);
  }
}

/**
 * Rebuild the transaction list in the DOM.
 * Applies the `over-limit` CSS class to items whose category total meets or
 * exceeds its spending limit.  Shows/hides the empty-state message.
 * Requirements: 2.1, 2.2, 2.4, 7.2, 7.3, 8.2
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  const emptyMsg = document.getElementById('empty-state-msg');
  if (!list) return;

  // Clear existing items
  list.innerHTML = '';

  const sorted = getSortedTransactions(AppState.transactions, AppState.sortOrder);
  const categoryTotals = computeCategoryTotals(AppState.transactions);

  if (sorted.length === 0) {
    if (emptyMsg) emptyMsg.removeAttribute('hidden');
    return;
  }

  if (emptyMsg) emptyMsg.setAttribute('hidden', '');

  for (const transaction of sorted) {
    const li = document.createElement('li');

    // Determine if this transaction's category is over its spending limit
    const categoryTotal = categoryTotals.get(transaction.category) ?? 0;
    const limit = AppState.spendingLimits[transaction.category];
    if (limit !== undefined && categoryTotal >= limit) {
      li.classList.add('over-limit');
    }

    li.innerHTML =
      '<span class="transaction-name">' + escapeHtml(transaction.name) + '</span>' +
      '<span class="transaction-amount">$' + transaction.amount.toFixed(2) + '</span>' +
      '<span class="transaction-category">' + escapeHtml(transaction.category) + '</span>' +
      '<button class="delete-btn" data-id="' + escapeHtml(transaction.id) + '" aria-label="Delete ' + escapeHtml(transaction.name) + '">Delete</button>';

    list.appendChild(li);
  }
}

/**
 * Render (or update) the spending pie chart using Chart.js.
 * Destroys any existing chart instance before creating a new one.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
function renderChart() {
  const canvas = document.getElementById('spending-chart');
  const emptyMsg = document.getElementById('chart-empty-msg');

  if (AppState.transactions.length === 0) {
    // No data — hide canvas, show placeholder, destroy any existing chart
    if (canvas) canvas.setAttribute('hidden', '');
    if (emptyMsg) emptyMsg.removeAttribute('hidden');
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  // If Chart.js failed to load (CDN unavailable), keep canvas hidden
  if (typeof Chart === 'undefined') {
    if (canvas) canvas.setAttribute('hidden', '');
    if (emptyMsg) emptyMsg.removeAttribute('hidden');
    return;
  }

  // Data available — show canvas, hide placeholder
  if (canvas) canvas.removeAttribute('hidden');
  if (emptyMsg) emptyMsg.setAttribute('hidden', '');

  // Destroy previous chart instance to avoid canvas reuse errors
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const categoryTotals = computeCategoryTotals(AppState.transactions);
  const labels = [];
  const data = [];

  for (const [category, total] of categoryTotals) {
    labels.push(category);
    data.push(total);
  }

  const grandTotal = data.reduce((sum, v) => sum + v, 0);

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed;
              const pct = grandTotal > 0 ? (value / grandTotal * 100).toFixed(1) : '0.0';
              return `${ctx.label}: $${value.toFixed(2)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Render the monthly spending summary section.
 * Shows/hides the empty-state message as appropriate.
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
function renderSummary() {
  const content = document.getElementById('summary-content');
  const emptyMsg = document.getElementById('summary-empty-msg');

  if (!content) return;

  const summary = computeMonthlySummary(AppState.transactions);

  if (summary.size === 0) {
    if (emptyMsg) emptyMsg.removeAttribute('hidden');
    if (content) content.setAttribute('hidden', '');
    return;
  }

  if (emptyMsg) emptyMsg.setAttribute('hidden', '');
  if (content) content.removeAttribute('hidden');

  // Clear before re-rendering
  content.innerHTML = '';

  for (const [, entry] of summary) {
    const block = document.createElement('div');
    block.className = 'month-block';

    const heading = document.createElement('h3');
    heading.textContent = entry.label;

    const totalPara = document.createElement('p');
    totalPara.textContent = 'Total: $' + entry.total.toFixed(2);

    const categoryList = document.createElement('ul');
    for (const [category, amount] of Object.entries(entry.byCategory)) {
      const item = document.createElement('li');
      item.textContent = category + ': $' + amount.toFixed(2);
      categoryList.appendChild(item);
    }

    block.appendChild(heading);
    block.appendChild(totalPara);
    block.appendChild(categoryList);
    content.appendChild(block);
  }
}

/**
 * Rebuild the category <option> elements and the spending-limit input rows.
 * Requirements: 5.1, 5.2, 8.1
 */
function renderCategorySelectors() {
  // --- Rebuild #item-category <select> options ---
  const categorySelect = document.getElementById('item-category');
  if (categorySelect) {
    categorySelect.innerHTML = '';
    for (const category of AppState.categories) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    }
  }

  // --- Rebuild #limits-list rows ---
  const limitsList = document.getElementById('limits-list');
  if (limitsList) {
    limitsList.innerHTML = '';
    for (const category of AppState.categories) {
      const row = document.createElement('div');
      row.className = 'limit-row';
      row.dataset.category = category;

      const label = document.createElement('label');
      label.textContent = category;

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0.01';
      input.step = '0.01';
      input.className = 'limit-input';
      if (AppState.spendingLimits[category] !== undefined) {
        input.value = AppState.spendingLimits[category];
      }

      const button = document.createElement('button');
      button.className = 'set-limit-btn';
      button.dataset.category = category;
      button.textContent = 'Set Limit';

      const warning = document.createElement('span');
      warning.className = 'limit-warning';
      warning.setAttribute('hidden', '');
      warning.textContent = '⚠️ Over limit!';

      const errorSpan = document.createElement('span');
      errorSpan.className = 'limit-error error-msg';

      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(button);
      row.appendChild(warning);
      row.appendChild(errorSpan);

      limitsList.appendChild(row);
    }
  }
}

/**
 * Apply the correct theme CSS class to <body> and update the toggle button text.
 * Requirements: 9.1, 9.2
 */
function renderTheme() {
  if (AppState.theme === THEMES.DARK) {
    document.body.className = 'theme-dark';
  } else {
    document.body.className = 'theme-light';
  }

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = AppState.theme === THEMES.LIGHT ? '🌙 Dark Mode' : '☀️ Light Mode';
  }
}

/**
 * Show or hide the ⚠️ warning indicator in each spending-limit row based on
 * whether the category total meets or exceeds its configured limit.
 * Requirements: 8.2, 8.3, 8.4
 */
function renderSpendingLimitWarnings() {
  const categoryTotals = computeCategoryTotals(AppState.transactions);

  for (const category of AppState.categories) {
    const row = document.querySelector(`#limits-list [data-category="${CSS.escape(category)}"]`);
    if (!row) continue;

    const warningSpan = row.querySelector('.limit-warning');
    if (!warningSpan) continue;

    const limit = AppState.spendingLimits[category];
    const total = categoryTotals.get(category) ?? 0;

    if (limit !== undefined && total >= limit) {
      warningSpan.removeAttribute('hidden');
    } else {
      warningSpan.setAttribute('hidden', '');
    }
  }
}

/**
 * Re-render all sections of the UI in the correct order.
 * Called after any state mutation that affects multiple sections.
 * Requirements: 10.2
 */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
  renderSummary();
  renderCategorySelectors();
  renderTheme();
  renderSpendingLimitWarnings();
}

/* ==========================================================================
   8. UTILITIES
   ========================================================================== */

/**
 * Escape a string for safe insertion into HTML content or attribute values.
 * Prevents XSS when rendering user-supplied data.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ==========================================================================
   9. EVENT HANDLERS
   ========================================================================== */

/**
 * Handle transaction form submission.
 * Reads #item-name, #item-amount, #item-category, calls addTransaction().
 * On failure: shows error in #form-error.
 * On success: clears #form-error and resets the form.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const nameInput     = document.getElementById('item-name');
  const amountInput   = document.getElementById('item-amount');
  const categoryInput = document.getElementById('item-category');
  const formError     = document.getElementById('form-error');

  const name     = nameInput     ? nameInput.value     : '';
  const amount   = amountInput   ? amountInput.value   : '';
  const category = categoryInput ? categoryInput.value : '';

  const result = addTransaction(name, amount, category);

  if (!result.ok) {
    if (formError) formError.textContent = result.error;
  } else {
    if (formError) formError.textContent = '';
    event.target.reset();
  }
}

/**
 * Handle delete clicks on the transaction list via event delegation.
 * When the clicked element has a data-id attribute, calls deleteTransaction().
 * Requirements: 2.3
 */
function handleDeleteClick(event) {
  const target = event.target;
  if (target && target.dataset.id) {
    deleteTransaction(target.dataset.id);
  }
}

/**
 * Handle the "Add Category" button click.
 * Reads #new-category-name, calls addCategory().
 * On failure: shows error in #category-error.
 * On success: clears #category-error and clears the input field.
 * Requirements: 5.2, 5.3
 */
function handleAddCategory() {
  const nameInput    = document.getElementById('new-category-name');
  const categoryError = document.getElementById('category-error');

  const name = nameInput ? nameInput.value : '';

  const result = addCategory(name);

  if (!result.ok) {
    if (categoryError) categoryError.textContent = result.error;
  } else {
    if (categoryError) categoryError.textContent = '';
    if (nameInput) nameInput.value = '';
  }
}

/**
 * Handle "Set Limit" button clicks in #limits-list via event delegation.
 * When a .set-limit-btn is clicked, reads the adjacent .limit-input value
 * and the button's data-category attribute, then calls setSpendingLimit().
 * On failure: displays an inline error in the row's .limit-error element.
 * Requirements: 8.1, 8.5
 */
function handleSetLimit(event) {
  const target = event.target;
  if (!target || !target.classList.contains('set-limit-btn')) return;

  const category = target.dataset.category;
  const row      = target.closest('.limit-row');
  if (!row) return;

  const limitInput = row.querySelector('.limit-input');
  const errorSpan  = row.querySelector('.limit-error');
  const limit      = limitInput ? limitInput.value : '';

  const result = setSpendingLimit(category, limit);

  if (!result.ok) {
    if (errorSpan) errorSpan.textContent = result.error;
  } else {
    if (errorSpan) errorSpan.textContent = '';
  }
}

/**
 * Handle sort select changes.
 * Calls setSortOrder() with the newly selected value.
 * Requirements: 7.1, 7.2
 */
function handleSortChange(event) {
  setSortOrder(event.target.value);
}

/**
 * Handle theme toggle button clicks.
 * Toggles between light and dark themes.
 * Requirements: 9.1, 9.2
 */
function handleThemeToggle() {
  setTheme(AppState.theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT);
}

/* ==========================================================================
   10. INITIALIZATION
   ========================================================================== */

/**
 * Initialize the application: load persisted state, render the full UI,
 * then attach all event handlers.
 * Requirements: 5.4, 9.3, 10.2
 */
function init() {
  loadState();
  renderAll();

  // Transaction form submit
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', handleFormSubmit);
  }

  // Transaction list delete (event delegation)
  const transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.addEventListener('click', handleDeleteClick);
  }

  // Add category button
  const addCategoryBtn = document.getElementById('add-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', handleAddCategory);
  }

  // Spending limits (event delegation)
  const limitsList = document.getElementById('limits-list');
  if (limitsList) {
    limitsList.addEventListener('click', handleSetLimit);
  }

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', handleSortChange);
  }

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', handleThemeToggle);
  }
}

document.addEventListener('DOMContentLoaded', init);
