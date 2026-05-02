# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a fully client-side single-page application using plain HTML, CSS, and Vanilla JavaScript. All state flows unidirectionally: user action → mutate `AppState` → write Local Storage → re-render DOM. Chart.js is loaded via CDN. No build step, no framework, no test files.

## Tasks

- [x] 1. Create project file structure and HTML skeleton
  - Create `index.html` at the project root with the full semantic HTML structure: `<header>`, `<main>`, all named sections (`#balance-section`, `#input-section`, `#category-section`, `#limits-section`, `#sort-controls`, `#transaction-list-section`, `#chart-section`, `#summary-section`), and the `#storage-warning` banner
  - Add `<link>` to `css/styles.css` and `<script>` tags for Chart.js CDN (`https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js`) and `js/app.js` (deferred)
  - Create `css/styles.css` as an empty file
  - Create `js/app.js` as an empty file
  - Include all element IDs exactly as specified in the design: `#theme-toggle`, `#balance-display`, `#transaction-form`, `#item-name`, `#item-amount`, `#item-category`, `#form-error`, `#new-category-name`, `#add-category-btn`, `#category-error`, `#limits-list`, `#sort-select`, `#transaction-list`, `#empty-state-msg`, `#spending-chart`, `#chart-empty-msg`, `#summary-content`, `#summary-empty-msg`
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Implement AppState, constants, and Local Storage persistence
  - [x] 2.1 Define constants and AppState in `js/app.js`
    - Declare `DEFAULT_CATEGORIES`, `LS_KEY`, `SORT_ORDERS`, `THEMES`, and `CHART_COLORS` constants
    - Define the `AppState` object with fields: `transactions: []`, `categories: [...DEFAULT_CATEGORIES]`, `spendingLimits: {}`, `theme: 'light'`, `sortOrder: 'insertion'`
    - _Requirements: 5.1, 9.4, 11.1_
  - [x] 2.2 Implement `saveState()` with error handling
    - Serialize `transactions`, `categories`, `spendingLimits`, and `theme` (not `sortOrder`) to `localStorage` under `LS_KEY` using `JSON.stringify`
    - Wrap in `try/catch`; on error call `showStorageWarning()`
    - _Requirements: 10.1_
  - [x] 2.3 Implement `loadState()` with defensive parsing
    - Read and `JSON.parse` the value at `LS_KEY`; return early (use defaults) if key is absent
    - Validate each field before assignment: `transactions` must be an array (drop malformed items missing `id`, `name`, `amount`, `category`, or `timestamp`); `categories` must be a non-empty string array; `spendingLimits` must be a plain object with numeric values; `theme` must be `'light'` or `'dark'`
    - On any `catch`, reset all fields to empty/default state and call `showStorageWarning()`
    - _Requirements: 10.2, 10.3_
  - [x] 2.4 Implement `showStorageWarning()`
    - Remove the `hidden` attribute from `#storage-warning` to display the non-blocking banner
    - _Requirements: 10.3_

- [x] 3. Implement validation functions (pure)
  - [x] 3.1 Implement `validateTransaction(name, amount, category)`
    - Return `{ ok: false, errors: string[] }` if `name` is empty/whitespace, `amount` is not a positive finite number, or `category` is empty
    - Return `{ ok: true, errors: [] }` when all fields are valid
    - _Requirements: 1.3, 1.4_
  - [x] 3.2 Implement `validateCategory(name, existingCategories)`
    - Return `{ ok: false, error }` if `name` is empty/whitespace or matches any existing category case-insensitively
    - Return `{ ok: true }` otherwise
    - _Requirements: 5.3_
  - [x] 3.3 Implement `validateSpendingLimit(value)`
    - Return `{ ok: false, error }` for any value that is not a positive finite number (zero, negative, NaN, non-numeric string)
    - Return `{ ok: true }` for valid positive finite numbers
    - _Requirements: 8.5_

- [x] 4. Implement computed value functions (pure)
  - [x] 4.1 Implement `computeBalance(transactions)`
    - Return the arithmetic sum of all `transaction.amount` values; return `0` for an empty array
    - _Requirements: 3.1, 3.4_
  - [x] 4.2 Implement `computeCategoryTotals(transactions)`
    - Return a `Map<string, number>` where each key is a category name and each value is the sum of amounts for transactions in that category
    - Every transaction must be counted in exactly one entry; the sum of all map values must equal `computeBalance(transactions)`
    - _Requirements: 4.1, 4.3_
  - [x] 4.3 Implement `computeMonthlySummary(transactions)`
    - Group transactions by calendar month derived from `transaction.timestamp` (format: "Month YYYY", e.g. "June 2025")
    - Return a `Map<string, MonthSummary>` where each entry has `label`, `total`, and `byCategory` fields
    - Each entry's `total` must equal the sum of all transaction amounts in that month; `byCategory` must correctly partition that month's transactions
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 4.4 Implement `getSortedTransactions(transactions, order)`
    - Return a new array (do not mutate the original) sorted per the `order` value:
      - `'amount-asc'`: ascending by `amount`
      - `'amount-desc'`: descending by `amount`
      - `'category-asc'`: lexicographic ascending by `category`
      - `'insertion'`: original array order (stable, by `timestamp`)
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 5. Checkpoint — verify pure functions in browser console
  - Open `index.html` in a browser, open DevTools console, and manually call `computeBalance`, `computeCategoryTotals`, `computeMonthlySummary`, `getSortedTransactions`, `validateTransaction`, `validateCategory`, and `validateSpendingLimit` with sample inputs to confirm correct return values before wiring up state mutations.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement state mutation functions
  - [x] 6.1 Implement `addTransaction(name, amount, category)`
    - Call `validateTransaction()`; on failure return `{ ok: false, error }` without mutating state
    - On success: generate a transaction `id` using `crypto.randomUUID()` with a `Date.now()`-based fallback, set `timestamp: Date.now()`, push to `AppState.transactions`, call `saveState()`, call `renderAll()`, return `{ ok: true }`
    - _Requirements: 1.2, 1.5, 10.1_
  - [x] 6.2 Implement `deleteTransaction(id)`
    - Filter `AppState.transactions` to remove the entry with matching `id`, call `saveState()`, call `renderAll()`
    - _Requirements: 2.3, 10.1_
  - [x] 6.3 Implement `addCategory(name)`
    - Call `validateCategory(name, AppState.categories)`; on failure return `{ ok: false, error }`
    - On success: push `name` to `AppState.categories`, call `saveState()`, call `renderCategorySelectors()`, return `{ ok: true }`
    - _Requirements: 5.2, 10.1_
  - [x] 6.4 Implement `setSpendingLimit(category, limit)`
    - Call `validateSpendingLimit(limit)`; on failure return `{ ok: false, error }`
    - On success: set `AppState.spendingLimits[category] = Number(limit)`, call `saveState()`, call `renderSpendingLimitWarnings()`, return `{ ok: true }`
    - _Requirements: 8.1, 10.1_
  - [x] 6.5 Implement `setTheme(theme)`
    - Set `AppState.theme = theme`, call `saveState()`, call `renderTheme()`
    - _Requirements: 9.2, 10.1_
  - [x] 6.6 Implement `setSortOrder(order)`
    - Set `AppState.sortOrder = order`, call `renderTransactionList()` (sort order is session-only, not persisted)
    - _Requirements: 7.1, 7.2_

- [x] 7. Implement rendering functions
  - [x] 7.1 Implement `renderBalance()`
    - Call `computeBalance(AppState.transactions)` and update `#balance-display` text to the formatted value (e.g. `$0.00`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 7.2 Implement `renderTransactionList()`
    - Call `getSortedTransactions(AppState.transactions, AppState.sortOrder)` to get the display order
    - For each transaction, render an `<li>` showing item name, amount, category, and a delete button with a `data-id` attribute
    - Apply the highlight CSS class to `<li>` elements whose category total meets or exceeds its spending limit (use `computeCategoryTotals()` and `AppState.spendingLimits`)
    - Show `#empty-state-msg` when the list is empty; hide it otherwise
    - _Requirements: 2.1, 2.2, 2.4, 7.2, 7.3, 8.2_
  - [x] 7.3 Implement `renderChart()`
    - If `AppState.transactions` is empty, hide `<canvas id="spending-chart">` and show `#chart-empty-msg`; destroy any existing `chartInstance` and return
    - Otherwise show the canvas, hide the placeholder, destroy any existing `chartInstance`, build `labels` and `data` from `computeCategoryTotals()`, and instantiate a new `Chart` with `type: 'pie'`, a fixed color palette cycling over categories, legend at bottom, and a tooltip callback showing `label: value (pct%)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 7.4 Implement `renderSummary()`
    - Call `computeMonthlySummary(AppState.transactions)` and render each month as a block in `#summary-content` showing the month label, total, and per-category breakdown
    - Show `#summary-empty-msg` when there are no transactions
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 7.5 Implement `renderCategorySelectors()`
    - Rebuild the `<option>` elements in `#item-category` from `AppState.categories`
    - Rebuild the spending-limit input rows in `#limits-list`: one row per category with a label, a number input pre-filled with the current limit (if any), a "Set Limit" button, and a warning indicator element (hidden by default)
    - _Requirements: 5.1, 5.2, 8.1_
  - [x] 7.6 Implement `renderTheme()`
    - Set `<body>` class to `theme-light` or `theme-dark` based on `AppState.theme`
    - Update `#theme-toggle` button text (e.g. "🌙 Dark Mode" / "☀️ Light Mode")
    - _Requirements: 9.1, 9.2_
  - [x] 7.7 Implement `renderSpendingLimitWarnings()`
    - For each category in `AppState.categories`, compare `computeCategoryTotals()` result against `AppState.spendingLimits`
    - Show the warning indicator in the corresponding `#limits-list` row when the category total meets or exceeds its limit; hide it otherwise
    - _Requirements: 8.2, 8.3, 8.4_
  - [x] 7.8 Implement `renderAll()`
    - Call `renderBalance()`, `renderTransactionList()`, `renderChart()`, `renderSummary()`, `renderCategorySelectors()`, `renderTheme()`, and `renderSpendingLimitWarnings()` in sequence
    - _Requirements: 10.2_

- [x] 8. Implement event handlers and initialization
  - [x] 8.1 Wire up the transaction form submit handler
    - On `#transaction-form` submit: prevent default, read `#item-name`, `#item-amount`, `#item-category` values, call `addTransaction()`
    - On failure: display the error string(s) in `#form-error`
    - On success: clear `#form-error` and reset the form
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 8.2 Wire up the transaction list delete handler (event delegation)
    - Attach a single `click` listener to `#transaction-list`; when the clicked element has a `data-id` attribute, call `deleteTransaction(data-id)`
    - _Requirements: 2.3_
  - [x] 8.3 Wire up the add-category button handler
    - On `#add-category-btn` click: read `#new-category-name` value, call `addCategory()`
    - On failure: display error in `#category-error`
    - On success: clear `#category-error` and clear the input field
    - _Requirements: 5.2, 5.3_
  - [x] 8.4 Wire up the spending-limit set handler (event delegation)
    - Attach a single `click` listener to `#limits-list`; when a "Set Limit" button is clicked, read the adjacent number input value and the `data-category` attribute, call `setSpendingLimit()`
    - On failure: display an inline error next to the relevant row
    - _Requirements: 8.1, 8.5_
  - [x] 8.5 Wire up the sort select change handler
    - On `#sort-select` change: call `setSortOrder(selectedValue)`
    - _Requirements: 7.1, 7.2_
  - [x] 8.6 Wire up the theme toggle handler
    - On `#theme-toggle` click: call `setTheme(AppState.theme === 'light' ? 'dark' : 'light')`
    - _Requirements: 9.1, 9.2_
  - [x] 8.7 Implement `init()` and attach to `DOMContentLoaded`
    - Call `loadState()`, then `renderAll()`, then attach all event handlers
    - _Requirements: 5.4, 9.3, 10.2_

- [x] 9. Checkpoint — verify full interactivity
  - Open `index.html` in a browser and confirm: transactions can be added and deleted, balance updates immediately, chart updates, categories can be added, spending limits can be set with highlighting, sort controls work, theme toggle works, and all data survives a page reload.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement responsive CSS and visual design in `css/styles.css`
  - [x] 10.1 Implement base layout and typography
    - Set `box-sizing: border-box` globally; define a CSS custom property palette for both themes (light blue background `#e8f4fd` for light mode, dark background for dark mode, white button text)
    - Style `<header>`, `<main>`, and section containers with readable typography hierarchy (headings, labels, body text)
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 10.2 Implement light and dark theme CSS classes
    - Define `.theme-light` on `<body>`: light blue background (`#e8f4fd` or similar), dark text, white-text buttons with colored backgrounds
    - Define `.theme-dark` on `<body>`: dark background, light text, appropriately contrasted buttons
    - Ensure all UI elements (form inputs, selects, list items, chart section, summary section) inherit theme colors correctly
    - _Requirements: 9.1, 12.1, 12.2, 12.5_
  - [x] 10.3 Implement spending-limit highlight and warning styles
    - Define a `.over-limit` CSS class that visually highlights transaction list items (e.g. red/orange left border or background tint)
    - Style the warning indicator element to be visually distinct (e.g. colored badge or icon)
    - _Requirements: 8.2, 8.3_
  - [x] 10.4 Implement responsive layout with media queries
    - Single-column stacked layout at 320px; comfortable multi-column or wider layout at larger breakpoints up to 1920px
    - Ensure the transaction list is scrollable when it overflows its container
    - Ensure the chart canvas scales responsively within its section
    - _Requirements: 2.2, 12.4_
  - [x] 10.5 Implement empty-state and error message styles
    - Style `.empty-state` paragraphs with muted/italic appearance
    - Style `.error-msg` with a visible error color (red) and ensure they are visible when non-empty
    - Style `#storage-warning` as a non-blocking banner (e.g. fixed bottom bar or top banner with warning color)
    - _Requirements: 2.4, 4.5, 6.4, 10.3_

- [x] 11. Final checkpoint — full end-to-end verification
  - Open `index.html` in a browser at 320px and 1920px viewport widths and confirm the layout is usable at both extremes
  - Verify the complete data persistence round-trip: add transactions across multiple categories and months, set spending limits, add a custom category, switch to dark mode, reload the page, and confirm all state is fully restored
  - Confirm the Local Storage error path: temporarily override `localStorage.setItem` in the console to throw, trigger a save, and verify the warning banner appears without crashing the app
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP (none in this plan — no test files per constraints)
- Each task references specific requirements for traceability
- Checkpoints at tasks 5, 9, and 11 ensure incremental validation
- `sortOrder` is intentionally session-only and is never written to Local Storage
- Chart.js `chartInstance` must be destroyed before re-creating to avoid canvas reuse errors
- All form error elements use `aria-live="polite"` for screen reader accessibility (already in HTML skeleton from task 1)
