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

jest.unstable_mockModule('@clerk/express', () => ({
  clerkMiddleware: () => (req, res, next) => next(),
  requireAuth:     () => (req, res, next) => next(),
}));

jest.unstable_mockModule('../middleware/auth.js', () => ({
  protectAdmin: (req, res, next) => next(),
}));

jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        results:           [],
        title:             'Test Movie',
        overview:          'Test overview',
        poster_path:       '/test.jpg',
        backdrop_path:     '/test_bg.jpg',
        genres:            [],
        release_date:      '2024-01-01',
        original_language: 'en',
        tagline:           '',
        vote_average:      7.5,
        runtime:           120,
      },
    }),
  },
}));

// ── Model mock refs — defined outside so tests can control them ────────
const mockMovie = {
  _id:         '60d21b4667d0d8992e610c85',
  title:       'Test Movie',
  poster_path: '/test.jpg',
  toString:    () => '60d21b4667d0d8992e610c85',
};

const mockShow = {
  _id:           '60d21b4667d0d8992e610c86',
  movie:         mockMovie,
  showDateTime:  new Date(Date.now() + 86400000),
  showPrice:     150,
  occupiedSeats: {},
};

const mockShowFind     = jest.fn();
const mockShowFindById = jest.fn();
const mockShowInsert   = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule('../models/Show.js', () => ({
  default: {
    find:       mockShowFind,
    findById:   mockShowFindById,
    insertMany: mockShowInsert,
  },
}));

const mockMovieFindById = jest.fn();
const mockMovieCreate   = jest.fn();

jest.unstable_mockModule('../models/Movie.js', () => ({
  default: {
    findById: mockMovieFindById,
    create:   mockMovieCreate,
  },
}));

// ── Build isolated app — MUST be after all unstable_mockModule calls ───
let app;
let request;

beforeAll(async () => {
  const { default: express }    = await import('express');
  request                       = (await import('supertest')).default;
  const { default: showRouter } = await import('../routes/showRoutes.js');

  app = express();
  app.use(express.json());
  app.use('/api/show', showRouter);
});

// ── Tests ──────────────────────────────────────────────────────────────
describe('Show API', () => {

  describe('GET /api/show/all', () => {
    test('returns 200 with success:true and shows array', async () => {
      mockShowFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([mockShow]),
        }),
      });

      const res = await request(app).get('/api/show/all');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.shows)).toBe(true);
    });

    test('deduplicates — same movie twice returns 1 entry', async () => {
      mockShowFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([mockShow, mockShow]),
        }),
      });

      const res = await request(app).get('/api/show/all');
      expect(res.body.shows.length).toBe(1);
    });
  });

  describe('GET /api/show/:movieId', () => {
    test('returns success:false when movie not found', async () => {
      mockMovieFindById.mockResolvedValue(null);

      const res = await request(app).get('/api/show/60d21b4667d0d8992e610c85');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
    });

    test('returns show data when movie exists', async () => {
      mockMovieFindById.mockResolvedValue(mockMovie);
      mockShowFind.mockResolvedValue([mockShow]);

      const res = await request(app).get('/api/show/60d21b4667d0d8992e610c85');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('show');
    });
  });

  describe('POST /api/show/add', () => {
    test('returns error when body is empty', async () => {
      const res = await request(app).post('/api/show/add').send({});
expect(res.body.success).toBe(false);
    });
  });

});