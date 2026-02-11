// server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express';
import connectDB from './configs/db.js';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import Booking from './models/Booking.js';
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import { stripeWebhooks } from './controllers/stripeWebhooks.js';

// ✅ ADD THIS IMPORT
import sendEmail from './configs/nodeMailer.js';

const app = express();
const port = process.env.PORT || 3000;

// ✅ Connect to MongoDB
await connectDB();

// ✅ Stripe Webhook (Must be before express.json)
app.post('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// ✅ JSON middleware after stripe raw parsing
app.use(express.json());

// ✅ CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://ticket-movie-mfoq.vercel.app'
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

// ✅ Inngest
app.use('/api/inngest', serve({ client: inngest, functions }));

// ----------------------------------------
// ✅ SMTP TEST ROUTE (IMPORTANT)
// ----------------------------------------
app.get('/test-email', async (req, res) => {
  try {
    await sendEmail({
      to: process.env.SENDER_EMAIL, // send to yourself
      subject: 'SMTP Test – QuickShow',
      body: `
        <h2>✅ SMTP is working!</h2>
        <p>This email confirms Brevo + Nodemailer setup is correct.</p>
      `,
    });

    res.send('✅ Test email sent successfully. Check inbox/spam.');
  } catch (error) {
    console.error('❌ SMTP test failed:', error);
    res.status(500).send('❌ SMTP test failed: ' + error.message);
  }
});
app.get('/test-inngest-email/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    await inngest.send({
      name: 'app/show.booked',
      data: { bookingId },
    });

    res.json({
      success: true,
      message: '✅ Inngest email event triggered',
      bookingId,
    });
  } catch (err) {
    console.error('❌ test-inngest-email error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Health check
app.get('/', (req, res) => res.send('Server is Live!'));

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
