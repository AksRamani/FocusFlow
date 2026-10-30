# FocusFlow: To-Do List, Kanban View & Task Management (Chrome Extension)

A clean, minimalist dark-themed to-do list and Kanban board task manager that transforms your browser's New Tab / homepage into a focused productivity workspace.

---

## ✨ Features & Capabilities

### 📌 Kanban View & Focused Single Tabs
- **3-Column Visual Board:** Seamlessly manage workflow across **To Do**, **In Progress**, and **Done**.
- **Single-Tab Focus Mode:** Switch between the full Kanban board view or dedicated single-column views with live task counts.
- **Ambient Clock & Progress Meter:** Features a live digital clock, formatted date, and a visual task completion bar showing percentage progress.

### 📥 Bulk Task Import (Smart Parsing)
- **Paste Lists in Bulk:** Import dozens of tasks at once with keyboard shortcut `B` or the **Bulk Add** button.
- **Smart Prefix Stripping:** Automatically removes leading bullet points (`-`, `*`, `•`), numbered lists (`1.`, `2)`), and checkboxes (`- [ ]`, `[x]`).
- **Smart Priority Tags:** Automatically assigns priorities when typing `[urgent]`, `[high]`, `[medium]`, `[low]` or exclamation marks (`!`, `!!`, `!!!`) anywhere in the line.

### ➕ Single Task Add & Fast Inline Editing
- Quickly add individual tasks with title, column status, priority, and notes (`N`).
- Double-click any card to open the edit modal.
- Native drag-and-drop support with visual insertion indicators, plus quick-move arrow buttons (`←` / `→`) on each card.

### 🎯 Direct Priority Dropdown on Cards
- Change priorities (**Urgent**, **High**, **Medium**, **Low**) with a **single selection** directly on the card without repeatedly clicking to cycle.
- Styled as a compact dark-theme pill with priority indicator dots (`●`) and colors.

### 🔗 Pull Request (PR) Link Tracking for Done Tasks
- **Track Finished Work:** Add GitHub, GitLab, or Bitbucket PR links directly to completed tasks.
- **On-Card PR Badge:** Displays an interactive PR pill (e.g. `PR #42`) with external link navigation (`target="_blank"`), plus quick edit (`✎`) and delete (`✕`) controls.
- **Quick `+ Add PR` Button:** Easily attach a PR link to any Done task with one click without opening the full edit modal.
- **Automatic URL Normalization:** Handles full URLs, repository paths, and PR numbers.

### 🗑️ Clear Done Column
- Dedicated **Clear** button directly in the **Done** column header to flush completed tasks.
- Prompts for confirmation to prevent accidental loss of data.

### 📋 End-of-Day Daily Status Report Generator
- **One-Click Report Generation (`R`):** Click the **Daily Report** button in the header to generate a clean daily summary of all tasks.
- **"Report is generating..." Loading State:** Smooth transition feedback while compiling task statuses and PR references.
- **Status-Wise Categorization:**
  - **Done:** Lists all completed tasks with priorities, notes, and **their attached PR links**. Includes a `+ Add PR` shortcut for any finished task missing a PR link.
  - **In Progress:** Lists current active tasks.
  - **To Do:** Lists upcoming tasks.
- **Dual View Modes:**
  - **Formatted View:** Interactive UI with status badges and clickable PR links.
  - **Markdown / Raw View:** Clean GitHub-flavored Markdown text.
- **Copy & Export Options:**
  - **Copy Report:** One-click copy formatted in Markdown, ready to paste directly into Slack, Teams, Jira, or email (with visual toast confirmation).
  - **Download .md:** Save the report as `daily-report-YYYY-MM-DD.md` directly to your computer.

### 🔍 Search & Priority Filtering
- Instant keyword search across task titles and notes with clear button.
- Filter tasks by priority dropdown (**All**, **Urgent**, **High**, **Medium**, **Low**).

### 🔒 100% Offline & Private
- All tasks are saved locally on your device via `chrome.storage.local` (with `localStorage` fallback).
- No external server dependencies, no tracking, and no account required.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `N` | Open **New Task** modal |
| `B` | Open **Bulk Add** modal |
| `R` | Open **Daily Report** modal |
| `Esc` | Close active modal / clear search |
| `Ctrl + Enter` / `Cmd + Enter` | Save and submit active modal |

---

## 🚀 How to Install Locally (Developer Mode)

1. Open Google Chrome (or any Chromium browser like Brave, Edge, or Vivaldi).
2. Navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the repository root folder (`d:\FocusFlow`).
6. Open a new tab to see FocusFlow in action!

---

## 📁 Project Structure

```text
FocusFlow/
├── manifest.json              # Chrome Extension Manifest V3 configuration
├── index.html                 # Main New Tab / dashboard interface
├── styles.css                 # Dark theme styles, Kanban grid, and modal layouts
├── app.js                     # Core application logic, storage, drag-and-drop & report generator
├── icons/                     # Extension icons (16px, 48px, 128px, 512px)
├── dist/                      # Ready-to-publish extension zip packages
│   └── focusflow-extension-v1.0.0.zip
├── privacy-policy.html        # Privacy policy document
├── STORE_LISTING.md           # Chrome Web Store SEO title, description & metadata
└── README.md                  # Project documentation
```

---

## 📦 Publishing to the Chrome Web Store

1. A pre-packaged, upload-ready ZIP file is provided at:
   `dist/focusflow-extension-v1.0.0.zip`
2. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Click **Add new item** and upload the ZIP file from the `dist/` directory.
4. Copy the title, short description, and formatted long description from [`STORE_LISTING.md`](file:///d:/FocusFlow/STORE_LISTING.md).
5. Submit for review!

---

## 📄 License & Credits

Developed by **Aakash Ramani** & **Antigravity**. Released under the MIT License.
