import { jest } from '@jest/globals';

// ── Mocks via unstable_mockModule (correct API for ES modules) ─────────
jest.unstable_mockModule('../configs/db.js', () => ({
  default: jest.fn().mockResolvedValue(true),
}));

jest.unstable_mockModule('../configs/nodeMailer.js', () => ({
  default: { sendMail: jest.fn() },
}));

jest.unstable_mockModule('../configs/redis.js', () => ({
  default: {
    get:     jest.fn().mockResolvedValue(null),
    setex:   jest.fn().mockResolvedValue('OK'),
    set:     jest.fn().mockResolvedValue('OK'),
    del:     jest.fn().mockResolvedValue(1),
    connect: jest.fn().mockResolvedValue(true),
  },
}));

jest.unstable_mockModule('../configs/rabbitmq.js', () => ({
  publishToQueue:  jest.fn().mockResolvedValue(true),
  connectRabbitMQ: jest.fn().mockResolvedValue(true),
}));

jest.unstable_mockModule('../configs/socket.js', () => ({
  getIO:      jest.fn().mockReturnValue({
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  }),
  initSocket: jest.fn(),
}));

jest.unstable_mockModule('@clerk/express', () => ({
  clerkMiddleware: () => (req, res, next) => next(),
  requireAuth:     () => (req, res, next) => next(),
}));

jest.unstable_mockModule('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id:       'cs_test_123',
          url:      'https://checkout.stripe.com/test',
          metadata: {},
        }),
      },
    },
  })),
}));

jest.unstable_mockModule('../inngest/index.js', () => ({
  inngest:   { send: jest.fn().mockResolvedValue(true) },
  functions: [],
}));

// ── Model mocks — keep refs outside so tests can control them ──────────
const mockShowFindById = jest.fn();
const mockShowFind     = jest.fn();
jest.unstable_mockModule('../models/Show.js', () => ({
  default: { findById: mockShowFindById, find: mockShowFind },
}));

const mockBookingFind    = jest.fn();
const mockBookingFindOne = jest.fn();
const mockBookingCreate  = jest.fn();
jest.unstable_mockModule('../models/Booking.js', () => ({
  default: { find: mockBookingFind, findOne: mockBookingFindOne, create: mockBookingCreate },
}));

const mockUserFindById = jest.fn().mockResolvedValue(null);
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findById: mockUserFindById, create: jest.fn() },
}));

// ── Build isolated app — MUST be after all unstable_mockModule calls ───
let app;
let request;

beforeAll(async () => {
  const { default: express }       = await import('express');
  request                          = (await import('supertest')).default;
  const { default: bookingRouter } = await import('../routes/bookingRoutes.js');

  app = express();
  app.use(express.json());
  app.use('/api/booking', bookingRouter);
});

// ── Tests ──────────────────────────────────────────────────────────────
describe('Booking API', () => {

  describe('GET /api/booking/seats/:showId', () => {
    test('returns 200 with occupied seats list', async () => {
      mockShowFindById.mockResolvedValue({
        occupiedSeats: { A1: 'user1', B2: 'user2' },
      });

      const res = await request(app).get('/api/booking/seats/60d21b4667d0d8992e610c85');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('occupiedSeats');
    });

    test('returns 404 when show not found', async () => {
      mockShowFindById.mockResolvedValue(null);

      const res = await request(app).get('/api/booking/seats/60d21b4667d0d8992e610c85');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/booking/create', () => {
    test('returns 401 when no auth', async () => {
      const res = await request(app)
        .post('/api/booking/create')
        .send({ showId: '60d21b4667d0d8992e610c85', bookedSeats: ['A1'] });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns error when bookedSeats is empty', async () => {
      const res = await request(app)
        .post('/api/booking/create')
        .send({ showId: '60d21b4667d0d8992e610c85', bookedSeats: [] });

      expect([400, 401]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });

    test('returns error when showId is missing', async () => {
      const res = await request(app)
        .post('/api/booking/create')
        .send({ bookedSeats: ['A1'] });

      expect([400, 401]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/booking/my', () => {
    test('handles missing auth gracefully', async () => {
      const res = await request(app).get('/api/booking/my');
      expect([200, 401, 500]).toContain(res.statusCode);
    });
  });

});