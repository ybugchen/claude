// In-memory data store for todos
let todos = [
  { id: 1, title: 'Learn Claude Code', completed: false, priority: 'high', createdAt: new Date().toISOString() },
  { id: 2, title: 'Build a demo app', completed: false, priority: 'medium', createdAt: new Date().toISOString() },
  { id: 3, title: 'Write documentation', completed: false, priority: 'low', createdAt: new Date().toISOString() }
];

let nextId = 4;

const store = {
  getAll() {
    return [...todos];
  },

  getById(id) {
    return todos.find(todo => todo.id === id);
  },

  create(title, priority = 'medium') {
    const newTodo = {
      id: nextId++,
      title,
      completed: false,
      priority,
      createdAt: new Date().toISOString()
    };
    todos.push(newTodo);
    return newTodo;
  },

  update(id, updates) {
    const index = todos.findIndex(todo => todo.id === id);
    if (index === -1) return null;

    todos[index] = {
      ...todos[index],
      ...updates,
      id: todos[index].id, // Prevent id from being updated
      updatedAt: new Date().toISOString()
    };

    return todos[index];
  },

  delete(id) {
    const index = todos.findIndex(todo => todo.id === id);
    if (index === -1) return false;

    todos.splice(index, 1);
    return true;
  },

  reset() {
    todos = [];
    nextId = 1;
  }
};

module.exports = store;
