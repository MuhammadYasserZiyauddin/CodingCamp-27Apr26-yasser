# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript. There is no build step, no server, and no framework. All data is persisted in the browser's Local Storage API. The app is delivered as a single `index.html` file that references one CSS file (`css/styles.css`) and one JavaScript file (`js/app.js`), plus the Chart.js library loaded from a CDN.

The application allows users to:
- Record expense transactions (name, amount, category)
- Visualize spending distribution via a Chart.js pie chart
- Manage custom categories and per-category spending limits
- Review a monthly summary of spending
- Sort and filter their transaction list
- Toggle between light and dark themes

All state mutations follow a unidirectional data flow: user action → state update → Local Storage write → DOM re-render. This keeps the single JS file predictable and debuggable without a framework.

---

## Architecture

### File Structure

```
/
├── index.html
├── css/
│   └── styles.css
└── js/
    └── app.js
```

Chart.js is loaded via CDN in `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
```

### Architectural Pattern: State → Render

The entire application state lives in a single in-memory object (`AppState`). Every user action mutates `AppState`, persists it to Local Storage, then calls the relevant render function(s). There is no two-way data binding and no virtual DOM.

```
User Action
    │
    ▼
Mutate AppState
    │
    ▼
Persist to Local Storage
    │
    ▼
Re-render affected DOM sections
```

### Module Boundaries (within app.js)

Although the app is a single file, the code is organized into clearly separated logical sections using comments and function groupings:

1. **Constants** — default categories, Local Storage keys, CSS class names
2. **State** — `AppState` object definition and initial values
3. **Storage** — `loadState()`, `saveState()`, error handling
4. **Validation** — pure validation functions for transactions, categories, limits
5. **State Mutations** — `addTransaction()`, `deleteTransaction()`, `addCategory()`, `setSpendingLimit()`, `setTheme()`, `setSortOrder()`
6. **Computed Values** — `computeBalance()`, `computeCategoryTotals()`, `computeMonthlySummary()`
7. **Rendering** — `renderAll()`, `renderTransactionList()`, `renderChart()`, `renderBalance()`, `renderSummary()`, `renderCategorySelectors()`, `renderTheme()`
8. **Event Handlers** — form submit, delete click, sort change, theme toggle, category add, limit set
9. **Initialization** — `init()` called on `DOMContentLoaded`

---

## Components and Interfaces

### HTML Structure (index.html)

```
<body>
  <header>
    <h1>Expense & Budget Visualizer</h1>
    <button id="theme-toggle">🌙 Dark Mode</button>
  </header>

  <main>
    <!-- Balance -->
    <section id="balance-section">
      <span id="balance-display">$0.00</span>
    </section>

    <!-- Transaction Input Form -->
    <section id="input-section">
      <form id="transaction-form">
        <input id="item-name" type="text" placeholder="Item name" />
        <input id="item-amount" type="number" min="0.01" step="0.01" placeholder="Amount" />
        <select id="item-category"></select>
        <button type="submit">Add Transaction</button>
        <p id="form-error" class="error-msg" aria-live="polite"></p>
      </form>
    </section>

    <!-- Category Management -->
    <section id="category-section">
      <input id="new-category-name" type="text" placeholder="New category name" />
      <button id="add-category-btn">Add Category</button>
      <p id="category-error" class="error-msg" aria-live="polite"></p>
    </section>

    <!-- Spending Limits -->
    <section id="limits-section">
      <div id="limits-list"></div>
    </section>

    <!-- Sort Controls -->
    <div id="sort-controls">
      <label for="sort-select">Sort by:</label>
      <select id="sort-select">
        <option value="insertion">Default (insertion order)</option>
        <option value="amount-asc">Amount ↑</option>
        <option value="amount-desc">Amount ↓</option>
        <option value="category-asc">Category A–Z</option>
      </select>
    </div>

    <!-- Transaction List -->
    <section id="transaction-list-section">
      <ul id="transaction-list"></ul>
      <p id="empty-state-msg" class="empty-state">No transactions yet.</p>
    </section>

    <!-- Pie Chart -->
    <section id="chart-section">
      <canvas id="spending-chart"></canvas>
      <p id="chart-empty-msg" class="empty-state">Add transactions to see the chart.</p>
    </section>

    <!-- Monthly Summary -->
    <section id="summary-section">
      <h2>Monthly Summary</h2>
      <div id="summary-content"></div>
      <p id="summary-empty-msg" class="empty-state">No transactions yet.</p>
    </section>
  </main>

  <!-- Local Storage warning (non-blocking) -->
  <div id="storage-warning" class="warning-banner" hidden>
    ⚠️ Local Storage is unavailable. Your data will not be saved.
  </div>
</body>
```

### JavaScript Public Interface (app.js)

All functions are module-scoped (no globals exported). The public surface is the `init()` function called on `DOMContentLoaded`.

#### State Mutation Functions

| Function | Parameters | Returns | Side Effects |
|---|---|---|---|
| `addTransaction(name, amount, category)` | strings/number | `{ ok, error }` | Mutates state, saves, re-renders |
| `deleteTransaction(id)` | string (UUID) | void | Mutates state, saves, re-renders |
| `addCategory(name)` | string | `{ ok, error }` | Mutates state, saves, re-renders |
| `setSpendingLimit(category, limit)` | string, number | `{ ok, error }` | Mutates state, saves, re-renders |
| `setTheme(theme)` | `'light'` \| `'dark'` | void | Mutates state, saves, re-renders |
| `setSortOrder(order)` | string | void | Mutates state, re-renders list |

#### Validation Functions (pure)

| Function | Parameters | Returns |
|---|---|---|
| `validateTransaction(name, amount, category)` | strings/number | `{ ok, errors: string[] }` |
| `validateCategory(name, existingCategories)` | string, string[] | `{ ok, error }` |
| `validateSpendingLimit(value)` | any | `{ ok, error }` |

#### Computed Value Functions (pure)

| Function | Parameters | Returns |
|---|---|---|
| `computeBalance(transactions)` | Transaction[] | number |
| `computeCategoryTotals(transactions)` | Transaction[] | `Map<string, number>` |
| `computeMonthlySummary(transactions)` | Transaction[] | `Map<string, MonthSummary>` |
| `getSortedTransactions(transactions, order)` | Transaction[], string | Transaction[] |

#### Rendering Functions

| Function | Reads From | Updates DOM |
|---|---|---|
| `renderAll()` | AppState | All sections |
| `renderBalance()` | AppState.transactions | `#balance-display` |
| `renderTransactionList()` | AppState | `#transaction-list`, `#empty-state-msg` |
| `renderChart()` | AppState.transactions | `<canvas>`, `#chart-empty-msg` |
| `renderSummary()` | AppState.transactions | `#summary-content`, `#summary-empty-msg` |
| `renderCategorySelectors()` | AppState.categories | `#item-category`, `#limits-list` |
| `renderTheme()` | AppState.theme | `<body>` class, `#theme-toggle` text |
| `renderSpendingLimitWarnings()` | AppState | Transaction list items, limit rows |

---

## Data Models

### AppState Object

```javascript
const AppState = {
  transactions: [],   // Transaction[]
  categories: [],     // string[] — includes defaults + custom
  spendingLimits: {}, // Record<categoryName, number>
  theme: 'light',     // 'light' | 'dark'
  sortOrder: 'insertion' // 'insertion' | 'amount-asc' | 'amount-desc' | 'category-asc'
};
```

### Transaction Object

```javascript
{
  id: string,        // crypto.randomUUID() or Date.now().toString() fallback
  name: string,      // item name, non-empty
  amount: number,    // positive float, stored as number
  category: string,  // must match a value in AppState.categories
  timestamp: number  // Date.now() at time of creation — used for month grouping
}
```

### Local Storage Schema

All data is stored under a single key to minimize serialization overhead and keep atomic writes consistent:

```javascript
const LS_KEY = 'expense_budget_visualizer_v1';

// Stored value (JSON.stringify of):
{
  transactions: Transaction[],
  categories: string[],
  spendingLimits: Record<string, number>,
  theme: 'light' | 'dark'
}
```

Using a single key means one `JSON.stringify` / `JSON.parse` call per save/load, and a single point of failure to handle.

### MonthSummary Object (computed, not persisted)

```javascript
{
  label: string,                    // e.g. "June 2025"
  total: number,                    // sum of all transaction amounts in month
  byCategory: Record<string, number> // category → total for that month
}
```

### Default Categories

```javascript
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];
```

Custom categories are appended to this list and persisted. On load, the stored categories array replaces the defaults entirely (the defaults are included in the stored array from first save).

### Sort Order Values

```javascript
const SORT_ORDERS = {
  INSERTION:    'insertion',
  AMOUNT_ASC:   'amount-asc',
  AMOUNT_DESC:  'amount-desc',
  CATEGORY_ASC: 'category-asc'
};
```

### Theme Values

```javascript
const THEMES = { LIGHT: 'light', DARK: 'dark' };
```

Applied as a CSS class on `<body>`: `class="theme-light"` or `class="theme-dark"`.

### Chart.js Integration

The pie chart is managed through a single `Chart` instance stored in a module-level variable:

```javascript
let chartInstance = null; // Chart | null
```

On each `renderChart()` call:
1. If `chartInstance` exists, call `chartInstance.destroy()` before creating a new one.
2. Build `labels` and `data` arrays from `computeCategoryTotals(AppState.transactions)`.
3. Instantiate `new Chart(canvas, { type: 'pie', data: {...}, options: {...} })`.

Chart.js configuration:
```javascript
{
  type: 'pie',
  data: {
    labels: categoryNames,
    datasets: [{
      data: categoryTotals,
      backgroundColor: CHART_COLORS // fixed palette of 10 colors, cycling
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: $${ctx.parsed.toFixed(2)} (${pct}%)`
        }
      }
    }
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Valid Transaction Persistence Round-Trip

*For any* valid transaction (non-empty name, positive amount, existing category), adding it via `addTransaction()` shall result in the transaction appearing in `AppState.transactions` and the serialized Local Storage value containing that transaction's data.

**Validates: Requirements 1.2, 10.1, 10.2**

---

### Property 2: Invalid Transaction Rejection

*For any* input where at least one field is empty/missing, or the amount is not a positive number, `validateTransaction()` shall return `ok: false` and `AppState.transactions` shall remain unchanged.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Balance Equals Sum of Amounts

*For any* array of transactions, `computeBalance(transactions)` shall return a value equal to the arithmetic sum of all transaction amounts. When the array is empty, the result shall be 0.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

### Property 4: Category Totals Partition

*For any* array of transactions, `computeCategoryTotals(transactions)` shall return a map where every transaction's amount is counted in exactly one category entry, and the sum of all category totals equals `computeBalance(transactions)`.

**Validates: Requirements 4.1, 4.3**

---

### Property 5: Transaction Deletion Removes from State and Storage

*For any* transaction present in `AppState.transactions`, calling `deleteTransaction(id)` shall result in that transaction no longer appearing in `AppState.transactions`, and the Local Storage value shall not contain that transaction's id.

**Validates: Requirements 2.3, 10.1**

---

### Property 6: Valid Category Addition Persists

*For any* non-empty category name that is not a case-insensitive duplicate of an existing category, calling `addCategory(name)` shall add the name to `AppState.categories` and persist it to Local Storage.

**Validates: Requirements 5.2, 5.4, 10.1**

---

### Property 7: Invalid Category Rejection

*For any* category name that is empty or is a case-insensitive match of an existing category, `validateCategory()` shall return `ok: false` and `AppState.categories` shall remain unchanged.

**Validates: Requirements 5.3**

---

### Property 8: Monthly Summary Correctness

*For any* array of transactions, `computeMonthlySummary(transactions)` shall produce an entry for every distinct calendar month represented in the data, where each entry's `total` equals the sum of all transaction amounts in that month, and each entry's `byCategory` map correctly partitions that month's transactions by category.

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 9: Sort Order Invariants

*For any* array of transactions and any sort order value, `getSortedTransactions(transactions, order)` shall return an array containing exactly the same transactions (no additions or removals), ordered according to the selected criterion:
- `amount-asc`: each transaction's amount ≤ the next transaction's amount
- `amount-desc`: each transaction's amount ≥ the next transaction's amount
- `category-asc`: each transaction's category ≤ the next transaction's category (lexicographic)
- `insertion`: order matches original insertion order

**Validates: Requirements 7.2, 7.3, 7.4**

---

### Property 10: Spending Limit Highlighting Consistency

*For any* set of transactions and spending limits, after `renderTransactionList()` and `renderSpendingLimitWarnings()` execute: every transaction belonging to a category whose total meets or exceeds its spending limit shall have the highlight CSS class applied, and every transaction in a category below its limit shall not have the highlight class. When a deletion brings a category total below its limit, the highlight and warning indicator shall be absent.

**Validates: Requirements 8.2, 8.3, 8.4**

---

### Property 11: Spending Limit Validation

*For any* value that is not a positive finite number (zero, negative, NaN, non-numeric string), `validateSpendingLimit()` shall return `ok: false` and no spending limit shall be written to `AppState.spendingLimits`.

**Validates: Requirements 8.5**

---

### Property 12: Theme Persistence Round-Trip

*For any* theme value (`'light'` or `'dark'`), calling `setTheme(theme)` shall update `AppState.theme`, write the value to Local Storage, and apply the corresponding CSS class to `<body>`. A subsequent `loadState()` call shall restore `AppState.theme` to that same value.

**Validates: Requirements 9.2, 9.3**

---

### Property 13: Full State Persistence Round-Trip

*For any* application state (transactions, categories, spending limits, theme), the result of `JSON.parse(localStorage.getItem(LS_KEY))` after any mutation shall be deeply equal to the current `AppState` (excluding the `sortOrder` field, which is session-only).

**Validates: Requirements 10.1, 10.2**

---

## Error Handling

### Local Storage Errors

All Local Storage access is wrapped in try/catch:

```javascript
function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      transactions: AppState.transactions,
      categories: AppState.categories,
      spendingLimits: AppState.spendingLimits,
      theme: AppState.theme
    }));
  } catch (e) {
    // Quota exceeded or storage unavailable — show non-blocking warning
    showStorageWarning();
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return; // First visit — use defaults
    const parsed = JSON.parse(raw);
    AppState.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    AppState.categories = Array.isArray(parsed.categories) ? parsed.categories : [...DEFAULT_CATEGORIES];
    AppState.spendingLimits = (parsed.spendingLimits && typeof parsed.spendingLimits === 'object') ? parsed.spendingLimits : {};
    AppState.theme = parsed.theme === 'dark' ? 'dark' : 'light';
  } catch (e) {
    // JSON parse error or storage unavailable — initialize empty state
    AppState.transactions = [];
    AppState.categories = [...DEFAULT_CATEGORIES];
    AppState.spendingLimits = {};
    AppState.theme = 'light';
    showStorageWarning();
  }
}
```

The `#storage-warning` banner is shown via `hidden` attribute removal. It is non-blocking — the app continues to function in-memory for the session.

### Form Validation Errors

Validation errors are displayed inline in `<p id="form-error">` and `<p id="category-error">` elements with `aria-live="polite"` for screen reader accessibility. Errors are cleared on the next successful submission or when the user modifies the relevant field.

### Chart.js Errors

If Chart.js fails to load (CDN unavailable), the `<canvas>` element will be hidden and the placeholder message shown. The rest of the app functions normally without the chart.

### Transaction ID Generation

`crypto.randomUUID()` is used for transaction IDs. If unavailable (very old browsers), a fallback of `Date.now().toString() + Math.random().toString(36).slice(2)` is used.

### Defensive Data Loading

On `loadState()`, each field is validated before assignment:
- `transactions` must be an array; each item must have `id`, `name`, `amount`, `category`, `timestamp` fields of correct types
- `categories` must be a non-empty array of strings
- `spendingLimits` must be a plain object with numeric values
- `theme` must be `'light'` or `'dark'`

Malformed individual transactions are silently dropped rather than crashing the load.

---

## Testing Strategy

> **Note:** Per the technical constraints (Requirement 11), this app has no build system, no test runner, and no test files. The testing strategy below describes how the correctness properties and acceptance criteria can be manually verified and how the code is structured to make verification straightforward.

### Structural Approach to Correctness

Because all business logic is implemented as **pure functions** (validation, computation, sorting), correctness can be verified by calling those functions directly in the browser console or a simple HTML test harness without any framework.

The key pure functions and their testability:

| Function | Testable As |
|---|---|
| `validateTransaction()` | Property 2 — call with generated inputs |
| `validateCategory()` | Property 7 — call with edge cases |
| `validateSpendingLimit()` | Property 11 — call with invalid values |
| `computeBalance()` | Property 3 — verify sum |
| `computeCategoryTotals()` | Property 4 — verify partition |
| `computeMonthlySummary()` | Property 8 — verify grouping |
| `getSortedTransactions()` | Property 9 — verify ordering |

### Manual Verification Checklist

**Transaction Input (Req 1)**
- [ ] Submit form with all fields → transaction appears in list and Local Storage
- [ ] Submit with empty name → error shown, no transaction added
- [ ] Submit with empty amount → error shown, no transaction added
- [ ] Submit with amount = 0 → error shown
- [ ] Submit with amount = -5 → error shown
- [ ] Successful add → form fields cleared

**Transaction List (Req 2)**
- [ ] All transactions show name, amount, category
- [ ] Delete button removes transaction from list and Local Storage
- [ ] Empty state message shown when no transactions

**Balance (Req 3)**
- [ ] Balance updates immediately on add and delete
- [ ] Balance = 0 with no transactions
- [ ] Balance = sum of all amounts

**Chart (Req 4)**
- [ ] Pie chart renders with correct slices per category
- [ ] Chart updates on add/delete
- [ ] Placeholder shown when no transactions
- [ ] Single category → full circle

**Categories (Req 5)**
- [ ] Default categories: Food, Transport, Fun
- [ ] Add valid custom category → appears in selector
- [ ] Add empty category → error
- [ ] Add duplicate (case-insensitive) → error
- [ ] Custom categories persist across page reload

**Monthly Summary (Req 6)**
- [ ] Transactions grouped by month with correct totals
- [ ] Per-category breakdown shown per month
- [ ] Empty state shown when no transactions

**Sorting (Req 7)**
- [ ] Amount ascending/descending sort works
- [ ] Category alphabetical sort works
- [ ] Default insertion order preserved

**Spending Limits (Req 8)**
- [ ] Set limit for a category
- [ ] Exceed limit → transactions highlighted, warning shown
- [ ] Delete transaction to go below limit → highlight removed
- [ ] Non-positive limit value → validation error

**Theme (Req 9)**
- [ ] Toggle switches between light and dark
- [ ] Theme persists across reload
- [ ] Default is light theme

**Persistence (Req 10)**
- [ ] All data survives page reload
- [ ] Corrupt Local Storage → empty state + warning banner

**Responsive Design (Req 12)**
- [ ] Layout usable at 320px width
- [ ] Layout usable at 1920px width
- [ ] Light blue background in light mode
- [ ] Dark background in dark mode
- [ ] White text on buttons

### Property-Based Testing Note

The pure functions listed above are ideal candidates for property-based testing using a library such as [fast-check](https://github.com/dubzzz/fast-check) if a test harness is ever added. Each correctness property in this document maps directly to a `fc.property()` assertion. The properties are written to be framework-agnostic and can be adapted to any PBT library.

For example, Property 3 (Balance Equals Sum) would be:
```javascript
// fast-check example (not part of the app — illustrative only)
fc.assert(fc.property(
  fc.array(fc.record({ amount: fc.float({ min: 0.01, max: 10000 }) })),
  (transactions) => {
    const expected = transactions.reduce((s, t) => s + t.amount, 0);
    return computeBalance(transactions) === expected;
  }
));
```
