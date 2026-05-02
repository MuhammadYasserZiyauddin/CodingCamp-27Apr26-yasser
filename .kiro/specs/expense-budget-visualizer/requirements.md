# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, manage budgets, and visualize spending patterns through interactive charts. The app runs entirely in the browser with no backend server, persisting all data via the browser's Local Storage API. It is designed to be clean, minimal, and immediately usable without any setup.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of a name, amount, and category.
- **Category**: A label grouping transactions (e.g., Food, Transport, Fun, or a user-defined custom category).
- **Balance**: The running total of all transaction amounts currently stored.
- **Chart**: The pie chart displaying spending distribution across categories.
- **Local_Storage**: The browser's built-in Local Storage API used to persist all data client-side.
- **Input_Form**: The UI form used to enter new transactions.
- **Transaction_List**: The scrollable UI component displaying all stored transactions.
- **Summary_View**: The monthly summary panel showing aggregated spending per month.
- **Spending_Limit**: A user-defined threshold amount per category above which spending is highlighted.
- **Theme**: The visual color scheme of the App, either light or dark mode.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly and accurately.

#### Acceptance Criteria

1. THE Input_Form SHALL include fields for Item Name (text), Amount (numeric), and Category (selectable).
2. WHEN the user submits the Input_Form with all fields filled and a valid positive Amount, THE App SHALL add the Transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Input_Form SHALL display a validation error message identifying the missing field(s) and SHALL NOT add a Transaction.
4. WHEN the user submits the Input_Form with an Amount that is not a positive number, THE Input_Form SHALL display a validation error message and SHALL NOT add a Transaction.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored Transactions, each showing the Item Name, Amount, and Category.
2. THE Transaction_List SHALL be scrollable when the number of Transactions exceeds the visible area.
3. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Local_Storage.
4. WHEN the Transaction_List contains no Transactions, THE App SHALL display an empty-state message indicating no transactions have been recorded.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the total Balance, calculated as the sum of all Transaction amounts, at the top of the page.
2. WHEN a Transaction is added, THE App SHALL update the displayed Balance within the same render cycle, with no perceptible delay.
3. WHEN a Transaction is deleted, THE App SHALL update the displayed Balance within the same render cycle, with no perceptible delay.
4. WHEN no Transactions exist, THE App SHALL display a Balance of 0.

---

### Requirement 4: Visual Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. THE Chart SHALL display spending distribution as a pie chart, with each slice representing one Category's total amount.
2. WHEN a Transaction is added or deleted, THE Chart SHALL update automatically to reflect the new distribution.
3. THE Chart SHALL label each slice with the Category name and its percentage of total spending.
4. WHEN only one Category has Transactions, THE Chart SHALL render a full circle for that Category.
5. WHEN no Transactions exist, THE App SHALL display a placeholder message in place of the Chart.

---

### Requirement 5: Category Management

**User Story:** As a user, I want to create custom categories beyond the defaults, so that I can organize my expenses in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide the default Categories: Food, Transport, and Fun.
2. WHEN the user submits a new category name that is non-empty and not a duplicate of an existing Category, THE App SHALL add the new Category to the Category selector in the Input_Form and persist it to Local_Storage.
3. WHEN the user submits a new category name that is empty or duplicates an existing Category name (case-insensitive), THE App SHALL display a validation error and SHALL NOT add the Category.
4. WHEN the App loads, THE App SHALL restore all previously saved custom Categories from Local_Storage.

---

### Requirement 6: Monthly Summary View

**User Story:** As a user, I want to view a summary of my spending grouped by month, so that I can track how my expenses change over time.

#### Acceptance Criteria

1. THE Summary_View SHALL display Transactions grouped by calendar month (e.g., "June 2025"), showing the total amount spent per month.
2. WHEN the user navigates to the Summary_View, THE App SHALL render all months for which at least one Transaction exists.
3. THE Summary_View SHALL display each month's Category breakdown, showing the total amount per Category within that month.
4. WHEN no Transactions exist, THE Summary_View SHALL display an empty-state message.

---

### Requirement 7: Transaction Sorting

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can find and analyze my expenses more easily.

#### Acceptance Criteria

1. THE Transaction_List SHALL provide a sort control allowing the user to sort Transactions by Amount (ascending or descending) or by Category (alphabetical).
2. WHEN the user selects a sort option, THE Transaction_List SHALL re-render with Transactions ordered according to the selected option within the same render cycle.
3. WHEN a new Transaction is added while a sort option is active, THE Transaction_List SHALL insert the new Transaction in the correct sorted position.
4. THE App SHALL default to displaying Transactions in the order they were added (insertion order) when no sort option is selected.

---

### Requirement 8: Spending Limit Highlighting

**User Story:** As a user, I want to set a spending limit per category and be visually alerted when I exceed it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL allow the user to set a numeric Spending_Limit for each Category.
2. WHEN the total amount of Transactions in a Category meets or exceeds the Spending_Limit for that Category, THE App SHALL visually highlight all Transactions in that Category in the Transaction_List.
3. WHEN the total amount of Transactions in a Category meets or exceeds the Spending_Limit for that Category, THE App SHALL display a warning indicator for that Category.
4. WHEN a Transaction is deleted and the Category total falls below the Spending_Limit, THE App SHALL remove the highlight and warning indicator for that Category.
5. IF a Spending_Limit value entered by the user is not a positive number, THEN THE App SHALL display a validation error and SHALL NOT save the Spending_Limit.

---

### Requirement 9: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control to switch between light Theme and dark Theme.
2. WHEN the user activates the toggle, THE App SHALL apply the selected Theme to all UI elements immediately, with no page reload.
3. WHEN the App loads, THE App SHALL restore the previously saved Theme preference from Local_Storage.
4. IF no Theme preference has been saved, THEN THE App SHALL default to light Theme.

---

### Requirement 10: Data Persistence

**User Story:** As a user, I want my data to be saved automatically, so that my transactions and settings are still available when I reopen the app.

#### Acceptance Criteria

1. THE App SHALL persist all Transactions, custom Categories, Spending_Limits, and Theme preference to Local_Storage after every add or delete operation.
2. WHEN the App loads, THE App SHALL read all stored data from Local_Storage and restore the Transaction_List, Chart, Balance, custom Categories, Spending_Limits, and Theme to their last saved state.
3. IF Local_Storage is unavailable or returns a parse error on load, THEN THE App SHALL initialize with an empty state and display a non-blocking warning message to the user.

---

### Requirement 11: Technical Constraints

**User Story:** As a developer, I want the app to be built with plain HTML, CSS, and Vanilla JavaScript, so that it has no build dependencies and runs in any modern browser without a server.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no frameworks or backend server.
2. THE App SHALL use a single CSS file located in the `css/` directory.
3. THE App SHALL use a single JavaScript file located in the `js/` directory.
4. THE App SHALL function correctly in the current stable versions of Chrome, Firefox, Edge, and Safari.
5. THE App SHALL load and become interactive in under 2 seconds on a standard broadband connection.

---

### Requirement 12: Visual Design and Accessibility

**User Story:** As a user, I want a clean, readable interface with a comfortable color scheme, so that the app is pleasant and easy to use.

#### Acceptance Criteria

1. THE App SHALL use a light blue background color in light Theme.
2. THE App SHALL render buttons with a colored background and white text to ensure sufficient contrast.
3. THE App SHALL use a clear visual hierarchy with readable typography, distinguishing headings, labels, and body text.
4. THE App SHALL be responsive and usable on screen widths from 320px to 1920px.
5. WHILE the dark Theme is active, THE App SHALL apply a dark background and light text to all UI elements.
