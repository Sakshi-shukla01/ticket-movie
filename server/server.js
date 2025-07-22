import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express';
import { serve } from "inngest/express";
import { inngest ,functions } from "./inngest/index.js"

const app = express();
const port = process.env.PORT || 3000;

// Connect to DB before starting server
try {
  await connectDB();
} catch (err) {
  console.error('Failed to connect to DB:', err.message);
  process.exit(1);
}

// Middlewares
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// Test route
app.get('/', (req, res) => res.send('Server is Live!'));
app.use('/api/ingest',serve({ client: inngest, functions}))
// Start server
app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));
