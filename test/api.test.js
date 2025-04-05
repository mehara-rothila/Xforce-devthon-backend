const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
let authToken;
let testSubjectId;
let testQuizId;
let testCategoryId;
let testTopicId;

// Test user credentials
const TEST_USER = {
  email: 'admin@xforce.com',
  password: 'admin123'
};

// Helper function for authenticated requests
const authRequest = (method, url, data = {}) => {
  return axios({
    method,
    url: `${BASE_URL}${url}`,
    data,
    headers: { Authorization: `Bearer ${authToken}` }
  });
};

describe('Xforce Devthon API Tests', () => {
  beforeAll(async () => {
    // Login before tests
    const res = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    authToken = res.data.token;
  });

  describe('Subject Endpoints', () => {
    test('Create Subject', async () => {
      const res = await authRequest('post', '/subjects', {
        name: 'Test Subject',
        description: 'Test Description'
      });
      testSubjectId = res.data.data._id;
      expect(res.status).toBe(201);
    });

    test('Get All Subjects', async () => {
      const res = await axios.get(`${BASE_URL}/subjects`);
      expect(res.status).toBe(200);
      expect(res.data.data.length).toBeGreaterThan(0);
    });
  });

  describe('Quiz Endpoints', () => {
    test('Create Quiz', async () => {
      const res = await authRequest('post', '/quizzes', {
        title: 'Test Quiz',
        subject: testSubjectId,
        questions: [
          {
            text: 'Test Question',
            options: [{ text: 'Correct', isCorrect: true }]
          }
        ]
      });
      testQuizId = res.data.data._id;
      expect(res.status).toBe(201);
    });

    test('Attempt Quiz', async () => {
      const res = await authRequest('post', `/quizzes/${testQuizId}/attempts`, {
        answers: [{ questionId: '0', answerId: '0' }]
      });
      expect(res.status).toBe(201);
      expect(res.data.data.score).toBeDefined();
    });
  });

  describe('Forum Endpoints', () => {
    test('Create Forum Category', async () => {
      const res = await authRequest('post', '/forum/categories', {
        name: 'Test Category',
        description: 'Test Category Description'
      });
      testCategoryId = res.data.data._id;
      expect(res.status).toBe(201);
    });

    test('Create Forum Topic', async () => {
      const res = await authRequest('post', '/forum/topics', {
        title: 'Test Topic',
        content: 'Test Content',
        category: testCategoryId
      });
      testTopicId = res.data.data._id;
      expect(res.status).toBe(201);
    });

    test('Get Forum Topics', async () => {
      const res = await axios.get(`${BASE_URL}/forum/categories/${testCategoryId}/topics`);
      expect(res.status).toBe(200);
      expect(res.data.data.length).toBe(1);
    });
  });

  afterAll(async () => {
    // Cleanup
    await authRequest('delete', `/subjects/${testSubjectId}`);
    await authRequest('delete', `/quizzes/${testQuizId}`);
    await authRequest('delete', `/forum/categories/${testCategoryId}`);
    console.log('✅ Test cleanup completed');
  });
});