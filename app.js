/**
 * FocusFlow - Minimal Dark Theme Kanban Extension
 * Author: Antigravity
 */

(function () {
  'use strict';

  // --- Constants & Priorities ---
  const PRIORITIES = {
    urgent: { label: 'Urgent', rank: 4, next: 'high' },
    high: { label: 'High', rank: 3, next: 'medium' },
    medium: { label: 'Medium', rank: 2, next: 'low' },
    low: { label: 'Low', rank: 1, next: 'urgent' }
  };

  const COLUMNS = ['todo', 'in-progress', 'done'];

  const DEFAULT_TASKS = [
    {
      id: 'demo-1',
      title: 'Welcome to FocusFlow! Paste your tasks all at once with Bulk Add',
      notes: 'Click the Bulk Add button or press B to paste a whole list.',
      status: 'todo',
      priority: 'high',
      createdAt: Date.now() - 3600000 * 2,
      order: 0
    },
    {
      id: 'demo-2',
      title: 'Drag and drop cards between To Do, In Progress, and Done',
      notes: 'You can drag to reorder within a column or between columns.',
      status: 'in-progress',
      priority: 'urgent',
      createdAt: Date.now() - 3600000,
      order: 0
    },
    {
      id: 'demo-3',
      title: 'Easily select priority from the dropdown: Urgent, High, Medium, Low',
      notes: 'Try selecting a priority from the dropdown directly on this card.',
      status: 'done',
      priority: 'medium',
      prLink: 'https://github.com/facebook/react/pull/42',
      createdAt: Date.now() - 7200000,
      order: 0
    }
  ];

  // --- App State ---
  let state = {
    tasks: [],
    activeView: 'board', // 'board' | 'todo' | 'in-progress' | 'done'
    searchQuery: '',
    priorityFilter: 'all',
    draggedTaskId: null,
    editingTaskId: null
  };

  // --- DOM Elements ---
  const elements = {
    currentTime: document.getElementById('currentTime'),
    currentDate: document.getElementById('currentDate'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    priorityFilter: document.getElementById('priorityFilter'),
    clearCompletedBtn: document.getElementById('clearCompletedBtn'),
    clearDoneColBtn: document.getElementById('clearDoneColBtn'),
    boardContainer: document.getElementById('boardContainer'),
    viewTabBtns: document.querySelectorAll('.tab-btn'),
    // Modals
    bulkAddModal: document.getElementById('bulkAddModal'),
    openBulkAddBtn: document.getElementById('openBulkAddBtn'),
    closeBulkAddBtn: document.getElementById('closeBulkAddBtn'),
    cancelBulkAddBtn: document.getElementById('cancelBulkAddBtn'),
    submitBulkAddBtn: document.getElementById('submitBulkAddBtn'),
    bulkTasksInput: document.getElementById('bulkTasksInput'),
    bulkTargetColumn: document.getElementById('bulkTargetColumn'),
    bulkDefaultPriority: document.getElementById('bulkDefaultPriority'),
    bulkTaskCount: document.getElementById('bulkTaskCount'),

    taskModal: document.getElementById('taskModal'),
    taskForm: document.getElementById('taskForm'),
    taskModalTitle: document.getElementById('taskModalTitle'),
    openAddTaskBtn: document.getElementById('openAddTaskBtn'),
    closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
    cancelTaskModalBtn: document.getElementById('cancelTaskModalBtn'),
    taskIdInput: document.getElementById('taskIdInput'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskColumnSelect: document.getElementById('taskColumnSelect'),
    taskPrioritySelect: document.getElementById('taskPrioritySelect'),
    taskPrLinkInput: document.getElementById('taskPrLinkInput'),
    taskNotesInput: document.getElementById('taskNotesInput'),

    // Daily Report Modal
    reportModal: document.getElementById('reportModal'),
    reportLoadingContainer: document.getElementById('reportLoadingContainer'),
    reportContentWrapper: document.getElementById('reportContentWrapper'),
    openReportBtn: document.getElementById('openReportBtn'),
    closeReportModalBtn: document.getElementById('closeReportModalBtn'),
    closeReportBtn: document.getElementById('closeReportBtn'),
    copyReportBtn: document.getElementById('copyReportBtn'),
    downloadReportBtn: document.getElementById('downloadReportBtn'),
    reportDateSubtitle: document.getElementById('reportDateSubtitle'),
    reportStatsBar: document.getElementById('reportStatsBar'),
    reportFormattedContainer: document.getElementById('reportFormattedContainer'),
    reportMarkdownContainer: document.getElementById('reportMarkdownContainer'),
    reportMarkdownText: document.getElementById('reportMarkdownText'),
    reportToggleFormatted: document.getElementById('reportToggleFormatted'),
    reportToggleMarkdown: document.getElementById('reportToggleMarkdown'),
    copyToast: document.getElementById('copyToast')
  };

  // --- Storage Helper ---
  const Storage = {
    async loadTasks() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['focusflow_tasks'], (res) => {
            if (res && res.focusflow_tasks && Array.isArray(res.focusflow_tasks)) {
              resolve(res.focusflow_tasks);
            } else {
              resolve(DEFAULT_TASKS);
            }
          });
        } else {
          try {
            const raw = localStorage.getItem('focusflow_tasks');
            if (raw) {
              resolve(JSON.parse(raw));
            } else {
              resolve(DEFAULT_TASKS);
            }
          } catch (e) {
            resolve(DEFAULT_TASKS);
          }
        }
      });
    },

    saveTasks(tasks) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ focusflow_tasks: tasks });
      } else {
        try {
          localStorage.setItem('focusflow_tasks', JSON.stringify(tasks));
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
      }
    }
  };

  // --- Date & Clock Utilities ---
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    elements.currentTime.textContent = `${hours}:${minutes}`;

    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    elements.currentDate.textContent = now.toLocaleDateString(undefined, dateOptions);
  }

  // --- Render Functions ---
  function render() {
    renderColumns();
    updateMetrics();
    updateTabCounts();
    updateViewMode();
  }

  function getFilteredTasks() {
    return state.tasks.filter((task) => {
      // Priority filter
      if (state.priorityFilter !== 'all' && task.priority !== state.priorityFilter) {
        return false;
      }
      // Search filter
      if (state.searchQuery.trim() !== '') {
        const query = state.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = (task.notes || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes) return false;
      }
      return true;
    });
  }

  function renderColumns() {
    const filteredTasks = getFilteredTasks();

    COLUMNS.forEach((colId) => {
      const listEl = document.getElementById(`list-${colId}`);
      const badgeEl = document.getElementById(`badge-${colId}`);
      if (!listEl) return;

      const colTasks = filteredTasks
        .filter((t) => t.status === colId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      if (badgeEl) {
        badgeEl.textContent = colTasks.length;
      }

      listEl.innerHTML = '';

      if (colTasks.length === 0) {
        const emptyMsg = state.searchQuery || state.priorityFilter !== 'all'
          ? 'No matching tasks'
          : colId === 'todo' ? 'No tasks to do' : colId === 'in-progress' ? 'Nothing in progress' : 'No completed tasks';
        listEl.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
        return;
      }

      colTasks.forEach((task) => {
        const card = createCardElement(task);
        listEl.appendChild(card);
      });
    });
  }

  function createCardElement(task) {
    const card = document.createElement('div');
    card.className = `task-card ${task.status === 'done' ? 'is-done' : ''}`;
    card.setAttribute('draggable', 'true');
    card.dataset.id = task.id;

    const isDone = task.status === 'done';
    const prio = task.priority || 'medium';
    const prioLabel = PRIORITIES[prio] ? PRIORITIES[prio].label : 'Med';

    // Move options helper
    let moveLeftBtn = '';
    let moveRightBtn = '';
    if (task.status === 'in-progress') {
      moveLeftBtn = `<button class="move-btn" data-action="move" data-target="todo" title="Move to To Do">←</button>`;
      moveRightBtn = `<button class="move-btn" data-action="move" data-target="done" title="Move to Done">→</button>`;
    } else if (task.status === 'todo') {
      moveRightBtn = `<button class="move-btn" data-action="move" data-target="in-progress" title="Move to In Progress">→</button>`;
    } else if (task.status === 'done') {
      moveLeftBtn = `<button class="move-btn" data-action="move" data-target="in-progress" title="Move to In Progress">←</button>`;
    }

    // PR Link markup
    let prHtml = '';
    const hasPr = Boolean(task.prLink && task.prLink.trim());
    if (hasPr) {
      const prDisplay = getPrDisplayText(task.prLink);
      const prUrl = normalizeUrl(task.prLink);
      prHtml = `
        <div class="card-pr-container">
          <div class="pr-pill-group">
            <a href="${escapeHtml(prUrl)}" target="_blank" rel="noopener noreferrer" class="pr-pill" title="${escapeHtml(task.prLink)}">
              <svg class="pr-icon" viewBox="0 0 16 16" fill="currentColor">
                <path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v7.256A2.246 2.246 0 0111.75 14a2.25 2.25 0 112.25-2.25c0-.414-.336-.75-.75-.75h-1V5a2.5 2.5 0 00-2.5-2.5zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5zm8.5 0a.75.75 0 100 1.5.75.75 0 000-1.5z"></path>
              </svg>
              <span class="pr-label">${escapeHtml(prDisplay)}</span>
              <svg class="pr-external-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.636 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1.793L5.146 10.793a.5.5 0 00.708.708L11.146 6.207v1.793a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-4.5a.5.5 0 00-.5-.5h-4.5z"/>
                <path d="M3 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V9.5a.5.5 0 00-1 0V13a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1h3.5a.5.5 0 000-1H3z"/>
              </svg>
            </a>
            <button class="pr-action-btn edit-pr-btn" data-action="edit-pr" title="Edit PR link">✎</button>
            <button class="pr-action-btn remove-pr-btn" data-action="remove-pr" title="Remove PR link">✕</button>
          </div>
        </div>
      `;
    } else if (isDone) {
      prHtml = `
        <div class="card-pr-container">
          <button class="add-pr-btn" data-action="add-pr" title="Add Pull Request link">
            <svg class="pr-icon" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v7.256A2.246 2.246 0 0111.75 14a2.25 2.25 0 112.25-2.25c0-.414-.336-.75-.75-.75h-1V5a2.5 2.5 0 00-2.5-2.5zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5zm8.5 0a.75.75 0 100 1.5.75.75 0 000-1.5z"></path>
            </svg>
            <span>+ Add PR</span>
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-top-row">
        <div class="card-title-group">
          <input type="checkbox" class="task-checkbox" ${isDone ? 'checked' : ''} title="Mark done/undone">
          <span class="card-title">${escapeHtml(task.title)}</span>
        </div>
        <div class="card-actions-menu">
          <button class="action-btn edit-btn" title="Edit task" data-action="edit">✎</button>
          <button class="action-btn delete-btn" title="Delete task" data-action="delete">✕</button>
        </div>
      </div>
      ${task.notes ? `<div class="card-notes">${escapeHtml(task.notes)}</div>` : ''}
      ${prHtml}
      <div class="card-meta-row">
        <select class="priority-select prio-${prio}" data-action="select-prio" title="Select priority">
          <option value="urgent" ${prio === 'urgent' ? 'selected' : ''}>● Urgent</option>
          <option value="high" ${prio === 'high' ? 'selected' : ''}>● High</option>
          <option value="medium" ${prio === 'medium' ? 'selected' : ''}>● Medium</option>
          <option value="low" ${prio === 'low' ? 'selected' : ''}>● Low</option>
        </select>
        <div class="quick-move-group">
          ${moveLeftBtn}
          ${moveRightBtn}
        </div>
      </div>
    `;

    // Event Listeners for Card
    const checkbox = card.querySelector('.task-checkbox');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleTaskDone(task.id, checkbox.checked);
    });

    const editBtn = card.querySelector('[data-action="edit"]');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditTaskModal(task.id);
    });

    const deleteBtn = card.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });

    const prioSelect = card.querySelector('[data-action="select-prio"]');
    if (prioSelect) {
      prioSelect.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      prioSelect.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      prioSelect.addEventListener('change', (e) => {
        e.stopPropagation();
        const newPriority = e.target.value;
        if (PRIORITIES[newPriority]) {
          updateTask(task.id, { priority: newPriority });
        }
      });
    }

    // PR Link Listeners
    const prLinkEl = card.querySelector('.pr-pill');
    if (prLinkEl) {
      prLinkEl.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    const addPrBtn = card.querySelector('[data-action="add-pr"]');
    if (addPrBtn) {
      addPrBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = prompt('Enter Pull Request link (e.g. GitHub PR URL):', '');
        if (val !== null && val.trim() !== '') {
          updateTask(task.id, { prLink: val.trim() });
        }
      });
    }

    const editPrBtn = card.querySelector('[data-action="edit-pr"]');
    if (editPrBtn) {
      editPrBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = prompt('Edit Pull Request URL:', task.prLink || '');
        if (val !== null) {
          updateTask(task.id, { prLink: val.trim() });
        }
      });
    }

    const removePrBtn = card.querySelector('[data-action="remove-pr"]');
    if (removePrBtn) {
      removePrBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Remove PR link from this task?')) {
          updateTask(task.id, { prLink: '' });
        }
      });
    }

    card.querySelectorAll('[data-action="move"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetStatus = btn.dataset.target;
        moveTaskStatus(task.id, targetStatus);
      });
    });

    // Double click to edit
    card.addEventListener('dblclick', () => {
      openEditTaskModal(task.id);
    });

    // Drag and Drop Events
    setupCardDragEvents(card, task.id);

    return card;
  }

  function updateMetrics() {
    const total = state.tasks.length;
    const completed = state.tasks.filter((t) => t.status === 'done').length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    elements.progressBar.style.width = `${pct}%`;
    elements.progressText.textContent = `${completed}/${total} done (${pct}%)`;
  }

  function updateTabCounts() {
    const todoCount = state.tasks.filter((t) => t.status === 'todo').length;
    const progressCount = state.tasks.filter((t) => t.status === 'in-progress').length;
    const doneCount = state.tasks.filter((t) => t.status === 'done').length;

    document.getElementById('tabCountTodo').textContent = todoCount;
    document.getElementById('tabCountInProgress').textContent = progressCount;
    document.getElementById('tabCountDone').textContent = doneCount;
  }

  function updateViewMode() {
    const board = elements.boardContainer;
    const activeView = state.activeView;

    // Update active tab buttons
    elements.viewTabBtns.forEach((btn) => {
      const view = btn.dataset.view;
      const isSelected = view === activeView;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    if (activeView === 'board') {
      board.classList.remove('single-tab-mode');
      COLUMNS.forEach((col) => {
        const colEl = document.getElementById(`column-${col}`);
        if (colEl) colEl.classList.remove('is-focused-tab');
      });
    } else {
      board.classList.add('single-tab-mode');
      COLUMNS.forEach((col) => {
        const colEl = document.getElementById(`column-${col}`);
        if (colEl) {
          colEl.classList.toggle('is-focused-tab', col === activeView);
        }
      });
    }
  }

  // --- Task Operations ---
  function addTask(taskData) {
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: taskData.title.trim(),
      notes: taskData.notes ? taskData.notes.trim() : '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      prLink: taskData.prLink ? taskData.prLink.trim() : '',
      createdAt: Date.now(),
      order: state.tasks.filter((t) => t.status === (taskData.status || 'todo')).length
    };
    state.tasks.push(newTask);
    Storage.saveTasks(state.tasks);
    render();
  }

  function updateTask(id, updates) {
    const index = state.tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      state.tasks[index] = { ...state.tasks[index], ...updates };
      Storage.saveTasks(state.tasks);
      render();
    }
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    Storage.saveTasks(state.tasks);
    render();
  }

  function toggleTaskDone(id, isDone) {
    const targetStatus = isDone ? 'done' : 'todo';
    moveTaskStatus(id, targetStatus);
  }

  function moveTaskStatus(id, newStatus) {
    const task = state.tasks.find((t) => t.id === id);
    if (task && task.status !== newStatus) {
      task.status = newStatus;
      // put at the end of the target column
      task.order = state.tasks.filter((t) => t.status === newStatus).length;
      Storage.saveTasks(state.tasks);
      render();
    }
  }

  function cycleTaskPriority(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (task) {
      const current = task.priority || 'medium';
      const next = PRIORITIES[current] ? PRIORITIES[current].next : 'medium';
      task.priority = next;
      Storage.saveTasks(state.tasks);
      render();
    }
  }

  function clearCompletedTasks() {
    const completedCount = state.tasks.filter((t) => t.status === 'done').length;
    if (completedCount === 0) {
      alert('There are no completed tasks in the Done column to clear.');
      return;
    }

    if (confirm(`Clear all ${completedCount} completed task(s) from the Done column?`)) {
      state.tasks = state.tasks.filter((t) => t.status !== 'done');
      Storage.saveTasks(state.tasks);
      render();
    }
  }

  // --- Bulk Add Parsing ---
  function parseBulkTasks(text, defaultColumn, defaultPriority) {
    const lines = text.split('\n');
    const parsed = [];

    lines.forEach((line) => {
      let trimmed = line.trim();
      if (!trimmed) return;

      // Strip leading markdown / bullet / number prefixes:
      // '- [ ] ', '* [ ] ', '- ', '* ', '• ', '1. ', '1) '
      trimmed = trimmed.replace(/^(\s*[-*•]|\s*\d+[\.\)])\s*(\[[ xX]\]\s*)?/, '').trim();
      if (!trimmed) return;

      let priority = defaultPriority;

      // Smart tag detection for priority
      if (/\[urgent\]/i.test(trimmed) || /!!!/.test(trimmed)) {
        priority = 'urgent';
        trimmed = trimmed.replace(/\[urgent\]/gi, '').replace(/!!!/g, '').trim();
      } else if (/\[high\]/i.test(trimmed) || /!!/.test(trimmed)) {
        priority = 'high';
        trimmed = trimmed.replace(/\[high\]/gi, '').replace(/!!/g, '').trim();
      } else if (/\[medium\]/i.test(trimmed)) {
        priority = 'medium';
        trimmed = trimmed.replace(/\[medium\]/gi, '').trim();
      } else if (/\[low\]/i.test(trimmed)) {
        priority = 'low';
        trimmed = trimmed.replace(/\[low\]/gi, '').trim();
      } else if (trimmed.endsWith('!') && !trimmed.endsWith('!!')) {
        priority = 'high';
        trimmed = trimmed.replace(/!+$/, '').trim();
      }

      if (trimmed.length > 0) {
        parsed.push({
          title: trimmed,
          notes: '',
          status: defaultColumn,
          priority: priority
        });
      }
    });

    return parsed;
  }

  function updateBulkLineCount() {
    const text = elements.bulkTasksInput.value;
    const col = elements.bulkTargetColumn.value;
    const prio = elements.bulkDefaultPriority.value;
    const tasks = parseBulkTasks(text, col, prio);
    const count = tasks.length;
    elements.bulkTaskCount.textContent = `${count} task${count === 1 ? '' : 's'} detected`;
  }

  function handleBulkSubmit() {
    const text = elements.bulkTasksInput.value;
    const col = elements.bulkTargetColumn.value;
    const defaultPrio = elements.bulkDefaultPriority.value;

    const parsedList = parseBulkTasks(text, col, defaultPrio);
    if (parsedList.length === 0) {
      alert('Please paste at least one valid task.');
      return;
    }

    const currentMaxOrder = state.tasks.filter((t) => t.status === col).length;

    parsedList.forEach((item, index) => {
      const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: item.title,
        notes: '',
        status: item.status,
        priority: item.priority,
        createdAt: Date.now() + index,
        order: currentMaxOrder + index
      };
      state.tasks.push(newTask);
    });

    Storage.saveTasks(state.tasks);
    closeBulkModal();
    render();
  }

  // --- Drag and Drop Handlers ---
  function setupCardDragEvents(card, taskId) {
    card.addEventListener('dragstart', (e) => {
      state.draggedTaskId = taskId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      state.draggedTaskId = null;
      clearDropIndicators();
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!state.draggedTaskId || state.draggedTaskId === taskId) return;

      const rect = card.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      clearDropIndicators();
      if (e.clientY < midpoint) {
        card.classList.add('drop-before');
      } else {
        card.classList.add('drop-after');
      }
    });

    card.addEventListener('dragleave', (e) => {
      // only remove if left the card boundary
      const rect = card.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX >= rect.right ||
        e.clientY < rect.top ||
        e.clientY >= rect.bottom
      ) {
        card.classList.remove('drop-before', 'drop-after');
      }
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const sourceId = state.draggedTaskId || e.dataTransfer.getData('text/plain');
      if (!sourceId || sourceId === taskId) {
        clearDropIndicators();
        return;
      }

      const rect = card.getBoundingClientRect();
      const isBefore = e.clientY < (rect.top + rect.height / 2);

      reorderTaskRelative(sourceId, taskId, isBefore);
      clearDropIndicators();
    });
  }

  function setupColumnDropZones() {
    COLUMNS.forEach((colId) => {
      const colEl = document.getElementById(`column-${colId}`);
      const listEl = document.getElementById(`list-${colId}`);
      if (!colEl || !listEl) return;

      colEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        listEl.classList.add('drag-over');
      });

      colEl.addEventListener('dragleave', (e) => {
        const rect = colEl.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX >= rect.right ||
          e.clientY < rect.top ||
          e.clientY >= rect.bottom
        ) {
          listEl.classList.remove('drag-over');
        }
      });

      colEl.addEventListener('drop', (e) => {
        e.preventDefault();
        listEl.classList.remove('drag-over');
        clearDropIndicators();

        const sourceId = state.draggedTaskId || e.dataTransfer.getData('text/plain');
        if (!sourceId) return;

        // If dropped onto column background (not on a specific card), append to bottom of column
        const targetCard = e.target.closest('.task-card');
        if (!targetCard) {
          const task = state.tasks.find((t) => t.id === sourceId);
          if (task) {
            task.status = colId;
            const maxOrder = Math.max(
              0,
              ...state.tasks.filter((t) => t.status === colId).map((t) => t.order || 0)
            );
            task.order = maxOrder + 1;
            Storage.saveTasks(state.tasks);
            render();
          }
        }
      });
    });
  }

  function clearDropIndicators() {
    document.querySelectorAll('.task-card').forEach((c) => {
      c.classList.remove('drop-before', 'drop-after');
    });
    document.querySelectorAll('.card-list').forEach((l) => {
      l.classList.remove('drag-over');
    });
  }

  function reorderTaskRelative(sourceId, targetId, insertBefore) {
    const sourceTask = state.tasks.find((t) => t.id === sourceId);
    const targetTask = state.tasks.find((t) => t.id === targetId);

    if (!sourceTask || !targetTask) return;

    const targetStatus = targetTask.status;
    sourceTask.status = targetStatus;

    // Get all tasks in target column excluding source
    const siblings = state.tasks
      .filter((t) => t.status === targetStatus && t.id !== sourceId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const targetIndex = siblings.findIndex((t) => t.id === targetId);
    const insertionIndex = insertBefore ? targetIndex : targetIndex + 1;

    siblings.splice(insertionIndex, 0, sourceTask);

    // Re-index orders
    siblings.forEach((task, idx) => {
      task.order = idx;
    });

    Storage.saveTasks(state.tasks);
    render();
  }

  // --- Modal Helpers ---
  function openBulkModal(defaultCol = 'todo') {
    elements.bulkTargetColumn.value = defaultCol;
    elements.bulkTasksInput.value = '';
    updateBulkLineCount();
    elements.bulkAddModal.classList.remove('hidden');
    elements.bulkTasksInput.focus();
  }

  function closeBulkModal() {
    elements.bulkAddModal.classList.add('hidden');
  }

  function openAddTaskModal(status = 'todo') {
    state.editingTaskId = null;
    elements.taskModalTitle.textContent = 'Add New Task';
    elements.taskIdInput.value = '';
    elements.taskTitleInput.value = '';
    elements.taskNotesInput.value = '';
    elements.taskPrLinkInput.value = '';
    elements.taskColumnSelect.value = status;
    elements.taskPrioritySelect.value = 'medium';
    elements.taskModal.classList.remove('hidden');
    elements.taskTitleInput.focus();
  }

  function openEditTaskModal(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;

    state.editingTaskId = id;
    elements.taskModalTitle.textContent = 'Edit Task';
    elements.taskIdInput.value = task.id;
    elements.taskTitleInput.value = task.title;
    elements.taskNotesInput.value = task.notes || '';
    elements.taskPrLinkInput.value = task.prLink || '';
    elements.taskColumnSelect.value = task.status;
    elements.taskPrioritySelect.value = task.priority || 'medium';
    elements.taskModal.classList.remove('hidden');
    elements.taskTitleInput.focus();
  }

  function closeTaskModal() {
    elements.taskModal.classList.add('hidden');
    state.editingTaskId = null;
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();
    const title = elements.taskTitleInput.value.trim();
    if (!title) return;

    const data = {
      title: title,
      status: elements.taskColumnSelect.value,
      priority: elements.taskPrioritySelect.value,
      prLink: elements.taskPrLinkInput.value.trim(),
      notes: elements.taskNotesInput.value.trim()
    };

    if (state.editingTaskId) {
      updateTask(state.editingTaskId, data);
    } else {
      addTask(data);
    }

    closeTaskModal();
  }

  // --- Utility Functions ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeUrl(url) {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }

  function getPrDisplayText(url) {
    if (!url) return '';
    const trimmed = url.trim();
    // GitHub PR pattern: /pull/123
    const ghMatch = trimmed.match(/\/pull\/(\d+)/i);
    if (ghMatch) return `PR #${ghMatch[1]}`;
    // GitLab MR pattern: /merge_requests/123
    const glMatch = trimmed.match(/\/merge_requests\/(\d+)/i);
    if (glMatch) return `MR #${glMatch[1]}`;
    // Short number or "#42"
    if (/^#?\d+$/.test(trimmed)) return `PR ${trimmed.startsWith('#') ? trimmed : '#' + trimmed}`;
    // Generic URL
    try {
      const parsed = new URL(normalizeUrl(trimmed));
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return `PR: ${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
      }
      return `PR: ${parsed.hostname}`;
    } catch (e) {
      return trimmed.length > 25 ? trimmed.substring(0, 22) + '...' : trimmed;
    }
  }

  // --- Daily Report Operations ---
  const REPORT_ICONS = {
    done: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    inProgress: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>`,
    todo: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd"/></svg>`
  };

  let reportViewMode = 'formatted'; // 'formatted' | 'markdown'
  let generateReportTimer = null;

  function getDailyReportData() {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const total = state.tasks.length;
    const doneTasks = state.tasks.filter((t) => t.status === 'done');
    const inProgressTasks = state.tasks.filter((t) => t.status === 'in-progress');
    const todoTasks = state.tasks.filter((t) => t.status === 'todo');
    const pct = total === 0 ? 0 : Math.round((doneTasks.length / total) * 100);

    return {
      dateFormatted,
      total,
      pct,
      doneTasks,
      inProgressTasks,
      todoTasks
    };
  }

  function generateMarkdownReport(data) {
    let md = `# 📋 Daily Status Report — ${data.dateFormatted}\n\n`;
    md += `**Summary:** ${data.doneTasks.length}/${data.total} tasks completed (${data.pct}%) | ${data.inProgressTasks.length} in progress | ${data.todoTasks.length} to do\n\n`;

    // Done Section
    md += `### ✅ Done (${data.doneTasks.length})\n`;
    if (data.doneTasks.length === 0) {
      md += `_No tasks completed yet_\n`;
    } else {
      data.doneTasks.forEach((t) => {
        const prio = PRIORITIES[t.priority] ? PRIORITIES[t.priority].label : 'Medium';
        let line = `- [x] ${t.title} [${prio}]`;
        if (t.prLink && t.prLink.trim()) {
          line += ` — PR: ${t.prLink.trim()}`;
        }
        md += `${line}\n`;
        if (t.notes && t.notes.trim()) {
          md += `  > ${t.notes.trim().replace(/\n/g, ' ')}\n`;
        }
      });
    }
    md += `\n`;

    // In Progress Section
    md += `### ⏳ In Progress (${data.inProgressTasks.length})\n`;
    if (data.inProgressTasks.length === 0) {
      md += `_No tasks currently in progress_\n`;
    } else {
      data.inProgressTasks.forEach((t) => {
        const prio = PRIORITIES[t.priority] ? PRIORITIES[t.priority].label : 'Medium';
        let line = `- [/] ${t.title} [${prio}]`;
        if (t.prLink && t.prLink.trim()) {
          line += ` — PR: ${t.prLink.trim()}`;
        }
        md += `${line}\n`;
        if (t.notes && t.notes.trim()) {
          md += `  > ${t.notes.trim().replace(/\n/g, ' ')}\n`;
        }
      });
    }
    md += `\n`;

    // To Do Section
    md += `### 📝 To Do (${data.todoTasks.length})\n`;
    if (data.todoTasks.length === 0) {
      md += `_No pending tasks_\n`;
    } else {
      data.todoTasks.forEach((t) => {
        const prio = PRIORITIES[t.priority] ? PRIORITIES[t.priority].label : 'Medium';
        let line = `- [ ] ${t.title} [${prio}]`;
        md += `${line}\n`;
        if (t.notes && t.notes.trim()) {
          md += `  > ${t.notes.trim().replace(/\n/g, ' ')}\n`;
        }
      });
    }

    return md;
  }

  function renderReportModal() {
    const data = getDailyReportData();
    elements.reportDateSubtitle.textContent = `Generated on ${data.dateFormatted} • Status-wise overview`;

    // Render stats
    elements.reportStatsBar.innerHTML = `
      <div class="report-stat-pill">
        <span class="report-stat-num">${data.total}</span>
        <span class="report-stat-lbl">Total Tasks</span>
      </div>
      <div class="report-stat-pill">
        <span class="report-stat-num stat-done">${data.doneTasks.length}</span>
        <span class="report-stat-lbl">Done (${data.pct}%)</span>
      </div>
      <div class="report-stat-pill">
        <span class="report-stat-num stat-progress">${data.inProgressTasks.length}</span>
        <span class="report-stat-lbl">In Progress</span>
      </div>
      <div class="report-stat-pill">
        <span class="report-stat-num stat-todo">${data.todoTasks.length}</span>
        <span class="report-stat-lbl">To Do</span>
      </div>
    `;

    // Render formatted sections
    let html = '';

    // Done Section
    html += `
      <div class="report-section">
        <div class="report-section-header">
          <div class="report-section-title-group">
            <span class="status-dot dot-done"></span>
            <span class="report-section-title">Done</span>
          </div>
          <span class="report-section-badge">${data.doneTasks.length}</span>
        </div>
        <div class="report-task-list">
          ${data.doneTasks.length === 0 ? '<div class="report-empty-notice">No completed tasks yet.</div>' : ''}
          ${data.doneTasks.map((t) => {
            const prio = t.priority || 'medium';
            const prioLabel = PRIORITIES[prio] ? PRIORITIES[prio].label : 'Med';
            const hasPr = Boolean(t.prLink && t.prLink.trim());
            const prUrl = hasPr ? normalizeUrl(t.prLink) : '';
            const prDisplay = hasPr ? getPrDisplayText(t.prLink) : '';
            return `
              <div class="report-task-item">
                <span class="report-status-icon icon-done">${REPORT_ICONS.done}</span>
                <div class="report-task-content">
                  <div class="report-task-title-line">
                    <span class="report-task-title">${escapeHtml(t.title)}</span>
                    <span class="priority-pill prio-${prio}">${prioLabel}</span>
                  </div>
                  ${t.notes ? `<div class="report-task-notes">${escapeHtml(t.notes)}</div>` : ''}
                </div>
                <div class="report-task-actions">
                  ${hasPr ? `
                    <a href="${escapeHtml(prUrl)}" target="_blank" rel="noopener noreferrer" class="report-pr-badge" title="${escapeHtml(t.prLink)}">
                      <svg class="pr-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v7.256A2.246 2.246 0 0111.75 14a2.25 2.25 0 112.25-2.25c0-.414-.336-.75-.75-.75h-1V5a2.5 2.5 0 00-2.5-2.5zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5zm8.5 0a.75.75 0 100 1.5.75.75 0 000-1.5z"></path>
                      </svg>
                      <span>${escapeHtml(prDisplay)}</span>
                      <svg class="pr-external-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8.636 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1.793L5.146 10.793a.5.5 0 00.708.708L11.146 6.207v1.793a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-4.5a.5.5 0 00-.5-.5h-4.5z"/>
                        <path d="M3 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V9.5a.5.5 0 00-1 0V13a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1h3.5a.5.5 0 000-1H3z"/>
                      </svg>
                    </a>
                  ` : `
                    <button class="add-pr-btn report-add-pr-btn" data-task-id="${t.id}" title="Add PR link for this completed task">
                      <svg class="pr-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v7.256A2.246 2.246 0 0111.75 14a2.25 2.25 0 112.25-2.25c0-.414-.336-.75-.75-.75h-1V5a2.5 2.5 0 00-2.5-2.5zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5zm8.5 0a.75.75 0 100 1.5.75.75 0 000-1.5z"></path>
                      </svg>
                      <span>+ Add PR</span>
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // In Progress Section
    html += `
      <div class="report-section">
        <div class="report-section-header">
          <div class="report-section-title-group">
            <span class="status-dot dot-progress"></span>
            <span class="report-section-title">In Progress</span>
          </div>
          <span class="report-section-badge">${data.inProgressTasks.length}</span>
        </div>
        <div class="report-task-list">
          ${data.inProgressTasks.length === 0 ? '<div class="report-empty-notice">Nothing currently in progress.</div>' : ''}
          ${data.inProgressTasks.map((t) => {
            const prio = t.priority || 'medium';
            const prioLabel = PRIORITIES[prio] ? PRIORITIES[prio].label : 'Med';
            const hasPr = Boolean(t.prLink && t.prLink.trim());
            const prUrl = hasPr ? normalizeUrl(t.prLink) : '';
            const prDisplay = hasPr ? getPrDisplayText(t.prLink) : '';
            return `
              <div class="report-task-item">
                <span class="report-status-icon icon-progress">${REPORT_ICONS.inProgress}</span>
                <div class="report-task-content">
                  <div class="report-task-title-line">
                    <span class="report-task-title">${escapeHtml(t.title)}</span>
                    <span class="priority-pill prio-${prio}">${prioLabel}</span>
                  </div>
                  ${t.notes ? `<div class="report-task-notes">${escapeHtml(t.notes)}</div>` : ''}
                </div>
                <div class="report-task-actions">
                  ${hasPr ? `
                    <a href="${escapeHtml(prUrl)}" target="_blank" rel="noopener noreferrer" class="report-pr-badge" title="${escapeHtml(t.prLink)}">
                      <svg class="pr-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v7.256A2.246 2.246 0 0111.75 14a2.25 2.25 0 112.25-2.25c0-.414-.336-.75-.75-.75h-1V5a2.5 2.5 0 00-2.5-2.5zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5zm8.5 0a.75.75 0 100 1.5.75.75 0 000-1.5z"></path>
                      </svg>
                      <span>${escapeHtml(prDisplay)}</span>
                      <svg class="pr-external-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8.636 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1.793L5.146 10.793a.5.5 0 00.708.708L11.146 6.207v1.793a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-4.5a.5.5 0 00-.5-.5h-4.5z"/>
                        <path d="M3 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V9.5a.5.5 0 00-1 0V13a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1h3.5a.5.5 0 000-1H3z"/>
                      </svg>
                    </a>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // To Do Section
    html += `
      <div class="report-section">
        <div class="report-section-header">
          <div class="report-section-title-group">
            <span class="status-dot dot-todo"></span>
            <span class="report-section-title">To Do</span>
          </div>
          <span class="report-section-badge">${data.todoTasks.length}</span>
        </div>
        <div class="report-task-list">
          ${data.todoTasks.length === 0 ? '<div class="report-empty-notice">No pending tasks.</div>' : ''}
          ${data.todoTasks.map((t) => {
            const prio = t.priority || 'medium';
            const prioLabel = PRIORITIES[prio] ? PRIORITIES[prio].label : 'Med';
            return `
              <div class="report-task-item">
                <span class="report-status-icon icon-todo">${REPORT_ICONS.todo}</span>
                <div class="report-task-content">
                  <div class="report-task-title-line">
                    <span class="report-task-title">${escapeHtml(t.title)}</span>
                    <span class="priority-pill prio-${prio}">${prioLabel}</span>
                  </div>
                  ${t.notes ? `<div class="report-task-notes">${escapeHtml(t.notes)}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    elements.reportFormattedContainer.innerHTML = html;

    // Attach listeners to any "+ Add PR" buttons inside the report view
    elements.reportFormattedContainer.querySelectorAll('.report-add-pr-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        const val = prompt('Enter Pull Request link for this completed task:');
        if (val !== null && val.trim() !== '') {
          updateTask(taskId, { prLink: val.trim() });
          renderReportModal();
        }
      });
    });

    // Populate markdown text
    const md = generateMarkdownReport(data);
    elements.reportMarkdownText.value = md;
  }

  function setReportViewMode(mode) {
    reportViewMode = mode;
    elements.reportToggleFormatted.classList.toggle('active', mode === 'formatted');
    elements.reportToggleMarkdown.classList.toggle('active', mode === 'markdown');
    elements.reportFormattedContainer.classList.toggle('hidden', mode !== 'formatted');
    elements.reportMarkdownContainer.classList.toggle('hidden', mode !== 'markdown');
  }

  function openReportModal() {
    if (generateReportTimer) {
      clearTimeout(generateReportTimer);
    }

    elements.reportModal.classList.remove('hidden');
    elements.copyToast.classList.add('hidden');
    elements.reportDateSubtitle.textContent = 'Report is generating...';

    // Show loading state, hide main report content
    elements.reportLoadingContainer.classList.remove('hidden');
    elements.reportContentWrapper.classList.add('hidden');

    // Display "Report is generating..." and render smoothly
    generateReportTimer = setTimeout(() => {
      renderReportModal();
      setReportViewMode('formatted');
      elements.reportLoadingContainer.classList.add('hidden');
      elements.reportContentWrapper.classList.remove('hidden');
    }, 450);
  }

  function closeReportModal() {
    if (generateReportTimer) {
      clearTimeout(generateReportTimer);
    }
    elements.reportModal.classList.add('hidden');
  }

  async function copyReportToClipboard() {
    const data = getDailyReportData();
    const md = generateMarkdownReport(data);
    try {
      await navigator.clipboard.writeText(md);
      elements.copyToast.classList.remove('hidden');
      setTimeout(() => {
        elements.copyToast.classList.add('hidden');
      }, 2500);
    } catch (err) {
      // Fallback
      setReportViewMode('markdown');
      elements.reportMarkdownText.select();
      document.execCommand('copy');
      elements.copyToast.classList.remove('hidden');
      setTimeout(() => {
        elements.copyToast.classList.add('hidden');
      }, 2500);
    }
  }

  function downloadReportFile() {
    const data = getDailyReportData();
    const md = generateMarkdownReport(data);
    const dateStr = new Date().toISOString().split('T')[0];
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${dateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Event Bindings ---
  function initEventBindings() {
    // Clock tick
    updateClock();
    setInterval(updateClock, 1000);

    // View tab switching
    elements.viewTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeView = btn.dataset.view;
        updateViewMode();
      });
    });

    // Column quick add buttons
    document.querySelectorAll('.quick-add-btn, .add-inline-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = btn.dataset.status || 'todo';
        openAddTaskModal(col);
      });
    });

    // Clear column button for Done tasks
    if (elements.clearDoneColBtn) {
      elements.clearDoneColBtn.addEventListener('click', clearCompletedTasks);
    }

    // Daily Report modal triggers
    if (elements.openReportBtn) {
      elements.openReportBtn.addEventListener('click', openReportModal);
    }
    if (elements.closeReportModalBtn) {
      elements.closeReportModalBtn.addEventListener('click', closeReportModal);
    }
    if (elements.closeReportBtn) {
      elements.closeReportBtn.addEventListener('click', closeReportModal);
    }
    if (elements.copyReportBtn) {
      elements.copyReportBtn.addEventListener('click', copyReportToClipboard);
    }
    if (elements.downloadReportBtn) {
      elements.downloadReportBtn.addEventListener('click', downloadReportFile);
    }
    if (elements.reportToggleFormatted) {
      elements.reportToggleFormatted.addEventListener('click', () => setReportViewMode('formatted'));
    }
    if (elements.reportToggleMarkdown) {
      elements.reportToggleMarkdown.addEventListener('click', () => setReportViewMode('markdown'));
    }

    // Bulk Add modal triggers
    elements.openBulkAddBtn.addEventListener('click', () => openBulkModal('todo'));
    elements.closeBulkAddBtn.addEventListener('click', closeBulkModal);
    elements.cancelBulkAddBtn.addEventListener('click', closeBulkModal);
    elements.submitBulkAddBtn.addEventListener('click', handleBulkSubmit);
    elements.bulkTasksInput.addEventListener('input', updateBulkLineCount);

    // Single Task modal triggers
    elements.openAddTaskBtn.addEventListener('click', () => openAddTaskModal('todo'));
    elements.closeTaskModalBtn.addEventListener('click', closeTaskModal);
    elements.cancelTaskModalBtn.addEventListener('click', closeTaskModal);
    elements.taskForm.addEventListener('submit', handleTaskFormSubmit);

    // Search and filters
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      elements.clearSearchBtn.classList.toggle('hidden', state.searchQuery === '');
      render();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.clearSearchBtn.classList.add('hidden');
      render();
    });

    elements.priorityFilter.addEventListener('change', (e) => {
      state.priorityFilter = e.target.value;
      render();
    });

    elements.clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    // Backdrop click to close modals
    [elements.bulkAddModal, elements.taskModal, elements.reportModal].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Escape closes open modals
      if (e.key === 'Escape') {
        closeBulkModal();
        closeTaskModal();
        closeReportModal();
      }

      // Ctrl+Enter or Cmd+Enter submits active modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!elements.bulkAddModal.classList.contains('hidden')) {
          e.preventDefault();
          handleBulkSubmit();
        }
      }

      // Global hotkeys when not inside an input or textarea
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      if (!isInput) {
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          openBulkModal('todo');
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          openAddTaskModal('todo');
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          openReportModal();
        }
      }
    });

    // Drag zones setup
    setupColumnDropZones();
  }

  // --- App Initialization ---
  async function init() {
    initEventBindings();
    state.tasks = await Storage.loadTasks();
    render();
  }

  // Start app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

