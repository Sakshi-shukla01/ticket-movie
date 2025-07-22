// api/ingest.js
import { serve } from 'inngest/express';
import { inngest, functions } from '../../inngest/index.js'; // adjust path

const handler = serve({
  client: inngest,
  functions,
});

export default handler; // <-- required for Vercel
