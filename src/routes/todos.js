const express = require('express');
const router = express.Router();
const store = require('../data/store');

// Get all todos
router.get('/', (req, res) => {
  res.json(store.getAll());
});

// Get todo by id
router.get('/:id', (req, res) => {
  const todo = store.getById(parseInt(req.params.id));
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  res.json(todo);
});

// Create new todo
router.post('/', (req, res) => {
  const { title, priority = 'medium' } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Validate priority
  const validPriorities = ['low', 'medium', 'high'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Priority must be low, medium, or high' });
  }

  const newTodo = store.create(title.trim(), priority);
  res.status(201).json(newTodo);
});

// Update todo
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, completed, priority } = req.body;

  // Validate priority if provided
  if (priority) {
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be low, medium, or high' });
    }
  }

  const updated = store.update(id, { title, completed, priority });
  if (!updated) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(updated);
});

// Delete todo
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = store.delete(id);

  if (!deleted) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.status(204).send();
});

module.exports = router;
