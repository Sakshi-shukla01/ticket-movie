import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express';
import connectDB from './configs/db.js';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';

// Import routers
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import { stripeWebhooks } from './controllers/stripeWebhooks.js';

const app = express();
const port = process.env.PORT || 3000;

// ✅ Connect to MongoDB
await connectDB();
//stripe webhooks route
app.use('/api/stripe',express.raw({type:'application/json'}),stripeWebhooks)

// ✅ CORS setup
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ✅ JSON parsing
app.use(express.json());

// ✅ Clerk auth middleware
app.use(clerkMiddleware());

// ✅ Register routes
app.use('/api/show', showRouter);        // GET movie shows
app.use('/api/booking', bookingRouter);  // POST/GET bookings
app.use('/api/admin', adminRouter);      // POST show addition (your case)
app.use('/api/user', userRouter);        // User-related routes
app.use('/api/inngest', serve({ client: inngest, functions }));

// ✅ Health check
app.get('/', (req, res) => res.send('Server is Live!'));

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
