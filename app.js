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
      title: 'Click the priority badge to cycle: Urgent → High → Medium → Low',
      notes: 'Try clicking the badge directly on this card.',
      status: 'done',
      priority: 'medium',
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
    taskNotesInput: document.getElementById('taskNotesInput')
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
      <div class="card-meta-row">
        <button class="priority-pill prio-${prio}" data-action="cycle-prio" title="Click to cycle priority (${prioLabel})">
          ● ${prioLabel}
        </button>
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

    const prioBtn = card.querySelector('[data-action="cycle-prio"]');
    prioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleTaskPriority(task.id);
    });

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
    if (completedCount === 0) return;

    if (confirm(`Clear all ${completedCount} completed task(s)?`)) {
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
    [elements.bulkAddModal, elements.taskModal].forEach((modal) => {
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

