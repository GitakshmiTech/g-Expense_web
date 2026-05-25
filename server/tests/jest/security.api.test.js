import request from 'supertest';
import { app } from '../../src/app.js';

describe('API security middleware', () => {
  it('serves health checks without authentication', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('rejects NoSQL operator injection before auth/controller execution', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: 'irrelevant' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/unsupported operator/i);
  });
});
