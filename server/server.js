// server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express';
import connectDB from './configs/db.js';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import { stripeWebhooks } from './controllers/stripeWebhooks.js';

const app = express();
const port = process.env.PORT || 3000;

// ✅ Connect to MongoDB
await connectDB();

// ✅ Stripe Webhook (Must be before express.json)
app.post('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// ✅ JSON middleware after stripe raw parsing
app.use(express.json());

// ✅ CORS middleware (multiple allowed origins)
const allowedOrigins = [
  'http://localhost:5173',
  'https://ticket-movie-mfoq.vercel.app'// ✅ your deployed frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ✅ Clerk Middleware
app.use(clerkMiddleware());

// ✅ API Routes
app.use('/api/show', showRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);

// ✅ Inngest functions route
app.use('/api/inngest', serve({ client: inngest, functions }));

// ✅ Health check route
app.get('/', (req, res) => res.send('Server is Live!'));

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
