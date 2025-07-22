import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';

const app = express();
const port = process.env.PORT || 3000;

try {
  await connectDB();
  console.log('✅ MongoDB connected');
} catch (err) {
  console.error('❌ Failed to connect to DB:', err.message);
  process.exit(1);
}

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// Health check route
app.get('/', (req, res) => res.send('✅ Server is Live!'));

// Inngest handler (v3)
app.use('/api/ingest', serve({ client: inngest, functions }));

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
