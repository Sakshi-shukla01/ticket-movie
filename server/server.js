import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';

const app = express();
const port = process.env.PORT || 3000;

// Connect to DB
await connectDB();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// Health check
app.get('/', (_req, res) => res.send('Server is Live!'));

// ——— Fix is here ———
app.use(
  '/api/ingest',
  serve({
    client:    inngest,
    functions,
  })
);

// Start server
app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
