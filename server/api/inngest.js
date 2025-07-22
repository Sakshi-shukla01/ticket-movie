// api/inngest.js
import { serve } from "inngest/express"; // ✅ Not "next"
import express from "express";
import { inngest, functions } from "../inngest/index.js";

const app = express();

const handler = serve({
  client: inngest,
  functions,
});

// 👇 Vercel requires this default export
export default handler;
