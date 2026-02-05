const API_BASE = '/api/todos';

// DOM Elements
const todoInput = document.getElementById('todoInput');
const prioritySelect = document.getElementById('prioritySelect');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');

// State
let todos = [];

// Fetch todos from server
async function fetchTodos() {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error('Failed to fetch todos');
    todos = await response.json();
    renderTodos();
  } catch (error) {
    console.error('Error fetching todos:', error);
    alert('无法加载任务列表，请检查服务器是否运行');
  }
}

// Create new todo
async function createTodo(title, priority = 'medium') {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority })
    });

    if (!response.ok) throw new Error('Failed to create todo');

    const newTodo = await response.json();
    todos.push(newTodo);
    renderTodos();
  } catch (error) {
    console.error('Error creating todo:', error);
    alert('添加任务失败');
  }
}

// Update todo
async function updateTodo(id, updates) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Failed to update todo');

    const updatedTodo = await response.json();
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos[index] = updatedTodo;
      renderTodos();
    }
  } catch (error) {
    console.error('Error updating todo:', error);
    alert('更新任务失败');
  }
}

// Delete todo
async function deleteTodo(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete todo');

    todos = todos.filter(t => t.id !== id);
    renderTodos();
  } catch (error) {
    console.error('Error deleting todo:', error);
    alert('删除任务失败');
  }
}

// Render todos
function renderTodos() {
  // Update stats
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const active = total - completed;

  totalCount.textContent = total;
  activeCount.textContent = active;
  completedCount.textContent = completed;

  // Show/hide empty state
  if (todos.length === 0) {
    emptyState.classList.remove('hidden');
    todoList.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  // Render todo items
  todoList.innerHTML = todos
    .map(todo => `
      <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
        <input
          type="checkbox"
          class="todo-checkbox"
          ${todo.completed ? 'checked' : ''}
          onchange="handleToggle(${todo.id}, this.checked)"
        >
        <span class="todo-text">${escapeHtml(todo.title)}</span>
        <span class="priority-badge ${todo.priority}">${getPriorityLabel(todo.priority)}</span>
        <button class="todo-delete" onclick="handleDelete(${todo.id})">删除</button>
      </li>
    `)
    .join('');
}

// Event handlers
function handleToggle(id, completed) {
  updateTodo(id, { completed });
}

function handleDelete(id) {
  if (confirm('确定要删除这个任务吗？')) {
    deleteTodo(id);
  }
}

function handleAdd() {
  const title = todoInput.value.trim();
  const priority = prioritySelect.value;
  if (title) {
    createTodo(title, priority);
    todoInput.value = '';
    prioritySelect.value = 'medium';
    todoInput.focus();
  }
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utility: Get priority label in Chinese
function getPriorityLabel(priority) {
  const labels = {
    low: '低',
    medium: '中',
    high: '高'
  };
  return labels[priority] || priority;
}

// Event listeners
addBtn.addEventListener('click', handleAdd);
todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleAdd();
  }
});

// Initialize
fetchTodos();
