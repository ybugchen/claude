const request = require('supertest');
const app = require('../src/server');
const store = require('../src/data/store');

describe('Todo API', () => {
  beforeEach(() => {
    // Reset store before each test
    store.reset();
    store.create('Test Todo 1');
    store.create('Test Todo 2');
  });

  describe('GET /api/todos', () => {
    it('should return all todos', async () => {
      const response = await request(app).get('/api/todos');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('title', 'Test Todo 1');
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should return a todo by id', async () => {
      const response = await request(app).get('/api/todos/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('title', 'Test Todo 1');
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).get('/api/todos/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Todo not found');
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'New Todo' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', 'New Todo');
      expect(response.body).toHaveProperty('completed', false);
      expect(response.body).toHaveProperty('priority', 'medium');
      expect(response.body).toHaveProperty('id');
    });

    it('should create a new todo with custom priority', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'High Priority Todo', priority: 'high' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', 'High Priority Todo');
      expect(response.body).toHaveProperty('priority', 'high');
    });

    it('should return 400 if priority is invalid', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'Invalid Priority', priority: 'urgent' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Priority must be low, medium, or high');
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title is required');
    });

    it('should return 400 if title is empty', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: '   ' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update a todo', async () => {
      const response = await request(app)
        .put('/api/todos/1')
        .send({ title: 'Updated Todo', completed: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'Updated Todo');
      expect(response.body).toHaveProperty('completed', true);
    });

    it('should update todo priority', async () => {
      const response = await request(app)
        .put('/api/todos/1')
        .send({ priority: 'high' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('priority', 'high');
    });

    it('should return 400 if priority is invalid', async () => {
      const response = await request(app)
        .put('/api/todos/1')
        .send({ priority: 'critical' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Priority must be low, medium, or high');
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .put('/api/todos/999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete a todo', async () => {
      const response = await request(app).delete('/api/todos/1');

      expect(response.status).toBe(204);

      // Verify it's deleted
      const getResponse = await request(app).get('/api/todos/1');
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).delete('/api/todos/999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
